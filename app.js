const STORAGE_KEY = "patrick-glanville-support-tracker-v1";
const allowedUsers = [
  { name: "Deric Glanville", email: "dglanville@gmail.com" },
  { name: "Patrick Glanville", email: "patrick.glanville@gmail.com" },
  { name: "Courtney Glanville", email: "courtney.glanville@gmail.com" },
  { name: "Georgette Hemmings", email: "hemmgeor@gmail.com" }
];

const seedData = {
  notes: "",
  tasks: [
    {
      id: crypto.randomUUID(),
      title: "Check Social Security retirement benefits",
      category: "Benefits",
      owner: "Patrick + brother",
      status: "Not started",
      priority: "High",
      due: "",
      next: "Create or access my Social Security account and estimate benefits at 61, 62, full retirement age, and 70.",
      notes: "Ask about timing, reduced early benefits, work income limits, and whether any spouse/divorced spouse benefits apply."
    },
    {
      id: crypto.randomUUID(),
      title: "Apply for DSS, SNAP, TANF, and Section 8 support",
      category: "Benefits",
      owner: "Patrick + brother",
      status: "Not started",
      priority: "Urgent",
      due: "",
      next: "Contact Texas Health and Human Services and local housing resources to ask about SNAP food benefits, TANF cash assistance, emergency aid, and Section 8 housing voucher waitlists.",
      notes: "DSS is often used generically for Department of Social Services. In Texas, start with Texas Health and Human Services for SNAP/TANF and local public housing authorities for Section 8. Track documents needed, application dates, case numbers, and interview deadlines.",
      tag: "Added/Updated"
    },
    {
      id: crypto.randomUUID(),
      title: "Prepare for and apply with Mercor.com",
      category: "Income",
      owner: "Patrick",
      status: "Not started",
      priority: "High",
      due: "",
      next: "Build a physics/math tutoring, AI evaluation, or technical-review resume profile before taking any assessment.",
      notes: "Practice timed reasoning and clear written explanations. Track login, application date, assessment score, and follow-up."
    },
    {
      id: crypto.randomUUID(),
      title: "Inventory available funds, including 401(k)",
      category: "Cash",
      owner: "Patrick",
      status: "Not started",
      priority: "Urgent",
      due: "",
      next: "List bank balances, retirement accounts, credit lines, and any hardship withdrawal or loan rules.",
      notes: "Avoid retirement withdrawals until tax, penalty, bankruptcy, and benefit consequences are understood."
    },
    {
      id: crypto.randomUUID(),
      title: "Ask Toyota of Irving about loan options",
      category: "Transportation",
      owner: "Brother",
      status: "Not started",
      priority: "Medium",
      due: "",
      next: "Call finance department and ask whether credit profile allows a low-cost replacement or refinance option.",
      notes: "Document quoted payment, APR, required down payment, trade-in treatment, and whether damaged Kia changes approval."
    },
    {
      id: crypto.randomUUID(),
      title: "Check rental car availability with Uber Eats",
      category: "Transportation",
      owner: "Patrick",
      status: "Not started",
      priority: "Urgent",
      due: "",
      next: "Check Uber driver app rental offers and compare weekly cost against expected food-delivery earnings.",
      notes: "Track provider, deposit, weekly rate, insurance, mileage limits, and whether Uber Eats delivery is eligible."
    },
    {
      id: crypto.randomUUID(),
      title: "Evaluate renting a car from Turo for transportation",
      category: "Transportation - Turo rental",
      owner: "Patrick + brother",
      status: "Not started",
      priority: "High",
      due: "",
      next: "Compare the total daily or weekly Turo cost against confirmed incoming money before booking.",
      notes: "Rationale: Turo may restore transportation for local job interviews, short-term work, medical appointments, and urgent errands, but it only helps if income exceeds the rental cost. Track rental price, fees, insurance/protection cost, deposit, fuel, mileage limits, expected daily earnings, and minimum cash needed for food, housing, and car-loan decisions. Do not book unless there is a clear plan for how the rental pays for itself or solves a specific high-value need.",
      tag: "Added/Updated"
    },
    {
      id: crypto.randomUUID(),
      title: "Use bicycle for local transportation and nearby jobs",
      category: "Transportation",
      owner: "Patrick",
      status: "Not started",
      priority: "High",
      due: "",
      next: "Map realistic bicycle range from home to grocery stores, restaurants, temp agencies, libraries, transit stops, and local employers.",
      notes: "Check bike condition, lock, lights, helmet, tire pump, weather limits, safe routes, and whether jobs can be reached without a car."
    },
    {
      id: crypto.randomUUID(),
      title: "Track actions already taken",
      category: "Accountability",
      owner: "Patrick + brothers",
      status: "In progress",
      priority: "High",
      due: "",
      next: "Enter every call, application, appointment, document request, and answer received.",
      notes: "This helps separate facts from fear and makes family conversations calmer."
    },
    {
      id: crypto.randomUUID(),
      title: "Define Plan B",
      category: "Plan",
      owner: "Patrick + brothers",
      status: "Not started",
      priority: "High",
      due: "",
      next: "Write a 30-day fallback plan if Kia repair, Uber rental, and Mercor do not work.",
      notes: "Include remote work, bus-accessible work, selling/settling the car, rooming options, and family support limits."
    },
    {
      id: crypto.randomUUID(),
      title: "Determine status of damaged Kia at Kia of Frisco",
      category: "Vehicle",
      owner: "Patrick",
      status: "Waiting",
      priority: "Urgent",
      due: "",
      next: "Call Kia of Frisco service department and confirm current location, repair estimate, release conditions, and written quote.",
      notes: "Ask for itemized estimate and photos. Confirm whether the car can be moved if repair is declined."
    },
    {
      id: crypto.randomUUID(),
      title: "Confirm Kia of Frisco storage fees",
      category: "Vehicle",
      owner: "Brother",
      status: "Not started",
      priority: "Urgent",
      due: "",
      next: "Ask in writing whether storage fees are being charged, from what date, daily amount, and grace period.",
      notes: "Get name of person who answered. Ask what must happen to stop fees."
    },
    {
      id: crypto.randomUUID(),
      title: "Contact Wells Fargo car financing about hardship options",
      category: "Debt",
      owner: "Patrick",
      status: "Not started",
      priority: "Urgent",
      due: "",
      next: "Call Wells Fargo auto-loan hardship department and explain recent hospitalization, CHF diagnosis, Afib diagnosis, loss of delivery income, and the $6,000 repair estimate.",
      notes: "Ask about deferment, hardship plan, settlement, voluntary surrender consequences, credit reporting, repossession timeline, and whether repair costs can be folded into a revised or higher loan.",
      tag: "Added/Updated"
    },
    {
      id: crypto.randomUUID(),
      title: "Call lenders to request suspension of payments",
      category: "Debt - lender hardship",
      owner: "Patrick + brother",
      status: "Not started",
      priority: "Urgent",
      due: "",
      next: "Make a lender list, call each hardship department, and ask whether payments can be suspended, deferred, reduced, or moved to the end of the loan.",
      notes: "Track lender name, phone number, account type, date called, representative name, hardship reason, documents requested, whether interest continues, credit-reporting impact, fees, due date changes, and written confirmation. Do not rely on verbal promises; ask for the hardship terms in writing.",
      tag: "Added/Updated"
    },
    {
      id: crypto.randomUUID(),
      title: "Research disability benefits eligibility",
      category: "Benefits",
      owner: "Patrick + brother",
      status: "Not started",
      priority: "Medium",
      due: "",
      next: "Review SSDI/SSI basics and document whether anxiety, depression, or other conditions limit substantial work.",
      notes: "Disability claims need medical documentation. Encourage treatment evaluation if symptoms affect work."
    },
    {
      id: crypto.randomUUID(),
      title: "Look into life insurance through Ethos",
      category: "Insurance",
      owner: "Patrick",
      status: "Not started",
      priority: "Low",
      due: "",
      next: "Review Ethos quote options and decide whether coverage is affordable after urgent cash-flow problems are stabilized.",
      notes: "Website: https://www.ethos.com/. Track premium, term, benefit amount, exclusions, and health questions."
    },
    {
      id: crypto.randomUUID(),
      title: "Look into bankruptcy options",
      category: "Debt",
      owner: "Patrick + brother",
      status: "Not started",
      priority: "Medium",
      due: "",
      next: "Schedule a free consultation with a Texas bankruptcy attorney or nonprofit credit counselor.",
      notes: "Ask about Chapter 7, Chapter 13, car loan treatment, retirement accounts, fees, and alternatives."
    },
    {
      id: crypto.randomUUID(),
      title: "Reset communication with brothers",
      category: "Family",
      owner: "Patrick + brothers",
      status: "Not started",
      priority: "High",
      due: "",
      next: "Agree on a simple weekly truth-only update: money, car, job applications, health, and asks.",
      notes: "Frame this as reducing panic and confusion, not blame. Track facts and commitments here."
    },
    {
      id: crypto.randomUUID(),
      title: "Assess depression and anxiety impact on job search",
      category: "Health",
      owner: "Patrick",
      status: "Not started",
      priority: "High",
      due: "",
      next: "Encourage primary-care or mental-health appointment and list symptoms that interfere with work.",
      notes: "If there is risk of self-harm or crisis, call or text 988 in the United States for immediate support."
    },
    {
      id: crypto.randomUUID(),
      title: "Change upstairs smoke detector battery",
      category: "Home safety",
      owner: "Brother",
      status: "Not started",
      priority: "Medium",
      due: "",
      next: "Replace battery, test alarm, and record date completed.",
      notes: "Bring the correct battery size and a stable ladder."
    }
  ]
};

let state = loadState();

const taskList = document.querySelector("#taskList");
const searchInput = document.querySelector("#searchInput");
const statusFilter = document.querySelector("#statusFilter");
const priorityFilter = document.querySelector("#priorityFilter");
const globalNotes = document.querySelector("#globalNotes");
const taskDialog = document.querySelector("#taskDialog");
const taskForm = document.querySelector("#taskForm");
const userSelect = document.querySelector("#userSelect");
const historyDialog = document.querySelector("#historyDialog");

const fields = {
  id: document.querySelector("#taskId"),
  title: document.querySelector("#taskTitle"),
  category: document.querySelector("#taskCategory"),
  owner: document.querySelector("#taskOwner"),
  status: document.querySelector("#taskStatus"),
  priority: document.querySelector("#taskPriority"),
  due: document.querySelector("#taskDue"),
  percent: document.querySelector("#taskPercent"),
  next: document.querySelector("#taskNext"),
  notes: document.querySelector("#taskNotes"),
  comment: document.querySelector("#taskComment"),
  comments: document.querySelector("#taskComments")
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return initializeState(structuredClone(seedData));
  try {
    const parsed = JSON.parse(saved);
    const loaded = {
      notes: parsed.notes || "",
      currentUser: parsed.currentUser || allowedUsers[0].email,
      history: Array.isArray(parsed.history) ? parsed.history : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : structuredClone(seedData.tasks)
    };
    addMissingSeedTasks(loaded);
    return initializeState(loaded);
  } catch {
    return initializeState(structuredClone(seedData));
  }
}

function initializeState(loaded) {
  loaded.currentUser = allowedUsers.some(user => user.email === loaded.currentUser)
    ? loaded.currentUser
    : allowedUsers[0].email;
  loaded.history = Array.isArray(loaded.history) ? loaded.history : [];
  loaded.tasks = loaded.tasks.map(task => ({
    percent: statusToPercent(task.status),
    comments: [],
    ...task,
    percent: normalizePercent(task.percent ?? statusToPercent(task.status)),
    comments: Array.isArray(task.comments) ? task.comments : []
  }));
  return loaded;
}

function normalizePercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function statusToPercent(status) {
  if (status === "Done") return 100;
  if (status === "In progress") return 50;
  if (status === "Waiting") return 35;
  if (status === "Blocked") return 20;
  return 0;
}

function addMissingSeedTasks(loaded) {
  markUpdatedSections(loaded.tasks);
  const existingTitles = new Set(loaded.tasks.map(task => task.title));
  seedData.tasks.forEach(task => {
    if (!existingTitles.has(task.title)) {
      loaded.tasks.push(structuredClone(task));
    }
  });
  markUpdatedSections(loaded.tasks);
}

function markUpdatedSections(tasks) {
  const loanTasks = tasks.filter(task =>
    task.title === "Contact car loan company in Dallas" ||
    task.title === "Contact Wells Fargo car financing about hardship options"
  );
  const loanTask = loanTasks[0];
  if (loanTask) {
    loanTask.title = "Contact Wells Fargo car financing about hardship options";
    loanTask.category = "Debt";
    loanTask.priority = "Urgent";
    loanTask.next = "Call Wells Fargo auto-loan hardship department and explain recent hospitalization, CHF diagnosis, Afib diagnosis, loss of delivery income, and the $6,000 repair estimate.";
    loanTask.notes = "Ask about deferment, hardship plan, settlement, voluntary surrender consequences, credit reporting, repossession timeline, and whether repair costs can be folded into a revised or higher loan.";
    loanTask.tag = "Added/Updated";
  }
  loanTasks.slice(1).forEach(duplicate => {
    const index = tasks.indexOf(duplicate);
    if (index >= 0) tasks.splice(index, 1);
  });

  const benefitsTask = tasks.find(task => task.title === "Apply for DSS, SNAP, TANF, and Section 8 support");
  if (benefitsTask) {
    benefitsTask.tag = "Added/Updated";
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;
  const priority = priorityFilter.value;

  const filtered = state.tasks.filter(task => {
    const haystack = Object.values(task).join(" ").toLowerCase();
    return (!query || haystack.includes(query))
      && (status === "all" || task.status === status)
      && (priority === "all" || task.priority === priority);
  });

  taskList.innerHTML = "";
  filtered.forEach(task => taskList.appendChild(createTaskCard(task)));
  updateProgress();
  globalNotes.value = state.notes;
  userSelect.value = state.currentUser;
}

function createTaskCard(task) {
  const card = document.createElement("article");
  card.className = "task-card";

  const header = document.createElement("header");
  const title = document.createElement("h2");
  title.textContent = task.title;
  const priority = document.createElement("span");
  priority.className = `pill ${task.priority}`;
  priority.textContent = task.priority;
  const badges = document.createElement("div");
  badges.className = "badge-row";
  badges.appendChild(priority);
  if (task.tag) {
    const tag = document.createElement("span");
    tag.className = "change-tag";
    tag.textContent = task.tag;
    badges.appendChild(tag);
  }
  header.append(title, badges);

  const meta = document.createElement("div");
  meta.className = "task-meta";
  meta.innerHTML = `
    <span>${escapeHtml(task.category || "Uncategorized")}</span>
    <span>${escapeHtml(task.owner || "No owner")}</span>
    <span>${task.due ? `Due ${escapeHtml(task.due)}` : "No due date"}</span>
    <span>${normalizePercent(task.percent)}% complete</span>
  `;

  const meter = document.createElement("div");
  meter.className = "task-meter";
  meter.innerHTML = `<span style="width: ${normalizePercent(task.percent)}%"></span>`;

  const next = document.createElement("p");
  next.textContent = task.next || "No next step recorded.";

  const notes = document.createElement("p");
  notes.className = "task-meta";
  notes.textContent = task.notes || "No notes yet.";

  const latestComment = document.createElement("p");
  latestComment.className = "latest-comment";
  latestComment.textContent = formatLatestComment(task);

  const footer = document.createElement("footer");
  const select = document.createElement("select");
  select.className = "status-select";
  ["Not started", "In progress", "Waiting", "Blocked", "Done"].forEach(status => {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = status;
    option.selected = task.status === status;
    select.appendChild(option);
  });
  select.addEventListener("change", () => {
    const before = task.status;
    task.status = select.value;
    if (select.value === "Done") task.percent = 100;
    else if (before === "Done" && task.percent === 100) task.percent = statusToPercent(select.value);
    recordUpdate(task, `Status changed from ${before} to ${select.value}`);
    saveState();
    render();
  });

  const edit = document.createElement("button");
  edit.type = "button";
  edit.textContent = "Edit";
  edit.addEventListener("click", () => openTask(task.id));

  footer.append(select, edit);
  card.append(header, meta, meter, next, notes, latestComment, footer);
  return card;
}

function formatLatestComment(task) {
  const latest = task.comments?.[task.comments.length - 1];
  if (!latest) return "No comments yet.";
  return `Latest: ${latest.authorName} on ${formatDateTime(latest.createdAt)} - ${latest.text}`;
}

function updateProgress() {
  const total = state.tasks.length || 1;
  const done = state.tasks.filter(task => task.status === "Done").length;
  const blocked = state.tasks.filter(task => task.status === "Blocked").length;
  const active = state.tasks.length - done;
  const average = state.tasks.reduce((sum, task) => sum + normalizePercent(task.percent), 0) / total;
  document.querySelector("#completeCount").textContent = done;
  document.querySelector("#activeCount").textContent = active;
  document.querySelector("#blockedCount").textContent = blocked;
  document.querySelector("#progressFill").style.width = `${Math.round(average)}%`;
}

function openTask(id) {
  const task = state.tasks.find(item => item.id === id) || {
    id: crypto.randomUUID(),
    title: "",
    category: "",
    owner: "",
    status: "Not started",
    priority: "Medium",
    due: "",
    percent: 0,
    next: "",
    notes: "",
    comments: []
  };
  fields.id.value = task.id;
  fields.title.value = task.title;
  fields.category.value = task.category;
  fields.owner.value = task.owner;
  fields.status.value = task.status;
  fields.priority.value = task.priority;
  fields.due.value = task.due;
  fields.percent.value = normalizePercent(task.percent);
  fields.next.value = task.next;
  fields.notes.value = task.notes;
  fields.comment.value = "";
  renderTaskComments(task);
  document.querySelector("#deleteTaskBtn").hidden = !state.tasks.some(item => item.id === task.id);
  taskDialog.showModal();
}

function renderTaskComments(task) {
  fields.comments.innerHTML = "";
  if (!task.comments?.length) {
    fields.comments.textContent = "No comments yet.";
    return;
  }
  task.comments.slice().reverse().forEach(comment => {
    const item = document.createElement("article");
    item.className = "comment-item";
    item.innerHTML = `
      <strong>${escapeHtml(comment.authorName)}</strong>
      <span>${escapeHtml(formatDateTime(comment.createdAt))}</span>
      <p>${escapeHtml(comment.text)}</p>
    `;
    fields.comments.appendChild(item);
  });
}

function closeDialog() {
  taskDialog.close();
  taskForm.reset();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function currentUser() {
  return allowedUsers.find(user => user.email === state.currentUser) || allowedUsers[0];
}

function buildChangeSummary(before, after, commentText) {
  const changes = [];
  if (!before) changes.push("Task created");
  else {
    if (before.status !== after.status) changes.push(`Status changed from ${before.status} to ${after.status}`);
    if (normalizePercent(before.percent) !== normalizePercent(after.percent)) {
      changes.push(`Percent complete changed from ${normalizePercent(before.percent)}% to ${normalizePercent(after.percent)}%`);
    }
    if (before.next !== after.next) changes.push("Next step updated");
    if (before.notes !== after.notes) changes.push("Notes updated");
    if (before.owner !== after.owner) changes.push("Owner updated");
    if (before.due !== after.due) changes.push("Due date updated");
  }
  if (commentText) changes.push("Comment added");
  return changes.join("; ") || "Task saved";
}

function recordUpdate(task, summary) {
  const user = currentUser();
  state.history.unshift({
    id: crypto.randomUUID(),
    taskId: task.id,
    taskTitle: task.title,
    userEmail: user.email,
    userName: user.name,
    createdAt: new Date().toISOString(),
    summary,
    percent: normalizePercent(task.percent),
    status: task.status
  });
  state.history = state.history.slice(0, 500);
}

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function renderHistory() {
  const historyList = document.querySelector("#historyList");
  historyList.innerHTML = "";
  if (!state.history.length) {
    historyList.textContent = "No updates recorded yet.";
    return;
  }
  state.history.forEach(entry => {
    const item = document.createElement("article");
    item.className = "history-item";
    item.innerHTML = `
      <strong>${escapeHtml(entry.taskTitle)}</strong>
      <span>${escapeHtml(entry.userName)} &lt;${escapeHtml(entry.userEmail)}&gt; - ${escapeHtml(formatDateTime(entry.createdAt))}</span>
      <p>${escapeHtml(entry.summary)}. Status: ${escapeHtml(entry.status)}. Complete: ${normalizePercent(entry.percent)}%.</p>
    `;
    historyList.appendChild(item);
  });
}

function populateUsers() {
  userSelect.innerHTML = "";
  allowedUsers.forEach(user => {
    const option = document.createElement("option");
    option.value = user.email;
    option.textContent = `${user.name} <${user.email}>`;
    userSelect.appendChild(option);
  });
}

taskForm.addEventListener("submit", event => {
  event.preventDefault();
  const existing = state.tasks.find(item => item.id === fields.id.value);
  const commentText = fields.comment.value.trim();
  const comments = existing?.comments ? [...existing.comments] : [];
  const user = currentUser();
  if (commentText) {
    comments.push({
      id: crypto.randomUUID(),
      authorEmail: user.email,
      authorName: user.name,
      createdAt: new Date().toISOString(),
      text: commentText
    });
  }
  const task = {
    id: fields.id.value || crypto.randomUUID(),
    title: fields.title.value.trim(),
    category: fields.category.value.trim(),
    owner: fields.owner.value.trim(),
    status: fields.status.value,
    priority: fields.priority.value,
    due: fields.due.value,
    percent: normalizePercent(fields.percent.value),
    next: fields.next.value.trim(),
    notes: fields.notes.value.trim(),
    tag: existing?.tag,
    comments
  };
  const index = state.tasks.findIndex(item => item.id === task.id);
  if (index >= 0) state.tasks[index] = task;
  else state.tasks.unshift(task);
  recordUpdate(task, buildChangeSummary(existing, task, commentText));
  saveState();
  closeDialog();
  render();
});

document.querySelector("#deleteTaskBtn").addEventListener("click", () => {
  const title = fields.title.value || "this task";
  if (!confirm(`Delete "${title}"?`)) return;
  const deletedTask = state.tasks.find(task => task.id === fields.id.value);
  state.tasks = state.tasks.filter(task => task.id !== fields.id.value);
  if (deletedTask) recordUpdate(deletedTask, "Task deleted");
  saveState();
  closeDialog();
  render();
});

document.querySelector("#addTaskBtn").addEventListener("click", () => openTask());
document.querySelector("#closeDialog").addEventListener("click", closeDialog);
document.querySelector("#cancelTaskBtn").addEventListener("click", closeDialog);
document.querySelector("#historyBtn").addEventListener("click", () => {
  renderHistory();
  historyDialog.showModal();
});
document.querySelector("#closeHistoryDialog").addEventListener("click", () => historyDialog.close());
searchInput.addEventListener("input", render);
statusFilter.addEventListener("change", render);
priorityFilter.addEventListener("change", render);
userSelect.addEventListener("change", () => {
  state.currentUser = userSelect.value;
  saveState();
});

globalNotes.addEventListener("input", () => {
  state.notes = globalNotes.value;
  saveState();
});

document.querySelector("#exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `patrick-glanville-tracker-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});

document.querySelector("#importInput").addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported.tasks)) throw new Error("Missing task list");
      state = initializeState({
        notes: imported.notes || "",
        currentUser: imported.currentUser,
        history: imported.history,
        tasks: imported.tasks
      });
      addMissingSeedTasks(state);
      state = initializeState(state);
      saveState();
      render();
    } catch (error) {
      alert(`Import failed: ${error.message}`);
    }
  };
  reader.readAsText(file);
  event.target.value = "";
});

document.querySelector("#pdfBtn").addEventListener("click", () => {
  searchInput.value = "";
  statusFilter.value = "all";
  priorityFilter.value = "all";
  render();
  window.print();
});

document.querySelector("#resetBtn").addEventListener("click", () => {
  if (!confirm("Reset tracker to the original starting tasks?")) return;
  state = initializeState(structuredClone(seedData));
  saveState();
  render();
});

populateUsers();
render();
