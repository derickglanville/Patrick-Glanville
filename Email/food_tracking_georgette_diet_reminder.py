"""Send the Saturday Food Tracking reminder for Georgette's modified diet."""

import argparse
import json
import smtplib
import sys
from datetime import date, datetime
from email.mime.text import MIMEText
from pathlib import Path

try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_FOLDER = PROJECT_ROOT / "Scripts"
CHECKPOINT_PATH = Path(__file__).resolve().parent / "food-tracking-georgette-diet-reminder-state.json"
EMAIL_RECIPIENT = "dglanville@gmail.com"
SMS_RECIPIENT = "9146722393@vtext.com"
NY_TZ = ZoneInfo("America/New_York") if ZoneInfo else datetime.now().astimezone().tzinfo

sys.path.insert(0, str(SCRIPTS_FOLDER))
from send_daily_email import resolve_mail_credentials  # noqa: E402


def now_ny():
    return datetime.now(NY_TZ)


def load_checkpoint():
    try:
        return json.loads(CHECKPOINT_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_checkpoint(checkpoint):
    CHECKPOINT_PATH.write_text(json.dumps(checkpoint, indent=2), encoding="utf-8")


def message_for(day):
    return (
        f"Saturday, {day.strftime('%B')} {day.day}: Georgette diet check. "
        "Record her weight and a short progress note for the modified diet in Gather Meal Journal."
    )


def send_message(recipient, subject, body):
    sender_email, app_password = resolve_mail_credentials()
    if not app_password:
        raise RuntimeError("Gmail app password is not configured for reminders.")
    message = MIMEText(body, "plain", "utf-8")
    message["From"] = sender_email
    message["To"] = recipient
    message["Subject"] = subject
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(sender_email, app_password)
        server.sendmail(sender_email, [recipient], message.as_string())


def run_once(day, dry_run=False):
    if day.weekday() != 5:
        print("Not Saturday. No Georgette diet reminder is due.")
        return 0
    checkpoint = load_checkpoint()
    key = day.isoformat()
    if checkpoint.get(key):
        print("Saturday reminder already sent for this date.")
        return 0
    body = message_for(day)
    print(body)
    if dry_run:
        print("Dry run: no email or text was sent.")
        return 0
    send_message(EMAIL_RECIPIENT, "Saturday Georgette diet check", body)
    send_message(SMS_RECIPIENT, "Georgette diet check", body)
    checkpoint[key] = now_ny().isoformat()
    save_checkpoint(checkpoint)
    print("Saturday email and text reminder sent.")
    return 0


def main():
    parser = argparse.ArgumentParser(description="Send the Saturday Georgette diet reminder.")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--date", help="Use YYYY-MM-DD for a deterministic local test.")
    args = parser.parse_args()
    day = date.fromisoformat(args.date) if args.date else now_ny().date()
    return run_once(day, args.dry_run)


if __name__ == "__main__":
    raise SystemExit(main())
