"""Send one Verizon SMS reminder for unpaid Admin bills due today."""

import argparse
import json
import smtplib
import sys
from datetime import date, datetime, time as clock_time
from email.mime.text import MIMEText
from pathlib import Path
from typing import Dict, Iterable, List, Optional

try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None


PROJECT_ROOT = Path(__file__).resolve().parent.parent
EMAIL_FOLDER = PROJECT_ROOT / "Email"
SCRIPTS_FOLDER = PROJECT_ROOT / "Scripts"
POLICY_PATH = EMAIL_FOLDER / "email-automation.json"
CHECKPOINT_PATH = EMAIL_FOLDER / "admin-bill-due-sms-state.json"
PAID_STATUSES = {"paid", "fully paid", "deferred", "n/a"}
NY_TZ = ZoneInfo("America/New_York") if ZoneInfo else datetime.now().astimezone().tzinfo

sys.path.insert(0, str(SCRIPTS_FOLDER))

from firestore_report_data import fetch_tracker_state  # noqa: E402
from send_daily_email import resolve_mail_credentials  # noqa: E402


def now_ny() -> datetime:
    return datetime.now(NY_TZ)


def load_policy() -> Dict:
    try:
        settings = json.loads(POLICY_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError) as error:
        raise RuntimeError(f"Could not read SMS policy: {error}") from error
    policy = settings.get("adminDueDateSmsNotifier") or {}
    if not policy.get("enabled", False):
        raise RuntimeError("Admin due-date SMS notifications are disabled by email-automation.json.")
    return policy


def parse_date(value) -> Optional[date]:
    text = str(value or "").strip()
    for pattern in ("%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(text, pattern).date()
        except ValueError:
            continue
    return None


def normalize_money(value) -> float:
    try:
        return float(str(value or "0").replace("$", "").replace(",", "").strip() or 0)
    except (TypeError, ValueError):
        return 0.0


def current_month_key(now: datetime) -> str:
    return now.strftime("%Y-%m")


def bill_identity(bill: Dict) -> str:
    return str(bill.get("templateKey") or bill.get("id") or bill.get("name") or "untitled").strip().lower()


def dedupe_bills(bills: Iterable[Dict]) -> List[Dict]:
    winners: Dict[str, Dict] = {}
    for bill in bills:
        if not isinstance(bill, dict):
            continue
        identity = bill_identity(bill)
        current = winners.get(identity)
        if current is None or len(json.dumps(bill, sort_keys=True)) >= len(json.dumps(current, sort_keys=True)):
            winners[identity] = bill
    return list(winners.values())


def collect_due_today_bills(policy: Dict) -> List[Dict]:
    now = now_ny()
    payload = fetch_tracker_state(str(policy.get("clientDocumentId") or "admin-glanville"))
    state = payload.get("state") or {}
    month_key = current_month_key(now)
    monthly_budgets = state.get("monthlyBudgets") or {}
    month_state = monthly_budgets.get(month_key) or {}
    bills = month_state.get("bills") or (state.get("bills") if state.get("billMonth") == month_key else [])
    due_today = []
    for bill in dedupe_bills(bills):
        if parse_date(bill.get("due")) != now.date():
            continue
        if str(bill.get("status") or "Unpaid").strip().lower() in PAID_STATUSES:
            continue
        due_today.append(bill)
    return sorted(due_today, key=lambda item: str(item.get("name") or "").lower())


def load_checkpoint() -> Dict:
    try:
        return json.loads(CHECKPOINT_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_checkpoint(checkpoint: Dict) -> None:
    CHECKPOINT_PATH.write_text(json.dumps(checkpoint, indent=2), encoding="utf-8")


def build_sms(bills: List[Dict]) -> str:
    total = sum(normalize_money(bill.get("amount")) for bill in bills)
    today_label = now_ny().strftime("%m/%d/%Y")
    lines = [f"Admin bill reminder {today_label}: {len(bills)} unpaid due today (${total:,.2f})."]
    lines.extend(f"- {str(bill.get('name') or 'Untitled')}: ${normalize_money(bill.get('amount')):,.2f}" for bill in bills)
    return "\n".join(lines)


def send_sms(message_text: str, recipient: str) -> None:
    sender_email, app_password = resolve_mail_credentials()
    if not app_password:
        raise RuntimeError("Gmail app password is not configured for SMS delivery.")
    message = MIMEText(message_text, "plain", "utf-8")
    message["From"] = sender_email
    message["To"] = recipient
    message["Subject"] = "Admin bill due reminder"
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(sender_email, app_password)
        server.sendmail(sender_email, [recipient], message.as_string())


def should_run(policy: Dict, checkpoint: Dict) -> bool:
    hour, minute = [int(value) for value in str(policy.get("sendTime") or "18:30").split(":", 1)]
    now = now_ny()
    scheduled_time = datetime.combine(now.date(), clock_time(hour, minute), NY_TZ)
    return now >= scheduled_time and checkpoint.get("last_checked_date") != now.date().isoformat()


def run_once(
    force: bool = False,
    dry_run: bool = False,
    update_daily_checkpoint: bool = True,
) -> int:
    policy = load_policy()
    checkpoint = load_checkpoint()
    if not force and not should_run(policy, checkpoint):
        print("Admin SMS alert is not due yet or has already run today.")
        return 0

    bills = collect_due_today_bills(policy)
    # A dashboard-initiated check must not consume the scheduled daily run.
    if update_daily_checkpoint and not dry_run:
        checkpoint["last_checked_date"] = now_ny().date().isoformat()
        checkpoint["last_checked_at"] = now_ny().isoformat()
        checkpoint["last_bill_count"] = len(bills)
        save_checkpoint(checkpoint)

    if not bills:
        print("No unpaid Admin bills are due today. No SMS sent.")
        return 0

    message_text = build_sms(bills)
    print(message_text)
    if dry_run:
        print("Dry run: SMS was not sent.")
        return 0
    send_sms(message_text, str(policy["recipient"]))
    if update_daily_checkpoint:
        checkpoint["last_sent_at"] = now_ny().isoformat()
        save_checkpoint(checkpoint)
    print(f"SMS sent to {policy['recipient']}.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Send Admin unpaid bill due-date SMS alerts.")
    parser.add_argument("--run-if-due", action="store_true", help="Send only when 6:30 PM has passed and today has not been checked.")
    parser.add_argument("--send-now", action="store_true", help="Run the check immediately and record the daily checkpoint.")
    parser.add_argument(
        "--send-manual",
        action="store_true",
        help="Run the condition immediately without changing the scheduled daily checkpoint.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Show the SMS without sending it.")
    args = parser.parse_args()
    if args.send_now:
        return run_once(force=True, dry_run=args.dry_run)
    if args.send_manual:
        return run_once(force=True, dry_run=args.dry_run, update_daily_checkpoint=False)
    if args.run_if_due:
        return run_once(force=False, dry_run=args.dry_run)
    parser.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
