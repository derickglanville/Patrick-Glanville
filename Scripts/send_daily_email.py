import argparse
import ast
import os
import smtplib
import time
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import date, datetime

try:
    import schedule
except ImportError:
    schedule = None

# ── Configuration ─────────────────────────────────────────────────────────────

EMAIL_FOLDER = r"C:\Software Developement\ChatGPT Codex\Patrick Glanville\Email"
ARCHIVE_FOLDER = r"C:\Software Developement\ChatGPT Codex\Patrick Glanville\Email\Archive"
LEGACY_CREDENTIAL_SCRIPT = r"C:\Software Developement\ChatGPT Codex\Patrick Glanville\Scripts\send_daily_email-2.py"

REPORT_DEFAULTS = {
    "change": {
        "folder": ARCHIVE_FOLDER,
        "filename_prefix": "patrick-change-report",
        "subject_prefix": "Patrick Change Report",
        "recipients": [
            "dglanville@gmail.com",
        ],
        "send_time": "08:00",
    },
    "urgency": {
        "folder": EMAIL_FOLDER,
        "filename_prefix": "patrick-urgency-report",
        "subject_prefix": "Patrick Glanville Urgency Report",
        "recipients": [
            "dglanville@gmail.com",
            "patrick.glanville@gmail.com",
        ],
        "send_time": "09:30",
    },
    "medication": {
        "folder": EMAIL_FOLDER,
        "filename_prefix": "patrick-medication-refill-alert",
        "subject_prefix": "Medication Refill Alert",
        "recipients": [
            "dglanville@gmail.com",
            "patrick.glanville@gmail.com",
            "courtney.glanville@gmail.com",
        ],
        "send_time": "10:00",
    },
}

# ── Core function ─────────────────────────────────────────────────────────────

def load_legacy_credentials():
    if not os.path.exists(LEGACY_CREDENTIAL_SCRIPT):
        return None, None

    try:
        with open(LEGACY_CREDENTIAL_SCRIPT, "r", encoding="utf-8") as handle:
            tree = ast.parse(handle.read(), filename=LEGACY_CREDENTIAL_SCRIPT)
    except Exception:
        return None, None

    sender_email = None
    app_password = None

    for node in tree.body:
        if not isinstance(node, ast.Assign) or len(node.targets) != 1:
            continue
        target = node.targets[0]
        if not isinstance(target, ast.Name):
            continue

        if target.id == "SENDER_EMAIL":
            sender_email = ast.literal_eval(node.value)
        elif target.id == "APP_PASSWORD":
            app_password = ast.literal_eval(node.value)

    return sender_email, app_password

def resolve_mail_credentials():
    sender_email = os.environ.get("PATRICK_REPORT_SENDER_EMAIL", "").strip()
    app_password = os.environ.get("PATRICK_REPORT_APP_PASSWORD", "").strip()

    if sender_email and app_password:
        return sender_email, app_password

    legacy_sender, legacy_password = load_legacy_credentials()
    if not sender_email:
        sender_email = (legacy_sender or "").strip()
    if not app_password:
        app_password = (legacy_password or "").strip()

    if not sender_email:
        sender_email = "dglanville@gmail.com"

    return sender_email, app_password

def resolve_report_path(report_kind, explicit_file=None):
    if explicit_file:
        return explicit_file

    config = REPORT_DEFAULTS[report_kind]
    today = date.today().strftime("%Y-%m-%d")
    filename = f"{config['filename_prefix']}-{today}.html"
    return os.path.join(config["folder"], filename)

def parse_recipients(explicit_recipients, report_kind):
    if explicit_recipients:
        return [item.strip() for item in explicit_recipients.split(",") if item.strip()]

    return list(REPORT_DEFAULTS[report_kind]["recipients"])

def send_daily_report(report_kind="change", explicit_file=None, explicit_recipients=None):
    sender_email, app_password = resolve_mail_credentials()

    if not app_password:
        print("Missing PATRICK_REPORT_APP_PASSWORD environment variable.")
        return False

    filepath = resolve_report_path(report_kind, explicit_file)
    filename = os.path.basename(filepath)
    recipients = parse_recipients(explicit_recipients, report_kind)
    subject_prefix = REPORT_DEFAULTS[report_kind]["subject_prefix"]

    if not os.path.exists(filepath):
        print(f"[{datetime.now()}] ERROR — File not found: {filepath}")
        return False

    with open(filepath, "r", encoding="utf-8") as f:
        html_content = f.read()

    # Build the email
    msg = MIMEMultipart("mixed")
    msg["From"]    = sender_email
    msg["To"]      = ", ".join(recipients)
    msg["Subject"] = f"{subject_prefix} - {datetime.now().strftime('%B %d, %Y')}"

    # Inline HTML body
    msg.attach(MIMEText(html_content, "html"))

    # HTML file as downloadable attachment
    with open(filepath, "rb") as attachment:
        part = MIMEBase("application", "octet-stream")
        part.set_payload(attachment.read())
    encoders.encode_base64(part)
    part.add_header("Content-Disposition", f'attachment; filename="{filename}"')
    msg.attach(part)

    # Send via Gmail SMTP
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender_email, app_password)
            server.sendmail(sender_email, recipients, msg.as_string())
        print(f"[{datetime.now()}] Email sent successfully to: {', '.join(recipients)}")
        return True
    except Exception as e:
        print(f"[{datetime.now()}] Failed to send email: {e}")
        return False


# ── Scheduler ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Send Patrick HTML report emails.")
    parser.add_argument("--file", dest="report_file", help="Explicit archived HTML report file to send.")
    parser.add_argument("--send-now", action="store_true", help="Send immediately once and exit.")
    parser.add_argument(
        "--report-kind",
        choices=sorted(REPORT_DEFAULTS.keys()),
        default="change",
        help="Which report type to send.",
    )
    parser.add_argument(
        "--to",
        dest="recipients",
        help="Comma-separated list of recipient emails. Defaults depend on report kind.",
    )
    args = parser.parse_args()

    if args.send_now or args.report_file:
        success = send_daily_report(args.report_kind, args.report_file, args.recipients)
        raise SystemExit(0 if success else 1)

    send_time = REPORT_DEFAULTS[args.report_kind]["send_time"]
    recipients = parse_recipients(args.recipients, args.report_kind)
    folder = REPORT_DEFAULTS[args.report_kind]["folder"]

    if schedule is None:
        raise SystemExit("Missing Python package 'schedule'. Install it or use --send-now mode.")

    print(f"Daily report scheduler started for '{args.report_kind}'. Will send at {send_time} every day.")
    print(f"   Folder : {folder}")
    print(f"   Recipients: {', '.join(recipients)}")
    print("   Press Ctrl+C to stop.\n")

    schedule.every().day.at(send_time).do(send_daily_report, args.report_kind, args.report_file, args.recipients)

    while True:
        schedule.run_pending()
        time.sleep(3600)
