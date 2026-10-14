"""Send one daily Verizon SMS for open Admin Notes & Reminders due today."""

import argparse
import json
import smtplib
import sys
from datetime import date, datetime
from email.mime.text import MIMEText
from pathlib import Path
from typing import Dict, Iterable, List

try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None


PROJECT_ROOT = Path(__file__).resolve().parent.parent
EMAIL_FOLDER = PROJECT_ROOT / "Email"
SCRIPTS_FOLDER = PROJECT_ROOT / "Scripts"
CHECKPOINT_PATH = EMAIL_FOLDER / "admin-notes-reminders-sms-state.json"
SMS_RECIPIENT = "9146722393@vtext.com"
NY_TZ = ZoneInfo("America/New_York") if ZoneInfo else datetime.now().astimezone().tzinfo

sys.path.insert(0, str(SCRIPTS_FOLDER))
from firestore_report_data import fetch_tracker_state  # noqa: E402
from send_daily_email import resolve_mail_credentials  # noqa: E402


def now_ny() -> datetime:
    return datetime.now(NY_TZ)


def load_checkpoint() -> Dict:
    try:
        return json.loads(CHECKPOINT_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_checkpoint(checkpoint: Dict) -> None:
    CHECKPOINT_PATH.write_text(json.dumps(checkpoint, indent=2), encoding="utf-8")


def due_today_entries(entries: Iterable[Dict], today: date) -> List[Dict]:
    target_date = today.isoformat()
    return sorted(
        [entry for entry in entries if isinstance(entry, dict)
         and str(entry.get("dueDate") or "").strip() == target_date
         and str(entry.get("status") or "Open").strip().lower() not in {"done", "closed"}],
        key=lambda entry: str(entry.get("title") or "").lower(),
    )


def build_sms(entries: List[Dict], today: date) -> str:
    lines = [f"3G Notes reminder {today.strftime('%m/%d/%Y')}: {len(entries)} follow-up(s) due today."]
    for entry in entries:
        title = str(entry.get("title") or "Untitled note").strip()
        reminder = str(entry.get("reminder") or entry.get("objective") or "Open Notes & Reminders for details.").strip()
        lines.append(f"- {title}: {reminder}")
    return "\n".join(lines)[:1500]


def send_sms(message_text: str) -> None:
    sender_email, app_password = resolve_mail_credentials()
    if not app_password:
        raise RuntimeError("Gmail app password is not configured for SMS delivery.")
    message = MIMEText(message_text, "plain", "utf-8")
    message["From"] = sender_email
    message["To"] = SMS_RECIPIENT
    message["Subject"] = "3G Notes reminder"
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(sender_email, app_password)
        server.sendmail(sender_email, [SMS_RECIPIENT], message.as_string())


def load_entries(state_file: str = "") -> List[Dict]:
    if state_file:
        payload = json.loads(Path(state_file).read_text(encoding="utf-8"))
        state = payload.get("state", payload)
    else:
        payload = fetch_tracker_state("admin-glanville")
        state = payload.get("state") or {}
    return state.get("adminNotesReminders") or []


def run_once(today: date, dry_run: bool = False, state_file: str = "") -> int:
    entries = due_today_entries(load_entries(state_file), today)
    if not entries:
        print("No open Notes & Reminders are due today. No SMS sent.")
        return 0
    checkpoint = load_checkpoint()
    pending = [entry for entry in entries if not checkpoint.get(f"{today.isoformat()}:{entry.get('id')}")]
    if not pending:
        print("Today's Notes & Reminders SMS was already sent.")
        return 0
    message_text = build_sms(pending, today)
    print(message_text)
    if dry_run:
        print("Dry run: SMS was not sent.")
        return 0
    send_sms(message_text)
    for entry in pending:
        checkpoint[f"{today.isoformat()}:{entry.get('id')}"] = now_ny().isoformat()
    save_checkpoint(checkpoint)
    print(f"SMS sent to {SMS_RECIPIENT}.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Send Verizon SMS reminders for Admin Notes & Reminders due today.")
    parser.add_argument("--dry-run", action="store_true", help="Show due reminders without sending a text.")
    parser.add_argument("--date", help="Use YYYY-MM-DD for a deterministic local test.")
    parser.add_argument("--state-file", help="Read a JSON state file instead of Firebase; intended for local verification.")
    args = parser.parse_args()
    today = date.fromisoformat(args.date) if args.date else now_ny().date()
    return run_once(today, dry_run=args.dry_run, state_file=args.state_file or "")


if __name__ == "__main__":
    raise SystemExit(main())
