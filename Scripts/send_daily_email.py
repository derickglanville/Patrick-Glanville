import argparse
import os
import smtplib
import time
import schedule
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import date, datetime

# ── Configuration ─────────────────────────────────────────────────────────────

SENDER_EMAIL = os.environ.get("PATRICK_REPORT_SENDER_EMAIL", "dglanville@gmail.com")
APP_PASSWORD = os.environ.get("PATRICK_REPORT_APP_PASSWORD", "").strip()

ARCHIVE_FOLDER = r"C:\Software Developement\ChatGPT Codex\Patrick Glanville\Email\Archive"

# ── Recipients (comment/uncomment as needed) ──────────────────────────────────

RECIPIENTS = [
    "dglanville@gmail.com",           # Active
    # "patrick.glanville@gmail.com",
    # "courtney.glanville@gmail.com",
    # "hemmgeor@gmail.com",
]

# ── Core function ─────────────────────────────────────────────────────────────

def resolve_report_path(explicit_file=None):
    if explicit_file:
        return explicit_file

    today    = date.today().strftime("%Y-%m-%d")
    filename = f"patrick-change-report-{today}.html"
    return os.path.join(ARCHIVE_FOLDER, filename)

def send_daily_report(explicit_file=None):
    if not APP_PASSWORD:
        print("Missing PATRICK_REPORT_APP_PASSWORD environment variable.")
        return

    filepath = resolve_report_path(explicit_file)
    filename = os.path.basename(filepath)

    if not os.path.exists(filepath):
        print(f"[{datetime.now()}] ERROR — File not found: {filepath}")
        return

    with open(filepath, "r", encoding="utf-8") as f:
        html_content = f.read()

    # Build the email
    msg = MIMEMultipart("mixed")
    msg["From"]    = SENDER_EMAIL
    msg["To"]      = ", ".join(RECIPIENTS)
    msg["Subject"] = f"Patrick Change Report – {datetime.now().strftime('%B %d, %Y')}"

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
            server.login(SENDER_EMAIL, APP_PASSWORD)
            server.sendmail(SENDER_EMAIL, RECIPIENTS, msg.as_string())
        print(f"[{datetime.now()}] Email sent successfully to: {', '.join(RECIPIENTS)}")
    except Exception as e:
        print(f"[{datetime.now()}] Failed to send email: {e}")


# ── Scheduler ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Send the archived Patrick change report email.")
    parser.add_argument("--file", dest="report_file", help="Explicit archived HTML report file to send.")
    parser.add_argument("--send-now", action="store_true", help="Send immediately once and exit.")
    args = parser.parse_args()

    if args.send_now or args.report_file:
        send_daily_report(args.report_file)
        raise SystemExit(0)

    SEND_TIME = "08:00"

    print(f"Daily report scheduler started. Will send at {SEND_TIME} every day.")
    print(f"   Archive : {ARCHIVE_FOLDER}")
    print(f"   Recipients: {', '.join(RECIPIENTS)}")
    print("   Press Ctrl+C to stop.\n")

    # Run once immediately on startup (comment out if not wanted)
    send_daily_report()

    schedule.every().day.at(SEND_TIME).do(send_daily_report)

    while True:
        schedule.run_pending()
        time.sleep(3600)
