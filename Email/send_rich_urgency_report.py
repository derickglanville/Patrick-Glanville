import argparse
import base64
import json
import mimetypes
import smtplib
import subprocess
import sys
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

def load_settings(script_dir: Path) -> dict:
    settings_path = script_dir / "smtp-settings.json"
    if not settings_path.exists():
        raise FileNotFoundError(f"Missing SMTP settings file: {settings_path}")

    return json.loads(settings_path.read_text(encoding="utf-8-sig"))


def load_recipients(settings: dict) -> list[str]:
    recipients = settings.get("recipients") or [
        "dglanville@gmail.com",
        "patrick.glanville@gmail.com",
    ]
    cleaned = [str(recipient).strip() for recipient in recipients if str(recipient).strip()]
    if not cleaned:
        raise ValueError("No recipients were configured in smtp-settings.json")
    return cleaned


def load_credential(script_dir: Path) -> tuple[str, str]:
    credential_path = script_dir / "smtp-credential.clixml"
    if not credential_path.exists():
        raise FileNotFoundError(f"Missing SMTP credential file: {credential_path}")

    ps_script = (
        "$cred = Import-Clixml -LiteralPath '{path}'; "
        "[pscustomobject]@{{"
        "username = $cred.UserName; "
        "password = $cred.GetNetworkCredential().Password"
        "}} | ConvertTo-Json -Compress"
    ).format(path=str(credential_path).replace("'", "''"))
    encoded_script = base64.b64encode(ps_script.encode("utf-16le")).decode("ascii")

    result = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-EncodedCommand",
            encoded_script,
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        stderr = result.stderr.strip() or result.stdout.strip()
        raise RuntimeError(f"Failed to load SMTP credential from PowerShell: {stderr}")

    payload = json.loads(result.stdout.strip())
    return payload["username"], "".join(payload["password"].split()).strip()


def build_message(report_path: Path, settings: dict, sender: str, recipients: list[str]) -> MIMEMultipart:
    html_body = report_path.read_text(encoding="utf-8")
    subject = f"Patrick Glanville Urgency Report - {report_path.stem.replace('patrick-urgency-report-', '')}"

    message = MIMEMultipart()
    message["From"] = f"{settings.get('displayName', '').strip()} <{sender}>" if settings.get("displayName") else sender
    message["To"] = ", ".join(recipients)
    message["Subject"] = subject
    message.attach(MIMEText(html_body, "html", "utf-8"))

    mime_type, _ = mimetypes.guess_type(report_path.name)
    if mime_type:
        maintype, subtype = mime_type.split("/", 1)
    else:
        maintype, subtype = "application", "octet-stream"

    with report_path.open("rb") as handle:
        attachment = MIMEBase(maintype, subtype)
        attachment.set_payload(handle.read())

    encoders.encode_base64(attachment)
    attachment.add_header("Content-Disposition", f'attachment; filename="{report_path.name}"')
    message.attach(attachment)
    return message


def smtp_attempts(settings: dict) -> list[dict]:
    host = settings["smtpHost"]
    configured_port = int(settings.get("port", 587))
    configured_ssl = bool(settings.get("useSsl", False))

    attempts = [
        {
            "host": host,
            "port": configured_port,
            "use_ssl": configured_ssl,
            "starttls": configured_port == 587,
            "label": "configured settings",
        }
    ]

    if host == "smtp.gmail.com":
        attempts.append(
            {
                "host": host,
                "port": 587,
                "use_ssl": False,
                "starttls": True,
                "label": "gmail starttls fallback",
            }
        )
        attempts.append(
            {
                "host": host,
                "port": 465,
                "use_ssl": True,
                "starttls": False,
                "label": "gmail ssl fallback",
            }
        )

    seen = set()
    unique_attempts = []
    for attempt in attempts:
        key = (attempt["host"], attempt["port"], attempt["use_ssl"], attempt["starttls"])
        if key not in seen:
            seen.add(key)
            unique_attempts.append(attempt)
    return unique_attempts


def send_message(message: MIMEMultipart, settings: dict, username: str, password: str, recipients: list[str]) -> None:
    errors: list[str] = []

    for attempt in smtp_attempts(settings):
        try:
            if attempt["use_ssl"]:
                server = smtplib.SMTP_SSL(attempt["host"], attempt["port"], timeout=30)
            else:
                server = smtplib.SMTP(attempt["host"], attempt["port"], timeout=30)

            try:
                server.ehlo()
                if attempt["starttls"]:
                    server.starttls()
                    server.ehlo()
                server.login(username, password)
                server.sendmail(username, recipients, message.as_string())
                print(
                    f"Sent rich urgency report by Python SMTP to: {', '.join(recipients)} "
                    f"using {attempt['label']} ({attempt['host']}:{attempt['port']})"
                )
                return
            finally:
                server.quit()
        except Exception as exc:
            errors.append(f"{attempt['label']} ({attempt['host']}:{attempt['port']}): {exc}")

    raise RuntimeError("Python SMTP send failed. " + " | ".join(errors))


def find_latest_report(script_dir: Path) -> Path:
    reports = sorted(
        script_dir.glob("patrick-urgency-report-*.html"),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    if not reports:
        raise FileNotFoundError(f"No rich HTML report found in {script_dir}")
    return reports[0]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Send the latest Patrick urgency report via Python SMTP.")
    parser.add_argument("--report-path", type=Path, help="Specific report HTML file to send.")
    parser.add_argument(
        "--print-only",
        action="store_true",
        help="Build and validate the message without attempting SMTP send.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    script_dir = Path(__file__).resolve().parent
    report_path = args.report_path.resolve() if args.report_path else find_latest_report(script_dir)

    if not report_path.exists():
        raise FileNotFoundError(f"Report file not found: {report_path}")

    settings = load_settings(script_dir)
    recipients = load_recipients(settings)
    username, password = load_credential(script_dir)
    message = build_message(report_path, settings, settings.get("from") or username, recipients)

    if args.print_only:
        print(f"Prepared message for {len(recipients)} recipient(s) with attachment: {report_path}")
        print(f"SMTP host: {settings['smtpHost']} | configured port: {settings.get('port', 587)}")
        return 0

    send_message(message, settings, username, password, recipients)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        raise
