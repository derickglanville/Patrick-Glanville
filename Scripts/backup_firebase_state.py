"""Create a local, dated JSON archive of every tracker Firebase state."""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

from firestore_report_data import fetch_tracker_state


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_BACKUP_DIRECTORY = PROJECT_ROOT / "Backups" / "Firebase"
CLIENT_DOCUMENTS = {
    "patrick": "patrick-glanville",
    "theodore": "theodore-glanville",
    "admin": "admin-glanville",
}


def build_backup() -> Dict[str, Any]:
    clients: Dict[str, Any] = {}
    failures = []
    for client_id, document_id in CLIENT_DOCUMENTS.items():
        try:
            clients[client_id] = fetch_tracker_state(document_id)
        except Exception as error:  # Preserve the last good archive on any incomplete run.
            failures.append(f"{client_id}: {error}")
    if failures:
        raise RuntimeError("Firebase backup incomplete; existing local backups were preserved. " + " | ".join(failures))
    now = datetime.now(timezone.utc)
    return {
        "app": "3G Tracking and Notifications",
        "backupType": "daily-firebase-state-archive",
        "savedAt": now.isoformat().replace("+00:00", "Z"),
        "clients": clients,
    }


def write_json_atomically(path: Path, payload: Dict[str, Any]) -> None:
    temporary_path = path.with_suffix(path.suffix + ".tmp")
    temporary_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    os.replace(temporary_path, path)


def main() -> int:
    parser = argparse.ArgumentParser(description="Back up all tracker Firebase states to local JSON.")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_BACKUP_DIRECTORY)
    args = parser.parse_args()

    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    payload = build_backup()
    date_key = datetime.now().astimezone().strftime("%Y-%m-%d")
    dated_path = output_dir / f"tracker-firebase-backup-{date_key}.json"
    latest_path = output_dir / "tracker-firebase-backup-latest.json"
    write_json_atomically(dated_path, payload)
    write_json_atomically(latest_path, payload)
    print(f"Saved Firebase JSON backup: {dated_path}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Firebase JSON backup failed: {error}", file=sys.stderr)
        raise SystemExit(1)
