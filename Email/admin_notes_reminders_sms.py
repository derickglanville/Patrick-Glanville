"""Send Admin Notes reminders by early Gmail and, temporarily, due-day Verizon text."""

import argparse
import json
import os
import smtplib
import sys
from datetime import date, datetime, timedelta
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
EMAIL_RECIPIENT = os.environ.get("ADMIN_NOTES_REMINDER_EMAIL_TO", "dglanville@gmail.com").strip()
# Set ADMIN_NOTES_SMS_END_DATE earlier if Verizon stops delivering texts sooner.
SMS_END_DATE = date.fromisoformat(os.environ.get("ADMIN_NOTES_SMS_END_DATE", "2027-03-31"))
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


def open_dated_entries(entries: Iterable[Dict]) -> List[Dict]:
    result = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        if str(entry.get("status") or "Open").strip().lower() in {"done", "closed", "completed"}:
            continue
        try:
            due = date.fromisoformat(str(entry.get("dueDate") or "").strip())
        except ValueError:
            continue
        result.append((due, entry))
    return sorted(result, key=lambda pair: (pair[0], str(pair[1].get("title") or "").lower()))


def due_today_entries(entries: Iterable[Dict], today: date) -> List[Dict]:
    return [entry for due, entry in open_dated_entries(entries) if due == today]


def email_send_date(due: date) -> date:
    send_on = due - timedelta(days=1)
    while send_on.weekday() >= 5:
        send_on -= timedelta(days=1)
    return send_on


def due_email_entries(entries: Iterable[Dict], today: date) -> List[Dict]:
    # A missed weekday run catches up before the due date. Never send on weekends.
    if today.weekday() >= 5:
        return []
    return [entry for due, entry in open_dated_entries(entries)
            if email_send_date(due) <= today <= due]


def build_sms(entries: List[Dict], today: date) -> str:
    lines = [f"3G Notes reminder {today.strftime('%m/%d/%Y')}: {len(entries)} follow-up(s) due today."]
    for entry in entries:
        title = str(entry.get("title") or "Untitled note").strip()
        reminder = str(entry.get("reminder") or entry.get("objective") or "Open Notes & Reminders for details.").strip()
        lines.append(f"- {title}: {reminder}")
    return "\n".join(lines)[:1500]


def build_email(entries: List[Dict]) -> str:
    lines = [f"3G Notes & Reminders — {len(entries)} upcoming follow-up(s)", ""]
    for entry in entries:
        due = date.fromisoformat(str(entry["dueDate"]).strip())
        title = str(entry.get("title") or "Untitled note").strip()
        action = str(entry.get("reminder") or entry.get("objective") or "Review in Notes & Reminders.").strip()
        lines.extend([f"{title} — due {due.strftime('%A, %B %d, %Y')}",
                      f"Status: {str(entry.get('status') or 'Open').strip()}",
                      f"Next action: {action}", ""])
    lines.append("Scheduled one day before the due date; moved to Friday when the reminder day falls on a weekend.")
    return "\n".join(lines)


def send_mail(message_text: str, recipient: str, subject: str) -> None:
    sender_email, app_password = resolve_mail_credentials()
    if not app_password:
        raise RuntimeError("Gmail app password is not configured for reminder delivery.")
    message = MIMEText(message_text, "plain", "utf-8")
    message["From"] = sender_email
    message["To"] = recipient
    message["Subject"] = subject
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=30) as server:
        server.login(sender_email, app_password)
        server.sendmail(sender_email, [recipient], message.as_string())


def send_sms(message_text: str) -> None:
    send_mail(message_text, SMS_RECIPIENT, "3G Notes reminder")


def send_email(message_text: str) -> None:
    send_mail(message_text, EMAIL_RECIPIENT, "Upcoming 3G Notes & Reminders")


def load_entries(state_file: str = "") -> List[Dict]:
    if state_file:
        payload = json.loads(Path(state_file).read_text(encoding="utf-8"))
        state = payload.get("state", payload)
    else:
        payload = fetch_tracker_state("admin-glanville")
        state = payload.get("state") or {}
    return state.get("adminNotesReminders") or []


def reminder_key(channel: str, entry: Dict) -> str:
    return f"{channel}:{str(entry.get('dueDate') or '').strip()}:{entry.get('id') or entry.get('title') or 'untitled'}"


def run_once(today: date, dry_run: bool = False, state_file: str = "") -> int:
    entries = load_entries(state_file)
    checkpoint = load_checkpoint()
    failures = []
    pending_email = [entry for entry in due_email_entries(entries, today)
                     if not checkpoint.get(reminder_key("email", entry))]
    pending_sms = [entry for entry in due_today_entries(entries, today)
                   if not checkpoint.get(reminder_key("sms", entry))
                   and not checkpoint.get(f"{today.isoformat()}:{entry.get('id')}")]
    if pending_email:
        message = build_email(pending_email)
        print(message)
        if dry_run:
            print("Dry run: Gmail reminder was not sent.")
        else:
            try:
                send_email(message)
                for entry in pending_email:
                    checkpoint[reminder_key("email", entry)] = now_ny().isoformat()
                save_checkpoint(checkpoint)
                print(f"Gmail reminder sent to {EMAIL_RECIPIENT}.")
            except Exception as error:
                failures.append(f"Gmail reminder failed: {error}")
    else:
        print("No new early Gmail reminders are due today.")

    if today >= SMS_END_DATE:
        print(f"Verizon email-to-text is disabled from {SMS_END_DATE}; using Gmail only.")
    elif pending_sms:
        message = build_sms(pending_sms, today)
        print(message)
        if dry_run:
            print("Dry run: due-day text was not sent.")
        else:
            try:
                send_sms(message)
                for entry in pending_sms:
                    checkpoint[reminder_key("sms", entry)] = now_ny().isoformat()
                save_checkpoint(checkpoint)
                print(f"Due-day text submitted to {SMS_RECIPIENT}.")
            except Exception as error:
                failures.append(f"Due-day text failed: {error}")
    else:
        print("No new due-day text reminders are due today.")
    for failure in failures:
        print(failure, file=sys.stderr)
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Send early Gmail and due-day text reminders for Admin Notes & Reminders.")
    parser.add_argument("--dry-run", action="store_true", help="Show reminders without sending anything.")
    parser.add_argument("--date", help="Use YYYY-MM-DD for a deterministic local test.")
    parser.add_argument("--state-file", help="Read a JSON state file instead of Firebase; intended for local verification.")
    args = parser.parse_args()
    today = date.fromisoformat(args.date) if args.date else now_ny().date()
    return run_once(today, dry_run=args.dry_run, state_file=args.state_file or "")


if __name__ == "__main__":
    raise SystemExit(main())
