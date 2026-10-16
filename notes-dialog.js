"use strict";

function renderAdminNotesRemindersDialog() {
  if (!adminNotesRemindersBody) return;
  const all = Array.isArray(state.adminNotesReminders) ? state.adminNotesReminders : [];
  const today = getLocalIsoDate(new Date());
  const soon = getLocalIsoDate(new Date(Date.now() + 7 * 86400000));
  const isClosed = entry => ["Done", "Closed"].includes(entry.status);
  const open = all.filter(entry => !isClosed(entry));
  const dueSoon = open.filter(entry => entry.dueDate && entry.dueDate <= soon);
  const completed = all.filter(isClosed);
  const views = [
    ["overview", "Overview", all.length],
    ["all", "All records", all.length],
    ["upcoming", "Due soon", dueSoon.length],
    ["completed", "Completed", completed.length]
  ];
  const query = adminNotesReminderSearch.trim().toLowerCase();
  let entries = all.filter(entry => {
    if (adminNotesReminderView === "overview" && isClosed(entry)) return false;
    if (adminNotesReminderView === "upcoming" && !dueSoon.includes(entry)) return false;
    if (adminNotesReminderView === "completed" && !isClosed(entry)) return false;
    if (adminNotesReminderView === "all" && adminNotesReminderStatus !== "All" && entry.status !== adminNotesReminderStatus) return false;
    return !query || `${entry.title} ${entry.category} ${entry.representative} ${entry.objective} ${entry.reminder}`.toLowerCase().includes(query);
  });
  entries = [...entries].sort((a, b) => {
    if (isClosed(a) !== isClosed(b)) return isClosed(a) ? 1 : -1;
    return `${a.dueDate || a.date || "9999-12-31"}`.localeCompare(`${b.dueDate || b.date || "9999-12-31"}`);
  });
  const selected = entries.find(entry => entry.id === adminNotesReminderSelectedId) || entries[0] || null;
  adminNotesReminderSelectedId = selected?.id || "";
  const prettyDate = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" }) : "No date";
  const selectedDue = selected?.dueDate ? (selected.dueDate < today ? "Overdue" : selected.dueDate <= soon ? "Due soon" : "Scheduled") : "No due date";
  const statusOptions = ["Open", "In progress", "Waiting", "Done", "Closed"];
  const priorityOptions = ["Low", "Normal", "High", "Urgent"];
  adminNotesRemindersBody.innerHTML = `
    <div class="gather-notes-shell">
      <aside class="gather-notes-rail" aria-label="Notes and reminders views">
        <div class="gather-notes-mark" aria-hidden="true">3G<span>·</span></div>
        <p class="gather-notes-kicker">YOUR ADMIN JOURNAL</p>
        <nav>${views.map(([key, label, count]) => `<button type="button" class="gather-notes-nav ${adminNotesReminderView === key ? "active" : ""}" data-notes-view="${key}" aria-current="${adminNotesReminderView === key ? "page" : "false"}"><span>${label}</span><b>${count}</b></button>`).join("")}</nav>
        <p class="gather-notes-rail-tip">Keep the next action and due date in one place.</p>
      </aside>
      <main class="gather-notes-main">
        <div class="gather-notes-heading"><div><p class="gather-notes-eyebrow">FOLLOW-UPS, THOUGHTFULLY TRACKED</p><h3>${adminNotesReminderView === "overview" ? "Your priorities, at a glance." : adminNotesReminderView === "upcoming" ? "What needs attention soon." : adminNotesReminderView === "completed" ? "Finished follow-ups." : "Your notes and reminders."}</h3><p>Choose a record to review or update it.</p></div><button type="button" id="addAdminNotesReminderBtn" class="gather-notes-primary">+ Add New</button></div>
        <div class="gather-notes-stats"><article><small>Open follow-ups</small><strong>${open.length}</strong><span>Still in progress</span></article><article><small>Due within 7 days</small><strong>${dueSoon.length}</strong><span>Including overdue items</span></article><article><small>Completed</small><strong>${completed.length}</strong><span>Done or closed</span></article></div>
        <div class="gather-notes-controls"><label class="gather-notes-search"><span>Search records</span><input id="adminNotesReminderSearch" type="search" aria-label="Search records" value="${escapeAttribute(adminNotesReminderSearch)}" placeholder="Case, meeting, person, or next action"></label>${adminNotesReminderView === "all" ? `<label><span>Status</span><select id="adminNotesReminderStatus">${["All", ...statusOptions].map(status => `<option${status === adminNotesReminderStatus ? " selected" : ""}>${status}</option>`).join("")}</select></label>` : ""}</div>
        <div class="gather-notes-workspace">
          <section class="gather-notes-list-panel" aria-label="Records">
            <div class="gather-notes-section-title"><h4>${adminNotesReminderView === "overview" ? "Next on your list" : adminNotesReminderView === "upcoming" ? "Due soon" : adminNotesReminderView === "completed" ? "Completed records" : "All records"}</h4><span>${entries.length} shown</span></div>
            <div class="gather-notes-list">${entries.length ? `<table class="gather-notes-table"><thead><tr><th>Record</th><th>Date</th><th>Due</th><th>Status</th><th>Priority</th><th>Category</th><th>Next action</th></tr></thead><tbody>${entries.map(entry => `<tr class="gather-notes-item ${entry.id === selected?.id ? "selected" : ""}" data-admin-note-id="${escapeAttribute(entry.id)}"><td><button type="button" class="gather-notes-open" title="Open ${escapeAttribute(entry.title || "Untitled note")}" aria-current="${entry.id === selected?.id ? "true" : "false"}">${escapeHtml(entry.title || "Untitled note")}</button></td><td>${escapeHtml(prettyDate(entry.date))}</td><td class="gather-notes-due-cell">${entry.dueDate ? escapeHtml(prettyDate(entry.dueDate)) : "—"}</td><td>${escapeHtml(entry.status)}</td><td>${escapeHtml(entry.priority)}</td><td>${escapeHtml(entry.category)}</td><td class="gather-notes-action-cell" title="${escapeAttribute(entry.reminder || entry.objective || "")}">${escapeHtml(entry.reminder || entry.objective || "—")}</td></tr>`).join("")}</tbody></table>` : '<p class="gather-notes-empty">No records match this view. Try another view or add a record.</p>'}</div>
          </section>
          <section class="gather-notes-detail" aria-label="Selected record">${selected ? `<div class="gather-notes-detail-head"><div><p class="gather-notes-eyebrow">EDIT SELECTED RECORD</p><h4>${escapeHtml(selected.title || "Untitled note")}</h4></div><span class="gather-notes-due-tag ${selectedDue === "Overdue" ? "overdue" : ""}">${escapeHtml(selectedDue)}</span></div><div class="gather-notes-form"><div class="gather-notes-fields"><label>Title<input class="admin-note-title" value="${escapeAttribute(selected.title)}" placeholder="Case, meeting, or follow-up"></label><label>Category<input class="admin-note-category-input" value="${escapeAttribute(selected.category)}" placeholder="Financial case"></label><label class="wide">Representative / contact<input class="admin-note-representative" value="${escapeAttribute(selected.representative)}" placeholder="Name or contact"></label><label>Record date<input class="admin-note-date" type="date" value="${escapeAttribute(selected.date)}"></label><label>Due date<input class="admin-note-due-date" type="date" value="${escapeAttribute(selected.dueDate)}" title="The local reminder task texts 914-672-2393 on this date."></label><label>Status<select class="admin-note-status-input">${statusOptions.map(status => `<option${status === selected.status ? " selected" : ""}>${status}</option>`).join("")}</select></label><label>Priority<select class="admin-note-priority-input">${priorityOptions.map(priority => `<option${priority === selected.priority ? " selected" : ""}>${priority}</option>`).join("")}</select></label></div><div class="gather-notes-texts"><label>Objective<textarea class="admin-note-objective" rows="2" placeholder="What needs to be decided or resolved?">${escapeHtml(selected.objective)}</textarea></label><label>Next action / reminder<textarea class="admin-note-reminder" rows="2" placeholder="What happens next?">${escapeHtml(selected.reminder)}</textarea></label></div><div class="gather-notes-actions"><small>${selected.updatedAt ? `Saved ${escapeHtml(formatDateTime(selected.updatedAt))}` : "Ready to update"}</small><div><button type="button" class="gather-notes-delete">Delete</button><button type="button" class="gather-notes-primary gather-notes-save">Save Changes</button></div></div></div>` : '<div class="gather-notes-detail-placeholder"><strong>Select a record</strong><p>Its details and edit controls will appear here.</p></div>'}</section>
        </div>
        <p class="gather-notes-sync-note">Changes save to Admin shared storage and the local backup. Due-date texts are checked by the local reminder task.</p>
      </main>
    </div>`;
  adminNotesRemindersBody.querySelectorAll("[data-notes-view]").forEach(button => button.addEventListener("click", () => { adminNotesReminderView = button.dataset.notesView; adminNotesReminderSelectedId = ""; renderAdminNotesRemindersDialog(); }));
  adminNotesRemindersBody.querySelectorAll(".gather-notes-item").forEach(button => button.addEventListener("click", () => { adminNotesReminderSelectedId = button.dataset.adminNoteId; renderAdminNotesRemindersDialog(); }));
  adminNotesRemindersBody.querySelector("#adminNotesReminderSearch")?.addEventListener("input", event => { const position = event.target.selectionStart; adminNotesReminderSearch = event.target.value; renderAdminNotesRemindersDialog(); const input = adminNotesRemindersBody.querySelector("#adminNotesReminderSearch"); input?.focus(); input?.setSelectionRange(position, position); });
  adminNotesRemindersBody.querySelector("#adminNotesReminderStatus")?.addEventListener("change", event => { adminNotesReminderStatus = event.target.value; adminNotesReminderSelectedId = ""; renderAdminNotesRemindersDialog(); });
  adminNotesRemindersBody.querySelector("#addAdminNotesReminderBtn")?.addEventListener("click", () => {
    if (!ensureCurrentUser("add a note or reminder")) return;
    const record = normalizeAdminNotesReminder({ id: crypto.randomUUID(), title: "New note or reminder", date: today, dueDate: "", status: "Open", priority: "Normal", updatedAt: new Date().toISOString() });
    state.adminNotesReminders.unshift(record);
    saveState();
    adminNotesReminderView = "all"; adminNotesReminderStatus = "All"; adminNotesReminderSearch = ""; adminNotesReminderSelectedId = record.id;
    renderAdminNotesRemindersDialog();
    adminNotesRemindersBody.querySelector(".admin-note-title")?.focus();
  });
  adminNotesRemindersBody.querySelector(".gather-notes-save")?.addEventListener("click", () => {
    if (!ensureCurrentUser("update a note or reminder")) return;
    const entry = state.adminNotesReminders.find(item => item.id === adminNotesReminderSelectedId);
    if (!entry) return;
    const root = adminNotesRemindersBody;
    Object.assign(entry, normalizeAdminNotesReminder({ ...entry,
      title: root.querySelector(".admin-note-title").value,
      category: root.querySelector(".admin-note-category-input").value,
      date: root.querySelector(".admin-note-date").value,
      dueDate: root.querySelector(".admin-note-due-date").value,
      status: root.querySelector(".admin-note-status-input").value,
      priority: root.querySelector(".admin-note-priority-input").value,
      representative: root.querySelector(".admin-note-representative").value,
      objective: root.querySelector(".admin-note-objective").value,
      reminder: root.querySelector(".admin-note-reminder").value,
      updatedAt: new Date().toISOString()
    }));
    saveState(); renderAdminNotesRemindersDialog();
  });
  adminNotesRemindersBody.querySelector(".gather-notes-delete")?.addEventListener("click", () => {
    const entry = state.adminNotesReminders.find(item => item.id === adminNotesReminderSelectedId);
    if (!entry || !ensureCurrentUser("delete a note or reminder") || !confirm(`Delete "${entry.title || "this note"}"?`)) return;
    state.adminNotesReminders = state.adminNotesReminders.filter(item => item.id !== entry.id);
    adminNotesReminderSelectedId = ""; saveState(); renderAdminNotesRemindersDialog();
  });
}
