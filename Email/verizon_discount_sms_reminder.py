"""Send local SMS reminders for Verizon loyalty and paper-free billing discounts."""

import argparse
import json
import smtplib
import sys
from datetime import date, datetime
from email.mime.text import MIMEText
from pathlib import Path
from typing import Dict, List

try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None


PROJECT_ROOT = Path(__file__).resolve().parent.parent
EMAIL_FOLDER = PROJECT_ROOT / "Email"
SCRIPTS_FOLDER = PROJECT_ROOT / "Scripts"
CHECKPOINT_PATH = EMAIL_FOLDER / "verizon-discount-sms-state.json"
SMS_RECIPIENT = "9146722393@vtext.com"
LOYALTY_EXPIRATION = date(2027, 4, 12)
LOYALTY_REMINDER_DAYS = (30, 14, 7, 1)
PAPER_FREE_CHECK_DAY = 1
NY_TZ = ZoneInfo("America/New_York") if ZoneInfo else datetime.now().astimezone().tzinfo

sys.path.insert(0, str(SCRIPTS_FOLDER))
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


def reminder_messages(today: date) -> List[str]:
    messages: List[str] = []
    days_remaining = (LOYALTY_EXPIRATION - today).days
    if days_remaining in LOYALTY_REMINDER_DAYS:
        suffix = "day" if days_remaining == 1 else "days"
        expiration_label = f"{LOYALTY_EXPIRATION.strftime('%b')} {LOYALTY_EXPIRATION.day}, {LOYALTY_EXPIRATION.year}"
        messages.append(f"Verizon reminder: the $52 loyalty credit expires in {days_remaining} {suffix} ({expiration_label}). Contact Verizon to renew or replace it.")
    if today.day == PAPER_FREE_CHECK_DAY:
        messages.append("Verizon reminder: confirm the $10-per-eligible-line paper-free billing and Auto Pay discount is on this month's bill.")
    return messages


def send_sms(message_text: str) -> None:
    sender_email, app_password = resolve_mail_credentials()
    if not app_password:
        raise RuntimeError("Gmail app password is not configured for SMS delivery.")
    message = MIMEText(message_text, "plain", "utf-8")
    message["From"] = sender_email
    message["To"] = SMS_RECIPIENT
    message["Subject"] = "Verizon discount reminder"
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(sender_email, app_password)
        server.sendmail(sender_email, [SMS_RECIPIENT], message.as_string())


def run_once(today: date, dry_run: bool = False) -> int:
    checkpoint = load_checkpoint()
    for message_text in reminder_messages(today):
        reminder_key = f"{today.isoformat()}:{message_text}"
        if checkpoint.get(reminder_key):
            continue
        print(message_text)
        if dry_run:
            continue
        send_sms(message_text)
        checkpoint[reminder_key] = now_ny().isoformat()
    if not dry_run:
        save_checkpoint(checkpoint)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Send Verizon discount reminder texts when due.")
    parser.add_argument("--dry-run", action="store_true", help="Show due reminders without sending a text.")
    parser.add_argument("--date", help="Use YYYY-MM-DD for a deterministic local test.")
    args = parser.parse_args()
    today = date.fromisoformat(args.date) if args.date else now_ny().date()
    return run_once(today, dry_run=args.dry_run)


if __name__ == "__main__":
    raise SystemExit(main())
