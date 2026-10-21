"""Send the Mom IDeerFit refill reminder one day before the two-week refill date."""

import argparse
import json
import smtplib
import sys
from datetime import date, datetime, timedelta
from email.mime.text import MIMEText
from pathlib import Path
from typing import Dict, Optional

try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None


PROJECT_ROOT = Path(__file__).resolve().parent.parent
EMAIL_FOLDER = PROJECT_ROOT / "Email"
SCRIPTS_FOLDER = PROJECT_ROOT / "Scripts"
CHECKPOINT_PATH = EMAIL_FOLDER / "mom-ideerfit-refill-reminder-state.json"
ADMIN_DOCUMENT_ID = "admin-glanville"
# Verizon's email-to-text gateway delivers a single, non-sensitive reminder to Derick.
SMS_RECIPIENT = "9146722393@vtext.com"
SMS_MESSAGE = "It is time to refill the IDeerFit refill tracker for mom."
NY_TZ = ZoneInfo("America/New_York") if ZoneInfo else datetime.now().astimezone().tzinfo

sys.path.insert(0, str(SCRIPTS_FOLDER))

from firestore_report_data import fetch_tracker_state  # noqa: E402
from send_daily_email import resolve_mail_credentials  # noqa: E402


def now_ny() -> datetime:
    return datetime.now(NY_TZ)


def parse_iso_date(value: object) -> Optional[date]:
    try:
        return datetime.strptime(str(value or "").strip(), "%Y-%m-%d").date()
    except ValueError:
        return None


def calculate_next_refill(last_refill: date, cadence_days: int, today: date) -> date:
    """Keep the two-week cadence moving forward even after a missed reminder."""
    next_refill = last_refill + timedelta(days=max(1, cadence_days))
    while next_refill < today:
        next_refill += timedelta(days=max(1, cadence_days))
    return next_refill


def load_plan() -> Dict:
    payload = fetch_tracker_state(ADMIN_DOCUMENT_ID)
    plan = (payload.get("state") or {}).get("momMedicationRefill")
    if not isinstance(plan, dict):
        raise RuntimeError("Mom's IDeerFit refill plan has not been saved in Admin yet.")
    return plan


def build_sms() -> str:
    """Return the approved one-line reminder without medication details."""
    return SMS_MESSAGE


def load_checkpoint() -> Dict:
    try:
        return json.loads(CHECKPOINT_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_checkpoint(checkpoint: Dict) -> None:
    CHECKPOINT_PATH.write_text(json.dumps(checkpoint, indent=2), encoding="utf-8")


def send_sms(message_text: str) -> None:
    sender_email, app_password = resolve_mail_credentials()
    if not app_password:
        raise RuntimeError("Gmail app password is not configured for the local reminder sender.")
    message = MIMEText(message_text, "plain", "utf-8")
    message["From"] = sender_email
    message["To"] = SMS_RECIPIENT
    message["Subject"] = "IDeerFit refill reminder"
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(sender_email, app_password)
        server.sendmail(sender_email, [SMS_RECIPIENT], message.as_string())


def run_once(send_now: bool = False, dry_run: bool = False) -> int:
    plan = load_plan()
    today = now_ny().date()
    last_refill = parse_iso_date(plan.get("lastRefillDate"))
    if not last_refill:
        raise RuntimeError("Mom's IDeerFit refill plan needs a valid last refill date.")
    next_refill = calculate_next_refill(last_refill, max(1, int(plan.get("frequencyDays") or 14)), today)
    reminder_date = next_refill - timedelta(days=1)
    if not send_now and today != reminder_date:
        print(f"No reminder due today. Next refill: {next_refill.isoformat()}; reminder date: {reminder_date.isoformat()}.")
        return 0
    checkpoint = load_checkpoint()
    refill_key = next_refill.isoformat()
    if not send_now and checkpoint.get("last_sent_for_refill_date") == refill_key:
        print(f"Reminder for {refill_key} was already sent. No duplicate text sent.")
        return 0
    message_text = build_sms()
    if dry_run:
        print(f"Dry run: text not sent. Would send to: {SMS_RECIPIENT}")
        print(message_text)
        return 0
    send_sms(message_text)
    checkpoint.update({"last_sent_for_refill_date": refill_key, "last_sent_at": now_ny().isoformat(), "last_message": message_text})
    save_checkpoint(checkpoint)
    print("Mom IDeerFit refill text sent to Derick.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Send Mom IDeerFit refill text one day before refill.")
    parser.add_argument("--send-now", action="store_true", help="Send the text now for testing, regardless of the date.")
    parser.add_argument("--dry-run", action="store_true", help="Show the text without sending it or changing the checkpoint.")
    args = parser.parse_args()
    return run_once(send_now=args.send_now, dry_run=args.dry_run)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Mom IDeerFit reminder failed: {error}", file=sys.stderr)
        raise SystemExit(1)
