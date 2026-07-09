import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


PROJECT_ROOT = Path(__file__).resolve().parent.parent
FIREBASE_CONFIG_PATH = PROJECT_ROOT / "firebase-config.js"


def load_firebase_config(config_path: Optional[Path] = None) -> Dict[str, str]:
    target = config_path or FIREBASE_CONFIG_PATH
    text = target.read_text(encoding="utf-8")

    keys = [
        "apiKey",
        "authDomain",
        "projectId",
        "storageBucket",
        "messagingSenderId",
        "appId",
    ]

    config: Dict[str, str] = {}
    for key in keys:
        match = re.search(rf"{key}\s*:\s*\"([^\"]+)\"", text)
        if match:
            config[key] = match.group(1)

    missing = [key for key in ("apiKey", "projectId") if not config.get(key)]
    if missing:
        raise RuntimeError(f"firebase-config.js is missing required keys: {', '.join(missing)}")

    return config


def _decode_firestore_value(value: Dict[str, Any]) -> Any:
    if "nullValue" in value:
        return None
    if "stringValue" in value:
        return value["stringValue"]
    if "booleanValue" in value:
        return bool(value["booleanValue"])
    if "integerValue" in value:
        return int(value["integerValue"])
    if "doubleValue" in value:
        return float(value["doubleValue"])
    if "timestampValue" in value:
        return value["timestampValue"]
    if "arrayValue" in value:
        return [_decode_firestore_value(item) for item in value.get("arrayValue", {}).get("values", [])]
    if "mapValue" in value:
        fields = value.get("mapValue", {}).get("fields", {})
        return {key: _decode_firestore_value(item) for key, item in fields.items()}
    if "geoPointValue" in value:
        return value["geoPointValue"]
    if "referenceValue" in value:
        return value["referenceValue"]
    if "bytesValue" in value:
        return value["bytesValue"]
    return value


def decode_firestore_document(document: Dict[str, Any]) -> Dict[str, Any]:
    fields = document.get("fields", {})
    payload = {key: _decode_firestore_value(value) for key, value in fields.items()}
    payload["_document_name"] = document.get("name", "")
    payload["_create_time"] = document.get("createTime", "")
    payload["_update_time"] = document.get("updateTime", "")
    return payload


def fetch_firestore_document(collection: str, document_id: str, config: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    settings = config or load_firebase_config()
    project_id = settings["projectId"]
    api_key = settings["apiKey"]
    url = (
        f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)"
        f"/documents/{collection}/{document_id}?key={api_key}"
    )
    request = Request(url, headers={"Accept": "application/json"})

    try:
        with urlopen(request, timeout=20) as response:
            raw = response.read().decode("utf-8")
    except HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Firestore document request failed with HTTP {error.code}: {body}") from error
    except URLError as error:
        raise RuntimeError(f"Firestore document request failed: {error}") from error

    document = json.loads(raw)
    if "fields" not in document:
        raise RuntimeError(f"Firestore document response did not contain fields: {document}")
    return decode_firestore_document(document)


def fetch_tracker_state(document_id: str) -> Dict[str, Any]:
    payload = fetch_firestore_document("tracker_state", document_id)
    state = payload.get("state")
    if not isinstance(state, dict):
        raise RuntimeError(f"tracker_state/{document_id} did not contain a valid state object")
    payload["state"] = state
    return payload


def parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    normalized = value.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        return None
