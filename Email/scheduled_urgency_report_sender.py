import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path


EMAIL_FOLDER = Path(r"C:\Software Developement\ChatGPT Codex\Patrick Glanville\Email")
INVOKE_SCRIPT = EMAIL_FOLDER / "Invoke-DailyUrgencyReport.ps1"
SEND_SCRIPT = Path(r"C:\Software Developement\ChatGPT Codex\Patrick Glanville\Scripts\send_daily_email.py")
SEND_TIME = "09:30"


def generate_latest_report() -> Path:
    result = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(INVOKE_SCRIPT),
            "-GenerateOnly",
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        stderr = (result.stderr or "").strip()
        stdout = (result.stdout or "").strip()
        raise RuntimeError(stderr or stdout or "Urgency report generation failed.")

    reports = sorted(EMAIL_FOLDER.glob("patrick-urgency-report-*.html"), key=lambda path: path.stat().st_mtime, reverse=True)
    if not reports:
        raise FileNotFoundError(f"No urgency report HTML file found in {EMAIL_FOLDER}")
    return reports[0]


def run_daily_send() -> None:
    report_path = generate_latest_report()
    result = subprocess.run(
        [
            sys.executable,
            str(SEND_SCRIPT),
            "--send-now",
            "--report-kind",
            "urgency",
            "--file",
            str(report_path),
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        stderr = (result.stderr or "").strip()
        stdout = (result.stdout or "").strip()
        raise RuntimeError(stderr or stdout or "Urgency email sender failed.")

    if result.stdout:
        print(result.stdout.strip())
    print(f"[{datetime.now()}] Sent Patrick urgency report: {report_path.name}")


def sleep_until_next_minute() -> None:
    now = time.time()
    time.sleep(max(1.0, 60 - (now % 60)))


def main() -> int:
    if not SEND_SCRIPT.exists():
        raise FileNotFoundError(f"Missing shared email sender script: {SEND_SCRIPT}")

    target_hour, target_minute = (int(part) for part in SEND_TIME.split(":", 1))
    last_sent_date = None

    print(f"Patrick urgency email scheduler started. Daily send time: {SEND_TIME}")
    print(f"Using shared sender script: {SEND_SCRIPT}")
    print(f"Email folder: {EMAIL_FOLDER}")
    print("Recipients: dglanville@gmail.com, patrick.glanville@gmail.com")
    print("Press Ctrl+C to stop.")

    while True:
        current = datetime.now()
        if (
            current.hour == target_hour
            and current.minute == target_minute
            and last_sent_date != current.date()
        ):
            try:
                run_daily_send()
                last_sent_date = current.date()
            except Exception as exc:
                print(f"[{datetime.now()}] Failed to send Patrick urgency report: {exc}", file=sys.stderr)
                last_sent_date = current.date()
        sleep_until_next_minute()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\nScheduler stopped by user.")
        raise SystemExit(0)
