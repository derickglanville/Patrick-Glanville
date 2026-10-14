"""Daily low-oil text check using the Admin tracker in Firebase."""
import argparse
import json
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
RECIPIENT = "9146722393@vtext.com"


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
        level = float(reading["percent"]) * 2.7
    except (ValueError, TypeError, KeyError):
        return None
    if not (0 <= age <= 30 and 0 <= level <= 270):
        return None
    rates = seasonal_rates(data.get("deliveries", []))
    if not any(rates):
        return None
    deliveries = data.get("deliveries", [])
    day = start
    while day < today:
        day += timedelta(days=1)
        level = min(270, level + sum(float(r.get("gallons") or 0) for r in deliveries if r.get("date") == day.isoformat()))
        if day < today:
            level -= rates[day.month - 1]
    current = max(0, min(270, level))
    count = 0
    while level > 67.5 and count < 366:
        day += timedelta(days=1)
        level -= rates[day.month - 1]
        count += 1
    return {"gallons": current, "days": count, "refill_date": day.isoformat(), "reading_id": reading.get("id", reading["date"])}


def send_text(message):
    sender, password = resolve_mail_credentials()
    if not password:
        raise RuntimeError("Gmail app password is not configured")
    mail = MIMEText(message, "plain", "utf-8")
    mail["From"], mail["To"], mail["Subject"] = sender, RECIPIENT, "Heating oil refill reminder"
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(sender, password)
        server.sendmail(sender, [RECIPIENT], mail.as_string())


def run(today, dry_run=False, state_file=""):
    if state_file:
        payload = json.loads(Path(state_file).read_text(encoding="utf-8"))
    else:
        payload = fetch_tracker_state("admin-glanville")
    state = payload.get("state", payload)
    outlook = forecast(state.get("homeHeatingOil") or {}, today)
    if not outlook:
        print("No recent tank reading or usable history; no oil text sent.")
        return
    days = outlook["days"]
    window = "low" if days <= 0 else "14" if days <= 14 else "none"
    if window == "none":
        print(f"Oil above alert window: about {outlook['gallons']:.0f} gallons, {days} days to 25%.")
        return
    key = f"{outlook['reading_id']}:{window}"
    try:
        sent = json.loads(CHECKPOINT.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        sent = {}
    if sent.get(key):
        print("Oil alert already sent for this reading/window.")
        return
    message = f"3G Oil: ~{outlook['gallons']:.0f}/270 gal. 25% reserve ~{outlook['refill_date']}. Check gauge and order oil."
    print(message)
    if dry_run:
        print("Dry run: no text sent.")
        return
    send_text(message)
    sent[key] = datetime.now().isoformat()
    CHECKPOINT.write_text(json.dumps(sent, indent=2), encoding="utf-8")
    print("Oil reminder sent.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--date")
    parser.add_argument("--state-file")
    args = parser.parse_args()
    run(date.fromisoformat(args.date) if args.date else date.today(), args.dry_run, args.state_file or "")
