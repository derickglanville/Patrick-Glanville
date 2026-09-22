"""Email Derick when the Patrick Firestore document receives new changes.

The notifier deliberately watches only the Patrick client document.  It starts by
recording a checkpoint, so enabling it never re-sends older tracker history.
"""

import argparse
import hashlib
import html
import json
import smtplib
import sys
import time
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None


PROJECT_ROOT = Path(__file__).resolve().parent.parent
EMAIL_FOLDER = PROJECT_ROOT / "Email"
POLICY_PATH = EMAIL_FOLDER / "email-automation.json"
CHECKPOINT_PATH = EMAIL_FOLDER / "patrick-account-change-notifier-state.json"
PATRICK_DOCUMENT_ID = "patrick-glanville"
DERICK_EMAIL = "dglanville@gmail.com"
NY_TZ = ZoneInfo("America/New_York") if ZoneInfo else datetime.now().astimezone().tzinfo

sys.path.insert(0, str(PROJECT_ROOT / "Scripts"))

from firestore_report_data import fetch_tracker_state, parse_iso_datetime  # noqa: E402
from send_daily_email import resolve_mail_credentials  # noqa: E402


def load_policy() -> Dict[str, Any]:
    default = {
        "legacyAutomaticEmailsEnabled": False,
        "patrickAccountChangeNotifier": {"enabled": True, "recipient": DERICK_EMAIL, "pollSeconds": 60},
    }
    try:
        configured = json.loads(POLICY_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return default
    notifier = configured.get("patrickAccountChangeNotifier") or {}
    default["legacyAutomaticEmailsEnabled"] = bool(configured.get("legacyAutomaticEmailsEnabled", False))
    default["patrickAccountChangeNotifier"].update(notifier)
    return default


def read_checkpoint() -> Dict[str, str]:
    try:
        return json.loads(CHECKPOINT_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def write_checkpoint(document_update_time: str, newest_history_at: str, state_hash: str) -> None:
    payload = {
        "documentUpdateTime": document_update_time,
        "newestHistoryAt": newest_history_at,
        "stateHash": state_hash,
        "savedAt": datetime.now(NY_TZ).isoformat(),
    }
    CHECKPOINT_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def state_digest(state: Dict[str, Any]) -> str:
    encoded = json.dumps(state, sort_keys=True, separators=(",", ":"), default=str).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def history_entries(state: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [entry for entry in state.get("history") or [] if isinstance(entry, dict)]


def newest_history_timestamp(entries: Iterable[Dict[str, Any]]) -> str:
    values = [str(entry.get("createdAt") or "") for entry in entries]
    return max(values, default="")


def new_history_entries(entries: Iterable[Dict[str, Any]], after: str) -> List[Dict[str, Any]]:
    return sorted(
        [entry for entry in entries if str(entry.get("createdAt") or "") > after],
        key=lambda entry: str(entry.get("createdAt") or ""),
    )


def format_timestamp(value: str) -> str:
    parsed = parse_iso_datetime(value)
    if parsed is None:
        return value or "Unknown time"
    return parsed.astimezone(NY_TZ).strftime("%b %d, %Y, %I:%M %p").replace(" 0", " ")


def event_type(entry: Dict[str, Any]) -> str:
    raw = str(entry.get("itemType") or "change").lower()
    labels = {
        "task": "Task",
        "bill": "Monthly bill",
        "lifeadmin": "To-do item",
        "runningnote": "Running note",
        "document": "Document",
    }
    return labels.get(raw, raw.replace("_", " ").title())


def build_email(entries: List[Dict[str, Any]], document_updated: str) -> Tuple[str, str]:
    rows = []
    for entry in entries:
        title = html.escape(str(entry.get("taskTitle") or "Patrick account update"))
        summary = html.escape(str(entry.get("summary") or "Details updated."))
        actor = html.escape(str(entry.get("userName") or entry.get("userEmail") or "Unknown user"))
        rows.append(
            "<li style='margin:0 0 14px;'>"
            f"<strong>{title}</strong><br>"
            f"<span style='color:#516070;'>{event_type(entry)} | {actor} | {format_timestamp(str(entry.get('createdAt') or ''))}</span><br>"
            f"<span>{summary}</span>"
            "</li>"
        )

    if not rows:
        rows.append("<li>Patrick's account was updated, but no new history entry was supplied.</li>")

    subject = f"Patrick account update: {len(entries) or 1} change{'s' if len(entries) != 1 else ''}"
    body = f"""<!doctype html>
<html lang='en'><body style='margin:0;background:#f3f6fa;color:#16202b;font-family:Arial,Helvetica,sans-serif;'>
  <main style='max-width:760px;margin:0 auto;background:#fff;'>
    <header style='padding:24px 28px;background:#153654;color:#fff;'>
      <h1 style='margin:0;font-size:24px;'>Patrick Account Changes</h1>
      <p style='margin:8px 0 0;color:#dce8f4;'>Firestore notification for Derick</p>
    </header>
    <section style='padding:24px 28px;'>
      <p><strong>{len(entries) or 1}</strong> new account change{'s' if len(entries) != 1 else ''} detected.</p>
      <ol style='padding-left:22px;'>{''.join(rows)}</ol>
    </section>
    <footer style='padding:16px 28px;border-top:1px solid #d8e0e8;color:#5d6a78;font-size:12px;'>
      Firestore document updated: {html.escape(format_timestamp(document_updated))}
    </footer>
  </main>
</body></html>"""
    return subject, body


def send_email(subject: str, body: str, recipient: str) -> None:
    sender_email, app_password = resolve_mail_credentials()
    if not app_password:
        raise RuntimeError("Gmail app password is not configured for the local sender.")
    message = MIMEMultipart("alternative")
    message["From"] = sender_email
    message["To"] = recipient
    message["Subject"] = subject
    message.attach(MIMEText(body, "html", "utf-8"))
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(sender_email, app_password)
        server.sendmail(sender_email, [recipient], message.as_string())


def check_once(send: bool = True) -> str:
    policy = load_policy()
    notifier = policy["patrickAccountChangeNotifier"]
    if not notifier.get("enabled", True):
        return "Patrick account change notifier is disabled by policy."

    payload = fetch_tracker_state(PATRICK_DOCUMENT_ID)
    state = payload.get("state") or {}
    entries = history_entries(state)
    latest_history = newest_history_timestamp(entries)
    document_updated = str(payload.get("_update_time") or state.get("updatedAt") or "")
    digest = state_digest(state)
    checkpoint = read_checkpoint()

    if not checkpoint:
        write_checkpoint(document_updated, latest_history, digest)
        return "Notifier checkpoint created. Existing Patrick history will not be emailed."

    new_entries = new_history_entries(entries, str(checkpoint.get("newestHistoryAt") or ""))
    if not new_entries:
        # Routine saves can update the Firestore document without creating an
        # account-history entry. Record the new baseline but do not email it.
        write_checkpoint(document_updated, latest_history, digest)
        return "Patrick document changed without new history; checkpoint updated without email."

    subject, body = build_email(new_entries, document_updated)
    if send:
        send_email(subject, body, str(notifier.get("recipient") or DERICK_EMAIL))
    write_checkpoint(document_updated, latest_history, digest)
    return f"{'Sent' if send else 'Detected'} Patrick account update ({len(new_entries) or 1} change(s))."


def main() -> int:
    parser = argparse.ArgumentParser(description="Notify Derick about Patrick Firestore account changes.")
    parser.add_argument("--once", action="store_true", help="Check once and exit.")
    parser.add_argument("--no-send", action="store_true", help="Check and update the checkpoint without sending email.")
    parser.add_argument("--poll-seconds", type=int, default=0, help="Override the policy polling interval.")
    args = parser.parse_args()

    interval = max(15, args.poll_seconds or int(load_policy()["patrickAccountChangeNotifier"].get("pollSeconds") or 60))
    if args.once:
        print(check_once(send=not args.no_send))
        return 0

    print(f"Patrick Firestore account notifier started. Polling every {interval} seconds.")
    while True:
        try:
            print(check_once(send=not args.no_send))
        except Exception as error:
            print(f"Notifier check failed: {error}", file=sys.stderr)
        time.sleep(interval)


if __name__ == "__main__":
    raise SystemExit(main())
