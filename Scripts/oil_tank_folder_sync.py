"""Import new local oil-gauge photos into Admin Firebase tank readings.

Run once with --once, or keep running with --watch. Photos stay in the local
folder; only the confirmed level and source filename are saved to Firebase.
"""

import argparse
import base64
import hashlib
import json
import logging
import mimetypes
import os
import re
import time
from datetime import datetime
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from firestore_report_data import load_firebase_config


ROOT = Path(__file__).resolve().parent.parent
PHOTO_DIR = ROOT / "Home Heating Oil" / "Tank Level"
LOG = PHOTO_DIR / "tank-level-sync.log"
REVIEW_FILE = PHOTO_DIR / "tank-level-review.json"
EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
CAPACITY_GALLONS = 275
MODEL = os.environ.get("OIL_GAUGE_VISION_MODEL", "gpt-5.4-mini")


def photo_datetime(path):
    """Prefer camera EXIF, then a date in the filename, then file modification time."""
    try:
        from PIL import Image
        from PIL.ExifTags import TAGS
        with Image.open(path) as image:
            metadata = {TAGS.get(k, k): v for k, v in image.getexif().items()}
        for key in ("DateTimeOriginal", "DateTimeDigitized", "DateTime"):
            if metadata.get(key):
                return datetime.strptime(metadata[key], "%Y:%m:%d %H:%M:%S")
    except (ImportError, OSError, ValueError, TypeError):
        pass
    match = re.search(r"(?<!\d)(\d{1,2})[_-](\d{1,2})[_-](20\d{2})(?!\d)", path.stem)
    modified = datetime.fromtimestamp(path.stat().st_mtime)
    if match:
        month, day, year = map(int, match.groups())
        try:
            return modified.replace(year=year, month=month, day=day)
        except ValueError:
            pass
    return modified


def read_gauge(path):
    """Use vision only for the physical indicator; reject uncertain readings."""
    from openai import OpenAI
    mime = mimetypes.guess_type(path.name)[0] or "image/jpeg"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    client = OpenAI()
    payload = [
        {"type": "input_text", "text": (
            "Read this home heating-oil tank gauge. It has a rotating numbered tape "
            "and a small fixed pointer/notch at the BOTTOM edge of the viewing window. "
            "Find that pointer first, then compare its horizontal position with the "
            "printed fraction marks. Interpolate BETWEEN adjacent marks when the pointer "
            "falls between them; do not round to the nearest marked fraction. For example, "
            "two-thirds from 1/4 (25%) toward 3/8 (37.5%) is about 33%. Do not use the "
            "largest printed fraction or the center of the window as the reading. "
            "Return ONLY JSON with keys percent, confidence, and explanation. percent "
            "is a numeric value from 0 to 100 to one decimal place, or null if the "
            "pointer or adjacent marks are unclear. confidence is high, medium, or low."
        )},
        {"type": "input_image", "image_url": "data:%s;base64,%s" % (mime, encoded), "detail": "high"},
    ]

    def estimate():
        response = client.responses.create(
        model=MODEL,
        store=False,
        input=[{"role": "user", "content": payload}],
        )
        raw = response.output_text.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.I)
        return json.loads(raw)

    first = estimate()
    percent = first.get("percent")
    if first.get("confidence") != "high" or not isinstance(percent, (int, float)) or not 0 <= percent <= 100:
        raise ValueError("Gauge could not be read confidently: %s" % first.get("explanation", "unclear image"))
    second = estimate()
    second_percent = second.get("percent")
    if second.get("confidence") != "high" or not isinstance(second_percent, (int, float)) or abs(second_percent - percent) > 2:
        raise ValueError("Gauge readings did not agree; review the photo manually")
    return round((float(percent) + float(second_percent)) / 2, 1), str(first.get("explanation", ""))[:180]


def firestore_value(value):
    if value is None:
        return {"nullValue": None}
    if isinstance(value, bool):
        return {"booleanValue": value}
    if isinstance(value, str):
        return {"stringValue": value}
    if isinstance(value, (float, int)):
        return {"doubleValue": value}
    if isinstance(value, list):
        return {"arrayValue": {"values": [firestore_value(item) for item in value]}}
    if isinstance(value, dict):
        return {"mapValue": {"fields": {key: firestore_value(item) for key, item in value.items()}}}
    raise TypeError(type(value))


def firestore_document():
    config = load_firebase_config()
    endpoint = "https://firestore.googleapis.com/v1/projects/%s/databases/(default)/documents/tracker_state/admin-glanville" % config["projectId"]
    return endpoint, config["apiKey"]


def load_live():
    endpoint, key = firestore_document()
    with urlopen(endpoint + "?" + urlencode({"key": key}), timeout=30) as response:
        raw = json.load(response)
    from firestore_report_data import decode_firestore_document
    return decode_firestore_document(raw)


def save_reading(record, allow_update=False, replace_source=None):
    # Merge the entire readings array under a Firestore update-time precondition.
    # A concurrent app save causes a retry, never an overwrite of newer readings.
    endpoint, key = firestore_document()
    for attempt in range(3):
        live = load_live()
        readings = live.get("state", {}).get("homeHeatingOil", {}).get("readings", [])
        if not isinstance(readings, list):
            raise ValueError("Firebase tank readings are not a list")
        source_matches = []
        if replace_source:
            source_matches = [item for item in readings if item.get("date") == record["date"] and
                              ("gauge photo " + replace_source).lower() in str(item.get("note", "")).lower()]
            if source_matches:
                original = sorted(source_matches, key=lambda item: item.get("time", ""))[0]
                record = {**record, "id": original["id"], "time": original["time"]}
        existing_index = next((index for index, item in enumerate(readings) if item.get("id") == record["id"]), -1)
        if existing_index >= 0 and not allow_update:
            return "already saved"
        if any(item.get("date") == record["date"] and item.get("time") == record["time"] for item in readings):
            if existing_index < 0:
                raise ValueError("A reading already exists at %s %s; leaving it unchanged" % (record["date"], record["time"]))
        duplicate_ids = {item["id"] for item in source_matches if item.get("id") != record["id"]}
        merged = [item for item in readings if item.get("id") not in duplicate_ids]
        if existing_index >= 0:
            merged = [record if item.get("id") == record["id"] else item for item in merged]
        else:
            merged.append(record)
        saved_at = datetime.utcnow().isoformat(timespec="milliseconds") + "Z"
        params = [
            ("key", key),
            ("updateMask.fieldPaths", "state.homeHeatingOil.readings"),
            ("updateMask.fieldPaths", "state.lastSavedAt"),
            ("updateMask.fieldPaths", "updated_at"),
            ("currentDocument.updateTime", live["_update_time"]),
        ]
        fields = {
            "state": firestore_value({"homeHeatingOil": {"readings": merged}, "lastSavedAt": saved_at}),
            "updated_at": firestore_value(saved_at),
        }
        body = json.dumps({"fields": fields}).encode("utf-8")
        request = Request(endpoint + "?" + urlencode(params), data=body, method="PATCH", headers={"Content-Type": "application/json"})
        try:
            with urlopen(request, timeout=30):
                return "updated" if existing_index >= 0 else "saved"
        except HTTPError as error:
            if error.code in (409, 412) and attempt < 2:
                continue
            raise RuntimeError("Firebase rejected reading (HTTP %s): %s" % (error.code, error.read().decode("utf-8", "replace")[:350])) from error
    raise RuntimeError("Firebase changed during all save attempts")


def process_photo(path):
    stamp = photo_datetime(path)
    source = path.name
    record_id = "oil-photo-" + hashlib.sha256(path.read_bytes()).hexdigest()[:20]
    live = load_live()
    prior = live.get("state", {}).get("homeHeatingOil", {}).get("readings", [])
    if any(item.get("id") == record_id for item in prior):
        return "already saved"
    percent, explanation = read_gauge(path)
    record = {"id": record_id, "date": stamp.strftime("%Y-%m-%d"), "time": stamp.strftime("%H:%M"),
              "percent": percent, "note": "Gauge photo %s: %s" % (source, explanation)}
    result = save_reading(record)
    logging.info("%s: %s at %s%% (%s gal)", source, result, percent, round(CAPACITY_GALLONS * percent / 100))
    return result


def confirmed_photo(path, percent):
    if not 0 <= percent <= 100:
        raise ValueError("Level must be a percentage from 0 to 100")
    stamp = photo_datetime(path)
    record = {"id": "oil-photo-" + hashlib.sha256(path.read_bytes()).hexdigest()[:20],
              "date": stamp.strftime("%Y-%m-%d"), "time": stamp.strftime("%H:%M"),
              "percent": percent, "note": "Reviewed gauge photo %s: pointer between 1/4 and 3/8; approximately %s%%" % (path.name, percent)}
    result = save_reading(record, allow_update=True, replace_source=path.name)
    try:
        review = json.loads(REVIEW_FILE.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        review = {}
    review[path.name] = {"hash": hashlib.sha256(path.read_bytes()).hexdigest(), "status": "saved", "checkedAt": datetime.now().isoformat(timespec="seconds")}
    REVIEW_FILE.write_text(json.dumps(review, indent=2), encoding="utf-8")
    logging.info("%s: %s reviewed at %s%%", path.name, result, record["percent"])
    return result


def scan():
    PHOTO_DIR.mkdir(parents=True, exist_ok=True)
    try:
        review = json.loads(REVIEW_FILE.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        review = {}
    for path in sorted(PHOTO_DIR.iterdir()):
        if path.suffix.lower() not in EXTENSIONS or not path.is_file():
            continue
        try:
            # Avoid opening a file while another process is still copying it.
            before = (path.stat().st_size, path.stat().st_mtime_ns)
            fingerprint = hashlib.sha256(path.read_bytes()).hexdigest()
            if review.get(path.name, {}).get("hash") == fingerprint:
                continue
            time.sleep(2)
            if before != (path.stat().st_size, path.stat().st_mtime_ns) or before[0] == 0:
                continue
            result = process_photo(path)
            if result in ("saved", "already saved"):
                review[path.name] = {"hash": fingerprint, "status": "saved", "checkedAt": datetime.now().isoformat(timespec="seconds")}
        except Exception as error:
            logging.exception("Could not import %s: %s", path.name, error)
            if isinstance(error, ValueError):
                review[path.name] = {"hash": fingerprint, "reason": str(error), "checkedAt": datetime.now().isoformat(timespec="seconds")}
        finally:
            REVIEW_FILE.write_text(json.dumps(review, indent=2), encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--once", action="store_true")
    group.add_argument("--watch", action="store_true")
    group.add_argument("--confirm", nargs=2, metavar=("PHOTO", "PERCENT"))
    args = parser.parse_args()
    PHOTO_DIR.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(filename=str(LOG), level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    if not args.confirm and not os.environ.get("OPENAI_API_KEY"):
        raise SystemExit("OPENAI_API_KEY is required to read gauge photos")
    if args.confirm:
        target = (PHOTO_DIR / args.confirm[0]).resolve()
        if target.parent != PHOTO_DIR.resolve() or not target.is_file():
            raise SystemExit("Photo must be in the Tank Level folder")
        print(confirmed_photo(target, float(args.confirm[1])))
    elif args.once:
        scan()
    else:
        while True:
            scan()
            time.sleep(60)
