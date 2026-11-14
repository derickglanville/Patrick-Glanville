"""Daily 1/2, 1/4, and 1/8 tank alerts from the Admin Firebase tracker."""
import argparse
import json
import os
import smtplib
import sys
from datetime import date, datetime, timedelta
from email.mime.text import MIMEText
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "Scripts"))
from firestore_report_data import fetch_tracker_state  # noqa: E402
from send_daily_email import resolve_mail_credentials  # noqa: E402

CHECKPOINT = ROOT / "Email" / "home-heating-oil-sms-state.json"
CAPACITY = 275.0
SMS_RECIPIENT = "9146722393@vtext.com"
EMAIL_RECIPIENT = os.environ.get("HOME_OIL_EMAIL_TO", "dglanville@gmail.com").strip()
# The Verizon gateway is temporary. Set this earlier if it stops delivering sooner.
SMS_END_DATE = date.fromisoformat(os.environ.get("HOME_OIL_SMS_END_DATE", "2027-03-31"))
THRESHOLDS = ((12.5, "1/8"), (25.0, "1/4"), (50.0, "1/2"))


def seasonal_rates(rows):
    rows = sorted((r for r in rows if str(r.get("date", "")) >= "2022-01-01"), key=lambda r: r["date"])
    gallons, days = [0.0] * 12, [0] * 12
    for left, right in zip(rows, rows[1:]):
        try:
            start, end = date.fromisoformat(left["date"]), date.fromisoformat(right["date"])
            span, qty = (end - start).days, float(left.get("gallons") or 0)
        except (ValueError, TypeError):
            continue
        if not (14 <= span <= 220 and qty >= 40):
            continue
        daily = qty / span
        for offset in range(span):
            month = (start + timedelta(days=offset)).month - 1
            gallons[month] += daily
            days[month] += 1
    overall = sum(gallons) / sum(days) if sum(days) else 0
    return [g / d if d >= 14 else overall for g, d in zip(gallons, days)]


def forecast(data, today):
    readings = sorted((r for r in data.get("readings", []) if str(r.get("date", "")) <= today.isoformat()), key=lambda r: (r["date"], str(r.get("time") or "")), reverse=True)
    if not readings:
        return None
    reading = readings[0]
    try:
        start = date.fromisoformat(reading["date"])
        age = (today - start).days
        level = CAPACITY * float(reading["percent"]) / 100
    except (ValueError, TypeError, KeyError):
        return None
    if not (0 <= age <= 90 and 0 <= level <= CAPACITY):
        return None
    rates = seasonal_rates(data.get("deliveries", []))
    if not any(rates):
        return None
    deliveries = data.get("deliveries", [])
    day = start
    while day < today:
        day += timedelta(days=1)
        level = min(CAPACITY, level + sum(float(r.get("gallons") or 0) for r in deliveries if r.get("date") == day.isoformat()))
        if day < today:
            level -= rates[day.month - 1]
    current = max(0, min(CAPACITY, level))
    latest_delivery = max((str(item.get("date")) for item in deliveries if str(item.get("date", "")) <= today.isoformat()), default="none")
    return {"gallons": current, "percent": current / CAPACITY * 100, "cycle": latest_delivery, "reading_date": reading["date"], "age": age}


def reached_threshold(outlook):
    return next(((percent, label) for percent, label in THRESHOLDS if outlook["percent"] <= percent), None)


def send_message(recipient, subject, message):
    sender, password = resolve_mail_credentials()
    if not password:
        raise RuntimeError("Gmail app password is not configured")
    mail = MIMEText(message, "plain", "utf-8")
    mail["From"], mail["To"], mail["Subject"] = sender, recipient, subject
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=30) as server:
        server.login(sender, password)
        server.sendmail(sender, [recipient], mail.as_string())


def run(today, dry_run=False, state_file=""):
    if state_file:
        payload = json.loads(Path(state_file).read_text(encoding="utf-8"))
    else:
        payload = fetch_tracker_state("admin-glanville")
    state = payload.get("state", payload)
    outlook = forecast(state.get("homeHeatingOil") or {}, today)
    if not outlook:
        print("No tank reading within 90 days or usable history; no oil alert sent.")
        return
    threshold = reached_threshold(outlook)
    if not threshold:
        print(f"Oil above 1/2 tank: about {outlook['gallons']:.0f} of {CAPACITY:.0f} gallons.")
        return
    _, label = threshold
    key = f"{outlook['cycle']}:{label}"
    try:
        sent = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        sent = {}
    sent_entry = sent.get(key) if isinstance(sent.get(key), dict) else {}
    message = (f"Heating oil is estimated at {outlook['gallons']:.0f} of {CAPACITY:.0f} gallons "
               f"({outlook['percent']:.0f}%), at or below {label} tank. "
               f"Last gauge reading: {outlook['reading_date']} ({outlook['age']} days ago). "
               "Check the physical gauge before ordering oil.")
    print(message)
    channels = [("email", EMAIL_RECIPIENT)]
    if today <= SMS_END_DATE:
        channels.append(("text", SMS_RECIPIENT))
    for channel, recipient in channels:
        if not recipient or sent_entry.get(channel):
            continue
        if dry_run:
            print(f"Dry run: would send {channel} to {recipient}.")
            continue
        try:
            send_message(recipient, f"Heating oil at {label} tank", message)
        except Exception as exc:
            print(f"Could not send {channel}: {exc}", file=sys.stderr)
            continue
        sent_entry[channel] = datetime.now().isoformat()
        sent[key] = sent_entry
        CHECKPOINT.write_text(json.dumps(sent, indent=2), encoding="utf-8")
        print(f"Oil {channel} alert sent.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--date")
    parser.add_argument("--state-file")
    args = parser.parse_args()
    run(date.fromisoformat(args.date) if args.date else date.today(), args.dry_run, args.state_file or "")
