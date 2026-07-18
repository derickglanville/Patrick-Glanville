import argparse
import html
import json
import smtplib
import sys
import time
from dataclasses import dataclass
from datetime import date, datetime, time as dt_time, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None


PROJECT_ROOT = Path(__file__).resolve().parent.parent
EMAIL_FOLDER = PROJECT_ROOT / "Email"
SCRIPTS_FOLDER = PROJECT_ROOT / "Scripts"
CHECKPOINT_PATH = EMAIL_FOLDER / "bill-due-alert-state.json"
HTML_OUTPUT_PATH = EMAIL_FOLDER / "bill-due-alert-latest.html"
DEFAULT_SEND_TIME = "09:00"
RECIPIENTS = ["dglanville@gmail.com"]
PAID_STATUSES = {"paid", "fully paid", "deferred", "n/a"}

NY_TZ = ZoneInfo("America/New_York") if ZoneInfo else datetime.now().astimezone().tzinfo

sys.path.insert(0, str(SCRIPTS_FOLDER))

from firestore_report_data import fetch_tracker_state  # noqa: E402
from send_daily_email import resolve_mail_credentials  # noqa: E402


CLIENTS = [
    {"id": "patrick", "doc_id": "patrick-glanville", "label": "Patrick Glanville"},
    {"id": "theodore", "doc_id": "theodore-glanville", "label": "Derick Glanville"},
    {"id": "admin", "doc_id": "admin-glanville", "label": "Admin"},
]


@dataclass
class BillAlert:
    client_id: str
    client_label: str
    month_key: str
    bill_id: str
    bill_name: str
    amount: float
    due_date: date
    status: str
    notes: str

    @property
    def alert_key(self) -> str:
        return f"{self.client_id}|{self.month_key}|{self.bill_id}|{self.due_date.isoformat()}"


def now_ny() -> datetime:
    return datetime.now(NY_TZ)


def parse_date(value: str) -> Optional[date]:
    text = str(value or "").strip()
    if not text:
        return None
    for fmt in ("%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def normalize_money(value) -> float:
    try:
        text = str(value).replace("$", "").replace(",", "").strip()
        if not text:
            return 0.0
        return round(float(text), 2)
    except (TypeError, ValueError):
        return 0.0


def format_currency(value: float) -> str:
    return f"${value:,.2f}"


def build_bill_identity(month_key: str, bill: Dict) -> str:
    template_key = str(bill.get("templateKey") or "").strip().lower()
    name = str(bill.get("name") or "").strip().lower()
    bill_id = str(bill.get("id") or "").strip().lower()
    identity = template_key or name or bill_id or "unnamed-bill"
    return f"{month_key}|{identity}"


def populated_score(bill: Dict) -> int:
    keys = [
        "name",
        "apr",
        "previousBalance",
        "currentBalance",
        "creditLimit",
        "amount",
        "paidAmount",
        "transactionNumber",
        "due",
        "paidDate",
        "status",
        "notes",
    ]
    score = 0
    for key in keys:
        value = bill.get(key)
        if value in (None, "", 0, 0.0, "0", "0.0", "0.00"):
            continue
        score += 1
    return score


def dedupe_bills(month_key: str, bills: Iterable[Dict]) -> List[Dict]:
    winners: Dict[str, Dict] = {}
    for bill in bills:
        if not isinstance(bill, dict):
            continue
        identity = build_bill_identity(month_key, bill)
        current = winners.get(identity)
        if current is None or populated_score(bill) >= populated_score(current):
            winners[identity] = bill
    return list(winners.values())


def iter_monthly_bills(state: Dict) -> Iterable[Tuple[str, Dict]]:
    monthly_budgets = state.get("monthlyBudgets") or {}
    yielded_months = set()
    for month_key, month_entry in monthly_budgets.items():
        month_bills = dedupe_bills(month_key, (month_entry or {}).get("bills") or [])
        for bill in month_bills:
            yield month_key, bill
        yielded_months.add(month_key)

    current_month = str(state.get("billMonth") or "").strip()
    if current_month and current_month not in yielded_months:
        for bill in dedupe_bills(current_month, state.get("bills") or []):
            yield current_month, bill


def is_unpaid_status(status: str) -> bool:
    normalized = str(status or "").strip().lower()
    if not normalized:
        return True
    return normalized not in PAID_STATUSES


def collect_due_tomorrow_alerts() -> List[BillAlert]:
    alerts: List[BillAlert] = []
    today = now_ny().date()
    target_date = today + timedelta(days=1)

    for client in CLIENTS:
        payload = fetch_tracker_state(client["doc_id"])
        state = payload.get("state") or {}
        for month_key, bill in iter_monthly_bills(state):
            due = parse_date(bill.get("due"))
            if due != target_date:
                continue
            status = str(bill.get("status") or "").strip()
            if not is_unpaid_status(status):
                continue
            alerts.append(
                BillAlert(
                    client_id=client["id"],
                    client_label=client["label"],
                    month_key=month_key,
                    bill_id=str(bill.get("id") or build_bill_identity(month_key, bill)),
                    bill_name=str(bill.get("name") or "Untitled bill"),
                    amount=normalize_money(bill.get("amount")),
                    due_date=due,
                    status=status or "Unpaid",
                    notes=str(bill.get("notes") or "").strip(),
                )
            )
    alerts.sort(key=lambda item: (item.due_date.isoformat(), item.client_label.lower(), item.bill_name.lower()))
    return alerts


def load_checkpoint() -> Dict:
    if not CHECKPOINT_PATH.exists():
        return {"sent_alerts": {}, "last_run_at": ""}
    try:
        return json.loads(CHECKPOINT_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {"sent_alerts": {}, "last_run_at": ""}


def save_checkpoint(checkpoint: Dict) -> None:
    checkpoint["last_run_at"] = now_ny().isoformat()
    CHECKPOINT_PATH.write_text(json.dumps(checkpoint, indent=2), encoding="utf-8")


def purge_old_sent_alerts(checkpoint: Dict) -> None:
    today_iso = now_ny().date().isoformat()
    sent_alerts = checkpoint.setdefault("sent_alerts", {})
    stale_keys = [key for key in sent_alerts if not str(key).startswith(today_iso)]
    for key in stale_keys:
        sent_alerts.pop(key, None)


def filter_unsent_alerts(alerts: List[BillAlert], checkpoint: Dict) -> List[BillAlert]:
    today_iso = now_ny().date().isoformat()
    sent_alerts = checkpoint.setdefault("sent_alerts", {})
    unsent = []
    for alert in alerts:
        sent_key = f"{today_iso}|{alert.alert_key}"
        if sent_alerts.get(sent_key):
            continue
        unsent.append(alert)
    return unsent


def mark_alerts_sent(alerts: List[BillAlert], checkpoint: Dict) -> None:
    today_iso = now_ny().date().isoformat()
    sent_alerts = checkpoint.setdefault("sent_alerts", {})
    sent_at = now_ny().isoformat()
    for alert in alerts:
        sent_alerts[f"{today_iso}|{alert.alert_key}"] = sent_at


def build_email_subject(alerts: List[BillAlert]) -> str:
    due_label = alerts[0].due_date.strftime("%B %d, %Y") if alerts else "Tomorrow"
    return f"Unpaid Bills Due Tomorrow - {due_label}"


def build_html_report(alerts: List[BillAlert]) -> str:
    generated_at = now_ny().strftime("%B %d, %Y at %I:%M %p").replace(" 0", " ")
    total_due = sum(alert.amount for alert in alerts)
    grouped: Dict[str, List[BillAlert]] = {}
    for alert in alerts:
        grouped.setdefault(alert.client_label, []).append(alert)

    sections = []
    for client_label, items in grouped.items():
        rows = "".join(
            f"""
            <tr>
              <td>{html.escape(item.bill_name)}</td>
              <td>{html.escape(item.month_key)}</td>
              <td>{html.escape(item.due_date.isoformat())}</td>
              <td>{html.escape(item.status)}</td>
              <td>{html.escape(format_currency(item.amount))}</td>
              <td>{html.escape(item.notes or '-')}</td>
            </tr>
            """
            for item in items
        )
        client_total = sum(item.amount for item in items)
        sections.append(
            f"""
            <section class="client-section">
              <div class="client-header">
                <h2>{html.escape(client_label)}</h2>
                <span>{len(items)} bill{'s' if len(items) != 1 else ''} • {html.escape(format_currency(client_total))}</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Bill</th>
                    <th>Month</th>
                    <th>Due date</th>
                    <th>Status</th>
                    <th>Amount due</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>{rows}</tbody>
              </table>
            </section>
            """
        )

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Unpaid Bills Due Tomorrow</title>
  <style>
    body {{ margin: 0; background: #f4f6f9; color: #18202a; font-family: Arial, Helvetica, sans-serif; }}
    .wrap {{ max-width: 980px; margin: 0 auto; background: #ffffff; }}
    .header {{ padding: 28px 32px; background: #18324d; color: #ffffff; }}
    .header h1 {{ margin: 0 0 8px; font-size: 28px; }}
    .header p {{ margin: 0; color: #dbe7f5; }}
    .content {{ padding: 26px 32px 34px; }}
    .notice {{ margin: 0 0 18px; padding: 12px 14px; background: #fff8d6; border: 1px solid #e5cd63; border-radius: 6px; }}
    .metrics {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 18px 0 22px; }}
    .metric {{ border: 1px solid #d9dee7; border-radius: 6px; padding: 12px; }}
    .metric strong {{ display: block; font-size: 22px; color: #2f6db7; }}
    .metric span {{ color: #5b6573; font-size: 13px; }}
    .client-section {{ margin-top: 22px; }}
    .client-header {{ display:flex; justify-content:space-between; align-items:end; gap:12px; border-bottom: 2px solid #d9dee7; padding-bottom: 8px; margin-bottom: 12px; }}
    .client-header h2 {{ margin: 0; font-size: 20px; }}
    .client-header span {{ color: #5b6573; font-weight: 700; }}
    table {{ width: 100%; border-collapse: collapse; }}
    th, td {{ border: 1px solid #d9dee7; padding: 10px; text-align: left; vertical-align: top; }}
    th {{ background: #eef3fb; color: #315b8a; font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; }}
    .footer {{ padding: 18px 32px; color: #5b6573; font-size: 12px; border-top: 1px solid #d9dee7; }}
  </style>
</head>
<body>
  <main class="wrap">
    <header class="header">
      <h1>Unpaid Bills Due Tomorrow</h1>
      <p>Generated {html.escape(generated_at)} | Recipient: dglanville@gmail.com</p>
    </header>
    <section class="content">
      <p class="notice"><strong>Reminder:</strong> These bills are due tomorrow and are still not marked paid.</p>
      <div class="metrics">
        <div class="metric"><strong>{len(alerts)}</strong><span>bills due tomorrow</span></div>
        <div class="metric"><strong>{len(grouped)}</strong><span>clients affected</span></div>
        <div class="metric"><strong>{html.escape(format_currency(total_due))}</strong><span>total amount due</span></div>
      </div>
      {''.join(sections)}
    </section>
    <footer class="footer">Prepared from 3G Tracking and Notifications using Firebase Firestore as the source of truth.</footer>
  </main>
</body>
</html>"""


def write_html_report(alerts: List[BillAlert]) -> Path:
    HTML_OUTPUT_PATH.write_text(build_html_report(alerts), encoding="utf-8")
    return HTML_OUTPUT_PATH


def send_html_email(subject: str, html_body: str, recipients: List[str]) -> None:
    sender_email, app_password = resolve_mail_credentials()
    if not app_password:
        raise RuntimeError("Missing app password for email sending.")

    message = MIMEMultipart("alternative")
    message["From"] = sender_email
    message["To"] = ", ".join(recipients)
    message["Subject"] = subject
    message.attach(MIMEText(html_body, "html", "utf-8"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(sender_email, app_password)
        server.sendmail(sender_email, recipients, message.as_string())


def run_once(send_email: bool = True, dry_run: bool = False) -> int:
    checkpoint = load_checkpoint()
    purge_old_sent_alerts(checkpoint)
    alerts = collect_due_tomorrow_alerts()
    unsent_alerts = filter_unsent_alerts(alerts, checkpoint)

    print(f"[{now_ny().isoformat()}] Checked bill alerts: {len(alerts)} due tomorrow, {len(unsent_alerts)} unsent.")
    if not unsent_alerts:
        save_checkpoint(checkpoint)
        return 0

    report_path = write_html_report(unsent_alerts)
    print(f"Report written to: {report_path}")
    for alert in unsent_alerts:
        print(f" - {alert.client_label}: {alert.bill_name} | {format_currency(alert.amount)} | due {alert.due_date.isoformat()} | {alert.status}")

    if dry_run or not send_email:
        save_checkpoint(checkpoint)
        return 0

    html_body = report_path.read_text(encoding="utf-8")
    send_html_email(build_email_subject(unsent_alerts), html_body, RECIPIENTS)
    mark_alerts_sent(unsent_alerts, checkpoint)
    save_checkpoint(checkpoint)
    print(f"Email sent to: {', '.join(RECIPIENTS)}")
    return 0


def should_run_now(send_time_text: str, checkpoint: Dict) -> bool:
    now = now_ny()
    hour, minute = [int(part) for part in send_time_text.split(":", 1)]
    target = datetime.combine(now.date(), dt_time(hour, minute), NY_TZ)
    last_run_date = str(checkpoint.get("last_scheduled_run_date") or "")
    if now < target:
        return False
    return last_run_date != now.date().isoformat()


def mark_scheduled_run(checkpoint: Dict) -> None:
    checkpoint["last_scheduled_run_date"] = now_ny().date().isoformat()
    save_checkpoint(checkpoint)


def watch_loop(send_time_text: str) -> None:
    print(f"Bill due alert scheduler started. Daily check time: {send_time_text} America/New_York")
    while True:
        checkpoint = load_checkpoint()
        purge_old_sent_alerts(checkpoint)
        if should_run_now(send_time_text, checkpoint):
            run_once(send_email=True, dry_run=False)
            checkpoint = load_checkpoint()
            mark_scheduled_run(checkpoint)
        time.sleep(300)


def main() -> int:
    parser = argparse.ArgumentParser(description="Send unpaid-bill reminders for bills due tomorrow.")
    parser.add_argument("--send-now", action="store_true", help="Run the bill due check immediately.")
    parser.add_argument("--dry-run", action="store_true", help="Preview matches without sending email.")
    parser.add_argument("--watch", action="store_true", help="Run a local scheduler loop.")
    parser.add_argument("--run-if-due", action="store_true", help="Run once only if today's scheduled time has passed and it has not already run.")
    parser.add_argument("--send-time", default=DEFAULT_SEND_TIME, help="Daily scheduler time in HH:MM, America/New_York.")
    args = parser.parse_args()

    if args.send_now:
        return run_once(send_email=not args.dry_run, dry_run=args.dry_run)

    if args.run_if_due:
        checkpoint = load_checkpoint()
        purge_old_sent_alerts(checkpoint)
        if should_run_now(args.send_time, checkpoint):
            result = run_once(send_email=not args.dry_run, dry_run=args.dry_run)
            checkpoint = load_checkpoint()
            mark_scheduled_run(checkpoint)
            return result
        print(f"[{now_ny().isoformat()}] Bill due alert not due yet for scheduled time {args.send_time}.")
        return 0

    if args.watch:
        watch_loop(args.send_time)
        return 0

    parser.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
