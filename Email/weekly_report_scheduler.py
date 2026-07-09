import argparse
import html
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None


PROJECT_ROOT = Path(__file__).resolve().parent.parent
EMAIL_FOLDER = PROJECT_ROOT / "Email"
ARCHIVE_FOLDER = EMAIL_FOLDER / "Archive"
SEND_SCRIPT = PROJECT_ROOT / "Scripts" / "send_daily_email.py"

sys.path.insert(0, str(PROJECT_ROOT / "Scripts"))

from firestore_report_data import fetch_tracker_state, parse_iso_datetime  # noqa: E402


NY_TZ = ZoneInfo("America/New_York") if ZoneInfo else datetime.now().astimezone().tzinfo or timezone.utc
PATRICK_DOC_ID = "patrick-glanville"
WEEKLY_REPORT_WEEKDAY = 0  # Monday
WEEKLY_REPORT_TIME = "09:30"

REPORT_CONFIG = {
    "urgency": {
        "prefix": "patrick-urgency-report",
        "label": "Patrick urgency report",
    },
    "change": {
        "prefix": "patrick-change-report",
        "label": "Patrick change report",
    },
    "medication": {
        "prefix": "patrick-medication-refill-alert",
        "label": "Patrick medication report",
    },
    "todo": {
        "prefix": "patrick-open-todo-report",
        "label": "Patrick open to-do report",
    },
}

CLOSED_STATUSES = {"Done", "On-Hold"}
MEDICATION_ALERT_WINDOW_DAYS = 7
TOP_TODO_LIST_TITLE = "Priority To-Do List"
PATRICK_EMAIL = "patrick.glanville@gmail.com"


def now_ny():
    return datetime.now(NY_TZ)


def parse_report_datetime(value):
    parsed = parse_iso_datetime(value)
    if parsed is None:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=NY_TZ)
    return parsed.astimezone(NY_TZ)


def normalize_percent(value):
    try:
        return max(0, min(100, int(round(float(value)))))
    except (TypeError, ValueError):
        return 0


def is_closed_task_status(status):
    return str(status or "").strip() in CLOSED_STATUSES


def is_closed_task(task):
    return is_closed_task_status(task.get("status")) or normalize_percent(task.get("percent")) == 100


def is_past_due(task, report_time):
    due = (task.get("due") or "").strip()
    if not due or is_closed_task(task):
        return False
    return due < report_time.date().isoformat()


def due_date_label(task, report_time):
    due = (task.get("due") or "").strip() or "No due date set"
    return f"{due} - PAST DUE" if is_past_due(task, report_time) else due


def is_job_task(task):
    return str(task.get("category") or "").startswith("Job -")


def category_rank(category):
    ordered = [
        "Job - CloudResearch",
        "Job - Data Annotation",
        "Job - Prolific",
        "Job - Mercor",
        "Job - Micro1",
        "Job - Outlier",
        "Job - Easy Money (HEB, Walmart, Home Depot, Kroger)",
        "Job - Teaching Assistance",
        "Career strategy",
        "Job barriers",
        "Income pathways",
        "Income",
        "Benefits",
        "Cash",
        "Transportation",
        "Transportation - Turo rental",
        "Vehicle",
        "Debt",
        "Debt - lender hardship",
        "Health",
        "Insurance",
        "Medical bills",
        "Household tasks",
        "Home safety",
        "Family",
        "Plan",
        "Accountability",
        "N/A",
    ]
    try:
        return ordered.index(category or "")
    except ValueError:
        return len(ordered)


def compare_report_sort_key(task):
    due = (task.get("due") or "").strip()
    return (
        category_rank(task.get("category")),
        0 if due else 1,
        due,
        str(task.get("title") or "").lower(),
    )


def format_dt(value):
    if isinstance(value, datetime):
        dt = value.astimezone(NY_TZ)
    else:
        dt = parse_report_datetime(value)
    if dt is None:
        return "None"
    return dt.strftime("%b %d, %Y, %I:%M %p").replace(" 0", " ").lstrip("0")


def metric_html(value, label):
    return (
        '<div class="metric">'
        f"<strong>{html.escape(str(value))}</strong>"
        f"<span>{html.escape(label)}</span>"
        "</div>"
    )


def archive_previous_versions(prefix, current_path):
    ARCHIVE_FOLDER.mkdir(parents=True, exist_ok=True)
    for path in EMAIL_FOLDER.glob(f"{prefix}-*.html"):
        if path.resolve() == current_path.resolve():
            continue
        destination = ARCHIVE_FOLDER / path.name
        if destination.exists():
            destination.unlink()
        path.replace(destination)


def write_report(prefix, html_text, report_date):
    EMAIL_FOLDER.mkdir(parents=True, exist_ok=True)
    filename = f"{prefix}-{report_date.date().isoformat()}.html"
    output_path = EMAIL_FOLDER / filename
    archive_previous_versions(prefix, output_path)
    output_path.write_text(html_text, encoding="utf-8")
    return output_path


def load_patrick_payload():
    return fetch_tracker_state(PATRICK_DOC_ID)


def get_week_window(report_time):
    return report_time - timedelta(days=7), report_time


def filter_patrick_history_weekly(state, report_time):
    start_time, end_time = get_week_window(report_time)
    entries = []
    for entry in state.get("history", []):
        created_at = parse_report_datetime(entry.get("createdAt"))
        if created_at is None:
            continue
        if entry.get("userEmail") != PATRICK_EMAIL:
            continue
        if not (start_time <= created_at <= end_time):
            continue
        item = dict(entry)
        item["_created_local"] = created_at
        entries.append(item)
    return sorted(entries, key=lambda item: item["_created_local"], reverse=True)


def get_urgent_tasks(state):
    tasks = [task for task in state.get("tasks", []) if task.get("priority") == "Urgent"]
    return sorted(tasks, key=compare_report_sort_key)


def build_task_card_html(task, report_time):
    overdue_badge = '<span class="overdue">Past due</span>' if is_past_due(task, report_time) else ""
    due_class = "due-past" if is_past_due(task, report_time) else ""
    return f"""
      <article class="task {'task-overdue' if is_past_due(task, report_time) else ''}">
        <h3>{html.escape(task.get('title') or 'Untitled task')}</h3>
        <div>{overdue_badge}<span class="badge">{html.escape(task.get('priority') or 'N/A')}</span></div>
        <table class="meta">
          <tr>
            <th>Status</th>
            <th>Complete</th>
            <th>Owner</th>
            <th>Category</th>
          </tr>
          <tr>
            <td>{html.escape(task.get('status') or 'N/A')}</td>
            <td>{normalize_percent(task.get('percent'))}%</td>
            <td>{html.escape(task.get('owner') or 'No owner')}</td>
            <td>{html.escape(task.get('category') or 'N/A')}</td>
          </tr>
        </table>
        <p><span class="label">Due:</span> <span class="{due_class}">{html.escape(due_date_label(task, report_time))}</span></p>
        <p><span class="label">What is due:</span> {html.escape(task.get('next') or 'No next step recorded.')}</p>
        <p><span class="label">Context:</span> {html.escape(task.get('notes') or 'No notes recorded.')}</p>
      </article>
    """


def build_urgency_report_html(state, report_time):
    urgent_tasks = get_urgent_tasks(state)
    job_tasks = [task for task in urgent_tasks if is_job_task(task)]
    other_tasks = [task for task in urgent_tasks if not is_job_task(task)]
    completed = sum(1 for task in urgent_tasks if str(task.get("status")) == "Done")
    blocked = sum(1 for task in urgent_tasks if str(task.get("status")) == "Blocked")
    average = round(sum(normalize_percent(task.get("percent")) for task in urgent_tasks) / len(urgent_tasks)) if urgent_tasks else 0

    def render_section(title, tasks, empty_message, special_class=""):
        if not tasks:
            body = f'<p class="empty">{html.escape(empty_message)}</p>'
        else:
            body = "".join(build_task_card_html(task, report_time) for task in tasks)
        return f"""
          <section class="section {special_class}">
            <div class="section-title"><h2>{html.escape(title)}</h2></div>
            {body}
          </section>
        """

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Patrick Glanville Urgency Report</title>
  <style>
    body {{ margin: 0; background: #f4f6f9; color: #18202a; font-family: Arial, Helvetica, sans-serif; }}
    .wrap {{ max-width: 960px; margin: 0 auto; background: #ffffff; }}
    .header {{ padding: 28px 32px; background: #18324d; color: #ffffff; }}
    .header h1 {{ margin: 0 0 8px; font-size: 28px; }}
    .header p {{ margin: 0; color: #dbe7f5; }}
    .content {{ padding: 26px 32px 34px; }}
    .notice {{ margin: 0 0 18px; padding: 12px 14px; background: #fff8d6; border: 1px solid #e5cd63; border-radius: 6px; }}
    .metrics {{ display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 18px 0 22px; }}
    .metric {{ border: 1px solid #d9dee7; border-radius: 6px; padding: 12px; }}
    .metric strong {{ display: block; font-size: 24px; color: #2f6db7; }}
    .metric span {{ color: #5b6573; font-size: 13px; }}
    .section {{ margin-top: 22px; }}
    .job-section {{ border: 2px solid #2f6db7; border-radius: 8px; padding: 16px; background: #f2f7ff; }}
    .section-title {{ border-bottom: 2px solid #d9dee7; padding-bottom: 8px; margin-bottom: 12px; }}
    .section-title h2 {{ margin: 0; font-size: 20px; }}
    .task {{ border: 1px solid #d9dee7; border-radius: 8px; padding: 14px; margin-top: 12px; background: #ffffff; }}
    .task-overdue {{ border-color: #b63b3b; box-shadow: inset 4px 0 0 #b63b3b; }}
    .task h3 {{ margin: 0 0 10px; font-size: 18px; }}
    .meta {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
    .meta th {{ text-align: left; color: #5b6573; font-size: 12px; text-transform: uppercase; padding: 6px 8px 2px 0; }}
    .meta td {{ padding: 2px 8px 8px 0; vertical-align: top; }}
    .badge {{ display: inline-block; padding: 4px 8px; border-radius: 999px; background: #ffe1df; color: #8d2424; font-weight: 700; font-size: 12px; }}
    .overdue {{ display: inline-block; margin-right: 8px; padding: 4px 8px; border-radius: 999px; background: #b63b3b; color: #ffffff; font-weight: 700; font-size: 12px; }}
    .due-past {{ color: #8d2424; font-weight: 700; }}
    .label {{ font-weight: 700; }}
    .empty {{ color: #5b6573; }}
    .footer {{ padding: 18px 32px; color: #5b6573; font-size: 12px; border-top: 1px solid #d9dee7; }}
  </style>
</head>
<body>
  <main class="wrap">
    <header class="header">
      <h1>Patrick Glanville Weekly Urgency Report</h1>
      <p>Generated {html.escape(format_dt(report_time))} | Weekly send schedule: Mondays at 9:30 AM</p>
    </header>
    <section class="content">
      <p class="notice"><strong>Job focus:</strong> Job and income opportunities are grouped first because restoring income is the highest leverage path for transportation, housing, debt, and daily living stability.</p>
      <div class="metrics">
        {metric_html(len(urgent_tasks), "urgent tasks")}
        {metric_html(len(job_tasks), "urgent job tasks")}
        {metric_html(completed, "completed")}
        {metric_html(blocked, "blocked")}
        {metric_html(f"{average}%", "average complete")}
      </div>
      {render_section("Job Search and Income Opportunities", job_tasks, "No urgent job tasks currently listed.", "job-section")}
      {render_section("Other Urgent Tasks", other_tasks, "No other urgent tasks currently listed.")}
    </section>
    <footer class="footer">Prepared from the Patrick Glanville Support Tracker stored in Firebase Firestore.</footer>
  </main>
</body>
</html>"""


def history_type_label(item_type):
    labels = {
        "task": "Task",
        "bill": "Bill",
        "document": "PDF",
        "note": "Running Note",
        "todo-note": "To-Do Note",
        "life-admin": "Life Admin",
    }
    return labels.get(str(item_type or "").strip().lower(), "Task")


def build_change_report_html(state, report_time):
    entries = filter_patrick_history_weekly(state, report_time)
    closed_entries = [entry for entry in entries if is_closed_task_status(entry.get("status"))]
    unique_items = len({entry.get("taskId") or f"{entry.get('itemType')}:{entry.get('itemId') or entry.get('taskTitle')}" for entry in entries})
    start_time, end_time = get_week_window(report_time)
    latest = format_dt(entries[0].get("createdAt")) if entries else "None"

    def render_entries(items, empty_message, include_percent=True):
        if not items:
            return f'<p class="empty">{html.escape(empty_message)}</p>'
        rows = []
        for entry in items:
            rows.append(f"""
              <article class="change-item">
                <div class="change-heading">
                  <span class="change-badge change-badge-type">{html.escape(history_type_label(entry.get('itemType')))}</span>
                  <span class="change-badge change-badge-user">{html.escape(entry.get('userName') or 'Unknown user')}</span>
                  <strong>{html.escape(entry.get('taskTitle') or 'Untitled item')}</strong>
                </div>
                <p class="change-time">{html.escape(format_dt(entry.get('createdAt')))}</p>
                <p>{html.escape(entry.get('summary') or 'No summary recorded.')}</p>
                {'<p><strong>Status:</strong> ' + html.escape(entry.get('status') or 'N/A') + ' | <strong>Complete:</strong> ' + str(normalize_percent(entry.get('percent'))) + '%</p>' if include_percent else ''}
              </article>
            """)
        return "".join(rows)

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Patrick Change Report</title>
  <style>
    body {{ margin: 0; background: #f4f6f9; color: #18202a; font-family: Arial, Helvetica, sans-serif; }}
    .wrap {{ max-width: 980px; margin: 0 auto; background: #ffffff; }}
    .header {{ padding: 28px 32px; background: #18324d; color: #ffffff; }}
    .header h1 {{ margin: 0 0 8px; font-size: 28px; }}
    .header p {{ margin: 0; color: #dbe7f5; }}
    .content {{ padding: 26px 32px 34px; }}
    .notice {{ margin: 0 0 18px; padding: 12px 14px; background: #eef3fb; border: 1px solid #c7d7ea; border-radius: 6px; }}
    .metrics {{ display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 18px 0 22px; }}
    .metric {{ border: 1px solid #d9dee7; border-radius: 6px; padding: 12px; }}
    .metric strong {{ display: block; font-size: 22px; color: #2f6db7; }}
    .metric span {{ color: #5b6573; font-size: 13px; }}
    .section {{ margin-top: 22px; }}
    .section-title {{ border-bottom: 2px solid #d9dee7; padding-bottom: 8px; margin-bottom: 12px; display:flex; justify-content:space-between; gap:12px; align-items:center; }}
    .section-title h2 {{ margin: 0; font-size: 20px; }}
    .section-title span {{ color: #5b6573; font-weight: 700; }}
    .change-item {{ border: 1px solid #d9dee7; border-radius: 8px; padding: 14px; margin-top: 12px; background: #ffffff; }}
    .change-heading {{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; }}
    .change-badge {{ display:inline-block; padding:4px 8px; border-radius:999px; font-weight:700; font-size:12px; }}
    .change-badge-type {{ background:#eef3fb; border:1px solid #c7d7ea; color:#315b8a; }}
    .change-badge-user {{ background:#f4ecff; border:1px solid #d4c0f7; color:#6b35a8; }}
    .change-time, .empty {{ color:#5b6573; }}
    .footer {{ padding: 18px 32px; color: #5b6573; font-size: 12px; border-top: 1px solid #d9dee7; }}
  </style>
</head>
<body>
  <main class="wrap">
    <header class="header">
      <h1>Patrick Weekly Change Report</h1>
      <p>Generated {html.escape(format_dt(report_time))} | Window {html.escape(format_dt(start_time))} to {html.escape(format_dt(end_time))}</p>
    </header>
    <section class="content">
      <p class="notice"><strong>Source:</strong> This report is based on Patrick's tracker history captured in Firebase Firestore over the last 7 days.</p>
      <div class="metrics">
        {metric_html(len(entries), "Patrick changes this week")}
        {metric_html(len(closed_entries), "closed this week")}
        {metric_html(unique_items, "unique items touched")}
        {metric_html(latest, "latest update")}
        {metric_html(start_time.date().isoformat(), "window start")}
      </div>
      <section class="section">
        <div class="section-title"><h2>Patrick Changes This Week</h2><span>{len(entries)} item{'s' if len(entries) != 1 else ''}</span></div>
        {render_entries(entries, "No Patrick changes were captured during the last 7 days.")}
      </section>
      <section class="section">
        <div class="section-title"><h2>Items Patrick Closed This Week</h2><span>{len(closed_entries)} item{'s' if len(closed_entries) != 1 else ''}</span></div>
        {render_entries(closed_entries, "Patrick has not closed any tracked items during the last 7 days.", include_percent=False)}
      </section>
    </section>
    <footer class="footer">Prepared from the Patrick Glanville Support Tracker stored in Firebase Firestore.</footer>
  </main>
</body>
</html>"""


def get_medication_task(state):
    for task in state.get("tasks", []):
        title = str(task.get("title") or "").lower()
        notes = str(task.get("notes") or "").lower()
        next_text = str(task.get("next") or "").lower()
        if "medication" in title and "refill" in title:
            return task
        if "track medication details" in notes or "list every current medication" in next_text:
            return task
    return None


def get_medication_refill_alert(entry, report_time):
    refill_date = str(entry.get("refillDate") or "").strip()
    if not refill_date:
        return None
    try:
        refill = datetime.strptime(refill_date, "%Y-%m-%d").date()
    except ValueError:
        try:
            refill = datetime.strptime(refill_date, "%m/%d/%Y").date()
        except ValueError:
            return None

    today = report_time.date()
    diff_days = (refill - today).days
    if diff_days < 0:
        return {"level": "red", "label": "Past due refill", "diffDays": diff_days}
    if diff_days <= MEDICATION_ALERT_WINDOW_DAYS:
        label = "Refill due today" if diff_days == 0 else f"Refill due in {diff_days} day{'s' if diff_days != 1 else ''}"
        return {"level": "yellow", "label": label, "diffDays": diff_days}
    return None


def build_medication_report_html(state, report_time):
    task = get_medication_task(state) or {}
    medications = [entry for entry in task.get("medications", []) if any(str(entry.get(key) or "").strip() for key in ("name", "dosage", "refillDate"))]
    rows = []
    active_alerts = []
    for entry in medications:
        alert = get_medication_refill_alert(entry, report_time)
        if alert:
            active_alerts.append((entry, alert))
        background = "#ffffff"
        if alert:
            background = "#ffe2e0" if alert["level"] == "red" else "#fff7bf"
        rows.append(f"""
          <tr style="background:{background};">
            <td>{html.escape(entry.get('name') or 'Unlisted medication')}</td>
            <td>{html.escape(entry.get('dosage') or 'Not set')}</td>
            <td>{html.escape(str(entry.get('pillsPrescribed') or '')) or 'Not set'}</td>
            <td>{html.escape(entry.get('refillDate') or 'Not set')}</td>
            <td>{html.escape(alert['label']) if alert else 'No active alert'}</td>
          </tr>
        """)

    alert_items = "".join(
        f"<li><strong>{html.escape(entry.get('name') or 'Medication')}:</strong> {html.escape(alert['label'])} ({html.escape(entry.get('refillDate') or 'No refill date')})</li>"
        for entry, alert in active_alerts
    ) or "<li>No active medication refill alerts right now.</li>"

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Medication Refill Alert</title>
  <style>
    body {{ margin:0; background:#f4f6f9; color:#18202a; font-family:Arial, Helvetica, sans-serif; }}
    .wrap {{ max-width:960px; margin:0 auto; background:#ffffff; }}
    .header {{ padding:28px 32px; background:#18324d; color:#ffffff; }}
    .header h1 {{ margin:0 0 8px; font-size:28px; }}
    .header p {{ margin:0; color:#dbe7f5; }}
    .content {{ padding:26px 32px 34px; }}
    .notice {{ margin:0 0 18px; padding:12px 14px; background:#fff8d6; border:1px solid #e5cd63; border-radius:6px; }}
    .metrics {{ display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; margin:18px 0 22px; }}
    .metric {{ border:1px solid #d9dee7; border-radius:6px; padding:12px; }}
    .metric strong {{ display:block; font-size:22px; color:#2f6db7; }}
    .metric span {{ color:#5b6573; font-size:13px; }}
    table {{ width:100%; border-collapse:collapse; margin-top:14px; }}
    th, td {{ border:1px solid #d9dee7; padding:10px; text-align:left; vertical-align:top; }}
    th {{ background:#eef3fb; }}
    .footer {{ padding: 18px 32px; color: #5b6573; font-size: 12px; border-top: 1px solid #d9dee7; }}
  </style>
</head>
<body>
  <main class="wrap">
    <header class="header">
      <h1>Patrick Weekly Medication Report</h1>
      <p>Generated {html.escape(format_dt(report_time))} | Weekly send schedule: Mondays at 9:30 AM</p>
    </header>
    <section class="content">
      <p class="notice"><strong>Medication status:</strong> This weekly report is sent whenever the Monday batch runs and includes any active refill alerts plus the current medication list.</p>
      <div class="metrics">
        {metric_html(len(active_alerts), "active alerts")}
        {metric_html(len(medications), "medications listed")}
        {metric_html(MEDICATION_ALERT_WINDOW_DAYS, "alert window days")}
      </div>
      <h2>Active Alert Summary</h2>
      <ul>{alert_items}</ul>
      <h2>Current Medication List</h2>
      <table>
        <thead>
          <tr>
            <th>Medication</th>
            <th>Dosage</th>
            <th>Pills prescribed</th>
            <th>Refill date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {''.join(rows) if rows else '<tr><td colspan="5">No medication rows are currently stored.</td></tr>'}
        </tbody>
      </table>
    </section>
    <footer class="footer">Prepared from the Patrick Glanville Support Tracker stored in Firebase Firestore.</footer>
  </main>
</body>
</html>"""


def get_priority_todo_task(state):
    for task in state.get("tasks", []):
        if task.get("title") == TOP_TODO_LIST_TITLE or task.get("category") == "Priority to-do list":
            return task
    return None


def build_open_todo_report_html(state, report_time):
    task = get_priority_todo_task(state) or {}
    todo_items = task.get("todoItems", []) if isinstance(task.get("todoItems"), list) else []
    open_items = [item for item in todo_items if not is_closed_task_status(item.get("status"))]
    closed_items = [item for item in todo_items if is_closed_task_status(item.get("status"))]
    open_items = sorted(open_items, key=lambda item: ((item.get("createdAt") or ""), str(item.get("title") or "").lower()))

    item_html = "".join(
        f"""
        <article class="todo-item">
          <div class="todo-heading">
            <strong>{html.escape(item.get('title') or 'Untitled to-do item')}</strong>
            <span class="status-badge">{html.escape(item.get('status') or 'Not started')}</span>
          </div>
          <p><strong>Created:</strong> {html.escape(format_dt(item.get('createdAt')))}</p>
          <p><strong>Last updated:</strong> {html.escape(format_dt(item.get('updatedAt') or item.get('createdAt')))}</p>
          <p><strong>Notes:</strong> {html.escape(item.get('notes') or 'No notes recorded.')}</p>
        </article>
        """
        for item in open_items
    ) or '<p class="empty">Patrick has no open priority to-do items right now.</p>'

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Patrick Open To-Do Report</title>
  <style>
    body {{ margin:0; background:#f4f6f9; color:#18202a; font-family:Arial, Helvetica, sans-serif; }}
    .wrap {{ max-width:960px; margin:0 auto; background:#ffffff; }}
    .header {{ padding:28px 32px; background:#18324d; color:#ffffff; }}
    .header h1 {{ margin:0 0 8px; font-size:28px; }}
    .header p {{ margin:0; color:#dbe7f5; }}
    .content {{ padding:26px 32px 34px; }}
    .notice {{ margin:0 0 18px; padding:12px 14px; background:#eef3fb; border:1px solid #c7d7ea; border-radius:6px; }}
    .metrics {{ display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin:18px 0 22px; }}
    .metric {{ border:1px solid #d9dee7; border-radius:6px; padding:12px; }}
    .metric strong {{ display:block; font-size:22px; color:#2f6db7; }}
    .metric span {{ color:#5b6573; font-size:13px; }}
    .todo-item {{ border:1px solid #d9dee7; border-radius:8px; padding:14px; margin-top:12px; background:#ffffff; }}
    .todo-heading {{ display:flex; justify-content:space-between; gap:12px; align-items:center; }}
    .status-badge {{ display:inline-block; padding:4px 8px; border-radius:999px; background:#eef3fb; border:1px solid #c7d7ea; color:#315b8a; font-weight:700; font-size:12px; }}
    .empty {{ color:#5b6573; }}
    .footer {{ padding: 18px 32px; color: #5b6573; font-size: 12px; border-top: 1px solid #d9dee7; }}
  </style>
</head>
<body>
  <main class="wrap">
    <header class="header">
      <h1>Patrick Weekly Open To-Do Report</h1>
      <p>Generated {html.escape(format_dt(report_time))} | Weekly send schedule: Mondays at 9:30 AM</p>
    </header>
    <section class="content">
      <p class="notice"><strong>Recipients:</strong> This weekly open to-do report is sent to Derick, Patrick, and Courtney so everyone sees Patrick's current open priority items.</p>
      <div class="metrics">
        {metric_html(len(open_items), "open to-do items")}
        {metric_html(len(closed_items), "closed to-do items")}
        {metric_html(task.get('owner') or 'Patrick + Deric', "owner")}
        {metric_html(task.get('status') or 'N/A', "card status")}
      </div>
      {item_html}
    </section>
    <footer class="footer">Prepared from the Patrick Glanville Support Tracker stored in Firebase Firestore.</footer>
  </main>
</body>
</html>"""


def generate_report_files(report_time, kinds):
    payload = load_patrick_payload()
    state = payload["state"]
    generated = {}
    for kind in kinds:
        prefix = REPORT_CONFIG[kind]["prefix"]
        if kind == "urgency":
            report_html = build_urgency_report_html(state, report_time)
        elif kind == "change":
            report_html = build_change_report_html(state, report_time)
        elif kind == "medication":
            report_html = build_medication_report_html(state, report_time)
        elif kind == "todo":
            report_html = build_open_todo_report_html(state, report_time)
        else:
            raise ValueError(f"Unsupported report kind: {kind}")
        generated[kind] = write_report(prefix, report_html, report_time)
    return generated


def send_report(kind, report_path):
    subprocess.run(
        [
            sys.executable,
            str(SEND_SCRIPT),
            "--send-now",
            "--report-kind",
            kind,
            "--file",
            str(report_path),
        ],
        check=True,
    )


def run_weekly_reports(send_emails=True, kinds=None):
    report_time = now_ny()
    selected = kinds or list(REPORT_CONFIG.keys())
    generated = generate_report_files(report_time, selected)
    if send_emails:
        for kind, report_path in generated.items():
            send_report(kind, report_path)
    return generated


def sleep_until_next_minute():
    current_epoch = time.time()
    time.sleep(max(1.0, 60 - (current_epoch % 60)))


def scheduler_loop():
    target_hour, target_minute = (int(part) for part in WEEKLY_REPORT_TIME.split(":", 1))
    last_sent_key = ""

    print("Patrick weekly report scheduler started.")
    print(f"Schedule: Mondays at {WEEKLY_REPORT_TIME} America/New_York")
    print("Reports: urgency, change, medication, todo")
    print("Press Ctrl+C to stop.")

    while True:
        current = now_ny()
        current_key = current.strftime("%Y-%m-%d")
        if (
            current.weekday() == WEEKLY_REPORT_WEEKDAY
            and current.hour == target_hour
            and current.minute == target_minute
            and current_key != last_sent_key
        ):
            try:
                results = run_weekly_reports(send_emails=True)
                print(f"[{current.isoformat()}] Weekly reports sent:")
                for kind, report_path in results.items():
                    print(f"  - {kind}: {report_path.name}")
            except Exception as error:
                print(f"[{current.isoformat()}] Weekly report batch failed: {error}", file=sys.stderr)
            finally:
                last_sent_key = current_key
        sleep_until_next_minute()


def main():
    parser = argparse.ArgumentParser(description="Generate and send Patrick's weekly Firestore-backed reports.")
    parser.add_argument("--run-now", action="store_true", help="Generate and send the weekly report batch immediately.")
    parser.add_argument("--generate-only", action="store_true", help="Generate the weekly report batch without emailing it.")
    parser.add_argument(
        "--report-kind",
        choices=["all", *REPORT_CONFIG.keys()],
        default="all",
        help="Generate only one report kind, or all of them.",
    )
    args = parser.parse_args()

    kinds = list(REPORT_CONFIG.keys()) if args.report_kind == "all" else [args.report_kind]

    if args.run_now or args.generate_only:
        results = run_weekly_reports(send_emails=not args.generate_only, kinds=kinds)
        for kind, report_path in results.items():
            print(f"{kind}: {report_path}")
        return 0

    return scheduler_loop()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\nWeekly scheduler stopped by user.")
        raise SystemExit(0)
