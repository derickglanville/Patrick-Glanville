const PATRICK_STORAGE_KEY = "patrick-glanville-support-tracker-v1";
const THEODORE_STORAGE_KEY = "theodore-glanville-support-tracker-v1";
const ADMIN_STORAGE_KEY = "admin-glanville-support-tracker-v1";
const PATRICK_WATCH_STORAGE_KEY = "patrick-glanville-patrick-watch-v1";
const THEODORE_WATCH_STORAGE_KEY = "theodore-glanville-client-watch-v1";
const ADMIN_WATCH_STORAGE_KEY = "admin-glanville-client-watch-v1";
const PATRICK_TASK_VIEW_KEY = "patrick-glanville-task-view-v1";
const THEODORE_TASK_VIEW_KEY = "theodore-glanville-task-view-v1";
const ADMIN_TASK_VIEW_KEY = "admin-glanville-task-view-v1";
const DATA_VERSION = 2026071301;
const PANEL_VISIBILITY_VERSION = 2026071302;
const TASK_GROUP_COLLAPSE_VERSION = 2026070101;
const BUILD_INFO = {
  commit: "working-tree",
  timestamp: "2026-07-06T10:00:00-04:00",
  builtAt: "2026-07-06T10:00:00-04:00",
  label: "Local build"
};
const GITHUB_COMMIT_API = "https://api.github.com/repos/derickglanville/Patrick-Glanville/commits/main";
const SUPABASE_TABLE = "tracker_state";
const FIREBASE_REFRESH_SIGNAL_TABLE = "tracker_refresh_signals";
const PATRICK_SUPABASE_STATE_ID = "patrick-glanville";
const THEODORE_SUPABASE_STATE_ID = "theodore-glanville";
const ADMIN_SUPABASE_STATE_ID = "admin-glanville";
const SUPABASE_SAVE_DELAY_MS = 700;
const PATRICK_REMOTE_UPDATED_AT_KEY = "patrick-glanville-remote-updated-at-v1";
const THEODORE_REMOTE_UPDATED_AT_KEY = "theodore-glanville-remote-updated-at-v1";
const ADMIN_REMOTE_UPDATED_AT_KEY = "admin-glanville-remote-updated-at-v1";
const URGENCY_REPORT_HELPER_URL = "http://127.0.0.1:8767";
const DERIC_EMAIL = "dglanville@gmail.com";
const DERIC_PIN = "3141";
const THEODORE_CLIENT_ACCESS_PIN = "3141";
const ADMIN_CLIENT_ACCESS_PIN = "314123";
const PATRICK_EMAIL = "patrick.glanville@gmail.com";
const THEODORE_EMAIL = "theodore.glanville@gmail.com";
const ADMIN_EMAIL = DERIC_EMAIL;
const EMAIL_REPORT_RECIPIENTS = [
  DERIC_EMAIL,
  PATRICK_EMAIL
];
const clientConfigs = {
  patrick: {
    id: "patrick",
    shortName: "Patrick",
    fullName: "Patrick Glanville",
    title: "3G Tracking and Notifications",
    browserTitle: "3G Tracking and Notifications",
    lede: "Tracking dashboard for transportation, income, benefits, family communication, and home-safety tasks.",
    storageKey: PATRICK_STORAGE_KEY,
    watchKey: PATRICK_WATCH_STORAGE_KEY,
    taskViewKey: PATRICK_TASK_VIEW_KEY,
    supabaseStateId: PATRICK_SUPABASE_STATE_ID,
    remoteUpdatedAtKey: PATRICK_REMOTE_UPDATED_AT_KEY,
    requiresAccessPin: false,
    supportsReports: true,
    supportsLifeAdmin: true,
    overviewCards: [
      { label: "Car repair estimate", value: "$6,000", detail: "2023 Kia damaged while working Uber Eats" },
      { label: "Loan balance", value: "$15,000", detail: "Clarify lender, hardship options, and status" },
      { label: "Primary risk", value: "No transport", detail: "Compare bicycle, Turo, and rental costs against actual income" },
      { label: "Support needs", value: "Anxiety", detail: "Track mental health, honesty, and Plan B steps" }
    ]
  },
  theodore: {
    id: "theodore",
    shortName: "Derick",
    fullName: "Derick Glanville",
    title: "3G Tracking and Notifications",
    browserTitle: "3G Tracking and Notifications",
    lede: "A focused dashboard for tracking work, expenses, and daily follow-through.",
    storageKey: THEODORE_STORAGE_KEY,
    watchKey: THEODORE_WATCH_STORAGE_KEY,
    taskViewKey: THEODORE_TASK_VIEW_KEY,
    supabaseStateId: THEODORE_SUPABASE_STATE_ID,
    remoteUpdatedAtKey: THEODORE_REMOTE_UPDATED_AT_KEY,
    requiresAccessPin: true,
    supportsReports: false,
    supportsLifeAdmin: false,
    overviewCards: [
      { label: "Immediate income goal", value: "Food industry work", detail: "Target restaurants, prep, dish, cafeteria, catering, and kitchen support jobs" },
      { label: "Training priority", value: "Stay current", detail: "Resume paying for physical training sessions on a consistent schedule" },
      { label: "Primary risk", value: "Income instability", detail: "Keep job applications and follow-ups moving until steady pay begins" },
      { label: "Support needs", value: "Daily structure", detail: "Track check-ins, next actions, and completed items each day" }
    ]
  },
  admin: {
    id: "admin",
    shortName: "Admin",
    fullName: "Admin",
    title: "3G Tracking and Notifications",
    browserTitle: "3G Tracking and Notifications",
    lede: "An administrative dashboard for managing monthly bills, follow-through, and shared household financial actions.",
    storageKey: ADMIN_STORAGE_KEY,
    watchKey: ADMIN_WATCH_STORAGE_KEY,
    taskViewKey: ADMIN_TASK_VIEW_KEY,
    supabaseStateId: ADMIN_SUPABASE_STATE_ID,
    remoteUpdatedAtKey: ADMIN_REMOTE_UPDATED_AT_KEY,
    requiresAccessPin: true,
    supportsReports: false,
    supportsLifeAdmin: false,
    overviewCards: [
      { label: "Monthly Budget Fund", value: "$5,000", detail: "Track whether the monthly fund covers all listed obligations" },
      { label: "Primary action", value: "Pay monthly bills", detail: "Keep due dates, paid dates, and balances organized in one place" },
      { label: "Primary risk", value: "Coverage gap", detail: "Watch for months where MBF does not cover total bill amounts" },
      { label: "Support needs", value: "Admin discipline", detail: "Maintain current paid status, due dates, and notes for every account" }
    ]
  }
};
const MEDICATION_LIST_TASK_TITLE = "Create medication list with dosage and refill dates";
const HEALTH_INSURANCE_TASK_TITLE = "Get health insurance before current coverage expires";
const DEPRESSION_TASK_TITLE = "Assess depression and anxiety impact on job search";
const ETHOS_TASK_TITLE = "Look into life insurance through Ethos";
const TOP_TODO_LIST_TITLE = "Priority To-Do List";
const DAILY_PROJECT_MANAGER_TITLE = "Daily Action Project Manager";
const MEDICATION_REFILL_ALERT_WINDOW_DAYS = 7;
let supabaseClient = null;
let supabaseEnabled = false;
let supabaseStatus = "Checking Firebase Firestore availability";
let supabaseSaveTimer = null;
let supabaseInitTimeout = null;
let supabaseInitStartedAt = 0;
let remoteUpdatedAt = "";
let applyingRemoteState = false;
let sharedStateUnsubscribe = null;
let sharedStateListenerId = "";
let pendingLocalSharedSaveAt = "";
let refreshSignalUnsubscribe = null;
let refreshSignalListenerId = "";
let lastSeenRefreshSignalAt = "";
let autoCalculateBillsOnLoadPending = true;
const DEVICE_SESSION_ID = `session-${Math.random().toString(36).slice(2)}-${Date.now()}`;
const allowedUsers = [
  { name: "Deric Glanville", email: DERIC_EMAIL },
  { name: "Patrick Glanville", email: PATRICK_EMAIL },
  { name: "Courtney Glanville", email: "courtney.glanville@gmail.com" },
  { name: "Georgette Hemmings", email: "hemmgeor@gmail.com" }
];
const baseCategories = [
  "Priority to-do list",
  "Daily action manager",
  "Job - CloudResearch",
  "Job - Data Annotation",
  "Job - Easy Money (HEB, Walmart, Home Depot, Kroger)",
  "Job - Teaching Assistance",
  "Job - Mercor",
  "Job - Micro1",
  "Job - Outlier",
  "Job - Prolific",
  "Career strategy",
  "Job barriers",
  "Income pathways",
  "N/A",
  "Accountability",
  "Benefits",
  "Cash",
  "Debt",
  "Debt - lender hardship",
  "Family",
  "Health",
  "Home safety",
  "Household tasks",
  "Income",
  "Insurance",
  "Medical bills",
  "Plan",
  "Transportation",
  "Transportation - Turo rental",
  "Vehicle"
];
const statusOptions = ["N/A", "Not started", "In progress", "Waiting", "Blocked", "On-Hold", "Done"];
const priorityOptions = ["Urgent", "High", "Medium", "Low"];
const billStatusOptions = ["Unpaid", "Scheduled", "Paid", "Deferred", "Past due", "N/A"];
const taskGroupOrder = [
  "Priority To-Do List",
  "Daily Project Manager",
  "Jobs and Income",
  "Career Strategy and Income Reset",
  "Benefits and Assistance",
  "Transportation and Vehicle",
  "Debt, Bills, and Legal",
  "Health and Insurance",
  "Household and Home",
  "Family, Plan, and Accountability",
  "Other"
];
const healthAndInsuranceCardOrder = [
  buildSeedTaskKey(HEALTH_INSURANCE_TASK_TITLE),
  buildSeedTaskKey(MEDICATION_LIST_TASK_TITLE),
  buildSeedTaskKey(DEPRESSION_TASK_TITLE),
  buildSeedTaskKey(ETHOS_TASK_TITLE)
];
const OUTLIER_COMMENT_TEXT = `What it is
• AI training and evaluation work.
• Reviewing AI-generated code.
• Writing prompts.
• Rating AI responses.
• Solving technical problems.
• Some projects require React, C#, Python, Java, or data science skills.

Income Potential
• General AI trainer: ~$15-$35/hour
• Experienced software engineers: ~$30-$60+/hour
• Specialized coding projects can occasionally pay more.

Pros
• Remote.
• Flexible schedule.
• Strong demand for experienced programmers.
• Physics and software background is attractive.

Cons
• Work availability can fluctuate.
• Projects come and go.
• Assessments can be difficult.
• No guarantee of full-time hours.

Assessment
This is a legitimate opportunity and worth pursuing. The bigger challenge may be getting assigned enough consistent work after the coding tests.

Rating: 8/10`;
const MICRO1_COMMENT_TEXT = `What it is
• AI-assisted recruiting platform.
• Places software engineers with startups and technology companies.
• Uses AI interviews and screening.

Income Potential
• Contract positions often range from $40,000-$80,000/year for junior roles.
• Experienced engineers can reach $80,000-$150,000+.
• Some remote contracts exceed that.

Pros
• Potential for real software engineering jobs.
• Higher upside than AI training.
• Long-term contracts are possible.

Cons
• More competitive.
• AI interviews can be challenging.
• Age bias can exist indirectly, although experience is valuable.

Assessment
This may be the bigger upside opportunity. If Patrick interviews well and demonstrates current skills in modern frameworks, the payoff could be much higher than gig-based AI training.`;
const defaultExpandedTaskGroups = [
  "Priority To-Do List"
];
const categoryOrder = [
  "Priority to-do list",
  "Daily action manager",
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
  "N/A"
];

const closedTaskStatuses = ["Done", "On-Hold"];

function isClosedTaskStatus(status) {
  return closedTaskStatuses.includes(status);
}

function isClosedTask(task) {
  if (!task) return false;
  return isClosedTaskStatus(task.status) || normalizePercent(task.percent) === 100;
}

function buildSeedTaskKey(title = "") {
  return String(title)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function findTaskByTitleOrSeedKey(tasks, title) {
  if (!Array.isArray(tasks) || !title) return null;
  const exactMatch = tasks.find(task => task.title === title);
  if (exactMatch) return exactMatch;

  const seedKey = buildSeedTaskKey(title);
  const seedMatch = tasks.find(task => task.seedKey === seedKey);
  if (seedMatch) return seedMatch;

  if (title === MEDICATION_LIST_TASK_TITLE) {
    return tasks.find(task => isMedicationGridTask(task) || isMedicationLikeTask(task)) || null;
  }

  return null;
}

function buildSeedComment(text, authorName = "Opportunity note", authorEmail = "") {
  return {
    id: crypto.randomUUID(),
    authorEmail,
    authorName,
    createdAt: new Date().toISOString(),
    text
  };
}

function isMedicationLikeTask(task) {
  const title = (task?.title || "").toLowerCase();
  const next = (task?.next || "").toLowerCase();
  const notes = (task?.notes || "").toLowerCase();
  return (
    (title.includes("medication") && title.includes("dosage") && title.includes("refill"))
    || next.includes("list every current medication")
    || notes.includes("track medication details")
  );
}

function isMedicationGridTask(task) {
  return task?.seedKey === buildSeedTaskKey(MEDICATION_LIST_TASK_TITLE) || isMedicationLikeTask(task);
}

function isDailyProjectManagerTask(task) {
  const seedKey = buildSeedTaskKey(DAILY_PROJECT_MANAGER_TITLE);
  return task?.seedKey === seedKey
    || task?.title === DAILY_PROJECT_MANAGER_TITLE
    || task?.category === "Daily action manager";
}

function isTopTodoListTask(task) {
  const seedKey = buildSeedTaskKey(TOP_TODO_LIST_TITLE);
  return task?.seedKey === seedKey
    || task?.title === TOP_TODO_LIST_TITLE
    || task?.category === "Priority to-do list";
}

function buildTodoItem(title) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title,
    status: "Not started",
    createdAt: now,
    closedAt: "",
    notes: ""
  };
}

function normalizeCurrencyCell(value) {
  if (value === null || value === undefined) return 0;
  const cleaned = String(value).replace(/[$,\s]/g, "").trim();
  if (!cleaned || cleaned.toUpperCase() === "N/A") return 0;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

function normalizeSpreadsheetDate(value) {
  const text = String(value || "").trim();
  if (!text || text.toUpperCase() === "N/A" || text === "1/0/1900") return "";
  const parts = text.split("/");
  if (parts.length !== 3) return "";
  const [monthText, dayText, yearText] = parts;
  const month = Number(monthText);
  const day = Number(dayText);
  const year = Number(yearText);
  if (!Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(year)) return "";
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildAdminBillFromTable(row) {
  const currentBalance = normalizeCurrencyCell(row.currentBalance);
  const due = normalizeSpreadsheetDate(row.due);
  const paidDate = normalizeSpreadsheetDate(row.paidDate);
  const amount = normalizeCurrencyCell(row.paidAmount);

  return {
    id: crypto.randomUUID(),
    name: row.name,
    amount,
    due,
    status: paidDate ? "Paid" : "Unpaid",
    notes: "",
    apr: row.apr && row.apr !== "N/A" ? String(row.apr) : "",
    previousBalance: currentBalance,
    currentBalance,
    creditLimit: normalizeCurrencyCell(row.creditLimit),
    paidAmount: normalizeCurrencyCell(row.paidAmount),
    transactionNumber: row.transactionNumber && row.transactionNumber !== "N/A" ? String(row.transactionNumber) : "",
    paidDate,
    statusTracksPaidDate: true
  };
}

function buildAdminSeedBills() {
  return [
    { name: "Yorktown Taxes and Insurance", apr: "N/A", currentBalance: "$0.00", creditLimit: "$0.00", paidAmount: "N/A", transactionNumber: "N/A", due: "7/15/2026", paidDate: "N/A" },
    { name: "Green Sky", apr: "10%", currentBalance: "$38,040.00", creditLimit: "$49,000.00", paidAmount: "$0.00", transactionNumber: "7/1/2026", due: "7/1/2026", paidDate: "7/1/2026" },
    { name: "YouTube TV", apr: "N/A", currentBalance: "$0.00", creditLimit: "$0.00", paidAmount: "$72.99", transactionNumber: "7/1/2026", due: "6/1/2026", paidDate: "1/0/1900" },
    { name: "FIOS Internet", apr: "N/A", currentBalance: "$0.00", creditLimit: "$0.00", paidAmount: "$95.00", transactionNumber: "7/1/2026", due: "6/1/2026", paidDate: "7/1/2026" },
    { name: "Verizon Cellphone", apr: "N/A", currentBalance: "$0.00", creditLimit: "$0.00", paidAmount: "$136.00", transactionNumber: "7/1/2026", due: "6/1/2026", paidDate: "7/1/2026" },
    { name: "BJ's Club", apr: "30%", currentBalance: "$420.00", creditLimit: "$3,300.00", paidAmount: "$80.00", transactionNumber: "", due: "7/2/2026", paidDate: "7/2/2026" },
    { name: "Citi Simplicity", apr: "25.99", currentBalance: "$4,300.00", creditLimit: "$6,700.00", paidAmount: "$120.00", transactionNumber: "4504", due: "7/2/2026", paidDate: "7/2/2026" },
    { name: "Bank of America", apr: "22.24", currentBalance: "$7,626.77", creditLimit: "$17,000.00", paidAmount: "$220.00", transactionNumber: "b142qh3bcb", due: "7/2/2026", paidDate: "7/2/2026" },
    { name: "Lowe's", apr: "26.99", currentBalance: "$4,561.65", creditLimit: "$8,474.00", paidAmount: "$180.00", transactionNumber: "3428268456", due: "7/2/2026", paidDate: "7/2/2026" },
    { name: "Third Federal", apr: "5.5", currentBalance: "$60,999.00", creditLimit: "$75,000.00", paidAmount: "$0.00", transactionNumber: "", due: "7/6/2026", paidDate: "" },
    { name: "American Express", apr: "27.24", currentBalance: "$9,270.00", creditLimit: "$15,000.00", paidAmount: "$300.00", transactionNumber: ";W4732.", due: "7/6/2026", paidDate: "7/6/2026" },
    { name: "Raymour Flanigan", apr: "29.99", currentBalance: "$0.00", creditLimit: "$7,000.00", paidAmount: "N/A", transactionNumber: "N/A", due: "N/A", paidDate: "N/A" },
    { name: "Barclay View (Uber)", apr: "29.99", currentBalance: "$2,700.00", creditLimit: "$3,550.00", paidAmount: "$150.00", transactionNumber: "1432991600", due: "7/8/2026", paidDate: "7/8/2026" },
    { name: "Amazon - Chase", apr: "27.29", currentBalance: "$5,897.16", creditLimit: "$8,000.00", paidAmount: "$200.00", transactionNumber: "9529078151", due: "7/11/2026", paidDate: "7/11/2026" },
    { name: "Citi Bank - Money", apr: "25.24", currentBalance: "$2,800.00", creditLimit: "$5,370.00", paidAmount: "", transactionNumber: "", due: "7/16/2026", paidDate: "" },
    { name: "Best Buy", apr: "29.99", currentBalance: "$2,800.00", creditLimit: "$5,600.00", paidAmount: "", transactionNumber: "", due: "7/16/2026", paidDate: "" },
    { name: "Key Bank", apr: "20.24", currentBalance: "$3,600.00", creditLimit: "$6,700.00", paidAmount: "", transactionNumber: "", due: "7/18/2026", paidDate: "" },
    { name: "Amex Centurion", apr: "27.24", currentBalance: "$3,080.00", creditLimit: "$3,000.00", paidAmount: "", transactionNumber: "", due: "7/18/2026", paidDate: "" },
    { name: "Wells Fargo Credit", apr: "29.99", currentBalance: "$2,760.00", creditLimit: "$6,000.00", paidAmount: "", transactionNumber: "", due: "7/19/2026", paidDate: "" },
    { name: "Citizen Bank", apr: "20.24", currentBalance: "$2,744.00", creditLimit: "$5,000.00", paidAmount: "", transactionNumber: "", due: "7/21/2026", paidDate: "" },
    { name: "QuickSilver-CapOne", apr: "28.24", currentBalance: "$2,700.00", creditLimit: "$5,000.00", paidAmount: "", transactionNumber: "", due: "7/27/2026", paidDate: "" },
    { name: "CareCredit", apr: "26.99", currentBalance: "$0.00", creditLimit: "$3,600.00", paidAmount: "", transactionNumber: "", due: "7/30/2026", paidDate: "" },
    { name: "Apple Card", apr: "24.24", currentBalance: "$4,400.00", creditLimit: "$7,000.00", paidAmount: "", transactionNumber: "", due: "7/30/2026", paidDate: "" }
  ].map(buildAdminBillFromTable);
}

const seedData = {
  dataVersion: DATA_VERSION,
  notes: "",
  lastSavedAt: "",
  panelVisibilityVersion: PANEL_VISIBILITY_VERSION,
  hiddenPanels: {
    overview: true,
    patrickWatch: true,
    bills: true,
    budgetSnapshots: true,
    lifeAdmin: true
  },
  runningNotes: [],
  documents: [],
  collapsedTaskGroupsVersion: TASK_GROUP_COLLAPSE_VERSION,
  collapsedTaskGroups: {},
  billMonth: "",
  monthlyBudgetFund: 1500,
  budgetSnapshots: [],
  bills: [
    { id: crypto.randomUUID(), name: "Housing / rent", amount: 0, due: "", status: "Unpaid", notes: "" },
    { id: crypto.randomUUID(), name: "Car loan", amount: 0, due: "", status: "Unpaid", notes: "Ask lender about hardship suspension or deferment." },
    { id: crypto.randomUUID(), name: "Car repair / Kia of Frisco", amount: 6000, due: "", status: "Unpaid", notes: "Repair estimate and possible storage fees." },
    { id: crypto.randomUUID(), name: "American Express", amount: 180, due: "", status: "Unpaid", notes: "Starting balance: $730.86. Monthly payment: $180. Due on the 25th of each month." },
    { id: crypto.randomUUID(), name: "Baylor Scott and White", amount: 0, due: "", status: "Unpaid", notes: "Ask for payment suspension due to lack of income." },
    { id: crypto.randomUUID(), name: "Phone / internet", amount: 0, due: "", status: "Unpaid", notes: "" },
    { id: crypto.randomUUID(), name: "Food / groceries", amount: 0, due: "", status: "Unpaid", notes: "Track SNAP or grocery contribution separately if needed." }
  ],
  lifeAdminNotes: [
    { id: crypto.randomUUID(), item: "Cancel unused subscriptions", due: "", status: "Open", notes: "List every recurring charge and cancel anything not essential." },
    { id: crypto.randomUUID(), item: "Pay or file taxes", due: "", status: "Open", notes: "Confirm what tax years or payment plans need attention." },
    { id: crypto.randomUUID(), item: "Organize important documents", due: "", status: "Open", notes: "Collect IDs, medical bills, loan statements, benefit notices, and insurance papers." }
  ],
  tasks: [
    {
      id: crypto.randomUUID(),
      title: TOP_TODO_LIST_TITLE,
      category: "Priority to-do list",
      owner: "Patrick + Deric",
      status: "In progress",
      priority: "Urgent",
      due: "",
      next: "Use this list for the highest-priority daily and household actions. Keep active work visible and review closed items when needed.",
      notes: "Track completion status, creation date, closed date, and short notes for each item.",
      todoView: "active",
      todoItems: [
        "Training for EBT",
        "Have the necessary new uniform with extras",
        "Migrate ATT number to Verizon",
        "Pay health insurance",
        "Wells Fargo payoff",
        "Work at Market Street",
        "Prepare for Outlier AI test",
        "Manage medication list",
        "Cook meals",
        "Clean house",
        "Contribute to groceries",
        "Lawn maintenance",
        "Mow the grass",
        "Take out garbage"
      ].map(buildTodoItem),
      tag: "New",
      tagTone: "purple"
    },
    {
      id: crypto.randomUUID(),
      title: DAILY_PROJECT_MANAGER_TITLE,
      category: "Daily action manager",
      owner: "Patrick + Deric",
      status: "In progress",
      priority: "Urgent",
      due: "",
      next: "Use this daily project notebook to track the specific tasks Patrick needs to complete today and over the next few days, then check items off as they are finished.",
      notes: "This card is the daily command center for urgent life-management work. Track daily actions such as finding health insurance, getting medication, paying Kia of Frisco storage fees, terminating the Wells Fargo car loan, and moving job applications forward.",
      dailyChecklist: [
        { id: crypto.randomUUID(), title: "Find health insurance options and compare coverage", taskDate: "", status: "open", notes: "", noteEntries: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), completedAt: "" },
        { id: crypto.randomUUID(), title: "Confirm medication needs, refill timing, and pickup plan", taskDate: "", status: "open", notes: "", noteEntries: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), completedAt: "" },
        { id: crypto.randomUUID(), title: "Apply or follow up on at least one job opportunity", taskDate: "", status: "open", notes: "", noteEntries: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), completedAt: "" },
        { id: crypto.randomUUID(), title: "Resolve Kia of Frisco storage payment and Wells Fargo loan next step", taskDate: "", status: "open", notes: "", noteEntries: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), completedAt: "" }
      ],
      tag: "New",
      tagTone: "purple"
    },
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
      category: "Job - Mercor",
      owner: "Patrick",
      status: "Not started",
      priority: "High",
      due: "",
      next: "Build a physics/math tutoring, AI evaluation, or technical-review resume profile before taking any assessment.",
      notes: "Website: https://www.mercor.com/. Practice timed reasoning and clear written explanations. Track login, application date, assessment score, and follow-up."
    },
    {
      id: crypto.randomUUID(),
      title: "Apply for Data Annotation work",
      category: "Job - Data Annotation",
      owner: "Patrick",
      status: "In progress",
      priority: "Urgent",
      due: "2026-05-24",
      percent: 15,
      next: "Create or update the profile, prepare for any qualification test, and look for projects that use physics, math, writing, or reasoning skills.",
      notes: "Website: https://www.dataannotation.tech/. Track account setup, qualification status, projects available, hourly rate, payment method, and whether the work can be done from home.",
      tag: "Added/Updated"
    },
    {
      id: crypto.randomUUID(),
      title: "Apply for CloudResearch Connect studies",
      category: "Job - CloudResearch",
      owner: "Patrick",
      status: "In progress",
      priority: "Urgent",
      due: "2026-05-25",
      percent: 15,
      next: "Create a CloudResearch Connect participant account, complete onboarding, and check for paid research studies that can be done from home.",
      notes: "Website: https://connect.cloudresearch.com/participant/. Track account setup, profile completion, verification, study availability, expected pay, payout method, and any rejection or approval notes.",
      tag: "Added/Updated"
    },
    {
      id: crypto.randomUUID(),
      title: "Apply for Prolific research studies",
      category: "Job - Prolific",
      owner: "Patrick",
      status: "In progress",
      priority: "Urgent",
      due: "2026-05-24",
      percent: 15,
      next: "Create a Prolific participant account, complete the profile honestly, and check whether studies are available from his location.",
      notes: "Website: https://www.prolific.com/. Track approval status, profile completion, study availability, expected pay, payment method, and daily time spent checking for studies.",
      tag: "Added/Updated"
    },
    {
      id: crypto.randomUUID(),
      title: "Prepare for Outlier AI coding assessments",
      category: "Job - Outlier",
      owner: "Patrick",
      status: "In progress",
      priority: "High",
      due: "2026-06-15",
      percent: 20,
      next: "Complete prep work for the React and C#.NET assessments, then take both coding tests tomorrow.",
      notes: "Website: https://app.outlier.ai/. Patrick is already signed up. Track prep resources, practice results, assessment timing, score or feedback, and any follow-up request after the tests.",
      comments: [buildSeedComment(OUTLIER_COMMENT_TEXT)],
      tag: "Added/Updated"
    },
    {
      id: crypto.randomUUID(),
      title: "Track Micro1.ai AI training application",
      category: "Job - Micro1",
      owner: "Patrick",
      status: "In progress",
      priority: "High",
      due: "2026-06-14",
      percent: 35,
      next: "Record the interview with their AI on June 14, 2026 and watch for next-step emails, assessments, or recruiter follow-up.",
      notes: "Website: https://micro1.ai/. Patrick already applied and completed an AI interview on June 14, 2026. Track role details, pay structure, next screening steps, recruiter contact, and final decision timeline.",
      comments: [buildSeedComment(MICRO1_COMMENT_TEXT)],
      tag: "Added/Updated"
    },
    {
      id: crypto.randomUUID(),
      title: "Apply for minimum-wage local jobs (HEB, Walmart, Home Depot, Kroger)",
      category: "Job - Easy Money (HEB, Walmart, Home Depot, Kroger)",
      owner: "Patrick",
      status: "Not started",
      priority: "Urgent",
      due: "",
      next: "Show the submitted applications if they already exist. If not, apply today to nearby HEB, Walmart, Home Depot, and Kroger roles that are reachable by bicycle, bus, family ride, or short-term rental.",
      notes: "Priority: this is the most important work track because immediate hourly income can stabilize food, transportation, and housing. Websites: HEB careers https://careers.heb.com/, Walmart careers https://careers.walmart.com/, Home Depot careers https://careers.homedepot.com/, Kroger careers https://www.krogerfamilycareers.com/. Track job title, location, distance, shift, pay, application date, screenshot or confirmation number, interview status, and transportation plan.",
      tag: "New",
      tagTone: "purple"
    },
    {
      id: crypto.randomUUID(),
      title: "Apply for Teaching Assistance opportunities",
      category: "Job - Teaching Assistance",
      owner: "Patrick",
      status: "Not started",
      priority: "High",
      due: "",
      next: "Identify nearby schools, colleges, tutoring programs, and academic support offices that hire teaching assistants, tutors, or lab helpers, then submit applications and save proof of submission.",
      notes: "Track employer name, role title, subject area, pay rate, location, schedule, application date, contact person, interview status, and whether transportation is realistic. Focus on math, physics, tutoring, and classroom support roles first."
    },
    {
      id: crypto.randomUUID(),
      title: "Identify why consistent employment keeps failing",
      category: "Job barriers",
      owner: "Patrick + Deric",
      status: "Not started",
      priority: "Urgent",
      due: "",
      next: "Review the last 12 months of job attempts and write down where opportunities are breaking down: applications, resume screening, interviews, coding tests, follow-through, transportation, health, age bias, confidence, or communication.",
      notes: "This is the root-cause card. The goal is to stop treating the problem as only 'apply to more jobs' and instead identify the actual blockers. Track patterns such as not hearing back, getting filtered out before interviews, struggling with modern-stack assessments, energy or health crashes, lack of references, inconsistent follow-up, and possible ageism.",
      tag: "New",
      tagTone: "purple"
    },
    {
      id: crypto.randomUUID(),
      title: "Build a realistic path to $25,000 per year",
      category: "Income pathways",
      owner: "Patrick + Deric",
      status: "Not started",
      priority: "Urgent",
      due: "",
      next: "Map the minimum combinations of work needed to reach at least $25,000/year, such as one steady part-time job, two smaller remote streams, tutoring plus contract work, or local hourly work plus AI/evaluation gigs.",
      notes: "Annual target: at least $25,000. Break this into monthly and weekly targets, then compare each path for realism, consistency, transportation, health impact, and time to first income. Do not assume one perfect job will solve everything. Evaluate mixes of local work, tutoring, technical freelancing, AI evaluation, contract programming, and benefits-supported transition plans.",
      tag: "New",
      tagTone: "purple"
    },
    {
      id: crypto.randomUUID(),
      title: "Test whether ageism is affecting Patrick's job search",
      category: "Job barriers",
      owner: "Deric + Patrick",
      status: "Not started",
      priority: "High",
      due: "",
      next: "Compare how Patrick is presenting himself on resumes, LinkedIn, application dates, technologies, and interview framing to see whether age or outdated presentation may be filtering him out before he gets a fair review.",
      notes: "Possible signals include graduation dates, very old experience framing, older terminology, lack of recent portfolio proof, and interview answers that focus too much on the past. The goal is not to prove bias abstractly, but to test whether modernizing presentation increases callbacks and whether some markets are more age-tolerant than others.",
      tag: "New",
      tagTone: "purple"
    },
    {
      id: crypto.randomUUID(),
      title: "Reposition Patrick's background for modern hiring",
      category: "Career strategy",
      owner: "Patrick + Deric",
      status: "Not started",
      priority: "High",
      due: "",
      next: "Create one modern resume version for software engineering, one for tutoring or teaching support, and one for AI evaluation or contract work, each emphasizing current value instead of only long tenure.",
      notes: "Patrick has a Master's in Physics and 30+ years of software development experience, which is valuable, but it may need better packaging for today's market. Focus on current frameworks, recent hands-on ability, problem-solving depth, reliability, and measurable outcomes. Remove anything that makes him look disconnected from current tools if it is not helping him.",
      tag: "New",
      tagTone: "purple"
    },
    {
      id: crypto.randomUUID(),
      title: "Choose backup income paths that can start faster than traditional hiring",
      category: "Income pathways",
      owner: "Patrick + brother",
      status: "Not started",
      priority: "High",
      due: "",
      next: "List income options that can start within 2 to 6 weeks even if full-time software work does not materialize, then rank them by speed, consistency, transportation needs, and expected weekly income.",
      notes: "Examples may include tutoring physics and math, substitute teaching support, local hourly work, library or school support roles, remote grading or help-desk style work, contract coding, AI evaluation, and project-based technical assistance. The goal is income stability first, not prestige.",
      tag: "New",
      tagTone: "purple"
    },
    {
      id: crypto.randomUUID(),
      title: "Stabilize health, routine, and follow-through so work can stick",
      category: "Career strategy",
      owner: "Patrick + family",
      status: "Not started",
      priority: "High",
      due: "",
      next: "Identify whether fatigue, depression, anxiety, medication issues, missed routines, or inconsistent sleep are interfering with applications, interviews, assessments, and ongoing work performance.",
      notes: "Even the right opportunity may fail if Patrick cannot sustain a routine or recover from setbacks. Track how health, stress, rejection, transportation instability, and confidence affect execution. This card is about making employment durable, not just getting one offer.",
      tag: "New",
      tagTone: "purple"
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
      next: "Map realistic bicycle range from home to grocery stores, restaurants, temp agencies, libraries, transit stops, and local employers so local work can start before another car is affordable.",
      notes: "Use the bicycle as the default local transportation plan until enough money is saved for a cheap used car. Check bike condition, lock, lights, helmet, tire pump, weather limits, safe routes, and whether jobs can be reached without a car."
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
      title: "Request Baylor Scott and White payment suspension",
      category: "Medical bills",
      owner: "Patrick + brother",
      status: "Not started",
      priority: "Urgent",
      due: "",
      next: "Call Baylor Scott and White billing or financial assistance and ask for a temporary suspension, hardship plan, charity-care review, or reduced payment plan because Patrick has no current income.",
      notes: "Track account number, billing phone number, representative name, date called, documents requested, whether collections are paused, financial-assistance application deadlines, and written confirmation of any payment suspension.",
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
      title: "Get health insurance before current coverage expires",
      category: "Insurance",
      owner: "Patrick + brother",
      status: "Not started",
      priority: "Urgent",
      due: "",
      next: "Confirm the current insurance end date, compare replacement coverage options, and apply for a new plan before there is a gap in coverage for appointments or medication.",
      notes: "Track current expiration date, marketplace or employer options, monthly premium, deductible, out-of-pocket maximum, cardiology and primary-care network coverage, prescription coverage, and the exact date new insurance becomes active."
    },
    {
      id: crypto.randomUUID(),
      title: "Create medication list with dosage and refill dates",
      category: "Health",
      owner: "Patrick + brother",
      status: "Not started",
      priority: "Urgent",
      due: "",
      next: "List every current medication, dosage, prescribing doctor, pharmacy, refill date, and how many days of supply remain.",
      notes: "Use this notes field to track medication details, refill timing, side effects, copay, prior authorization issues, pharmacy contact information, and any gaps caused by insurance changes.",
      medications: [
        { id: crypto.randomUUID(), name: "", dosage: "", refillDate: "", pillsPrescribed: 30 }
      ]
    },
    {
      id: crypto.randomUUID(),
      title: "Review bankruptcy filing for all debts, including the damaged car",
      category: "Debt",
      owner: "Patrick + brother",
      status: "Not started",
      priority: "Urgent",
      due: "",
      next: "Schedule a free consultation with a Texas bankruptcy attorney and ask whether filing should happen during or after the voluntary car surrender process.",
      notes: "Ask about Chapter 7, Chapter 13, treatment of the damaged car loan deficiency, medical bills, credit cards, retirement accounts, filing fees, and whether timing the filing around repossession changes the outcome.",
      tag: "New",
      tagTone: "purple"
    },
    {
      id: crypto.randomUUID(),
      title: "Arrange voluntary surrender of Kia and notify Wells Fargo",
      category: "Debt",
      owner: "Patrick + brother",
      status: "Not started",
      priority: "Urgent",
      due: "",
      next: "Call Wells Fargo and say Patrick wants to voluntarily surrender the vehicle, then ask for the exact handoff location, required paperwork, key return instructions, and what to do with the title and registration.",
      notes: "The lender holds the title until payoff, so the car cannot just be dropped at the DMV. Ask about surrender date, pickup or drop-off instructions, deficiency balance risk after auction, and credit impact. Remove the TollTag, cancel the toll account, remove personal items, and file a Texas vehicle transfer notification within 30 days after the car leaves Patrick's possession.",
      tag: "New",
      tagTone: "purple"
    },
    {
      id: crypto.randomUUID(),
      title: "Get on the Section 8 housing waiting list",
      category: "Benefits",
      owner: "Patrick + brother",
      status: "Not started",
      priority: "Urgent",
      due: "",
      next: "Check whether the Dallas Housing Authority or Plano Housing Authority waiting lists are open and document the exact application procedure for Frisco-area coverage.",
      notes: "Frisco does not run its own Section 8 program, so check DHA, PHA, and open-waitlist listings through AffordableHousing.com. There should never be a fee to apply. If a waiting list is open, submit the preliminary application and save proof. If it is closed, capture the procedure and where to monitor for reopening.",
      tag: "New",
      tagTone: "purple"
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
    },
    {
      id: crypto.randomUUID(),
      title: "Clean house",
      category: "Household tasks",
      owner: "Patrick",
      status: "Not started",
      priority: "Medium",
      due: "",
      next: "Pick one area of the house and clean it fully before moving to the next area.",
      notes: "Track what was cleaned, date completed, and any supplies needed.",
      tag: "Added/Updated"
    },
    {
      id: crypto.randomUUID(),
      title: "Vacuum carpet",
      category: "Household tasks",
      owner: "Patrick",
      status: "Not started",
      priority: "Medium",
      due: "",
      next: "Vacuum high-traffic carpeted areas first, then bedrooms or less-used rooms.",
      notes: "Record rooms completed and whether vacuum bags, filters, or maintenance are needed.",
      tag: "Added/Updated"
    },
    {
      id: crypto.randomUUID(),
      title: "Do dishes",
      category: "Household tasks",
      owner: "Patrick",
      status: "Not started",
      priority: "Medium",
      due: "",
      next: "Wash or load dishes daily and clear the sink before bedtime.",
      notes: "Track consistency and whether dish soap, dishwasher pods, or sponges are needed.",
      tag: "Added/Updated"
    },
    {
      id: crypto.randomUUID(),
      title: "Cook meals",
      category: "Household tasks",
      owner: "Patrick",
      status: "Not started",
      priority: "Medium",
      due: "",
      next: "Plan simple meals that use available groceries and reduce eating-out costs.",
      notes: "Track meals cooked, grocery items used, and low-cost meal ideas.",
      tag: "Added/Updated"
    },
    {
      id: crypto.randomUUID(),
      title: "Take out garbage",
      category: "Household tasks",
      owner: "Patrick",
      status: "Not started",
      priority: "Medium",
      due: "",
      next: "Empty inside trash cans and take garbage to the outside bin before pickup day.",
      notes: "Track pickup schedule and whether bags or cleaning supplies are needed.",
      tag: "Added/Updated"
    },
    {
      id: crypto.randomUUID(),
      title: "Mow the grass",
      category: "Household tasks",
      owner: "Patrick",
      status: "Not started",
      priority: "Medium",
      due: "",
      next: "Mow when weather and health allow, or help arrange mowing if physical limits prevent it.",
      notes: "Track date mowed, mower fuel/battery needs, and any areas skipped.",
      tag: "Added/Updated"
    },
    {
      id: crypto.randomUUID(),
      title: "Lawn maintenance",
      category: "Household tasks",
      owner: "Patrick",
      status: "Not started",
      priority: "Medium",
      due: "",
      next: "Trim, edge, pick up branches, and handle basic yard cleanup as needed.",
      notes: "Track tools needed, safety limits, and tasks completed.",
      tag: "Added/Updated"
    },
    {
      id: crypto.randomUUID(),
      title: "Contribute to groceries",
      category: "Household tasks",
      owner: "Patrick",
      status: "Not started",
      priority: "High",
      due: "",
      next: "Agree on a realistic weekly grocery contribution based on actual income and benefits.",
      notes: "Contribution can be money, SNAP groceries, cooking, shopping, or meal planning depending on cash flow.",
      tag: "Added/Updated"
    },
    {
      id: crypto.randomUUID(),
      title: "Help with maintenance of house",
      category: "Household tasks",
      owner: "Patrick",
      status: "Not started",
      priority: "Medium",
      due: "",
      next: "Keep a list of small house maintenance tasks Patrick can help with safely.",
      notes: "Examples: replace batteries, change filters, organize tools, report repairs, clean vents, or assist with scheduled maintenance.",
      tag: "Added/Updated"
    }
  ]
};

function buildTheoSeedData() {
  return {
    dataVersion: DATA_VERSION,
    notes: "",
    runningNotes: [],
    documents: [],
    history: [],
    lastSavedAt: "",
    currentUser: THEODORE_EMAIL,
    hiddenPanels: {
      overview: true,
      patrickWatch: true,
      bills: true,
      budgetSnapshots: true,
      lifeAdmin: true
    },
    collapsedTaskGroupsVersion: TASK_GROUP_COLLAPSE_VERSION,
    collapsedTaskGroups: {},
    panelVisibilityVersion: PANEL_VISIBILITY_VERSION,
    billMonth: "",
    monthlyBudgetFund: 0,
    budgetSnapshots: [],
    bills: [],
    lifeAdminNotes: [],
    tasks: [
      {
        id: crypto.randomUUID(),
        title: TOP_TODO_LIST_TITLE,
        category: "Priority to-do list",
        owner: "Theodore + Deric",
        status: "In progress",
        priority: "Urgent",
        due: "",
        next: "Use this list for Theo's highest-priority income and expense actions. Keep active work visible and move completed work to the closed view.",
        notes: "Track completion status, creation date, closed date, and short notes for each item.",
        todoView: "active",
        todoItems: [
          "Find a job in the food industry",
          "Start paying for physical training sessions"
        ].map(buildTodoItem),
        tag: "New",
        tagTone: "purple"
      }
    ]
  };
}

function buildAdminSeedData() {
  return {
    dataVersion: DATA_VERSION,
    notes: "",
    runningNotes: [],
    documents: [],
    history: [],
    lastSavedAt: "",
    currentUser: ADMIN_EMAIL,
    hiddenPanels: {
      overview: true,
      patrickWatch: true,
      bills: true,
      budgetSnapshots: true,
      lifeAdmin: true
    },
    collapsedTaskGroupsVersion: TASK_GROUP_COLLAPSE_VERSION,
    collapsedTaskGroups: {},
    panelVisibilityVersion: PANEL_VISIBILITY_VERSION,
    billMonth: "",
    monthlyBudgetFund: 5000,
    budgetSnapshots: [],
    bills: buildAdminSeedBills(),
    lifeAdminNotes: [],
    tasks: [
      {
        id: crypto.randomUUID(),
        title: TOP_TODO_LIST_TITLE,
        category: "Priority to-do list",
        owner: "Admin + Deric",
        status: "In progress",
        priority: "Urgent",
        due: "",
        next: "Use this list for admin-level financial follow-through and bill management.",
        notes: "Track the highest-priority monthly financial actions here and move completed items to the closed view.",
        todoView: "active",
        todoItems: [
          "Pay monthly bills"
        ].map(buildTodoItem),
        tag: "New",
        tagTone: "purple"
      }
    ]
  };
}

const seedDataByClient = {
  patrick: seedData,
  theodore: buildTheoSeedData(),
  admin: buildAdminSeedData()
};

Object.values(seedDataByClient).forEach(clientSeedData => {
  clientSeedData.tasks.forEach(task => {
    task.seedKey = task.seedKey || buildSeedTaskKey(task.title);
  });
});

function buildUnselectedClientState() {
  return {
    dataVersion: DATA_VERSION,
    notes: "",
    runningNotes: [],
    documents: [],
    history: [],
    lastSavedAt: "",
    currentUser: "",
    hiddenPanels: {
      overview: true,
      patrickWatch: true,
      bills: true,
      budgetSnapshots: true,
      lifeAdmin: true
    },
    collapsedTaskGroupsVersion: TASK_GROUP_COLLAPSE_VERSION,
    collapsedTaskGroups: Object.fromEntries(taskGroupOrder.map(groupName => [groupName, true])),
    panelVisibilityVersion: PANEL_VISIBILITY_VERSION,
    billMonth: "",
    monthlyBudgetFund: 0,
    budgetSnapshots: [],
    bills: [],
    lifeAdminNotes: [],
    tasks: []
  };
}

let activeClientId = "";

function currentClientConfig() {
  return clientConfigs[activeClientId] || null;
}

function getSeedData() {
  return seedDataByClient[activeClientId] || buildUnselectedClientState();
}

function clientNeedsAccessPin(clientId) {
  return Boolean(clientId && clientConfigs[clientId]?.requiresAccessPin);
}

function clientAccessPin(clientId) {
  if (clientId === "admin") return ADMIN_CLIENT_ACCESS_PIN;
  if (clientId === "theodore") return THEODORE_CLIENT_ACCESS_PIN;
  return "";
}

function isClientAccessValidated(clientId) {
  return !clientNeedsAccessPin(clientId) || validatedProtectedClientIds.has(clientId);
}

function clientAccessLabel(clientId) {
  return clientConfigs[clientId]?.fullName || "this client";
}

function getStorageKey() {
  return currentClientConfig()?.storageKey || "";
}

function getPatrickWatchKey() {
  return currentClientConfig()?.watchKey || "";
}

function getTaskViewKey() {
  return currentClientConfig()?.taskViewKey || "";
}

function getSupabaseStateId() {
  return currentClientConfig()?.supabaseStateId || "";
}

function getRemoteUpdatedAtKey() {
  return currentClientConfig()?.remoteUpdatedAtKey || "";
}

function getSeedTaskTitle(seedKey) {
  return getSeedData().tasks.find(task => task.seedKey === seedKey)?.title || "";
}

function isPatrickClient() {
  return currentClientConfig()?.id === "patrick";
}

function isAdminClient() {
  return currentClientConfig()?.id === "admin";
}

function clientUsesBillGrouping(clientId = activeClientId) {
  return clientId !== "patrick";
}

let state = buildUnselectedClientState();
let patrickWatchState = {
  lastReviewedAt: "",
  view: "open",
  reviewedEntries: {},
  closedEntries: {}
};

const taskList = document.querySelector("#taskList");
const appEyebrow = document.querySelector("#appEyebrow");
const appTitle = document.querySelector("#appTitle");
const appLede = document.querySelector("#appLede");
const searchInput = document.querySelector("#searchInput");
const statusFilter = document.querySelector("#statusFilter");
const priorityFilter = document.querySelector("#priorityFilter");
const categoryFilter = document.querySelector("#categoryFilter");
const taskViewActiveBtn = document.querySelector("#taskViewActiveBtn");
const taskViewDoneBtn = document.querySelector("#taskViewDoneBtn");
const taskViewAllBtn = document.querySelector("#taskViewAllBtn");
const newRunningNote = document.querySelector("#newRunningNote");
const runningNotesList = document.querySelector("#runningNotesList");
const taskDialog = document.querySelector("#taskDialog");
const taskForm = document.querySelector("#taskForm");
const userSelect = document.querySelector("#userSelect");
const currentUserContent = document.querySelector("#currentUserContent");
const toggleCurrentUserBtn = document.querySelector("#toggleCurrentUserBtn");
const clientSwitchBtn = document.querySelector("#clientSwitchBtn");
const topClientSwitchBtn = document.querySelector("#topClientSwitchBtn");
const topClientSelect = document.querySelector("#topClientSelect");
const pullLatestDevicesBtn = document.querySelector("#pullLatestDevicesBtn");
const topClientPinWrapInline = document.querySelector("#topClientPinWrapInline");
const topClientPin = document.querySelector("#topClientPin");
const overviewPanel = document.querySelector("#overviewPanel");
const overviewContent = document.querySelector("#overviewContent");
const overviewCards = document.querySelector("#overviewCards");
const toggleOverviewBtn = document.querySelector("#toggleOverviewBtn");
const accountGateDialog = document.querySelector("#accountGateDialog");
const accountGateForm = document.querySelector("#accountGateForm");
const accountGateSelect = document.querySelector("#accountGateSelect");
const accountGatePinWrap = document.querySelector("#accountGatePinWrap");
const accountGatePin = document.querySelector("#accountGatePin");
const accountGateMessage = document.querySelector("#accountGateMessage");
const accountGateError = document.querySelector("#accountGateError");
const clientGateDialog = document.querySelector("#clientGateDialog");
const clientGateForm = document.querySelector("#clientGateForm");
const clientGateSelect = document.querySelector("#clientGateSelect");
const clientGatePinWrap = document.querySelector("#clientGatePinWrap");
const clientGatePin = document.querySelector("#clientGatePin");
const clientGateMessage = document.querySelector("#clientGateMessage");
const clientGateError = document.querySelector("#clientGateError");
const historyDialog = document.querySelector("#historyDialog");
const urgencyReportDialog = document.querySelector("#urgencyReportDialog");
const patrickChangeReportDialog = document.querySelector("#patrickChangeReportDialog");
const documentsDialog = document.querySelector("#documentsDialog");
const medicationDialog = document.querySelector("#medicationDialog");
const medicationDialogBody = document.querySelector("#medicationDialogBody");
const patrickWatchPanel = document.querySelector("#patrickWatchPanel");
const patrickChangeReport = document.querySelector("#patrickChangeReport");
const billMonthInput = document.querySelector("#billMonth");
const billMBFInput = document.querySelector("#billMBF");
const billPrevMonthBtn = document.querySelector("#billPrevMonthBtn");
const billNextMonthBtn = document.querySelector("#billNextMonthBtn");
const copyBillsToNextMonthBtn = document.querySelector("#copyBillsToNextMonthBtn");
const calculateBillsBtn = document.querySelector("#calculateBillsBtn");
const assignDueDatesBtn = document.querySelector("#assignDueDatesBtn");
const undoCopyBillsToNextMonthBtn = document.querySelector("#undoCopyBillsToNextMonthBtn");
const billMBFDisplay = document.querySelector("#billMBFDisplay");
const billList = document.querySelector("#billList");
const billTotal = document.querySelector("#billTotal");
const billPaid = document.querySelector("#billPaid");
const billRemaining = document.querySelector("#billRemaining");
const billCashFlow = document.querySelector("#billCashFlow");
const billCoverage = document.querySelector("#billCoverage");
const billPastDue = document.querySelector("#billPastDue");
const budgetAlert = document.querySelector("#budgetAlert");
const upcomingBillsBanner = document.querySelector("#upcomingBillsBanner");
const billGroupFullBtn = document.querySelector("#billGroupFullBtn");
const billGroupEarlyBtn = document.querySelector("#billGroupEarlyBtn");
const billGroupMidBtn = document.querySelector("#billGroupMidBtn");
const billGroupLateBtn = document.querySelector("#billGroupLateBtn");
const upcomingBillsDialog = document.querySelector("#upcomingBillsDialog");
const upcomingBillsDialogSummary = document.querySelector("#upcomingBillsDialogSummary");
const upcomingBillsDialogList = document.querySelector("#upcomingBillsDialogList");
const closeUpcomingBillsDialogBtn = document.querySelector("#closeUpcomingBillsDialog");
const hiddenBillList = document.querySelector("#hiddenBillList");
const hiddenBillsContent = document.querySelector("#hiddenBillsContent");
const toggleHiddenBillsBtn = document.querySelector("#toggleHiddenBillsBtn");
const budgetSnapshotList = document.querySelector("#budgetSnapshotList");
const budgetSnapshotsContent = document.querySelector("#budgetSnapshotsContent");
const lifeAdminNotes = document.querySelector("#lifeAdminNotes");
const budgetPanel = document.querySelector("#budgetPanel");
const budgetPanelContent = document.querySelector("#budgetPanelContent");
const lifeAdminPanel = document.querySelector("#lifeAdminPanel");
const lifeAdminPanelContent = document.querySelector("#lifeAdminPanelContent");
const patrickWatchContent = document.querySelector("#patrickWatchContent");
const togglePatrickWatchBtn = document.querySelector("#togglePatrickWatchBtn");
const processGuideBtn = document.querySelector("#processGuideBtn");
const urgencyReportBtn = document.querySelector("#urgencyReportBtn");
const patrickChangeReportBtn = document.querySelector("#patrickChangeReportBtn");
const htmlEmailDashboardReportBtn = document.querySelector("#htmlEmailDashboardReportBtn");
const toggleBillsBtn = document.querySelector("#toggleBillsBtn");
const toggleLifeAdminBtn = document.querySelector("#toggleLifeAdminBtn");
const toggleBudgetSnapshotsBtn = document.querySelector("#toggleBudgetSnapshotsBtn");
const hideBillsBtn = document.querySelector("#hideBillsBtn");
const toggleBillsCompactBtn = document.querySelector("#toggleBillsCompactBtn");
const toggleBillsPopoutBtn = document.querySelector("#toggleBillsPopoutBtn");
const hideLifeAdminBtn = document.querySelector("#hideLifeAdminBtn");
const pdfUploadInput = document.querySelector("#pdfUploadInput");
const viewDocumentsBtn = document.querySelector("#viewDocumentsBtn");
const closeDocumentsDialogBtn = document.querySelector("#closeDocumentsDialog");
const documentsList = document.querySelector("#documentsList");
const markPatrickReviewedBtn = document.querySelector("#markPatrickReviewedBtn");
const closeAllPatrickBtn = document.querySelector("#closeAllPatrickBtn");
const commentHistoryDialog = document.querySelector("#commentHistoryDialog");
const commentHistoryTitle = document.querySelector("#commentHistoryTitle");
const commentHistoryList = document.querySelector("#commentHistoryList");
const patrickTodayCount = document.querySelector("#patrickTodayCount");
const patrickPendingCount = document.querySelector("#patrickPendingCount");
const patrickClosedCount = document.querySelector("#patrickClosedCount");
const patrickWatchList = document.querySelector("#patrickWatchList");
const patrickViewOpenBtn = document.querySelector("#patrickViewOpenBtn");
const patrickViewClosedBtn = document.querySelector("#patrickViewClosedBtn");
const patrickViewAllBtn = document.querySelector("#patrickViewAllBtn");
let dericPinValidatedForSession = false;
const validatedProtectedClientIds = new Set();
let taskViewMode = loadTaskViewMode();
let activeMedicationTaskId = "";
let forceCurrentBillMonthOnNextRemoteApply = false;

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
  tag: document.querySelector("#taskLabel"),
  tagTone: document.querySelector("#taskLabelTone"),
  notes: document.querySelector("#taskNotes"),
  comment: document.querySelector("#taskComment"),
  comments: document.querySelector("#taskComments")
};

const taskLabelAdminRow = document.querySelector("#taskLabelAdminRow");
let currentUserCollapsed = true;

function loadState() {
  if (!activeClientId || !getStorageKey()) return buildUnselectedClientState();
  const seedData = getSeedData();
  const saved = localStorage.getItem(getStorageKey());
  if (!saved) return initializeState(structuredClone(seedData));
  try {
    const parsed = JSON.parse(saved);
    const loaded = {
      dataVersion: Number(parsed.dataVersion) || 0,
      notes: parsed.notes || "",
      runningNotes: Array.isArray(parsed.runningNotes) ? parsed.runningNotes : [],
      documents: Array.isArray(parsed.documents) ? parsed.documents : [],
      collapsedTaskGroupsVersion: Number(parsed.collapsedTaskGroupsVersion) || 0,
      currentUser: parsed.currentUser || PATRICK_EMAIL,
      history: Array.isArray(parsed.history) ? parsed.history : [],
      lastSavedAt: parsed.lastSavedAt || "",
      panelVisibilityVersion: Number(parsed.panelVisibilityVersion) || 0,
      hiddenPanels: parsed.hiddenPanels || {},
      collapsedTaskGroups: parsed.collapsedTaskGroups || {},
      billMonth: parsed.billMonth || "",
      monthlyBudgetFund: normalizeMoney(parsed.monthlyBudgetFund ?? seedData.monthlyBudgetFund ?? 0),
      monthlyBudgets: parsed.monthlyBudgets || {},
      budgetSnapshots: Array.isArray(parsed.budgetSnapshots) ? parsed.budgetSnapshots : structuredClone(seedData.budgetSnapshots || []),
      bills: Array.isArray(parsed.bills) ? parsed.bills : structuredClone(seedData.bills),
      lifeAdminNotes: Array.isArray(parsed.lifeAdminNotes) ? parsed.lifeAdminNotes : structuredClone(seedData.lifeAdminNotes),
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : structuredClone(seedData.tasks)
    };
    const migrated = applyDataMigrations(loaded);
    const initialized = initializeState(loaded);
    if (migrated) localStorage.setItem(getStorageKey(), JSON.stringify(initialized));
    return initialized;
  } catch {
    return initializeState(structuredClone(seedData));
  }
}

function loadTaskViewMode() {
  if (!activeClientId || !getTaskViewKey()) return "active";
  try {
    const saved = localStorage.getItem(getTaskViewKey());
    return ["active", "done", "all"].includes(saved) ? saved : "active";
  } catch {
    return "active";
  }
}

function saveTaskViewMode() {
  if (!activeClientId || !getTaskViewKey()) return;
  localStorage.setItem(getTaskViewKey(), taskViewMode);
}

function initializeState(loaded) {
  const seedData = getSeedData();
  loaded = loaded && typeof loaded === "object" ? loaded : structuredClone(seedData);
  loaded.notes = loaded.notes || "";
  loaded.tasks = Array.isArray(loaded.tasks) ? loaded.tasks : structuredClone(seedData.tasks);
  let stateAdjusted = assignSeedKeys(loaded.tasks);
  stateAdjusted = addMissingSeedTasks(loaded) || stateAdjusted;
  loaded.bills = Array.isArray(loaded.bills) ? loaded.bills : structuredClone(seedData.bills);
  ensureSeedBills(loaded);
  const repairSnapshot = JSON.stringify({
    tasks: loaded.tasks,
    bills: loaded.bills,
    documents: loaded.documents
  });
  applyOngoingStateRepairs(loaded);
  stateAdjusted = JSON.stringify({
    tasks: loaded.tasks,
    bills: loaded.bills,
    documents: loaded.documents
  }) !== repairSnapshot || stateAdjusted;
  loaded.dataVersion = Number(loaded.dataVersion) || DATA_VERSION;
  let panelVisibilityReset = false;
  loaded.currentUser = allowedUsers.some(user => user.email === loaded.currentUser)
    ? loaded.currentUser
    : (activeClientId ? PATRICK_EMAIL : "");
  loaded.history = Array.isArray(loaded.history) ? loaded.history : [];
  loaded.lastSavedAt = loaded.lastSavedAt || new Date().toISOString();
  const preNormalizedBudgetSnapshot = JSON.stringify({
    bills: loaded.bills,
    monthlyBudgets: loaded.monthlyBudgets
  });
  loaded.runningNotes = normalizeRunningNotes(loaded.runningNotes, loaded.notes);
  loaded.documents = normalizeDocuments(loaded.documents);
  if (loaded.panelVisibilityVersion !== PANEL_VISIBILITY_VERSION) {
    loaded.hiddenPanels = { overview: true, patrickWatch: true, bills: true, budgetSnapshots: true, lifeAdmin: true };
    loaded.panelVisibilityVersion = PANEL_VISIBILITY_VERSION;
    panelVisibilityReset = true;
  } else {
    loaded.hiddenPanels = {
      overview: loaded.hiddenPanels?.overview ?? true,
      patrickWatch: loaded.hiddenPanels?.patrickWatch ?? true,
      bills: loaded.hiddenPanels?.bills ?? true,
      budgetSnapshots: loaded.hiddenPanels?.budgetSnapshots ?? true,
      lifeAdmin: Boolean(loaded.hiddenPanels?.lifeAdmin)
    };
  }
  const shouldResetCollapsedTaskGroups = Number(loaded.collapsedTaskGroupsVersion) !== TASK_GROUP_COLLAPSE_VERSION;
  loaded.collapsedTaskGroups = loaded.collapsedTaskGroups && typeof loaded.collapsedTaskGroups === "object"
    ? loaded.collapsedTaskGroups
    : {};
  if (shouldResetCollapsedTaskGroups) {
    loaded.collapsedTaskGroups = Object.fromEntries(taskGroupOrder.map(groupName => [groupName, true]));
    loaded.collapsedTaskGroupsVersion = TASK_GROUP_COLLAPSE_VERSION;
    stateAdjusted = true;
  }
  defaultExpandedTaskGroups.forEach(groupName => {
    loaded.collapsedTaskGroups[groupName] = false;
  });
  loaded.billMonth = loaded.billMonth || defaultBillMonth();
  loaded.billGroupView = ["full", "early", "mid", "late"].includes(loaded.billGroupView)
    ? loaded.billGroupView
    : defaultBillGroupView(loaded.billMonth);
  loaded.billsCompactView = Boolean(loaded.billsCompactView);
  loaded.monthlyBudgetFund = normalizeMoney(loaded.monthlyBudgetFund ?? seedData.monthlyBudgetFund ?? 0);
  loaded.monthlyBudgets = normalizeMonthlyBudgetsMap(loaded.monthlyBudgets, seedData);
  const hasStoredMonthlyBudgets = Object.keys(loaded.monthlyBudgets).length > 0;
  const legacyBills = Array.isArray(loaded.bills) ? loaded.bills.map(normalizeBill) : structuredClone(seedData.bills).map(normalizeBill);
  if (!loaded.monthlyBudgets[loaded.billMonth]) {
    loaded.monthlyBudgets[loaded.billMonth] = hasStoredMonthlyBudgets
      ? buildDefaultMonthlyBudget(loaded.billMonth, seedData)
      : normalizeMonthlyBudgetEntry({
          month: loaded.billMonth,
          monthlyBudgetFund: loaded.monthlyBudgetFund,
          bills: legacyBills
        }, loaded.billMonth, seedData);
  }
  const activeMonthlyBudget = loaded.monthlyBudgets[loaded.billMonth] || buildDefaultMonthlyBudget(loaded.billMonth, seedData);
  loaded.monthlyBudgetFund = activeMonthlyBudget.monthlyBudgetFund;
  loaded.budgetSnapshots = Array.isArray(loaded.budgetSnapshots)
    ? loaded.budgetSnapshots.map(normalizeBudgetSnapshot).filter(Boolean)
    : structuredClone(seedData.budgetSnapshots || []).map(normalizeBudgetSnapshot).filter(Boolean);
  loaded.bills = activeMonthlyBudget.bills.map(normalizeBill);
  stateAdjusted = JSON.stringify({
    bills: loaded.bills,
    monthlyBudgets: loaded.monthlyBudgets
  }) !== preNormalizedBudgetSnapshot || stateAdjusted;
  loaded.lifeAdminNotes = Array.isArray(loaded.lifeAdminNotes)
    ? loaded.lifeAdminNotes.map(normalizeLifeAdminNote)
    : structuredClone(seedData.lifeAdminNotes).map(normalizeLifeAdminNote);
  loaded.tasks = loaded.tasks.map(task => normalizeTaskState({
    percent: statusToPercent(task.status),
    comments: [],
    ...task,
    createdAt: inferTaskCreatedAt(task, loaded.history),
    completedAt: inferTaskCompletedAt(task, loaded.history),
    percent: normalizePercent(task.percent ?? statusToPercent(task.status)),
    comments: Array.isArray(task.comments) ? task.comments : []
  }));
  stateAdjusted = dedupeTasksBySeedKey(loaded.tasks) || stateAdjusted;
  if (panelVisibilityReset || stateAdjusted) {
    localStorage.setItem(getStorageKey(), JSON.stringify(loaded));
  }
  return loaded;
}

function defaultBillMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function defaultBillGroupView(month = defaultBillMonth()) {
  if (!clientUsesBillGrouping()) return "full";
  if (month !== defaultBillMonth()) return "full";
  const day = new Date().getDate();
  if (day <= 10) return "early";
  if (day <= 20) return "mid";
  return "late";
}

function getBillDueGroup(bill) {
  const due = String(bill?.due || "").trim();
  if (!due) return "late";
  const parts = due.split("-");
  if (parts.length !== 3) return "late";
  const day = Number(parts[2]);
  if (!Number.isFinite(day)) return "late";
  if (day <= 10) return "early";
  if (day <= 20) return "mid";
  return "late";
}

function getBillGroupMeta(groupKey) {
  if (groupKey === "full") {
    return { key: "full", label: "Full bill view", range: "All monthly bills" };
  }
  if (groupKey === "mid") {
    return { key: "mid", label: "Mid month bills", range: "Due on days 11-20" };
  }
  if (groupKey === "late") {
    return { key: "late", label: "Late month bills", range: "Due on days 21-31 or without a due date" };
  }
  return { key: "early", label: "Early month bills", range: "Due on days 1-10" };
}

function setBillGroupView(groupKey) {
  if (!["full", "early", "mid", "late"].includes(groupKey)) return;
  state.billGroupView = groupKey;
  saveState();
  renderBills();
}

function shiftMonthString(month, offset) {
  const [yearText, monthText] = String(month || defaultBillMonth()).split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  if (!Number.isFinite(year) || !Number.isFinite(monthNumber)) return defaultBillMonth();
  const shifted = new Date(year, monthNumber - 1 + offset, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}`;
}

function formatBudgetMonthLabel(month) {
  const [yearText, monthText] = String(month || "").split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  if (!Number.isFinite(year) || !Number.isFinite(monthNumber)) return String(month || "");
  return new Date(year, monthNumber - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });
}

function normalizeBillDateLike(value) {
  const text = String(value || "").trim();
  if (!text || text.toUpperCase() === "N/A") return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return normalizeSpreadsheetDate(text);
}

function extractLegacyBillMetadata(notes = "") {
  const sourceText = String(notes || "").trim();
  if (!sourceText) {
    return {
      notes: "",
      apr: "",
      currentBalance: null,
      creditLimit: null,
      transactionNumber: "",
      paidDate: ""
    };
  }

  const metadata = {
    apr: "",
    currentBalance: null,
    creditLimit: null,
    transactionNumber: "",
    paidDate: ""
  };

  const pattern = /(APR|Current balance|Credit line|Tran #|Paid date):\s*([\s\S]*?)(?=(?:APR|Current balance|Credit line|Tran #|Paid date):|$)/gi;
  let matched = false;
  let cleaned = sourceText.replace(pattern, (_, label, rawValue) => {
    matched = true;
    const value = String(rawValue || "").trim().replace(/^[.\s]+|[.\s]+$/g, "");
    switch (label.toLowerCase()) {
      case "apr":
        metadata.apr = value && value.toUpperCase() !== "N/A" ? value : "";
        break;
      case "current balance":
        metadata.currentBalance = normalizeCurrencyCell(value);
        break;
      case "credit line":
        metadata.creditLimit = normalizeCurrencyCell(value);
        break;
      case "tran #":
        metadata.transactionNumber = value && value.toUpperCase() !== "N/A" ? value : "";
        break;
      case "paid date":
        metadata.paidDate = normalizeBillDateLike(value);
        break;
      default:
        break;
    }
    return " ";
  });

  cleaned = cleaned
    .replace(/\s*[|]\s*/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\.\s*/g, ". ")
    .replace(/\s*,\s*/g, ", ")
    .trim()
    .replace(/^[,.;\s-]+|[,.;\s-]+$/g, "");

  return {
    notes: matched ? cleaned : sourceText,
    ...metadata
  };
}

function normalizeBill(bill) {
  const legacyMetadata = extractLegacyBillMetadata(bill.notes || "");
  const apr = String(legacyMetadata.apr || bill.apr || "").trim();
  const transactionNumber = String(legacyMetadata.transactionNumber || bill.transactionNumber || "").trim();
  const due = normalizeBillDateLike(bill.due || "");
  const paidDate = normalizeBillDateLike(legacyMetadata.paidDate || bill.paidDate || "");
  const statusTracksPaidDate = isAdminClient() ? true : Boolean(bill.statusTracksPaidDate);
  const explicitStatus = billStatusOptions.includes(bill.status) ? bill.status : "Unpaid";
  const normalizedName = String(bill.name || "").trim();
  const normalizedTemplateKey = typeof bill.templateKey === "string" && bill.templateKey.trim()
    ? bill.templateKey.trim()
    : buildBudgetBillTemplateKey(normalizedName);
  return {
    id: bill.id || crypto.randomUUID(),
    templateKey: normalizedTemplateKey,
    name: normalizedName,
    amount: normalizeMoney(bill.amount),
    due,
    status: statusTracksPaidDate ? (paidDate ? "Paid" : "Unpaid") : explicitStatus,
    notes: legacyMetadata.notes || "",
    apr,
    previousBalance: normalizeMoney(
      bill.previousBalance !== undefined && bill.previousBalance !== null
        ? bill.previousBalance
        : (legacyMetadata.currentBalance !== null ? legacyMetadata.currentBalance : bill.currentBalance)
    ),
    currentBalance: legacyMetadata.currentBalance !== null
      ? normalizeMoney(legacyMetadata.currentBalance)
      : normalizeMoney(bill.currentBalance),
    creditLimit: legacyMetadata.creditLimit !== null
      ? normalizeMoney(legacyMetadata.creditLimit)
      : normalizeMoney(bill.creditLimit),
    paidAmount: normalizeMoney(bill.paidAmount),
    transactionNumber,
    paidDate,
    statusTracksPaidDate,
    hidden: Boolean(bill.hidden)
  };
}

function buildBudgetBillTemplateKey(name = "") {
  const normalizedName = String(name || "").trim().toLowerCase();
  return normalizedName ? `seed:${normalizedName}` : "";
}

function pickBillStringValue(...values) {
  for (const value of values) {
    const stringValue = String(value || "").trim();
    if (stringValue) return stringValue;
  }
  return "";
}

function mergeDuplicateBudgetBills(primaryBill, duplicateBill) {
  const primary = normalizeBill(primaryBill);
  const duplicate = normalizeBill(duplicateBill);

  const merged = {
    ...primary,
    id: primary.id || duplicate.id || crypto.randomUUID(),
    templateKey: primary.templateKey || duplicate.templateKey || "",
    name: pickBillStringValue(primary.name, duplicate.name),
    apr: pickBillStringValue(primary.apr, duplicate.apr),
    previousBalance: normalizeMoney(primary.previousBalance) || normalizeMoney(duplicate.previousBalance),
    currentBalance: normalizeMoney(primary.currentBalance) || normalizeMoney(duplicate.currentBalance),
    creditLimit: normalizeMoney(primary.creditLimit) || normalizeMoney(duplicate.creditLimit),
    amount: normalizeMoney(primary.amount) || normalizeMoney(duplicate.amount),
    paidAmount: normalizeMoney(primary.paidAmount) || normalizeMoney(duplicate.paidAmount),
    transactionNumber: pickBillStringValue(primary.transactionNumber, duplicate.transactionNumber),
    due: pickBillStringValue(primary.due, duplicate.due),
    paidDate: pickBillStringValue(primary.paidDate, duplicate.paidDate),
    status: primary.status === "Paid" || duplicate.status === "Paid"
      ? "Paid"
      : (primary.status || duplicate.status || "Unpaid"),
    notes: pickBillStringValue(primary.notes, duplicate.notes),
    hidden: Boolean(primary.hidden && duplicate.hidden),
    statusTracksPaidDate: Boolean(primary.statusTracksPaidDate || duplicate.statusTracksPaidDate)
  };

  if (merged.statusTracksPaidDate) {
    merged.status = merged.paidDate ? "Paid" : "Unpaid";
  }

  return merged;
}

function dedupeBudgetBills(bills = []) {
  const uniqueBills = [];
  const billIndexByIdentity = new Map();

  bills.forEach(rawBill => {
    const normalizedBill = normalizeBill(rawBill);
    const identityKey = normalizedBill.templateKey || (normalizedBill.name || "").trim().toLowerCase();
    if (!identityKey) {
      uniqueBills.push(normalizedBill);
      return;
    }
    const existingIndex = billIndexByIdentity.get(identityKey);
    if (existingIndex === undefined) {
      billIndexByIdentity.set(identityKey, uniqueBills.length);
      uniqueBills.push(normalizedBill);
      return;
    }
    uniqueBills[existingIndex] = mergeDuplicateBudgetBills(uniqueBills[existingIndex], normalizedBill);
  });

  return uniqueBills;
}

function normalizeBudgetSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const month = String(snapshot.month || "").trim();
  if (!month) return null;
  return {
    id: snapshot.id || crypto.randomUUID(),
    month,
    monthlyBudgetFund: normalizeMoney(snapshot.monthlyBudgetFund),
    totalBills: normalizeMoney(snapshot.totalBills),
    paidBills: normalizeMoney(snapshot.paidBills),
    remainingBills: normalizeMoney(snapshot.remainingBills),
    cashFlow: Math.round(Number(snapshot.cashFlow || 0) * 100) / 100,
    fundingGap: normalizeMoney(snapshot.fundingGap),
    covered: Boolean(snapshot.covered),
    pastDueCount: Math.max(0, Number(snapshot.pastDueCount) || 0),
    savedAt: snapshot.savedAt || new Date().toISOString(),
    updatedAt: snapshot.updatedAt || snapshot.savedAt || new Date().toISOString()
  };
}

const BUDGET_TRACKING_START_MONTH = "2026-07";
const FUTURE_BILL_DEFAULT_AMOUNTS = {
  "American Express": 180,
  "Phone / internet": 35
};
const ADMIN_FUTURE_BILL_SCHEDULE = {
  "2026-09": {
    "Yorktown Taxes and Insurance": {
      amount: 4275.12,
      due: "2026-09-10"
    }
  },
  "2026-12": {
    "Yorktown Taxes and Insurance": {
      amount: 3592.00,
      due: "2026-12-14"
    }
  },
  "2027-01": {
    "Yorktown Taxes and Insurance": {
      amount: 4275.12,
      due: "2027-01-31"
    }
  },
  "2027-04": {
    "Yorktown Taxes and Insurance": {
      amount: 5033.12,
      due: "2027-04-30"
    }
  }
};
const ADMIN_SCHEDULED_BILL_MONTHS = {
  "Yorktown Taxes and Insurance": new Set([
    "2026-07",
    "2026-09",
    "2026-12",
    "2027-01",
    "2027-04"
  ])
};

function isBeforeBudgetTrackingStart(month) {
  return String(month || "").trim() && String(month) < BUDGET_TRACKING_START_MONTH;
}

function isFutureBudgetMonth(month) {
  const normalizedMonth = String(month || "").trim();
  return normalizedMonth && normalizedMonth > defaultBillMonth();
}

function isFutureBudgetBillLockedToDefault(name = "") {
  return Object.prototype.hasOwnProperty.call(FUTURE_BILL_DEFAULT_AMOUNTS, name);
}

function getFutureBudgetBillOverride(name = "", month = "") {
  if (!isAdminClient()) return null;
  const monthSchedule = ADMIN_FUTURE_BILL_SCHEDULE[String(month || "").trim()];
  if (!monthSchedule) return null;
  return monthSchedule[String(name || "").trim()] || null;
}

function shouldIncludeAdminBillInMonth(name = "", month = "") {
  if (!isAdminClient()) return true;
  const normalizedName = String(name || "").trim();
  const normalizedMonth = String(month || "").trim();
  const scheduledMonths = ADMIN_SCHEDULED_BILL_MONTHS[normalizedName];
  if (!scheduledMonths) return true;
  return scheduledMonths.has(normalizedMonth);
}

function buildBudgetBillTemplate(sourceBill = {}, options = {}) {
  const { zeroAmounts = false, futureDefaults = false, month = "", assignSeedKey = false } = options;
  const normalized = normalizeBill(sourceBill);
  const templateKey = normalized.templateKey || (assignSeedKey ? buildBudgetBillTemplateKey(normalized.name) : "");
  const scheduledOverride = futureDefaults ? getFutureBudgetBillOverride(normalized.name, month) : null;
  const defaultAmount = futureDefaults
    ? normalizeMoney(scheduledOverride?.amount ?? FUTURE_BILL_DEFAULT_AMOUNTS[normalized.name] ?? 0)
    : normalized.amount;
  const defaultDue = futureDefaults
    ? (scheduledOverride?.due || "")
    : normalized.due;
  return {
    ...normalized,
    id: normalized.id || crypto.randomUUID(),
    templateKey,
    amount: zeroAmounts ? 0 : defaultAmount,
    due: zeroAmounts ? "" : defaultDue,
    status: zeroAmounts ? "Unpaid" : normalized.status,
    notes: futureDefaults ? "" : normalized.notes,
    paidAmount: futureDefaults ? 0 : normalized.paidAmount,
    paidDate: futureDefaults ? "" : normalized.paidDate,
    transactionNumber: futureDefaults ? "" : normalized.transactionNumber
  };
}

function buildDefaultMonthlyBudget(month, seed = getSeedData()) {
  const zeroAmounts = isBeforeBudgetTrackingStart(month);
  const futureDefaults = !zeroAmounts && isFutureBudgetMonth(month);
  return {
    month,
    monthlyBudgetFund: zeroAmounts ? 0 : normalizeMoney(seed.monthlyBudgetFund ?? 0),
    bills: (seed.bills || [])
      .filter(bill => shouldIncludeAdminBillInMonth(bill?.name, month))
      .map(bill => buildBudgetBillTemplate(bill, { zeroAmounts, futureDefaults, month, assignSeedKey: true }))
  };
}

function sanitizeFutureMonthlyBudgetEntry(entry, seed = getSeedData()) {
  if (!entry || !isFutureBudgetMonth(entry.month)) return entry;
  if (entry.copiedForwardFrom) {
    return {
      ...entry,
      monthlyBudgetFund: normalizeMoney(entry.monthlyBudgetFund),
      bills: (entry.bills || []).map(bill => normalizeBill(bill))
    };
  }
  const template = buildDefaultMonthlyBudget(entry.month, seed);
  const templateByName = new Map(template.bills.map(bill => [bill.name, bill]));
  return {
    ...entry,
    monthlyBudgetFund: template.monthlyBudgetFund,
    bills: entry.bills.map(bill => {
      const normalized = normalizeBill(bill);
      const fallback = templateByName.get(normalized.name) || buildBudgetBillTemplate(normalized, { zeroAmounts: false, futureDefaults: true, month: entry.month });
      const scheduledOverride = getFutureBudgetBillOverride(normalized.name, entry.month);
      const preservedAmount = normalizeMoney(normalized.amount);
      const preservedPaidAmount = normalizeMoney(normalized.paidAmount);
      return {
        ...normalized,
        amount: scheduledOverride
          ? fallback.amount
          : (isFutureBudgetBillLockedToDefault(normalized.name)
            ? (preservedAmount || fallback.amount)
            : preservedAmount),
        due: scheduledOverride?.due || normalized.due || "",
        status: normalized.status || "Unpaid",
        notes: normalized.notes || "",
        paidAmount: preservedPaidAmount,
        paidDate: normalized.paidDate || "",
        transactionNumber: normalized.transactionNumber || ""
      };
    })
  };
}

function normalizeMonthlyBudgetEntry(entry, fallbackMonth = "", seed = getSeedData()) {
  const month = String(entry?.month || fallbackMonth || "").trim();
  if (!month) return null;
  const zeroAmounts = isBeforeBudgetTrackingStart(month);
  const fallback = buildDefaultMonthlyBudget(month, seed);
  const deletedBillKeys = Array.isArray(entry?.deletedBillKeys)
    ? entry.deletedBillKeys
        .map(key => String(key || "").trim())
        .filter(Boolean)
    : [];
  const deletedBillNames = Array.isArray(entry?.deletedBillNames)
    ? entry.deletedBillNames
        .map(name => String(name || "").trim().toLowerCase())
        .filter(Boolean)
    : [];
  const deletedBillKeySet = new Set(deletedBillKeys);
  const deletedBillSet = new Set(deletedBillNames);
  const incomingBills = Array.isArray(entry?.bills) && entry.bills.length
    ? entry.bills
    : fallback.bills;
  const normalizedBills = dedupeBudgetBills(
    incomingBills.map(bill => buildBudgetBillTemplate(bill, { zeroAmounts, month }))
  );
  const billsByIdentity = new Map(
    normalizedBills.map(bill => [
      bill.templateKey || (bill.name || "").trim().toLowerCase(),
      bill
    ]).filter(([key]) => Boolean(key))
  );
  fallback.bills.forEach(seedBill => {
    const normalizedName = (seedBill.name || "").trim().toLowerCase();
    const identityKey = seedBill.templateKey || buildBudgetBillTemplateKey(seedBill.name) || normalizedName;
    if (
      !identityKey ||
      billsByIdentity.has(identityKey) ||
      deletedBillKeySet.has(identityKey) ||
      deletedBillSet.has(normalizedName)
    ) {
      return;
    }
    const mergedBill = buildBudgetBillTemplate(seedBill, {
      zeroAmounts,
      futureDefaults: isFutureBudgetMonth(month),
      month,
      assignSeedKey: true
    });
    normalizedBills.push(mergedBill);
    billsByIdentity.set(identityKey, mergedBill);
  });
  const normalizedEntry = {
    month,
    monthlyBudgetFund: zeroAmounts ? 0 : normalizeMoney(entry?.monthlyBudgetFund ?? fallback.monthlyBudgetFund),
    bills: normalizedBills.filter(bill => shouldIncludeAdminBillInMonth(bill?.name, month)),
    copiedForwardFrom: entry?.copiedForwardFrom || "",
    deletedBillKeys,
    deletedBillNames
  };
  return sanitizeFutureMonthlyBudgetEntry(normalizedEntry, seed);
}

function normalizeMonthlyBudgetsMap(monthlyBudgets, seed = getSeedData()) {
  const normalized = {};
  if (monthlyBudgets && typeof monthlyBudgets === "object") {
    Object.entries(monthlyBudgets).forEach(([month, value]) => {
      const entry = normalizeMonthlyBudgetEntry(value, month, seed);
      if (entry) normalized[entry.month] = entry;
    });
  }
  return normalized;
}

function dedupeAllMonthlyBudgetBills() {
  state.monthlyBudgets = normalizeMonthlyBudgetsMap(state.monthlyBudgets);
  Object.keys(state.monthlyBudgets).forEach(month => {
    const entry = state.monthlyBudgets[month];
    state.monthlyBudgets[month] = normalizeMonthlyBudgetEntry({
      ...entry,
      bills: dedupeBudgetBills((entry?.bills || []).map(normalizeBill))
    }, month);
  });
}

function calculateBudgetTotals(monthlyBudgetFund, bills) {
  const totalBills = bills.reduce((sum, bill) => sum + normalizeMoney(bill.amount), 0);
  const paidBills = bills
    .filter(bill => bill.status === "Paid")
    .reduce((sum, bill) => sum + normalizeMoney(bill.amount), 0);
  const remainingBills = Math.max(0, totalBills - paidBills);
  const cashFlow = Math.round((normalizeMoney(monthlyBudgetFund) - totalBills) * 100) / 100;
  const covered = cashFlow >= 0;
  const fundingGap = covered ? 0 : Math.abs(cashFlow);
  const pastDueCount = bills.filter(bill => isBillPastDue(bill)).length;
  return {
    totalBills,
    paidBills,
    remainingBills,
    cashFlow,
    covered,
    fundingGap,
    pastDueCount
  };
}

function ensureMonthlyBudgetState(month) {
  const targetMonth = month || state.billMonth || defaultBillMonth();
  state.monthlyBudgets = normalizeMonthlyBudgetsMap(state.monthlyBudgets);
  if (!state.monthlyBudgets[targetMonth]) {
    state.monthlyBudgets[targetMonth] = buildDefaultMonthlyBudget(targetMonth);
  }
  return state.monthlyBudgets[targetMonth];
}

function syncBudgetSnapshotForMonth(month) {
  const monthlyBudget = ensureMonthlyBudgetState(month);
  const totals = calculateBudgetTotals(monthlyBudget.monthlyBudgetFund, monthlyBudget.bills);
  const now = new Date().toISOString();
  const existing = (state.budgetSnapshots || []).find(entry => entry.month === monthlyBudget.month);
  if (existing) {
    existing.monthlyBudgetFund = monthlyBudget.monthlyBudgetFund;
    existing.totalBills = totals.totalBills;
    existing.paidBills = totals.paidBills;
    existing.remainingBills = totals.remainingBills;
    existing.cashFlow = totals.cashFlow;
    existing.fundingGap = totals.fundingGap;
    existing.covered = totals.covered;
    existing.pastDueCount = totals.pastDueCount;
    existing.updatedAt = now;
  } else {
    state.budgetSnapshots.push(normalizeBudgetSnapshot({
      id: crypto.randomUUID(),
      month: monthlyBudget.month,
      monthlyBudgetFund: monthlyBudget.monthlyBudgetFund,
      totalBills: totals.totalBills,
      paidBills: totals.paidBills,
      remainingBills: totals.remainingBills,
      cashFlow: totals.cashFlow,
      fundingGap: totals.fundingGap,
      covered: totals.covered,
      pastDueCount: totals.pastDueCount,
      savedAt: now,
      updatedAt: now
    }));
  }
  state.budgetSnapshots = state.budgetSnapshots.map(normalizeBudgetSnapshot).filter(Boolean);
}

function syncCurrentBudgetMonth(saveSnapshot = true) {
  const month = state.billMonth || defaultBillMonth();
  state.bills = dedupeBudgetBills(state.bills.map(normalizeBill));
  dedupeAllMonthlyBudgetBills();
  const existingMonthEntry = state.monthlyBudgets[month] || {};
  state.monthlyBudgets[month] = normalizeMonthlyBudgetEntry({
    month,
    monthlyBudgetFund: state.monthlyBudgetFund,
    bills: state.bills,
    copiedForwardFrom: existingMonthEntry.copiedForwardFrom || "",
    deletedBillKeys: existingMonthEntry.deletedBillKeys || [],
    deletedBillNames: existingMonthEntry.deletedBillNames || []
  }, month);
  if (saveSnapshot) syncBudgetSnapshotForMonth(month);
}

function loadBudgetMonth(month, options = {}) {
  const targetMonth = month || defaultBillMonth();
  state.billMonth = targetMonth;
  const monthlyBudget = ensureMonthlyBudgetState(targetMonth);
  state.monthlyBudgetFund = monthlyBudget.monthlyBudgetFund;
  state.bills = dedupeBudgetBills(monthlyBudget.bills.map(normalizeBill));
  state.monthlyBudgets[targetMonth].bills = state.bills.map(bill => ({ ...bill }));
  if (options.syncSnapshot !== false) syncBudgetSnapshotForMonth(targetMonth);
}

function currentMonthlyDueDate(dayOfMonth) {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(dayOfMonth).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

function shiftDateByMonths(dateString, offset) {
  const text = String(dateString || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return "";
  const [yearText, monthText, dayText] = text.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return "";
  const shifted = new Date(year, month - 1 + offset, day);
  if (shifted.getDate() !== day) {
    shifted.setDate(0);
  }
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}-${String(shifted.getDate()).padStart(2, "0")}`;
}

function moveDateToTargetMonth(dateString, targetMonth) {
  const text = normalizeBillDateLike(dateString);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return "";
  const [targetYearText, targetMonthText] = String(targetMonth || "").split("-");
  const targetYear = Number(targetYearText);
  const targetMonthNumber = Number(targetMonthText);
  const day = Number(text.split("-")[2]);
  if (!Number.isFinite(targetYear) || !Number.isFinite(targetMonthNumber) || !Number.isFinite(day)) return "";
  const targetDate = new Date(targetYear, targetMonthNumber - 1, day);
  if (targetDate.getMonth() !== targetMonthNumber - 1) {
    targetDate.setDate(0);
  }
  return `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;
}

function getBillsDueWithinDays(bills, daysAhead = 7) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + daysAhead);
  return bills
    .filter(bill => String(bill.due || "").trim())
    .map(bill => {
      const dueDate = new Date(`${bill.due}T00:00:00`);
      return Number.isNaN(dueDate.getTime()) ? null : { bill, dueDate };
    })
    .filter(Boolean)
    .filter(({ dueDate }) => dueDate >= today && dueDate <= end)
    .sort((a, b) => a.dueDate - b.dueDate);
}

function compareBillsByDueDate(a, b) {
  const dueA = normalizeBillDateLike(a?.due || "");
  const dueB = normalizeBillDateLike(b?.due || "");
  const hasDueA = /^\d{4}-\d{2}-\d{2}$/.test(dueA);
  const hasDueB = /^\d{4}-\d{2}-\d{2}$/.test(dueB);

  if (hasDueA && hasDueB && dueA !== dueB) return dueA.localeCompare(dueB);
  if (hasDueA && !hasDueB) return -1;
  if (!hasDueA && hasDueB) return 1;

  return String(a?.name || "").localeCompare(String(b?.name || ""));
}

function renderUpcomingBillsBanner() {
  if (!upcomingBillsBanner) return;
  const dueSoon = getBillsDueWithinDays(state.bills, 7);
  if (!dueSoon.length) {
    upcomingBillsBanner.hidden = true;
    upcomingBillsBanner.textContent = "";
    upcomingBillsBanner.removeAttribute("role");
    upcomingBillsBanner.removeAttribute("tabindex");
    if (upcomingBillsDialogSummary) upcomingBillsDialogSummary.textContent = "";
    if (upcomingBillsDialogList) upcomingBillsDialogList.innerHTML = "";
    return;
  }

  const totalDue = dueSoon.reduce((sum, entry) => sum + normalizeMoney(entry.bill.amount), 0);
  upcomingBillsBanner.textContent = `${dueSoon.length} bill${dueSoon.length === 1 ? "" : "s"} due within 7 days • Total due ${formatCurrency(totalDue)}. Click to review.`;
  upcomingBillsBanner.setAttribute("role", "button");
  upcomingBillsBanner.setAttribute("tabindex", "0");
  upcomingBillsBanner.hidden = false;

  if (upcomingBillsDialogSummary) {
    upcomingBillsDialogSummary.textContent = `Total amount due in the next 7 days: ${formatCurrency(totalDue)}`;
  }

  if (upcomingBillsDialogList) {
    upcomingBillsDialogList.innerHTML = "";
    dueSoon.forEach(({ bill, dueDate }) => {
      const item = document.createElement("article");
      item.className = "upcoming-bill-item";

      const title = document.createElement("strong");
      title.textContent = bill.name || "Untitled bill";

      const meta = document.createElement("span");
      meta.textContent = `${formatCurrency(bill.amount)} due ${bill.due}${bill.hidden ? " • hidden from main list" : ""}`;

      item.append(title, meta);
      upcomingBillsDialogList.appendChild(item);
    });
  }
}

function openUpcomingBillsDialog() {
  renderUpcomingBillsBanner();
  const dueSoon = getBillsDueWithinDays(state.bills, 7);
  if (!dueSoon.length || !upcomingBillsDialog) return;
  upcomingBillsDialog.showModal();
}

function ensureSeedBills(loaded) {
  const seedData = getSeedData();
  const existingNames = new Set((loaded.bills || []).map(bill => (bill.name || "").trim().toLowerCase()));
  seedData.bills.forEach(seedBill => {
    const normalizedName = (seedBill.name || "").trim().toLowerCase();
    if (!existingNames.has(normalizedName)) {
      loaded.bills.push(structuredClone(seedBill));
      existingNames.add(normalizedName);
    }
  });
}

function normalizeMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.round(number * 100) / 100);
}

function formatSignedCurrency(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return formatCurrency(0);
  const absolute = Math.abs(number).toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
  return number < 0 ? `-${absolute}` : absolute;
}

function formatCurrency(value) {
  return normalizeMoney(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
}

function formatApr(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.includes("%") ? text : `${text}%`;
}

function formatCurrencyInputValue(value) {
  return formatCurrency(normalizeCurrencyCell(value));
}

function calculateCreditRemainingPercent(bill) {
  const limit = normalizeMoney(bill.creditLimit);
  const balance = normalizeMoney(bill.currentBalance);
  if (!limit) return null;
  const remaining = Math.max(0, limit - balance);
  return Math.max(0, Math.min(100, Math.round((remaining / limit) * 1000) / 10));
}

function formatPercentLabel(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  return `${Number(value).toFixed(1)}%`;
}

function parseAprNumber(value) {
  const text = String(value || "").replace(/[^0-9.]+/g, "").trim();
  const number = Number(text);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function calculateMonthlyInterestPortion(balance, apr) {
  const normalizedBalance = normalizeMoney(balance);
  const aprNumber = parseAprNumber(apr);
  if (!normalizedBalance || !aprNumber) return 0;
  return normalizedBalance * (aprNumber / 100 / 12);
}

function calculateCurrentBalanceFromPayment(previousBalance, paidAmount, apr) {
  const normalizedPreviousBalance = normalizeMoney(previousBalance);
  const normalizedPaidAmount = normalizeMoney(paidAmount);
  if (!normalizedPreviousBalance) return 0;
  if (!normalizedPaidAmount) return normalizedPreviousBalance;
  const interestPortion = calculateMonthlyInterestPortion(normalizedPreviousBalance, apr);
  const principalReduction = Math.max(0, normalizedPaidAmount - interestPortion);
  return Math.max(0, normalizedPreviousBalance - principalReduction);
}

function calculateRecommendedBillPayments(bills) {
  const normalizedBills = Array.isArray(bills) ? bills : [];
  const debtCandidates = normalizedBills
    .map(bill => {
      const balance = normalizeMoney(bill.currentBalance);
      const creditLimit = normalizeMoney(bill.creditLimit);
      const apr = parseAprNumber(bill.apr);
      const scheduledAmount = normalizeMoney(bill.amount);
      const targetBalance = creditLimit > 0 ? creditLimit * 0.25 : 0;
      const reducibleBalance = Math.max(0, balance - targetBalance);
      const payoffBalance = creditLimit > 0 ? reducibleBalance : balance;
      return {
        id: bill.id,
        balance,
        creditLimit,
        apr,
        scheduledAmount,
        targetBalance,
        payoffBalance,
        monthlyInterest: balance * (apr / 100 / 12)
      };
    })
    .filter(item => item.balance > 0 || item.scheduledAmount > 0);

  const weightedTotal = debtCandidates.reduce((sum, item) => {
    if (item.payoffBalance <= 0) return sum;
    return sum + (item.payoffBalance * (1 + item.apr / 100));
  }, 0);

  const payoffPool = debtCandidates.reduce((sum, item) => sum + item.payoffBalance, 0) / 36;
  const recommendations = new Map();

  debtCandidates.forEach(item => {
    let recommended = item.scheduledAmount;
    if (item.balance > 0) {
      const baseFloor = Math.max(item.scheduledAmount, item.monthlyInterest);
      if (item.payoffBalance > 0 && weightedTotal > 0) {
        const weightedShare = (item.payoffBalance * (1 + item.apr / 100)) / weightedTotal;
        recommended = baseFloor + (payoffPool * weightedShare);
      } else if (item.creditLimit > 0 && item.balance > item.targetBalance) {
        recommended = baseFloor + (item.balance - item.targetBalance) / 36;
      } else {
        recommended = Math.max(baseFloor, item.balance / 36);
      }
    }
    recommendations.set(item.id, normalizeMoney(recommended));
  });

  return recommendations;
}

function normalizeLifeAdminNote(note) {
  return {
    id: note.id || crypto.randomUUID(),
    item: note.item || "",
    due: note.due || "",
    status: ["Open", "In progress", "Done", "N/A"].includes(note.status) ? note.status : "Open",
    notes: note.notes || ""
  };
}

function normalizeMedicationEntry(entry = {}) {
  return {
    id: entry.id || crypto.randomUUID(),
    name: entry.name || "",
    dosage: entry.dosage || "",
    refillDate: entry.refillDate || "",
    pillsPrescribed: normalizeMedicationSupply(entry.pillsPrescribed)
  };
}

function normalizeMedicationEntries(entries) {
  return Array.isArray(entries)
    ? entries.map(entry => normalizeMedicationEntry(entry))
    : [];
}

function normalizeMedicationSupply(value) {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric) || numeric <= 0) return 30;
  return numeric;
}

function getTodayDateOnly() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getMedicationRefillAlert(entry) {
  const refillDate = (entry?.refillDate || "").trim();
  if (!refillDate) return null;

  const refill = new Date(`${refillDate}T00:00:00`);
  if (Number.isNaN(refill.getTime())) return null;

  const today = getTodayDateOnly();
  const diffDays = Math.floor((refill.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) {
    return {
      level: "red",
      label: "Past due refill",
      diffDays
    };
  }

  if (diffDays <= MEDICATION_REFILL_ALERT_WINDOW_DAYS) {
    return {
      level: "yellow",
      label: diffDays === 0 ? "Refill due today" : `Refill due in ${diffDays} day${diffDays === 1 ? "" : "s"}`,
      diffDays
    };
  }

  return null;
}

function normalizeRunningNotes(notes, legacyText = "") {
  const normalized = Array.isArray(notes) ? notes.map(note => ({
    id: note.id || crypto.randomUUID(),
    text: note.text || "",
    createdAt: note.createdAt || new Date().toISOString(),
    updatedAt: note.updatedAt || note.createdAt || new Date().toISOString(),
    createdByEmail: note.createdByEmail || "",
    createdByName: note.createdByName || "",
    updatedByEmail: note.updatedByEmail || note.createdByEmail || "",
    updatedByName: note.updatedByName || note.createdByName || ""
  })).filter(note => note.text.trim()) : [];

  if (!normalized.length && legacyText && legacyText.trim()) {
    const now = new Date().toISOString();
    normalized.push({
      id: crypto.randomUUID(),
      text: legacyText.trim(),
      createdAt: now,
      updatedAt: now,
      createdByEmail: "",
      createdByName: "",
      updatedByEmail: "",
      updatedByName: ""
    });
  }

  return normalized;
}

function normalizeDailyChecklist(items) {
  const normalized = Array.isArray(items)
    ? items.map(item => ({
      id: item.id || crypto.randomUUID(),
      title: String(item.title || "").trim(),
      taskDate: item.taskDate || "",
      status: item.status === "done" ? "done" : "open",
      notes: String(item.notes || "").trim(),
      noteEntries: normalizeDailyProjectNoteEntries(item.noteEntries, item.notes, item.updatedAt || item.createdAt || ""),
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
      completedAt: item.status === "done"
        ? (item.completedAt || item.updatedAt || item.createdAt || new Date().toISOString())
        : ""
    })).filter(item => item.title)
    : [];

  return normalized.sort((a, b) => {
    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
    if ((a.taskDate || "") !== (b.taskDate || "")) return (b.taskDate || "").localeCompare(a.taskDate || "");
    return (b.updatedAt || "").localeCompare(a.updatedAt || "");
  });
}

function normalizeTodoListItems(items) {
  const normalized = Array.isArray(items)
    ? items.map((item, index) => {
      const status = statusOptions.includes(item.status) ? item.status : "Not started";
      const isClosed = isClosedTaskStatus(status);
      return {
        id: item.id || crypto.randomUUID(),
        title: String(item.title || "").trim(),
        status,
        createdAt: item.createdAt || new Date().toISOString(),
        closedAt: isClosed ? (item.closedAt || item.updatedAt || new Date().toISOString()) : "",
        updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
        notes: String(item.notes || "").trim(),
        order: Number.isFinite(Number(item.order)) ? Number(item.order) : index
      };
    }).filter(item => item.title)
    : [];

  return normalized
    .sort((a, b) => {
      if ((a.order ?? 0) !== (b.order ?? 0)) return (a.order ?? 0) - (b.order ?? 0);
      return (a.createdAt || "").localeCompare(b.createdAt || "");
    })
    .map((item, index) => ({
      ...item,
      order: index
    }));
}

function normalizeDailyProjectNoteEntries(entries, legacyText = "", fallbackTimestamp = "") {
  const normalized = Array.isArray(entries)
    ? entries.map(entry => ({
      id: entry.id || crypto.randomUUID(),
      text: String(entry.text || "").trim(),
      createdAt: entry.createdAt || fallbackTimestamp || new Date().toISOString(),
      createdByEmail: entry.createdByEmail || "",
      createdByName: entry.createdByName || ""
    })).filter(entry => entry.text)
    : [];

  const legacy = String(legacyText || "").trim();
  if (!normalized.length && legacy) {
    normalized.push({
      id: crypto.randomUUID(),
      text: legacy,
      createdAt: fallbackTimestamp || new Date().toISOString(),
      createdByEmail: "",
      createdByName: ""
    });
  }

  return normalized.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

function normalizeDocuments(documents) {
  return Array.isArray(documents) ? documents.map(savedDocument => ({
    id: savedDocument.id || crypto.randomUUID(),
    name: savedDocument.name || "Untitled PDF",
    mimeType: savedDocument.mimeType || "application/pdf",
    sizeBytes: Number(savedDocument.sizeBytes) || 0,
    savedAt: savedDocument.savedAt || new Date().toISOString(),
    savedByEmail: savedDocument.savedByEmail || "",
    savedByName: savedDocument.savedByName || "",
    path: savedDocument.path || savedDocument.filePath || "",
    source: savedDocument.source || (savedDocument.path || savedDocument.filePath ? "path" : "metadata-only")
  })) : [];
}

function loadPatrickWatchState() {
  if (!activeClientId || !getPatrickWatchKey()) {
    return {
      lastReviewedAt: "",
      view: "open",
      reviewedEntries: {},
      closedEntries: {}
    };
  }
  try {
    const saved = localStorage.getItem(getPatrickWatchKey());
    if (!saved) {
      return {
        lastReviewedAt: "",
        view: "open",
        reviewedEntries: {},
        closedEntries: {}
      };
    }
    const parsed = JSON.parse(saved);
    return {
      lastReviewedAt: parsed.lastReviewedAt || "",
      view: ["open", "closed", "all"].includes(parsed.view) ? parsed.view : "open",
      reviewedEntries: parsed.reviewedEntries && typeof parsed.reviewedEntries === "object" ? parsed.reviewedEntries : {},
      closedEntries: parsed.closedEntries && typeof parsed.closedEntries === "object" ? parsed.closedEntries : {}
    };
  } catch {
    return {
      lastReviewedAt: "",
      view: "open",
      reviewedEntries: {},
      closedEntries: {}
    };
  }
}

function savePatrickWatchState(nextState) {
  if (!activeClientId || !getPatrickWatchKey()) return;
  localStorage.setItem(getPatrickWatchKey(), JSON.stringify({
    lastReviewedAt: nextState.lastReviewedAt || "",
    view: ["open", "closed", "all"].includes(nextState.view) ? nextState.view : "open",
    reviewedEntries: nextState.reviewedEntries || {},
    closedEntries: nextState.closedEntries || {}
  }));
}

function normalizePercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function inferTaskCreatedAt(task, history = []) {
  if (task?.createdAt) return task.createdAt;

  const commentDates = Array.isArray(task?.comments)
    ? task.comments.map(comment => comment?.createdAt).filter(Boolean).sort((a, b) => a.localeCompare(b))
    : [];
  if (commentDates.length) return commentDates[0];

  const matchingEntries = Array.isArray(history)
    ? history.filter(entry => entry?.taskId === task?.id || (entry?.taskTitle && entry.taskTitle === task?.title))
    : [];

  if (matchingEntries.length) {
    return matchingEntries
      .map(entry => entry.createdAt)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))[0];
  }

  return BUILD_INFO.builtAt || new Date().toISOString();
}

function inferTaskCompletedAt(task, history = []) {
  if (task?.completedAt) return task.completedAt;
  const isClosed = isClosedTask(task);
  if (!isClosed) return "";

  const matchingEntries = Array.isArray(history)
    ? history.filter(entry => (
      isClosedTaskStatus(entry?.status)
      && (entry?.taskId === task?.id || (entry?.taskTitle && entry.taskTitle === task?.title))
    ))
    : [];

  if (matchingEntries.length) {
    return matchingEntries
      .map(entry => entry.createdAt)
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a))[0];
  }

  return task?.updatedAt || task?.createdAt || "";
}

function syncTaskCompletionState(task) {
  if (!task) return task;

  task.percent = normalizePercent(task.percent);

  if (task.percent === 100) {
    task.status = "Done";
    task.priority = "Low";
    task.completedAt = task.completedAt || new Date().toISOString();
  } else if (task.status === "Done") {
    task.status = "In progress";
    task.completedAt = "";
  } else if (task.status === "On-Hold") {
    task.completedAt = task.completedAt || new Date().toISOString();
  } else if (!isClosedTaskStatus(task.status)) {
    task.completedAt = "";
  }

  return task;
}

function normalizeTaskState(task) {
  const normalizedTask = syncTaskCompletionState(task);
  normalizedTask.seedKey = normalizedTask.seedKey || inferSeedTaskKey(normalizedTask);
  if (isTopTodoListTask(normalizedTask)) {
    normalizedTask.todoItems = normalizeTodoListItems(normalizedTask.todoItems);
    normalizedTask.todoView = normalizedTask.todoView === "closed" ? "closed" : "active";
  }
  if (isDailyProjectManagerTask(normalizedTask)) {
    normalizedTask.dailyChecklist = normalizeDailyChecklist(normalizedTask.dailyChecklist);
  }
  if (isMedicationGridTask(normalizedTask)) {
    normalizedTask.medications = normalizeMedicationEntries(normalizedTask.medications);
    if (!normalizedTask.medications.length) {
      normalizedTask.medications = [normalizeMedicationEntry()];
    }
  }
  return normalizedTask;
}

function statusToPercent(status) {
  if (status === "Done") return 100;
  if (status === "On-Hold") return 0;
  if (status === "In progress") return 50;
  if (status === "Waiting") return 35;
  if (status === "Blocked") return 20;
  return 0;
}

function inferSeedTaskKey(task) {
  if (!task) return "";
  if (task.seedKey) return task.seedKey;
  if (isTopTodoListTask(task)) return buildSeedTaskKey(TOP_TODO_LIST_TITLE);
  if (isDailyProjectManagerTask(task)) return buildSeedTaskKey(DAILY_PROJECT_MANAGER_TITLE);
  if (isMedicationLikeTask(task)) return buildSeedTaskKey(MEDICATION_LIST_TASK_TITLE);
  const exactSeedTask = getSeedData().tasks.find(seedTask => seedTask.title === task.title);
  return exactSeedTask?.seedKey || "";
}

function assignSeedKeys(tasks) {
  let changed = false;
  tasks.forEach(task => {
    const inferredSeedKey = inferSeedTaskKey(task);
    if (inferredSeedKey && task.seedKey !== inferredSeedKey) {
      task.seedKey = inferredSeedKey;
      changed = true;
    }
  });
  return changed;
}

function addMissingSeedTasks(loaded) {
  const seedData = getSeedData();
  markUpdatedSections(loaded.tasks);
  const existingSeedKeys = new Set(loaded.tasks.map(task => task.seedKey).filter(Boolean));
  const existingTitles = new Set(loaded.tasks.map(task => task.title));
  let changed = false;
  seedData.tasks.forEach(task => {
    if (!existingSeedKeys.has(task.seedKey) && !existingTitles.has(task.title)) {
      loaded.tasks.push(structuredClone(task));
      changed = true;
    }
  });
  markUpdatedSections(loaded.tasks);
  return changed;
}

function applyOngoingStateRepairs(loaded) {
  if (!isPatrickClient()) return;
  applyTaskDefaults(loaded.tasks, "Apply for CloudResearch Connect studies", {
    priority: "Urgent",
    due: "2026-05-25"
  });
  applyTaskDefaults(loaded.tasks, "Apply for Data Annotation work", {
    priority: "Urgent",
    due: "2026-05-24"
  });
  applyTaskDefaults(loaded.tasks, "Apply for Prolific research studies", {
    priority: "Urgent",
    due: "2026-05-24"
  });

  restoreJobResearchTasksToOnHold(loaded.tasks);

  updateTaskContent(loaded.tasks, "Check Social Security retirement benefits", {
    next: "Confirm the exact retirement eligibility date next year, compare benefits at 62 versus later claiming ages, and document the expected monthly amount.",
    notes: "Patrick appears eligible next year for retirement. Ask about timing, reduced early benefits, work income limits, and whether any spouse/divorced spouse benefits apply.",
    tag: "Updated",
    tagTone: "purple"
  });

  applyTaskDefaults(loaded.tasks, "Apply for SNAP and TANF benefits", {
    priority: "Urgent",
    due: "2026-05-26"
  });

  applyTaskDefaults(loaded.tasks, "Get on the Section 8 housing waiting list", {
    priority: "Urgent"
  });

  applyTaskDefaults(loaded.tasks, "Arrange voluntary surrender of Kia and notify Wells Fargo", {
    priority: "Urgent"
  });

  applyTaskDefaults(loaded.tasks, "Review bankruptcy filing for all debts, including the damaged car", {
    priority: "Urgent"
  });

  updateTaskContent(loaded.tasks, "Prepare for and apply with Mercor.com", {
    next: "Build a physics/math tutoring, AI evaluation, or technical-review resume profile and pivot away from Perplexity since no more work is available there.",
    notes: "Website: https://www.mercor.com/. Perplexity has banned any more work, so focus on Mercor and other AI/data evaluation companies. Practice timed reasoning and clear written explanations. Track login, application date, assessment score, follow-up, and any other companies applied to.",
    tag: "Updated",
    tagTone: "purple"
  });

  updateTaskContent(loaded.tasks, "Apply for minimum-wage local jobs (HEB, Walmart, Home Depot, Kroger)", {
    next: "Follow up on Walmart, Kroger, Home Depot, and Market Street applications, then apply to local hospitals, schools, and library roles. Share current resumes with everyone helping the search.",
    notes: "Priority: this is the most important work track because immediate hourly income can stabilize food, transportation, and housing. Applied to Walmart, Kroger, Home Depot, and Market Street, and Patrick completed a two-hour interview with Market Street. Waiting on responses. Next steps: apply to nearby hospitals, schools, and library roles, then send resumes to everyone who can help with leads. Websites: HEB careers https://careers.heb.com/, Walmart careers https://careers.walmart.com/, Home Depot careers https://careers.homedepot.com/, Kroger careers https://www.krogerfamilycareers.com/. Track job title, location, distance, shift, pay, application date, screenshot or confirmation number, interview status, and transportation plan.",
    tag: "Updated",
    tagTone: "purple"
  });

  updateTaskContent(loaded.tasks, "Apply for Teaching Assistance opportunities", {
    next: "Apply to local schools, hospitals, library systems, colleges, tutoring programs, and academic support offices, then share resumes with everyone who may help identify openings.",
    notes: "Track employer name, role title, subject area, pay rate, location, schedule, application date, contact person, interview status, and whether transportation is realistic. Focus on math, physics, tutoring, classroom support, library support, and hospital education roles first. Make sure current resumes are shared with everyone helping the search.",
    tag: "Updated",
    tagTone: "purple"
  });

  ensureTaskComment(loaded.tasks, "Prepare for Outlier AI coding assessments", OUTLIER_COMMENT_TEXT);
  ensureTaskComment(loaded.tasks, "Track Micro1.ai AI training application", MICRO1_COMMENT_TEXT);
  refreshSeedCommentTimestamps(loaded.tasks, "Prepare for Outlier AI coding assessments");
  refreshSeedCommentTimestamps(loaded.tasks, "Track Micro1.ai AI training application");

  updateTaskContent(loaded.tasks, HEALTH_INSURANCE_TASK_TITLE, {
    next: "Confirm the grace-period coverage end date of 2026-07-31, compare replacement coverage options now, and apply for a new plan before there is any gap in appointments or medication access.",
    notes: "Coverage is currently expected to last through 2026-07-31 because of the grace period. Track marketplace or employer options, monthly premium, deductible, out-of-pocket maximum, cardiology and primary-care network coverage, prescription coverage, and the exact date new insurance becomes active.",
    tag: "Updated",
    tagTone: "purple"
  });

  updateTaskContent(loaded.tasks, MEDICATION_LIST_TASK_TITLE, {
    next: "Confirm the strength and dosage for Eliquis, Entresto, Jardiance, Metoprolol, and Rosuvastatin, then add refill dates, prescribing doctor, pharmacy, and days of supply remaining.",
    notes: "Use this notes field to track medication details, refill timing, side effects, copay, prior authorization issues, pharmacy contact information, and any gaps caused by insurance changes. Current medications to verify for strength/dosage: Eliquis, Entresto, Jardiance, Metoprolol, and Rosuvastatin.",
    tag: "Updated",
    tagTone: "purple"
  });
  ensureMedicationListDefaults(loaded.tasks);

  updateTaskContent(loaded.tasks, DEPRESSION_TASK_TITLE, {
    next: "Patrick needs to call Denton County MHMR before the next July appointment and ask to speak with a social worker about available resources.",
    notes: "Use Denton County MHMR as the current mental-health support track. The next appointment is in July. Ask for resource help, benefits guidance, case-management options, transportation support, medication support, and any other local assistance that can stabilize daily functioning and job readiness.",
    tag: "Updated",
    tagTone: "purple"
  });

  const americanExpressBill = loaded.bills.find(bill => (bill.name || "").trim().toLowerCase() === "american express");
  if (americanExpressBill) {
    americanExpressBill.amount = 180;
    americanExpressBill.due = americanExpressBill.due || currentMonthlyDueDate(25);
    americanExpressBill.status = billStatusOptions.includes(americanExpressBill.status) ? americanExpressBill.status : "Unpaid";
    americanExpressBill.notes = "Starting balance: $730.86. Monthly payment: $180. Due on the 25th of each month.";
  }

  if (Array.isArray(loaded.documents)) {
    loaded.documents = loaded.documents.map(savedDocument => ({
      id: savedDocument.id || crypto.randomUUID(),
      name: savedDocument.name || "Untitled PDF",
      mimeType: savedDocument.mimeType || "application/pdf",
      sizeBytes: Number(savedDocument.sizeBytes) || 0,
      savedAt: savedDocument.savedAt || new Date().toISOString(),
      savedByEmail: savedDocument.savedByEmail || "",
      savedByName: savedDocument.savedByName || "",
      path: savedDocument.path || savedDocument.filePath || "",
      source: savedDocument.path || savedDocument.filePath ? "path" : "metadata-only"
    }));
  }
}

function applyDataMigrations(loaded) {
  if ((Number(loaded.dataVersion) || 0) >= DATA_VERSION) return false;

  applyOngoingStateRepairs(loaded);

  loaded.dataVersion = DATA_VERSION;
  loaded.lastSavedAt = new Date().toISOString();
  return true;
}

function updateTaskFields(tasks, title, updates) {
  const task = findTaskByTitleOrSeedKey(tasks, title);
  if (!task) return;
  Object.assign(task, updates);
}

function applyTaskDefaults(tasks, title, updates) {
  const task = findTaskByTitleOrSeedKey(tasks, title);
  if (!task) return;

  Object.entries(updates).forEach(([field, value]) => {
    const currentValue = task[field];
    if (currentValue === undefined || currentValue === null || currentValue === "") {
      task[field] = value;
    }
  });
}

function updateTaskContent(tasks, title, updates) {
  const task = findTaskByTitleOrSeedKey(tasks, title);
  if (!task) return;
  Object.assign(task, updates);
}

function ensureTaskComment(tasks, title, text, authorName = "Opportunity note", authorEmail = "") {
  const task = findTaskByTitleOrSeedKey(tasks, title);
  if (!task) return;
  if (!Array.isArray(task.comments)) task.comments = [];
  const normalizedText = String(text || "").trim();
  const hasMatch = task.comments.some(comment => String(comment?.text || "").trim() === normalizedText);
  if (hasMatch) return;
  task.comments.push(buildSeedComment(normalizedText, authorName, authorEmail));
}

function refreshSeedCommentTimestamps(tasks, title, authorName = "Opportunity note") {
  const task = findTaskByTitleOrSeedKey(tasks, title);
  if (!task || !Array.isArray(task.comments) || !task.comments.length) return;

  const seededComments = task.comments.filter(comment => (comment?.authorName || "") === authorName);
  if (!seededComments.length) return;

  const now = new Date().toISOString();
  seededComments.forEach(comment => {
    if (!comment.createdAt || comment.createdAt === BUILD_INFO.builtAt) {
      comment.createdAt = now;
    }
  });

  if (!task.createdAt || task.createdAt === BUILD_INFO.builtAt) {
    task.createdAt = seededComments
      .map(comment => comment.createdAt)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))[0] || now;
  }
}

function ensureMedicationListDefaults(tasks) {
  const task = findTaskByTitleOrSeedKey(tasks, MEDICATION_LIST_TASK_TITLE);
  if (!task) return;

  const requiredNames = ["Eliquis", "Entresto", "Jardiance", "Metoprolol", "Rosuvastatin"];
  task.medications = normalizeMedicationEntries(task.medications);

  const existingNames = new Set(
    task.medications
      .map(entry => (entry.name || "").trim().toLowerCase())
      .filter(Boolean)
  );

  requiredNames.forEach(name => {
    if (existingNames.has(name.toLowerCase())) return;
    task.medications.push(normalizeMedicationEntry({ name, dosage: "", refillDate: "" }));
  });
}

function restoreJobResearchTasksToOnHold(tasks) {
  const titles = new Set([
    "Apply for CloudResearch Connect studies",
    "Apply for Data Annotation work",
    "Apply for Prolific research studies"
  ]);

  tasks.forEach(task => {
    if (!titles.has(task.title)) return;
    task.status = "On-Hold";
    task.percent = 0;
    task.priority = "Urgent";
    task.completedAt = task.completedAt || new Date().toISOString();
  });
}

function medicationDataScore(entries) {
  return normalizeMedicationEntries(entries).reduce((score, entry) => score
    + (entry.name ? 1 : 0)
    + (entry.dosage ? 1 : 0)
    + (entry.refillDate ? 2 : 0)
    + ((entry.pillsPrescribed ?? "") !== "" ? 1 : 0), 0);
}

function mergeTaskData(primary, duplicate) {
  if (!primary || !duplicate) return;

  primary.seedKey = primary.seedKey || duplicate.seedKey || inferSeedTaskKey(primary) || inferSeedTaskKey(duplicate);
  const seedTitle = primary.seedKey ? getSeedTaskTitle(primary.seedKey) : "";
  if (seedTitle && primary.title === seedTitle && duplicate.title && duplicate.title !== seedTitle) {
    primary.title = duplicate.title;
  }

  if ((!primary.owner || primary.owner === "No owner") && duplicate.owner) primary.owner = duplicate.owner;
  if ((!primary.due) && duplicate.due) primary.due = duplicate.due;
  if ((!primary.next || primary.next === "No next step recorded.") && duplicate.next) primary.next = duplicate.next;
  if ((!primary.notes || primary.notes === "No notes yet.") && duplicate.notes) primary.notes = duplicate.notes;
  if ((!primary.createdAt) || (duplicate.createdAt && duplicate.createdAt < primary.createdAt)) primary.createdAt = duplicate.createdAt;

  primary.percent = Math.max(normalizePercent(primary.percent), normalizePercent(duplicate.percent));

  if (priorityRank(duplicate.priority) < priorityRank(primary.priority)) {
    primary.priority = duplicate.priority;
  }

  if (statusToPercent(duplicate.status) > statusToPercent(primary.status)) {
    primary.status = duplicate.status;
  }

  const primaryComments = Array.isArray(primary.comments) ? primary.comments : [];
  const duplicateComments = Array.isArray(duplicate.comments) ? duplicate.comments : [];
  const seenCommentIds = new Set(primaryComments.map(comment => comment.id));
  duplicateComments.forEach(comment => {
    if (!seenCommentIds.has(comment.id)) {
      primaryComments.push(comment);
      seenCommentIds.add(comment.id);
    }
  });
  primary.comments = primaryComments;

  const primaryTodos = normalizeTodoListItems(primary.todoItems);
  const duplicateTodos = normalizeTodoListItems(duplicate.todoItems);
  if (!primaryTodos.length && duplicateTodos.length) {
    primary.todoItems = duplicateTodos;
  } else if (primaryTodos.length && duplicateTodos.length) {
    const mergedTodos = [...primaryTodos];
    const seenTodoIds = new Set(mergedTodos.map(item => item.id));
    duplicateTodos.forEach(item => {
      if (seenTodoIds.has(item.id)) return;
      mergedTodos.push(item);
      seenTodoIds.add(item.id);
    });
    primary.todoItems = normalizeTodoListItems(mergedTodos);
  }

  const primaryChecklist = normalizeDailyChecklist(primary.dailyChecklist);
  const duplicateChecklist = normalizeDailyChecklist(duplicate.dailyChecklist);
  if (!primaryChecklist.length && duplicateChecklist.length) {
    primary.dailyChecklist = duplicateChecklist;
  } else if (primaryChecklist.length && duplicateChecklist.length) {
    const mergedChecklist = [...primaryChecklist];
    const seenChecklistIds = new Set(mergedChecklist.map(item => item.id));
    duplicateChecklist.forEach(item => {
      if (seenChecklistIds.has(item.id)) return;
      mergedChecklist.push(item);
      seenChecklistIds.add(item.id);
    });
    primary.dailyChecklist = normalizeDailyChecklist(mergedChecklist);
  }

  const primaryMedications = normalizeMedicationEntries(primary.medications);
  const duplicateMedications = normalizeMedicationEntries(duplicate.medications);
  const primaryMedicationScore = medicationDataScore(primaryMedications);
  const duplicateMedicationScore = medicationDataScore(duplicateMedications);
  if (duplicateMedicationScore > primaryMedicationScore) {
    primary.medications = duplicateMedications;
  }

  if (!primary.tag && duplicate.tag) primary.tag = duplicate.tag;
  if (!primary.tagTone && duplicate.tagTone) primary.tagTone = duplicate.tagTone;
}

function taskMergeScore(task) {
  const medications = normalizeMedicationEntries(task.medications);
  const medicationValueCount = medications.filter(entry => entry.name || entry.dosage || entry.refillDate).length;
  const commentCount = Array.isArray(task.comments) ? task.comments.length : 0;
  const seedTitle = task.seedKey ? getSeedTaskTitle(task.seedKey) : "";
  const customTitleBonus = seedTitle && task.title && task.title !== seedTitle ? 25 : 0;
  return (medicationValueCount * 30) + (commentCount * 15) + normalizePercent(task.percent) + customTitleBonus;
}

function dedupeTasksBySeedKey(tasks) {
  const matchesBySeedKey = new Map();
  tasks.forEach(task => {
    if (!task.seedKey) return;
    if (!matchesBySeedKey.has(task.seedKey)) matchesBySeedKey.set(task.seedKey, []);
    matchesBySeedKey.get(task.seedKey).push(task);
  });

  let changed = false;
  matchesBySeedKey.forEach(matches => {
    if (matches.length <= 1) return;
    const primary = [...matches].sort((a, b) => taskMergeScore(b) - taskMergeScore(a))[0];
    matches.forEach(duplicate => {
      if (duplicate === primary) return;
      mergeTaskData(primary, duplicate);
      const index = tasks.indexOf(duplicate);
      if (index >= 0) {
        tasks.splice(index, 1);
        changed = true;
      }
    });
    normalizeTaskState(primary);
  });
  return changed;
}

function dedupeTasksByTitle(tasks, title) {
  const matches = tasks.filter(task => task.title === title);
  if (matches.length <= 1) return;

  const primary = matches[0];
  matches.slice(1).forEach(duplicate => {
    mergeTaskData(primary, duplicate);
    const index = tasks.indexOf(duplicate);
    if (index >= 0) tasks.splice(index, 1);
  });
}

function markUpdatedSections(tasks) {
  const easyMoneyTasks = tasks.filter(task =>
    task.title === "Apply for easy money local jobs" ||
    task.title === "Apply for Easy Money jobs at Home Depot, Amazon, and Lowe's" ||
    task.title === "Apply for minimum-wage local jobs (HEB, Walmart, Home Depot, Kroger)" ||
    task.category === "Job - Easy Money" ||
    task.category === "Job - Easy Money (Home Depot, Amazon, Lowe's)"
  );
  const easyMoneyTask = easyMoneyTasks[0];
  if (easyMoneyTask) {
    easyMoneyTask.title = "Apply for minimum-wage local jobs (HEB, Walmart, Home Depot, Kroger)";
    easyMoneyTask.category = "Job - Easy Money (HEB, Walmart, Home Depot, Kroger)";
    easyMoneyTask.priority = "Urgent";
    easyMoneyTask.next = "Show the submitted applications if they already exist. If not, apply today to nearby HEB, Walmart, Home Depot, and Kroger roles that are reachable by bicycle, bus, family ride, or short-term rental.";
    easyMoneyTask.notes = "Priority: this is the most important work track because immediate hourly income can stabilize food, transportation, and housing. Websites: HEB careers https://careers.heb.com/, Walmart careers https://careers.walmart.com/, Home Depot careers https://careers.homedepot.com/, Kroger careers https://www.krogerfamilycareers.com/. Track job title, location, distance, shift, pay, application date, screenshot or confirmation number, interview status, and transportation plan.";
    easyMoneyTask.tag = "New";
    easyMoneyTask.tagTone = "purple";
  }
  easyMoneyTasks.slice(1).forEach(duplicate => {
    const index = tasks.indexOf(duplicate);
    if (index >= 0) tasks.splice(index, 1);
  });

  const mercorTask = tasks.find(task => task.title === "Prepare for and apply with Mercor.com");
  if (mercorTask) {
    mercorTask.category = "Job - Mercor";
    if (!mercorTask.notes.includes("https://www.mercor.com/")) {
      mercorTask.notes = `Website: https://www.mercor.com/. ${mercorTask.notes}`;
    }
  }

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
    benefitsTask.title = "Apply for SNAP and TANF benefits";
    benefitsTask.priority = "Urgent";
    benefitsTask.due = benefitsTask.due || "2026-05-26";
    benefitsTask.next = "Present the started application if it already exists. If nothing has been submitted, begin the SNAP and TANF application today and save proof of submission.";
    benefitsTask.notes = "Start with Texas Health and Human Services. Track login details, documents needed, application date, confirmation number, interview date, case number, and requested follow-up items.";
    benefitsTask.tag = "New";
    benefitsTask.tagTone = "purple";
  }
  dedupeTasksByTitle(tasks, "Apply for SNAP and TANF benefits");

  const bankruptcyTask = tasks.find(task =>
    task.title === "Look into bankruptcy options" ||
    task.title === "Review bankruptcy filing for all debts, including the damaged car"
  );
  if (bankruptcyTask) {
    bankruptcyTask.title = "Review bankruptcy filing for all debts, including the damaged car";
    bankruptcyTask.category = "Debt";
    bankruptcyTask.priority = "Urgent";
    bankruptcyTask.next = "Schedule a free consultation with a Texas bankruptcy attorney and ask whether filing should happen during or after the voluntary car surrender process.";
    bankruptcyTask.notes = "Ask about Chapter 7, Chapter 13, treatment of the damaged car loan deficiency, medical bills, credit cards, retirement accounts, filing fees, and whether timing the filing around repossession changes the outcome.";
    bankruptcyTask.tag = "New";
    bankruptcyTask.tagTone = "purple";
  }
  dedupeTasksByTitle(tasks, "Review bankruptcy filing for all debts, including the damaged car");

  const bikeTask = tasks.find(task => task.title === "Use bicycle for local transportation and nearby jobs");
  if (bikeTask) {
    bikeTask.next = "Map realistic bicycle range from home to grocery stores, restaurants, temp agencies, libraries, transit stops, and local employers so local work can start before another car is affordable.";
    bikeTask.notes = "Use the bicycle as the default local transportation plan until enough money is saved for a cheap used car. Check bike condition, lock, lights, helmet, tire pump, weather limits, safe routes, and whether jobs can be reached without a car.";
  }

  const turoTask = tasks.find(task => task.title === "Evaluate renting a car from Turo for transportation");
  if (turoTask) {
    turoTask.notes = "Rationale: Turo may restore transportation for local job interviews, short-term work, medical appointments, and urgent errands, but it only helps if confirmed income exceeds the rental cost. Do not book out of pride, pressure, or hope alone. Track rental price, fees, insurance/protection cost, deposit, fuel, mileage limits, expected daily earnings, and minimum cash needed for food, housing, and car-loan decisions.";
  }

  dedupeTasksByTitle(tasks, "Arrange voluntary surrender of Kia and notify Wells Fargo");
  dedupeTasksByTitle(tasks, "Get on the Section 8 housing waiting list");
}

function saveState() {
  if (activeClientId && state.billMonth) {
    syncCurrentBudgetMonth();
  }
  state.lastSavedAt = new Date().toISOString();
  const storageKey = getStorageKey();
  if (storageKey) {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }
  updateDataStoreStatus();
  queueSharedStateSave();
}

function cacheRemoteUpdatedAt(value) {
  remoteUpdatedAt = value || "";
  if (remoteUpdatedAt) localStorage.setItem(getRemoteUpdatedAtKey(), remoteUpdatedAt);
  else localStorage.removeItem(getRemoteUpdatedAtKey());
}

function toTimestampMs(value) {
  const timestamp = Date.parse(String(value || "").trim());
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function readCachedRemoteUpdatedAt() {
  return localStorage.getItem(getRemoteUpdatedAtKey()) || "";
}

function supabaseConfig() {
  return window.PATRICK_FIREBASE_CONFIG || {};
}

function getSupabaseSetupIssue() {
  if (window.__firebaseConfigLoadError) return window.__firebaseConfigLoadError;
  if (window.__firebaseLibraryLoadError) return window.__firebaseLibraryLoadError;
  if (window.__firebaseInitError) return window.__firebaseInitError;
  const config = supabaseConfig();
  if (!config.apiKey) return "Firebase config is missing apiKey";
  if (!config.authDomain) return "Firebase config is missing authDomain";
  if (!config.projectId) return "Firebase config is missing projectId";
  if (!config.appId) return "Firebase config is missing appId";
  if (!window.__firebaseInitPromise) return "Firebase bootstrap did not start";
  return "";
}

function hasSupabaseConfig() {
  return !getSupabaseSetupIssue();
}

function finalizeSupabaseInitStatusIfPending() {
  if (supabaseEnabled) return;
  if (supabaseStatus !== "Checking Firebase Firestore availability") return;
  const setupIssue = getSupabaseSetupIssue();
  supabaseStatus = setupIssue
    ? `Firebase Firestore unavailable: ${setupIssue}`
    : "Firebase Firestore unavailable: initialization timed out";
  updateDataStoreStatus();
}

function getFirebaseDebugStatus() {
  return [
    `bootStage=${window.__appBootStage || "unknown"}`,
    `bootError=${window.__appBootError || "none"}`,
    `stage=${window.__firebaseInitStage || "unknown"}`,
    `configLoaded=${window.__firebaseConfigLoaded ? "yes" : "no"}`,
    `libraryLoaded=${window.__firebaseLibraryLoaded ? "yes" : "no"}`,
    `hasBootstrap=${window.__firebaseInitPromise ? "yes" : "no"}`,
    `hasInstance=${window.__patrickFirebase?.db ? "yes" : "no"}`,
    `backendEnabled=${supabaseEnabled ? "yes" : "no"}`,
    `client=${activeClientId || "none"}`,
    `configError=${window.__firebaseConfigLoadError || "none"}`,
    `libraryError=${window.__firebaseLibraryLoadError || "none"}`,
    `initError=${window.__firebaseInitError || "none"}`
  ].join(", ");
}

window.addEventListener("error", event => {
  window.__appBootError = event?.error?.message || event?.message || "unknown script error";
  updateDataStoreStatus();
});

window.addEventListener("unhandledrejection", event => {
  window.__appBootError = event?.reason?.message || String(event?.reason || "unknown promise rejection");
  updateDataStoreStatus();
});

async function initializeSharedDataSource() {
  window.__firebaseInitStage = "starting";
  supabaseInitStartedAt = Date.now();
  supabaseStatus = "Checking Firebase Firestore availability";
  updateDataStoreStatus();
  window.clearTimeout(supabaseInitTimeout);
  supabaseInitTimeout = window.setTimeout(() => {
    finalizeSupabaseInitStatusIfPending();
  }, 2500);
  if (!hasSupabaseConfig()) {
    window.__firebaseInitStage = "config-check-failed";
    supabaseStatus = `Firebase Firestore unavailable: ${getSupabaseSetupIssue()}`;
    window.clearTimeout(supabaseInitTimeout);
    updateDataStoreStatus();
    return;
  }

  try {
    window.__firebaseInitStage = "waiting-for-bootstrap";
    await window.__firebaseInitPromise;
    window.__firebaseInitStage = "bootstrap-resolved";
    if (!window.__patrickFirebase?.db) {
      window.__firebaseInitStage = "missing-db-instance";
      throw new Error(getSupabaseSetupIssue() || "Firebase Firestore did not initialize");
    }
    supabaseClient = window.__patrickFirebase;
    supabaseEnabled = true;
    window.__firebaseInitStage = "backend-enabled";
    window.clearTimeout(supabaseInitTimeout);
    supabaseStatus = activeClientId
      ? "Connecting to Firebase Firestore shared storage"
      : "Firebase Firestore ready; choose a client to load data";
    updateDataStoreStatus();
    if (activeClientId) {
      window.__firebaseInitStage = "subscribing-live-sync";
      await subscribeToSharedState();
      window.__firebaseInitStage = "live-sync-active";
    }
  } catch (error) {
    supabaseEnabled = false;
    window.__firebaseInitStage = "init-catch";
    window.clearTimeout(supabaseInitTimeout);
    supabaseStatus = `Firebase Firestore unavailable: ${error.message}`;
    updateDataStoreStatus();
  }
}

function stopSharedStateSync() {
  if (typeof sharedStateUnsubscribe === "function") {
    sharedStateUnsubscribe();
  }
  sharedStateUnsubscribe = null;
  sharedStateListenerId = "";
  if (typeof refreshSignalUnsubscribe === "function") {
    refreshSignalUnsubscribe();
  }
  refreshSignalUnsubscribe = null;
  refreshSignalListenerId = "";
  lastSeenRefreshSignalAt = "";
}

function applyRemoteSharedState(remoteState, updatedAt = "") {
  const originalStateJson = JSON.stringify(remoteState);
  const normalizedState = structuredClone(remoteState);
  const preferredBillMonth = forceCurrentBillMonthOnNextRemoteApply
    ? defaultBillMonth()
    : (state.billMonth || "");
  if (forceCurrentBillMonthOnNextRemoteApply) {
    normalizedState.billMonth = defaultBillMonth();
  }
  applyDataMigrations(normalizedState);
  const normalizedStateJson = JSON.stringify(normalizedState);
  const selectedUserEmail = state.currentUser;
  applyingRemoteState = true;
  state = initializeState(normalizedState);
  forceCurrentBillMonthOnNextRemoteApply = false;
  if (selectedUserEmail) state.currentUser = selectedUserEmail;
  if (preferredBillMonth) {
    loadBudgetMonth(preferredBillMonth, { syncSnapshot: false });
  }
  cacheRemoteUpdatedAt(updatedAt || state.lastSavedAt || "");
  if (getStorageKey()) {
    localStorage.setItem(getStorageKey(), JSON.stringify(state));
  }
  supabaseStatus = `Firebase Firestore shared storage; live sync active for ${currentClientConfig()?.shortName || "client"}${updatedAt ? `; synced ${formatDateTime(updatedAt)}` : ""}`;
  render();
  updateDataStoreStatus();
  applyingRemoteState = false;
  return normalizedStateJson !== originalStateJson;
}

async function subscribeToSharedState() {
  if (!supabaseEnabled || !activeClientId || !getSupabaseStateId()) return;
  stopSharedStateSync();
  const clientId = activeClientId;
  const stateId = getSupabaseStateId();
  const docRef = supabaseClient.doc(supabaseClient.db, SUPABASE_TABLE, stateId);
  sharedStateListenerId = `${clientId}:${stateId}`;
  supabaseStatus = `Firebase Firestore shared storage; connecting live sync for ${currentClientConfig()?.shortName || "client"}`;
  updateDataStoreStatus();

  await new Promise((resolve, reject) => {
    let settled = false;
    const settleResolve = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    const settleReject = error => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    };

    sharedStateUnsubscribe = supabaseClient.onSnapshot(
      docRef,
      async snapshot => {
        if (sharedStateListenerId !== `${clientId}:${stateId}` || activeClientId !== clientId) {
          settleResolve();
          return;
        }

        try {
          if (!snapshot.exists()) {
            cacheRemoteUpdatedAt("");
            settleResolve();
            await saveSharedStateNow();
            return;
          }

          const data = snapshot.data() || {};
          const remoteState = data.state;
          const updatedAt = data.updated_at || "";
          const remoteUpdatedAtMs = toTimestampMs(updatedAt);
          const pendingLocalSaveMs = toTimestampMs(pendingLocalSharedSaveAt);

          if (pendingLocalSaveMs && (!remoteUpdatedAtMs || remoteUpdatedAtMs < pendingLocalSaveMs)) {
            settleResolve();
            return;
          }

          if (!remoteState || !Array.isArray(remoteState.tasks)) {
            settleResolve();
            await saveSharedStateNow();
            return;
          }

          const needsNormalizationSave = applyRemoteSharedState(remoteState, updatedAt);
          settleResolve();
          if (needsNormalizationSave) {
            await saveSharedStateNow();
          }
        } catch (error) {
          supabaseStatus = `Firebase Firestore sync failed: ${error.message}`;
          updateDataStoreStatus();
          settleReject(error);
        }
      },
      error => {
        supabaseStatus = `Firebase Firestore listener failed: ${error.message}`;
        updateDataStoreStatus();
        settleReject(error);
      }
    );
  });

  const refreshDocRef = supabaseClient.doc(supabaseClient.db, FIREBASE_REFRESH_SIGNAL_TABLE, stateId);
  refreshSignalListenerId = `${clientId}:${stateId}`;
  refreshSignalUnsubscribe = supabaseClient.onSnapshot(
    refreshDocRef,
    snapshot => {
      if (refreshSignalListenerId !== `${clientId}:${stateId}` || activeClientId !== clientId || !snapshot.exists()) {
        return;
      }
      const data = snapshot.data() || {};
      const requestedAt = String(data.requested_at || "");
      const requestedBySession = String(data.session_id || "");
      if (!requestedAt) return;
      if (!lastSeenRefreshSignalAt) {
        lastSeenRefreshSignalAt = requestedAt;
        return;
      }
      if (requestedAt === lastSeenRefreshSignalAt) return;
      lastSeenRefreshSignalAt = requestedAt;
      if (requestedBySession === DEVICE_SESSION_ID) return;
      supabaseStatus = `Firebase Firestore shared storage; remote refresh requested for ${currentClientConfig()?.shortName || "client"}; reloading`;
      updateDataStoreStatus();
      window.setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.set("refresh", Date.now().toString());
        window.location.href = url.toString();
      }, 150);
    },
    error => {
      supabaseStatus = `Firebase Firestore refresh signal failed: ${error.message}`;
      updateDataStoreStatus();
    }
  );
}

async function requestRemoteClientRefresh() {
  if (!supabaseEnabled || !activeClientId || !getSupabaseStateId()) {
    alert("Choose a client with Firebase sync active first.");
    return;
  }
  try {
    const requestedAt = new Date().toISOString();
    const refreshDocRef = supabaseClient.doc(
      supabaseClient.db,
      FIREBASE_REFRESH_SIGNAL_TABLE,
      getSupabaseStateId()
    );
    await supabaseClient.setDoc(
      refreshDocRef,
      {
        id: getSupabaseStateId(),
        client_id: activeClientId,
        requested_at: requestedAt,
        requested_by: state.currentUser || "",
        requested_by_name: getAllowedUserByEmail(state.currentUser || "")?.name || "",
        session_id: DEVICE_SESSION_ID
      },
      { merge: true }
    );
    lastSeenRefreshSignalAt = requestedAt;
    supabaseStatus = `Firebase Firestore shared storage; latest pull requested for ${currentClientConfig()?.shortName || "client"}`;
    updateDataStoreStatus();
    const url = new URL(window.location.href);
    url.searchParams.set("refresh", Date.now().toString());
    window.location.href = url.toString();
  } catch (error) {
    supabaseStatus = `Firebase Firestore refresh request failed: ${error.message}`;
    updateDataStoreStatus();
    alert(`Could not request the latest pull on other devices: ${error.message}`);
  }
}

function queueSharedStateSave() {
  if (!supabaseEnabled || applyingRemoteState || !activeClientId || !getSupabaseStateId()) return;
  pendingLocalSharedSaveAt = state.lastSavedAt || new Date().toISOString();
  window.clearTimeout(supabaseSaveTimer);
  supabaseSaveTimer = window.setTimeout(() => {
    saveSharedStateNow().catch(error => {
      supabaseStatus = `Firebase Firestore save failed: ${error.message}`;
      updateDataStoreStatus();
    });
  }, SUPABASE_SAVE_DELAY_MS);
}

async function saveSharedStateNow() {
  if (!supabaseEnabled || !activeClientId || !getSupabaseStateId()) return;
  try {
    const payload = {
      id: getSupabaseStateId(),
      state,
      updated_by: state.currentUser || "",
      updated_at: new Date().toISOString()
    };

    const docRef = supabaseClient.doc(supabaseClient.db, SUPABASE_TABLE, getSupabaseStateId());
    await supabaseClient.setDoc(docRef, payload, { merge: true });

    cacheRemoteUpdatedAt(payload.updated_at);
    pendingLocalSharedSaveAt = "";
    supabaseStatus = `Firebase Firestore shared storage; live sync active for ${currentClientConfig()?.shortName || "client"}; saved ${formatDateTime(remoteUpdatedAt)}`;
    updateDataStoreStatus();
  } catch (error) {
    supabaseStatus = `Firebase Firestore save failed: ${error.message}`;
    updateDataStoreStatus();
    throw error;
  }
}

async function updateSyncStatus() {
  const localBuildStatus = document.querySelector("#localBuildStatus");
  const syncStatus = document.querySelector("#syncStatus");
  localBuildStatus.textContent = `${BUILD_INFO.label}: ${formatDateTime(BUILD_INFO.builtAt)}`;
  updateDataStoreStatus();

  try {
    const response = await fetch(`${GITHUB_COMMIT_API}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    const data = await response.json();
    const remoteSha = data.sha ? data.sha.slice(0, 7) : "unknown";
    const remoteDate = data.commit?.committer?.date || data.commit?.author?.date;
    syncStatus.textContent = `${remoteSha} pushed ${formatDateTime(remoteDate)}`;
    syncStatus.className = "sync-ok";
  } catch (error) {
    syncStatus.textContent = `Could not verify GitHub push timestamp: ${error.message}`;
    syncStatus.className = "sync-warn";
  }
}

function updateDataStoreStatus() {
  const dataStoreStatus = document.querySelector("#dataStoreStatus");
  const fallbackLabel = window.location.protocol === "file:"
    ? "local file browser storage"
    : `${window.location.hostname} browser storage`;
  if (
    !supabaseEnabled &&
    supabaseStatus === "Checking Firebase Firestore availability" &&
    supabaseInitStartedAt &&
    Date.now() - supabaseInitStartedAt > 3000
  ) {
    finalizeSupabaseInitStatusIfPending();
  }
  if (!activeClientId) {
    dataStoreStatus.textContent = supabaseEnabled
      ? "Firebase Firestore ready; choose a client to load shared data"
      : supabaseStatus === "Checking Firebase Firestore availability"
        ? `${fallbackLabel}; ${supabaseStatus}; ${getFirebaseDebugStatus()}`
        : `${fallbackLabel}; ${supabaseStatus}`;
    return;
  }
  const locationLabel = supabaseEnabled
    ? `${supabaseStatus}; local cache standby`
    : `${fallbackLabel}; ${supabaseStatus}`;
  const debugSuffix = !supabaseEnabled && supabaseStatus === "Checking Firebase Firestore availability"
    ? `; ${getFirebaseDebugStatus()}`
    : "";
  dataStoreStatus.textContent = `${locationLabel}${debugSuffix}; local backup ${formatDateTime(state.lastSavedAt)}`;
}

function renderOverviewCards() {
  if (!overviewCards) return;
  const cards = currentClientConfig()?.overviewCards || [];
  overviewCards.innerHTML = "";
  cards.forEach(card => {
    const article = document.createElement("article");
    article.innerHTML = `
      <span class="metric-label">${escapeHtml(card.label)}</span>
      <strong>${escapeHtml(card.value)}</strong>
      <span>${escapeHtml(card.detail)}</span>
    `;
    overviewCards.appendChild(article);
  });
}

function updateClientChrome() {
  const client = currentClientConfig();
  if (clientSwitchBtn) clientSwitchBtn.textContent = client ? `Client: ${client.shortName}` : "Choose Client";
  if (topClientSwitchBtn) topClientSwitchBtn.hidden = true;
  if (topClientSelect) topClientSelect.value = client?.id || "";
  if (topClientPin) {
    const needsPin = !!(topClientSelect && clientNeedsAccessPin(topClientSelect.value) && !isClientAccessValidated(topClientSelect.value));
    if (topClientPinWrapInline) topClientPinWrapInline.hidden = !needsPin;
    topClientPin.hidden = !needsPin;
    if (topClientPin.hidden) topClientPin.value = "";
  }
  if (userSelect) {
    userSelect.disabled = !client;
    if (userSelect.options.length) {
      userSelect.options[0].textContent = client ? "Select account..." : "Choose client first...";
    }
  }
  if (pullLatestDevicesBtn) {
    pullLatestDevicesBtn.disabled = !client || !supabaseEnabled;
    pullLatestDevicesBtn.title = client && supabaseEnabled
      ? `Tell other open ${client.shortName} dashboards to reload the latest shared data`
      : "Choose a client with Firebase sync active first";
  }
  if (currentUserContent && toggleCurrentUserBtn) {
    currentUserContent.hidden = currentUserCollapsed;
    toggleCurrentUserBtn.textContent = currentUserCollapsed ? "Show" : "Hide";
    toggleCurrentUserBtn.setAttribute("aria-expanded", String(!currentUserCollapsed));
    toggleCurrentUserBtn.setAttribute("aria-label", `${currentUserCollapsed ? "Show" : "Hide"} Current user`);
  }
  if (appTitle) appTitle.textContent = client ? client.title : "3G Tracking and Notifications";
  if (appLede) appLede.textContent = client
    ? client.lede
    : "Choose a client to load their separate dashboard, notes, reports, and saved history.";
  if (appEyebrow) appEyebrow.textContent = client ? `Client workspace: ${client.fullName}` : "Multi-client tracking workspace";
  document.title = client ? client.browserTitle : "3G Tracking and Notifications";
  renderOverviewCards();

  if (processGuideBtn) processGuideBtn.hidden = !client?.supportsReports;
  if (urgencyReportBtn) urgencyReportBtn.hidden = !client?.supportsReports;
  if (patrickChangeReportBtn) patrickChangeReportBtn.hidden = !client?.supportsReports;
  if (htmlEmailDashboardReportBtn) htmlEmailDashboardReportBtn.hidden = !client?.supportsReports;
  if (toggleLifeAdminBtn) toggleLifeAdminBtn.hidden = !client?.supportsLifeAdmin;
}

function render() {
  updateClientChrome();
  const query = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;
  const priority = priorityFilter.value;
  const category = categoryFilter.value;

  const filtered = state.tasks.filter(task => {
    const haystack = buildTaskSearchText(task);
    const matchesView = taskViewMode === "done"
      ? isClosedTask(task)
      : taskViewMode === "all"
        ? true
        : !isClosedTask(task);
    return (!query || haystack.includes(query))
      && matchesView
      && (status === "all" || task.status === status)
      && (priority === "all" || task.priority === priority)
      && (category === "all" || (task.category || "N/A") === category);
  });

  taskList.innerHTML = "";
  if (filtered.length) {
    renderTaskGroups(filtered);
  } else {
    const empty = document.createElement("p");
    empty.className = "empty-notes";
    empty.textContent = taskViewMode === "done"
      ? "No done or on-hold items match the current filters."
      : taskViewMode === "all"
        ? "No items match the current filters."
        : "No active items match the current filters.";
    taskList.appendChild(empty);
  }
  updateProgress();
  renderTaskViewControls();
  renderBills();
  renderLifeAdminNotes();
  renderPatrickWatch();
  renderPanelVisibility();
  renderRunningNotes();
  syncTopTodoPopoutState();
  userSelect.value = state.currentUser || "";
  updateTaskLabelControls();
}

function buildTaskSearchText(task) {
  const base = Object.values(task || {}).join(" ").toLowerCase();
  if (isTopTodoListTask(task)) {
    const todos = normalizeTodoListItems(task.todoItems)
      .map(item => `${item.title} ${item.status} ${item.createdAt} ${item.closedAt} ${item.notes}`)
      .join(" ")
      .toLowerCase();
    return `${base} ${todos}`.trim();
  }
  if (!isDailyProjectManagerTask(task)) return base;
  const checklist = normalizeDailyChecklist(task.dailyChecklist)
    .map(item => `${item.title} ${item.taskDate} ${item.status} ${item.notes}`)
    .join(" ")
    .toLowerCase();
  return `${base} ${checklist}`.trim();
}

function renderPatrickWatch() {
  const isDeric = state.currentUser === DERIC_EMAIL;
  const canShowPatrickWatch = isPatrickClient() && isDeric;
  patrickWatchPanel.hidden = !canShowPatrickWatch;
  if (!canShowPatrickWatch) return;

  setPanelCollapsed(
    patrickWatchPanel,
    patrickWatchContent,
    togglePatrickWatchBtn,
    state.hiddenPanels.patrickWatch,
    "Client Change Watch"
  );

  const patrickEntries = state.history
    .filter(entry => entry.userEmail === "patrick.glanville@gmail.com")
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const todayEntries = patrickEntries.filter(entry => isEasternDateToday(entry.createdAt));
  const openEntries = patrickEntries.filter(entry => !isPatrickEntryClosed(entry));
  const closedEntries = patrickEntries.filter(isPatrickEntryClosed);
  const currentView = patrickWatchState.view || "open";
  const visibleEntries = currentView === "closed"
    ? closedEntries
    : currentView === "all"
      ? patrickEntries
      : openEntries;

  patrickTodayCount.textContent = String(todayEntries.length);
  patrickPendingCount.textContent = String(openEntries.length);
  patrickClosedCount.textContent = String(closedEntries.length);
  patrickViewOpenBtn.classList.toggle("is-active", currentView === "open");
  patrickViewClosedBtn.classList.toggle("is-active", currentView === "closed");
  patrickViewAllBtn.classList.toggle("is-active", currentView === "all");

  patrickWatchList.innerHTML = "";
  if (!patrickEntries.length) {
    patrickWatchList.textContent = "No client updates have been recorded yet.";
    return;
  }

  if (!visibleEntries.length) {
    patrickWatchList.textContent = currentView === "closed"
      ? "No closed client changes yet."
      : currentView === "all"
        ? "No client changes are available."
        : "No open client changes right now.";
    return;
  }

  visibleEntries.forEach(entry => {
    const itemType = entry.itemType || "task";
    const closed = isPatrickEntryClosed(entry);
    const reviewed = isPatrickEntryReviewed(entry);
    const item = document.createElement("article");
    item.className = `patrick-watch-item${closed ? " is-closed" : ""}`;
    item.innerHTML = `
      <header>
        <div class="history-entry-headline">
          <span class="history-type-badge history-type-${escapeHtml(historyTypeClass(itemType))}">${escapeHtml(historyTypeLabel(itemType))}</span>
          <span class="history-user-badge">${escapeHtml(entry.userName || "Unknown user")}</span>
          <h3>${escapeHtml(entry.taskTitle)}</h3>
        </div>
        <span>${escapeHtml(formatDateTime(entry.createdAt))}</span>
      </header>
      <p>${escapeHtml(entry.summary)}</p>
      <div class="patrick-watch-meta">
        <span>Status: ${escapeHtml(entry.status || "N/A")} | Complete: ${normalizePercent(entry.percent)}%</span>
        ${reviewed ? '<span class="status-chip status-chip-reviewed">Reviewed</span>' : ""}
        ${closed ? '<span class="status-chip status-chip-closed">Closed</span>' : ""}
      </div>
      <div class="patrick-watch-actions">
        ${closed
          ? '<button type="button" class="ghost reopen-patrick-entry">Reopen</button>'
          : `
            <button type="button" class="ghost review-patrick-entry">Mark Reviewed</button>
            <button type="button" class="ghost close-patrick-entry">Approve & Close</button>
          `}
      </div>
    `;
    const reviewButton = item.querySelector(".review-patrick-entry");
    if (reviewButton) {
      reviewButton.addEventListener("click", () => {
        markPatrickEntriesReviewed([entry]);
        renderPatrickWatch();
      });
    }
    const closeButton = item.querySelector(".close-patrick-entry");
    if (closeButton) {
      closeButton.addEventListener("click", () => {
        closePatrickEntries([entry]);
        renderPatrickWatch();
      });
    }
    const reopenButton = item.querySelector(".reopen-patrick-entry");
    if (reopenButton) {
      reopenButton.addEventListener("click", () => {
        reopenPatrickEntry(entry.id);
        renderPatrickWatch();
      });
    }
    patrickWatchList.appendChild(item);
  });
}

function isEasternDateToday(value) {
  if (!value) return false;
  const easternToday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
  const easternValueDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
  return easternValueDate === easternToday;
}

function renderRunningNotes() {
  runningNotesList.innerHTML = "";
  if (!state.runningNotes.length) {
    const empty = document.createElement("p");
    empty.className = "empty-notes";
    empty.textContent = "No client notes have been saved yet.";
    runningNotesList.appendChild(empty);
    return;
  }

  [...state.runningNotes]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .forEach(note => {
      const item = document.createElement("article");
      item.className = "running-note-item";
      item.dataset.noteId = note.id;
      item.innerHTML = `
        <header>
          <span>Created ${escapeHtml(formatDateTime(note.createdAt))}${note.createdByName ? ` by ${escapeHtml(note.createdByName)}` : ""}</span>
          <span>Updated ${escapeHtml(formatDateTime(note.updatedAt))}${note.updatedByName ? ` by ${escapeHtml(note.updatedByName)}` : ""}</span>
        </header>
        <textarea class="running-note-text" rows="3">${escapeHtml(note.text)}</textarea>
        <div class="running-note-actions">
          <button type="button" class="save-running-note">Update note</button>
          <button type="button" class="ghost delete-running-note">Delete</button>
        </div>
      `;
      item.querySelector(".save-running-note").addEventListener("click", () => updateRunningNote(item));
      item.querySelector(".delete-running-note").addEventListener("click", () => deleteRunningNote(note.id));
      runningNotesList.appendChild(item);
    });
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function renderSavedDocuments() {
  if (!documentsList) return false;
  documentsList.innerHTML = "";
  if (!state.documents.length) {
    documentsList.textContent = "No document metadata has been saved yet.";
    return false;
  }

  [...state.documents]
    .sort((a, b) => (b.savedAt || "").localeCompare(a.savedAt || ""))
    .forEach(savedDocument => {
      const item = document.createElement("article");
      item.className = "document-item";
      item.innerHTML = `
        <header>
          <div>
            <h3>${escapeHtml(savedDocument.name)}</h3>
            <div class="document-meta">
              <span>${escapeHtml(formatFileSize(savedDocument.sizeBytes))}</span>
              <span>Saved ${escapeHtml(formatDateTime(savedDocument.savedAt))}</span>
              <span>${escapeHtml(savedDocument.savedByName || savedDocument.savedByEmail || "Unknown user")}</span>
              <span>${escapeHtml(savedDocument.path || "No shared file path saved")}</span>
            </div>
          </div>
        </header>
        <p>Only document metadata is kept in Firebase Firestore to reduce bandwidth use.</p>
      `;
      documentsList.appendChild(item);
    });

  return true;
}

function renderTaskViewControls() {
  taskViewActiveBtn.classList.toggle("is-active", taskViewMode === "active");
  taskViewDoneBtn.classList.toggle("is-active", taskViewMode === "done");
  taskViewAllBtn.classList.toggle("is-active", taskViewMode === "all");
  const closedStatusOptions = [...statusFilter.options].filter(option => isClosedTaskStatus(option.value));
  closedStatusOptions.forEach(option => {
    option.disabled = taskViewMode === "active";
  });
  if (taskViewMode === "active" && isClosedTaskStatus(statusFilter.value)) {
      statusFilter.value = "all";
  }
}

function openSavedDocument(documentId) {
  const savedDocument = state.documents.find(item => item.id === documentId);
  if (!savedDocument?.path) {
    alert("This document no longer has an openable PDF stored in Firebase Firestore.");
    return;
  }
  alert(`Open this PDF from its saved path instead:\n${savedDocument.path}`);
}

function savePdfDocument(file) {
  alert("PDF uploads to Firebase Firestore have been disabled to reduce egress. Keep only file metadata or a shared file path outside tracker_state.");
  return Promise.resolve(false);
}

function addRunningNote() {
  const text = newRunningNote.value.trim();
  if (!text) return;
  const user = ensureCurrentUser("add a running note");
  if (!user) return;
  const now = new Date().toISOString();
  state.runningNotes.unshift({
    id: crypto.randomUUID(),
    text,
    createdAt: now,
    updatedAt: now,
    createdByEmail: user.email,
    createdByName: user.name,
    updatedByEmail: user.email,
    updatedByName: user.name
  });
  recordHistoryEntry({
    itemType: "runningNote",
    itemId: state.runningNotes[0].id,
    title: historyTitleFor("runningNote", truncateText(text)),
    summary: `Running note added: ${truncateText(text, 140)}`,
    status: "Added",
    percent: 0
  });
  state.notes = "";
  newRunningNote.value = "";
  saveState();
  renderRunningNotes();
}

function updateRunningNote(item) {
  const note = state.runningNotes.find(entry => entry.id === item.dataset.noteId);
  if (!note) return;
  const user = ensureCurrentUser("update a running note");
  if (!user) return;
  const previousText = note.text;
  const text = item.querySelector(".running-note-text").value.trim();
  if (!text) {
    alert("A note cannot be blank. Delete it if it is no longer needed.");
    return;
  }
  note.text = text;
  note.updatedAt = new Date().toISOString();
  note.updatedByEmail = user.email;
  note.updatedByName = user.name;
  if (text !== previousText) {
    recordHistoryEntry({
      itemType: "runningNote",
      itemId: note.id,
      title: historyTitleFor("runningNote", truncateText(text || previousText)),
      summary: `Running note updated from "${truncateText(previousText, 70)}" to "${truncateText(text, 70)}"`,
      status: "Updated",
      percent: 0
    });
  }
  saveState();
  renderRunningNotes();
}

function deleteRunningNote(id) {
  const note = state.runningNotes.find(entry => entry.id === id);
  if (!ensureCurrentUser("delete a running note")) return;
  if (!note || !confirm("Delete this running note?")) return;
  recordHistoryEntry({
    itemType: "runningNote",
    itemId: note.id,
    title: historyTitleFor("runningNote", truncateText(note.text)),
    summary: `Running note deleted: ${truncateText(note.text, 140)}`,
    status: "Deleted",
    percent: 0
  });
  state.runningNotes = state.runningNotes.filter(entry => entry.id !== id);
  saveState();
  renderRunningNotes();
}

function renderTaskGroups(tasks) {
  const groups = groupTasksForDashboard(sortTasksForDashboard(tasks));
  groups.forEach(group => {
    const section = document.createElement("section");
    section.className = "task-group";
    const isCollapsed = Boolean(state.collapsedTaskGroups[group.name]);

    const header = document.createElement("button");
    header.type = "button";
    header.className = "task-group-header";
    header.setAttribute("aria-expanded", String(!isCollapsed));
    header.innerHTML = `
      <span>${escapeHtml(group.name)}</span>
      <small>${group.tasks.length} card${group.tasks.length === 1 ? "" : "s"}</small>
      <strong>${isCollapsed ? "Show" : "Hide"}</strong>
    `;
    header.addEventListener("click", () => {
      state.collapsedTaskGroups[group.name] = !state.collapsedTaskGroups[group.name];
      saveState();
      render();
    });

    const grid = document.createElement("div");
    grid.className = "task-grid";
    grid.hidden = isCollapsed;
    group.tasks.forEach(task => grid.appendChild(createTaskCard(task)));

    section.append(header, grid);
    taskList.appendChild(section);
  });
}

function groupTasksForDashboard(tasks) {
  const grouped = new Map();
  tasks.forEach(task => {
    const groupName = taskGroupName(task.category);
    if (!grouped.has(groupName)) grouped.set(groupName, []);
    grouped.get(groupName).push(task);
  });

  return [...grouped.entries()]
    .map(([name, groupTasks]) => ({ name, tasks: groupTasks }))
    .sort((a, b) => taskGroupRank(a.name) - taskGroupRank(b.name) || a.name.localeCompare(b.name));
}

function taskGroupRank(groupName) {
  const index = taskGroupOrder.indexOf(groupName);
  return index >= 0 ? index : taskGroupOrder.length;
}

function taskGroupName(category = "N/A") {
  if (category === "Priority to-do list") return "Priority To-Do List";
  if (category === "Daily action manager") return "Daily Project Manager";
  if (category.startsWith("Job -") || category === "Income" || category === "Cash") return "Jobs and Income";
  if (category === "Career strategy" || category === "Job barriers" || category === "Income pathways") return "Career Strategy and Income Reset";
  if (category === "Benefits") return "Benefits and Assistance";
  if (category === "Transportation" || category === "Transportation - Turo rental" || category === "Vehicle") return "Transportation and Vehicle";
  if (category === "Debt" || category === "Debt - lender hardship" || category === "Medical bills") return "Debt, Bills, and Legal";
  if (category === "Health" || category === "Insurance") return "Health and Insurance";
  if (category === "Household tasks" || category === "Home safety") return "Household and Home";
  if (category === "Family" || category === "Plan" || category === "Accountability") return "Family, Plan, and Accountability";
  return "Other";
}

function renderPanelVisibility() {
  setPanelCollapsed(
    overviewPanel,
    overviewContent,
    toggleOverviewBtn,
    state.hiddenPanels.overview,
    "Situation Overview"
  );
  setPanelCollapsed(
    budgetPanel,
    budgetPanelContent,
    toggleBillsBtn,
    state.hiddenPanels.bills,
    "Monthly Bills"
  );
  if (toggleBudgetSnapshotsBtn && budgetSnapshotsContent) {
    setPanelCollapsed(
      document.querySelector(".budget-snapshots"),
      budgetSnapshotsContent,
      toggleBudgetSnapshotsBtn,
      state.hiddenPanels.budgetSnapshots,
      "Saved Monthly Budgets"
    );
  }
  const client = currentClientConfig();
  if (client?.supportsLifeAdmin) {
    setPanelHidden(
      lifeAdminPanel,
      lifeAdminPanelContent,
      toggleLifeAdminBtn,
      state.hiddenPanels.lifeAdmin,
      "Client To-Do Notes"
    );
  } else {
    lifeAdminPanel.hidden = true;
    lifeAdminPanelContent.hidden = true;
  }
}

function setPanelHidden(panel, content, button, hidden, label) {
  panel.hidden = hidden;
  content.hidden = hidden;
  panel.classList.toggle("panel-collapsed", hidden);
  button.textContent = hidden ? `Show ${label}` : `Hide ${label}`;
  button.setAttribute("aria-expanded", String(!hidden));
  button.setAttribute("aria-label", `${hidden ? "Show" : "Hide"} ${label}`);
}

function setPanelCollapsed(panel, content, button, hidden, label) {
  panel.hidden = false;
  content.hidden = hidden;
  panel.classList.toggle("panel-collapsed", hidden);
  button.textContent = hidden ? `Show ${label}` : `Hide ${label}`;
  button.setAttribute("aria-expanded", String(!hidden));
  button.setAttribute("aria-label", `${hidden ? "Show" : "Hide"} ${label}`);
}

function renderBills() {
  const usesSimpleBills = !clientUsesBillGrouping();
  if (!["full", "early", "mid", "late"].includes(state.billGroupView)) {
    state.billGroupView = defaultBillGroupView(state.billMonth);
  }
  if (usesSimpleBills) {
    state.billGroupView = "full";
  }
  billMonthInput.value = state.billMonth || defaultBillMonth();
  if (billMBFInput) billMBFInput.value = normalizeMoney(state.monthlyBudgetFund);
  if (budgetPanel) {
    budgetPanel.classList.toggle("budget-panel-compact-view", Boolean(state.billsCompactView));
  }
  if (toggleBillsCompactBtn) {
    toggleBillsCompactBtn.textContent = state.billsCompactView ? "Standard View" : "Compact View";
    toggleBillsCompactBtn.className = state.billsCompactView ? "" : "ghost";
    toggleBillsCompactBtn.setAttribute("aria-pressed", String(Boolean(state.billsCompactView)));
  }
  billList.innerHTML = "";
  if (hiddenBillList) hiddenBillList.innerHTML = "";

  const visibleBills = usesSimpleBills
    ? [...state.bills]
    : state.bills.filter(bill => !bill.hidden).sort(compareBillsByDueDate);
  const hiddenBills = usesSimpleBills
    ? []
    : state.bills.filter(bill => bill.hidden);
  const recommendedPayments = calculateRecommendedBillPayments(visibleBills);
  const billGroups = {
    early: visibleBills.filter(bill => getBillDueGroup(bill) === "early"),
    mid: visibleBills.filter(bill => getBillDueGroup(bill) === "mid"),
    late: visibleBills.filter(bill => getBillDueGroup(bill) === "late")
  };

  const buildBillTotalsRow = billsForTotals => {
    const totals = billsForTotals.reduce((acc, bill) => {
      acc.previousBalance += normalizeMoney(bill.previousBalance ?? bill.currentBalance);
      acc.currentBalance += normalizeMoney(bill.currentBalance);
      acc.balanceDiff += normalizeMoney(bill.currentBalance) - normalizeMoney(bill.previousBalance ?? bill.currentBalance);
      acc.creditLimit += normalizeMoney(bill.creditLimit);
      acc.amount += normalizeMoney(bill.amount);
      acc.paidAmount += normalizeMoney(bill.paidAmount);
      acc.recommended += normalizeMoney(recommendedPayments.get(bill.id) ?? bill.amount);
      return acc;
    }, {
      previousBalance: 0,
      currentBalance: 0,
      balanceDiff: 0,
      creditLimit: 0,
      amount: 0,
      paidAmount: 0,
      recommended: 0
    });
    const overallCreditPercent = totals.creditLimit > 0
      ? Math.max(0, ((totals.creditLimit - totals.currentBalance) / totals.creditLimit) * 100)
      : null;
    const creditClass = overallCreditPercent === null
      ? ""
      : (overallCreditPercent < 50 ? " is-low-credit" : " is-healthy-credit");
    const row = document.createElement("article");
    row.className = "budget-bill-item budget-bill-total-row";
    row.innerHTML = `
      <div class="budget-bill-total-cell budget-bill-total-label">Totals</div>
      <div class="budget-bill-total-cell">-</div>
      <div class="budget-bill-total-cell">${escapeHtml(formatCurrency(totals.previousBalance))}</div>
      <div class="budget-bill-total-cell">${escapeHtml(formatCurrency(totals.currentBalance))}</div>
      <div class="budget-bill-total-cell">${escapeHtml(formatSignedCurrency(totals.balanceDiff))}</div>
      <div class="budget-bill-total-cell">${escapeHtml(formatCurrency(totals.creditLimit))}</div>
      <div class="budget-bill-total-cell">${escapeHtml(formatCurrency(totals.amount))}</div>
      <div class="budget-bill-total-cell">${escapeHtml(formatCurrency(totals.paidAmount))}</div>
      <div class="budget-bill-total-cell">${escapeHtml(formatCurrency(totals.recommended))}</div>
      <div class="budget-bill-total-cell">-</div>
      <div class="budget-bill-total-cell">-</div>
      <div class="budget-bill-total-cell">-</div>
      <div class="budget-bill-total-cell budget-bill-status-note${creditClass}">${overallCreditPercent === null ? "N/A" : escapeHtml(formatPercentLabel(overallCreditPercent))}</div>
      <div class="budget-bill-total-cell">-</div>
      <div class="budget-bill-total-cell">-</div>
      <div class="budget-bill-total-cell">-</div>
    `;
    return row;
  };

  const renderBillRow = (bill, targetList, hiddenMode = false) => {
    const creditRemainingPercent = calculateCreditRemainingPercent(bill);
    const creditRemainingClass = creditRemainingPercent === null
      ? ""
      : (creditRemainingPercent < 50 ? " is-low-credit" : " is-healthy-credit");
    const recommendedPayment = recommendedPayments.get(bill.id) ?? normalizeMoney(bill.amount);
    const pastDue = isBillPastDue(bill);
    const dueSoon = !pastDue && isBillDueSoon(bill, 7);
    const balanceDiff = normalizeMoney(bill.currentBalance) - normalizeMoney(bill.previousBalance ?? bill.currentBalance);
    const row = document.createElement("article");
    row.className = `budget-bill-item${pastDue ? " is-past-due" : ""}${dueSoon ? " is-due-soon" : ""}${bill.status === "Paid" ? " is-paid" : ""}${bill.hidden ? " is-hidden" : ""}`;
    row.dataset.billId = bill.id;
    row.innerHTML = `
      <label class="budget-bill-field budget-bill-name-box">
        <span>Bill</span>
        <input class="bill-name" value="${escapeAttribute(bill.name)}" aria-label="Bill name">
      </label>
      <div class="budget-bill-field budget-bill-apr-box">
        <span>APR</span>
        <div class="budget-bill-apr">${bill.apr ? escapeHtml(formatApr(bill.apr)) : "-"}</div>
      </div>
      <label class="budget-bill-field">
        <span>Previous balance</span>
        <input class="bill-previous-balance" type="text" inputmode="decimal" value="${escapeAttribute(formatCurrencyInputValue(bill.previousBalance ?? bill.currentBalance))}" aria-label="Previous balance">
      </label>
      <label class="budget-bill-field">
        <span>Current balance</span>
        <input class="bill-current-balance" type="text" inputmode="decimal" value="${escapeAttribute(formatCurrencyInputValue(bill.currentBalance))}" aria-label="Current balance">
      </label>
      <label class="budget-bill-field">
        <span>Difference</span>
        <input class="bill-balance-diff" type="text" value="${escapeAttribute(formatSignedCurrency(balanceDiff))}" aria-label="Balance difference" readonly>
      </label>
      <label class="budget-bill-field">
        <span>Credit line</span>
        <input class="bill-credit-limit" type="text" inputmode="decimal" value="${escapeAttribute(formatCurrencyInputValue(bill.creditLimit))}" aria-label="Credit line">
      </label>
      <label class="budget-bill-field">
        <span>Due amt</span>
        <input class="bill-amount" type="text" inputmode="decimal" value="${escapeAttribute(formatCurrencyInputValue(bill.amount))}" aria-label="Bill amount due">
      </label>
      <label class="budget-bill-field">
        <span>Paid amt</span>
        <input class="bill-paid-amount" type="text" inputmode="decimal" value="${escapeAttribute(formatCurrencyInputValue(bill.paidAmount))}" aria-label="Actual amount paid">
      </label>
      <label class="budget-bill-field">
        <span>Recommended</span>
        <input class="bill-recommended-payment" type="text" value="${escapeAttribute(formatCurrency(recommendedPayment))}" aria-label="Recommended payment" readonly>
      </label>
      <label class="budget-bill-field">
        <span>Tran #</span>
        <input class="bill-transaction-number" value="${escapeAttribute(bill.transactionNumber || "")}" aria-label="Transaction number">
      </label>
      <label class="budget-bill-field">
        <span>Due date</span>
        <input class="bill-due" type="date" value="${escapeAttribute(bill.due)}" aria-label="Bill due date">
      </label>
      <label class="budget-bill-field">
        <span>Date paid</span>
        <input class="bill-paid-date" type="date" value="${escapeAttribute(bill.paidDate || "")}" aria-label="Bill date paid">
      </label>
      <div class="budget-bill-field budget-bill-credit-box">
        <span>% Credit</span>
        <div class="budget-bill-status-note${creditRemainingClass}">${creditRemainingPercent === null ? "N/A" : escapeHtml(formatPercentLabel(creditRemainingPercent))}</div>
      </div>
      <div class="budget-bill-status-box">
        <label class="budget-bill-field">
          <span>Status</span>
          <select class="bill-status" aria-label="Bill status"${bill.statusTracksPaidDate ? " disabled" : ""}>
            ${billStatusOptions.map(status => `<option${status === bill.status ? " selected" : ""}>${escapeHtml(status)}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="budget-bill-notes-box">
        <label class="budget-bill-field">
          <span>Notes</span>
          <textarea class="bill-notes" rows="2" aria-label="Bill notes" placeholder="Optional notes">${escapeHtml(bill.notes || "")}</textarea>
        </label>
      </div>
      <div class="budget-bill-actions">
        <button type="button" class="toggle-bill-hidden" aria-label="${bill.hidden ? "Unhide" : "Hide"} bill">${bill.hidden ? "Unhide" : "Hide"}</button>
        <button type="button" class="delete-bill-button" aria-label="Delete bill">Delete</button>
      </div>
    `;

    row.querySelector(".bill-name").addEventListener("input", () => updateBillFromRow(row, { recordHistory: false, persist: false }));
    row.querySelector(".bill-previous-balance").addEventListener("input", () => updateBillFromRow(row, { recordHistory: false, persist: false }));
    row.querySelector(".bill-current-balance").addEventListener("input", () => updateBillFromRow(row, { recordHistory: false, persist: false }));
    row.querySelector(".bill-credit-limit").addEventListener("input", () => updateBillFromRow(row, { recordHistory: false, persist: false }));
    row.querySelector(".bill-amount").addEventListener("input", () => updateBillFromRow(row, { recordHistory: false, persist: false }));
    row.querySelector(".bill-paid-amount").addEventListener("input", () => updateBillFromRow(row, { recordHistory: false, persist: false }));
    row.querySelector(".bill-transaction-number").addEventListener("input", () => updateBillFromRow(row, { recordHistory: false, persist: false }));
    row.querySelector(".bill-notes").addEventListener("input", () => updateBillFromRow(row, { recordHistory: false, persist: false }));
    row.querySelector(".bill-name").addEventListener("change", () => updateBillFromRow(row));
    row.querySelector(".bill-previous-balance").addEventListener("change", () => updateBillFromRow(row));
    row.querySelector(".bill-current-balance").addEventListener("change", () => updateBillFromRow(row));
    row.querySelector(".bill-credit-limit").addEventListener("change", () => updateBillFromRow(row));
    row.querySelector(".bill-amount").addEventListener("change", () => updateBillFromRow(row));
    row.querySelector(".bill-due").addEventListener("change", () => updateBillFromRow(row));
    row.querySelector(".bill-paid-amount").addEventListener("change", () => updateBillFromRow(row));
    row.querySelector(".bill-transaction-number").addEventListener("change", () => updateBillFromRow(row));
    row.querySelector(".bill-paid-date").addEventListener("change", () => updateBillFromRow(row));
    row.querySelector(".bill-status").addEventListener("change", () => updateBillFromRow(row));
    row.querySelector(".bill-notes").addEventListener("change", () => updateBillFromRow(row));
    row.querySelector(".toggle-bill-hidden").addEventListener("click", () => toggleBillHidden(bill.id));
    row.querySelector(".delete-bill-button").addEventListener("click", () => deleteBill(bill.id));
    if (hiddenMode) {
      row.querySelectorAll("input, textarea, select").forEach(control => {
        control.disabled = true;
      });
    }
    targetList.appendChild(row);
  };

  if (usesSimpleBills) {
    const list = document.createElement("div");
    list.className = "budget-bill-list budget-bill-list-simple";
    if (!visibleBills.length) {
      const empty = document.createElement("p");
      empty.className = "empty-notes";
      empty.textContent = "No monthly bills in this month.";
      list.appendChild(empty);
    } else {
      visibleBills.forEach(bill => renderSimpleBillRow(bill, list));
    }
    billList.appendChild(list);
  } else {
    const list = document.createElement("div");
    list.className = "budget-bill-list budget-bill-list-admin";
    const filteredBills = state.billGroupView === "full"
      ? visibleBills
      : billGroups[state.billGroupView] || [];
    list.appendChild(buildBillTotalsRow(filteredBills));
    if (!filteredBills.length) {
      const empty = document.createElement("p");
      empty.className = "empty-notes";
      empty.textContent = "No bills in this view for this month.";
      list.appendChild(empty);
    } else {
      filteredBills.forEach(bill => renderBillRow(bill, list, false));
    }
    billList.appendChild(list);
  }
  if (!usesSimpleBills) {
    hiddenBills.forEach(bill => renderBillRow(bill, hiddenBillList, true));
  }

  [
    ["full", billGroupFullBtn],
    ["early", billGroupEarlyBtn],
    ["mid", billGroupMidBtn],
    ["late", billGroupLateBtn]
  ].forEach(([groupKey, button]) => {
    if (!button) return;
    const isActive = state.billGroupView === groupKey;
    button.className = isActive ? "" : "ghost";
    button.setAttribute("aria-pressed", String(isActive));
  });

  const billGroupToolbar = document.querySelector(".budget-group-toolbar");
  if (billGroupToolbar) {
    billGroupToolbar.hidden = usesSimpleBills;
  }
  const billListHeader = document.querySelector(".budget-bill-list-header");
  if (billListHeader) {
    billListHeader.classList.toggle("is-simple", usesSimpleBills);
    billListHeader.innerHTML = usesSimpleBills
      ? "<span>Bill</span><span>Amount</span><span>Due</span><span>Status</span><span>Notes</span><span>Actions</span>"
      : "<span>Bill</span><span>APR</span><span>Prev Bal</span><span>Current Bal</span><span>Diff</span><span>Credit Line</span><span>Due Amt</span><span>Paid Amt</span><span>Recommended</span><span>Tran #</span><span>Due</span><span>Date Paid</span><span>% Credit</span><span>Status</span><span>Notes</span><span>Actions</span>";
  }

  const hiddenBillsPanel = document.querySelector(".hidden-bills-panel");
  if (hiddenBillsPanel) {
    hiddenBillsPanel.hidden = usesSimpleBills;
  }
  if (copyBillsToNextMonthBtn) copyBillsToNextMonthBtn.hidden = usesSimpleBills;
  if (calculateBillsBtn) calculateBillsBtn.hidden = usesSimpleBills;
  if (assignDueDatesBtn) assignDueDatesBtn.hidden = usesSimpleBills;
  if (undoCopyBillsToNextMonthBtn) undoCopyBillsToNextMonthBtn.hidden = usesSimpleBills;
  if (toggleBillsPopoutBtn) toggleBillsPopoutBtn.hidden = usesSimpleBills;

  if (toggleHiddenBillsBtn) {
    const hiddenCount = hiddenBills.length;
    toggleHiddenBillsBtn.hidden = hiddenCount === 0;
    toggleHiddenBillsBtn.textContent = state.hiddenBillsExpanded
      ? `Hide Hidden Bills (${hiddenCount})`
      : `Show Hidden Bills (${hiddenCount})`;
  }
  if (hiddenBillsContent) {
    hiddenBillsContent.hidden = !state.hiddenBillsExpanded || hiddenBills.length === 0;
  }

  updateBillTotals();
  renderUpcomingBillsBanner();
  renderBudgetSnapshots();

  if (autoCalculateBillsOnLoadPending && !usesSimpleBills) {
    autoCalculateBillsOnLoadPending = false;
    setTimeout(() => {
      calculateAllBillBalances({ skipUserCheck: true, skipHistory: true });
    }, 0);
  }
}

function deleteBill(id) {
  const bill = state.bills.find(item => item.id === id);
  if (!bill) return;
  if (!ensureCurrentUser("delete a monthly bill")) return;
  const month = state.billMonth || defaultBillMonth();
  ensureMonthlyBudgetState(month);
  const deletedKey = String(bill.templateKey || "").trim();
  if (deletedKey) {
    const deletedBillKeys = new Set(state.monthlyBudgets[month]?.deletedBillKeys || []);
    deletedBillKeys.add(deletedKey);
    state.monthlyBudgets[month].deletedBillKeys = Array.from(deletedBillKeys);
  }
  const deletedName = String(bill.name || "").trim().toLowerCase();
  if (deletedName) {
    const deletedBillNames = new Set(state.monthlyBudgets[month]?.deletedBillNames || []);
    deletedBillNames.add(deletedName);
    state.monthlyBudgets[month].deletedBillNames = Array.from(deletedBillNames);
  }
  recordHistoryEntry({
    itemType: "bill",
    itemId: bill.id,
    title: historyTitleFor("bill", bill.name || "Untitled bill"),
    summary: `Monthly bill deleted${bill.amount ? ` for ${formatCurrency(bill.amount)}` : ""}`,
    status: bill.status || "N/A",
    percent: percentFromBillStatus(bill.status)
  });
  state.bills = state.bills.filter(item => item.id !== id);
  syncCurrentBudgetMonth();
  saveState();
  renderBills();
}

function buildBillChangeSummary(before, after) {
  const changes = [];
  if ((before.name || "") !== (after.name || "")) changes.push(`Name changed from ${before.name || "Untitled"} to ${after.name || "Untitled"}`);
  if (normalizeMoney(before.previousBalance ?? before.currentBalance) !== normalizeMoney(after.previousBalance ?? after.currentBalance)) changes.push(`Previous balance changed from ${formatCurrency(before.previousBalance ?? before.currentBalance)} to ${formatCurrency(after.previousBalance ?? after.currentBalance)}`);
  if (normalizeMoney(before.currentBalance) !== normalizeMoney(after.currentBalance)) changes.push(`Current balance changed from ${formatCurrency(before.currentBalance)} to ${formatCurrency(after.currentBalance)}`);
  if (normalizeMoney(before.creditLimit) !== normalizeMoney(after.creditLimit)) changes.push(`Credit line changed from ${formatCurrency(before.creditLimit)} to ${formatCurrency(after.creditLimit)}`);
  if (normalizeMoney(before.amount) !== normalizeMoney(after.amount)) changes.push(`Amount changed from ${formatCurrency(before.amount)} to ${formatCurrency(after.amount)}`);
  if ((before.transactionNumber || "") !== (after.transactionNumber || "")) changes.push(`Transaction number changed from ${before.transactionNumber || "None"} to ${after.transactionNumber || "None"}`);
  if ((before.due || "") !== (after.due || "")) changes.push(`Due date changed from ${before.due || "No due date"} to ${after.due || "No due date"}`);
  if ((before.status || "") !== (after.status || "")) changes.push(`Status changed from ${before.status || "N/A"} to ${after.status || "N/A"}`);
  if (normalizeMoney(before.paidAmount) !== normalizeMoney(after.paidAmount)) changes.push(`Amount paid changed from ${formatCurrency(before.paidAmount)} to ${formatCurrency(after.paidAmount)}`);
  if ((before.paidDate || "") !== (after.paidDate || "")) changes.push(`Date paid changed from ${before.paidDate || "No paid date"} to ${after.paidDate || "No paid date"}`);
  if ((before.notes || "") !== (after.notes || "")) changes.push("Notes updated");
  return summarizeLines(changes, "Monthly bill updated");
}

function updateBillFromRow(row, options = {}) {
  const bill = state.bills.find(item => item.id === row.dataset.billId);
  if (!bill) return;
  if (!options.skipUserCheck && !ensureCurrentUser("update a monthly bill")) return;
  const recordHistory = options.recordHistory !== false;
  const persist = options.persist !== false;
  const before = { ...bill };
  const getField = selector => row.querySelector(selector);
  bill.name = getField(".bill-name")?.value.trim() ?? bill.name;
  bill.previousBalance = getField(".bill-previous-balance")
    ? normalizeCurrencyCell(getField(".bill-previous-balance").value)
    : (bill.previousBalance ?? bill.currentBalance);
  bill.currentBalance = getField(".bill-current-balance")
    ? normalizeCurrencyCell(getField(".bill-current-balance").value)
    : bill.currentBalance;
  bill.creditLimit = getField(".bill-credit-limit")
    ? normalizeCurrencyCell(getField(".bill-credit-limit").value)
    : bill.creditLimit;
  bill.amount = getField(".bill-amount")
    ? normalizeCurrencyCell(getField(".bill-amount").value)
    : bill.amount;
  bill.transactionNumber = getField(".bill-transaction-number")?.value.trim() ?? bill.transactionNumber;
  bill.due = getField(".bill-due")?.value ?? bill.due;
  bill.paidAmount = getField(".bill-paid-amount")
    ? normalizeCurrencyCell(getField(".bill-paid-amount").value)
    : bill.paidAmount;
  bill.paidDate = getField(".bill-paid-date")?.value ?? bill.paidDate;
  bill.status = bill.statusTracksPaidDate
    ? (bill.paidDate ? "Paid" : "Unpaid")
    : (getField(".bill-status")?.value ?? bill.status);
  bill.notes = getField(".bill-notes")?.value.trim() ?? bill.notes;
  if (options.recalculateBalance) {
    bill.currentBalance = calculateCurrentBalanceFromPayment(bill.previousBalance, bill.paidAmount, bill.apr);
  }
  const summary = buildBillChangeSummary(before, bill);
  if (recordHistory && (summary !== "Monthly bill updated" || JSON.stringify(before) !== JSON.stringify(bill))) {
    recordHistoryEntry({
      itemType: "bill",
      itemId: bill.id,
      title: historyTitleFor("bill", bill.name || before.name || "Untitled bill"),
      summary,
      status: bill.status || "N/A",
      percent: percentFromBillStatus(bill.status)
    });
  }
  if (persist) {
    syncCurrentBudgetMonth(false);
    saveState();
  }
  updateBillTotals();

  if (options.recordHistory !== false) {
    if (getField(".bill-previous-balance")) getField(".bill-previous-balance").value = formatCurrencyInputValue(bill.previousBalance);
    if (getField(".bill-current-balance")) getField(".bill-current-balance").value = formatCurrencyInputValue(bill.currentBalance);
    if (getField(".bill-credit-limit")) getField(".bill-credit-limit").value = formatCurrencyInputValue(bill.creditLimit);
    if (getField(".bill-amount")) getField(".bill-amount").value = formatCurrencyInputValue(bill.amount);
    if (getField(".bill-paid-amount")) getField(".bill-paid-amount").value = formatCurrencyInputValue(bill.paidAmount);
  }
}

function calculateAllBillBalances(options = {}) {
  if (clientUsesBillGrouping() === false) return;
  if (!options.skipUserCheck && !ensureCurrentUser("calculate monthly bill balances")) return;
  const rows = [...document.querySelectorAll(".budget-bill-item[data-bill-id]")];
  if (!rows.length) return;
  rows.forEach(row => {
    updateBillFromRow(row, {
      recalculateBalance: true,
      recordHistory: options.skipHistory ? false : false,
      persist: false,
      skipUserCheck: true
    });
  });
  syncCurrentBudgetMonth(false);
  saveState();
  renderBills();
}

function updateBillTotals() {
  const monthlyBudgetFund = normalizeMoney(state.monthlyBudgetFund);
  const {
    totalBills: total,
    paidBills: paid,
    remainingBills: remaining,
    cashFlow,
    covered,
    fundingGap,
    pastDueCount: pastDue
  } = calculateBudgetTotals(monthlyBudgetFund, state.bills);

  if (billMBFDisplay) billMBFDisplay.textContent = formatCurrency(monthlyBudgetFund);
  billTotal.textContent = formatCurrency(total);
  billPaid.textContent = formatCurrency(paid);
  billRemaining.textContent = formatCurrency(remaining);
  if (billCashFlow) {
    billCashFlow.textContent = formatSignedCurrency(cashFlow);
    billCashFlow.parentElement?.classList.toggle("is-negative", !covered);
    billCashFlow.parentElement?.classList.toggle("is-positive", covered && cashFlow > 0);
  }
  if (billCoverage) {
    billCoverage.textContent = covered ? "Covered" : `Short ${formatCurrency(fundingGap)}`;
    billCoverage.parentElement?.classList.toggle("is-negative", !covered);
    billCoverage.parentElement?.classList.toggle("is-positive", covered);
  }
  billPastDue.textContent = pastDue;
  if (budgetAlert) {
    if (covered) {
      budgetAlert.hidden = true;
      budgetAlert.textContent = "";
    } else {
      budgetAlert.hidden = false;
      budgetAlert.textContent = `Monthly Budget Fund does not cover this month's bills. Additional funding needed: ${formatCurrency(fundingGap)}.`;
    }
  }
}

function currentBudgetSnapshot() {
  const monthlyBudgetFund = normalizeMoney(state.monthlyBudgetFund);
  const totals = calculateBudgetTotals(monthlyBudgetFund, state.bills);
  return {
    month: state.billMonth || defaultBillMonth(),
    monthlyBudgetFund,
    totalBills: totals.totalBills,
    paidBills: totals.paidBills,
    remainingBills: totals.remainingBills,
    cashFlow: totals.cashFlow,
    fundingGap: totals.fundingGap,
    covered: totals.covered,
    pastDueCount: totals.pastDueCount
  };
}

function renderBudgetSnapshots() {
  if (!budgetSnapshotList) return;
  budgetSnapshotList.innerHTML = "";
  const storedSnapshots = new Map(
    (state.budgetSnapshots || [])
      .map(normalizeBudgetSnapshot)
      .filter(Boolean)
      .map(snapshot => [snapshot.month, snapshot])
  );
  const snapshots = Object.values(normalizeMonthlyBudgetsMap(state.monthlyBudgets))
    .map(monthlyBudget => {
      const totals = calculateBudgetTotals(monthlyBudget.monthlyBudgetFund, monthlyBudget.bills);
      const stored = storedSnapshots.get(monthlyBudget.month);
      return normalizeBudgetSnapshot({
        id: stored?.id || crypto.randomUUID(),
        month: monthlyBudget.month,
        monthlyBudgetFund: monthlyBudget.monthlyBudgetFund,
        totalBills: totals.totalBills,
        paidBills: totals.paidBills,
        remainingBills: totals.remainingBills,
        cashFlow: totals.cashFlow,
        fundingGap: totals.fundingGap,
        covered: totals.covered,
        pastDueCount: totals.pastDueCount,
        savedAt: stored?.savedAt || stored?.updatedAt || new Date().toISOString(),
        updatedAt: stored?.updatedAt || stored?.savedAt || new Date().toISOString()
      });
    })
    .filter(Boolean)
    .sort((a, b) => (b.month || "").localeCompare(a.month || "") || (b.updatedAt || "").localeCompare(a.updatedAt || ""));

  if (!snapshots.length) {
    const empty = document.createElement("p");
    empty.className = "empty-notes";
    empty.textContent = "No monthly budgets have been saved yet.";
    budgetSnapshotList.appendChild(empty);
    return;
  }

  snapshots.forEach(snapshot => {
    const card = document.createElement("article");
    card.className = `budget-snapshot-card${snapshot.covered ? "" : " is-negative"}`;
    card.innerHTML = `
      <div class="budget-snapshot-card-header">
        <strong>${escapeHtml(snapshot.month)}</strong>
        <span>${snapshot.covered ? "Covered" : `Short ${escapeHtml(formatCurrency(snapshot.fundingGap))}`}</span>
      </div>
      <div class="budget-snapshot-grid">
        <span>MBF: ${escapeHtml(formatCurrency(snapshot.monthlyBudgetFund))}</span>
        <span>Total: ${escapeHtml(formatCurrency(snapshot.totalBills))}</span>
        <span>Paid: ${escapeHtml(formatCurrency(snapshot.paidBills))}</span>
        <span>Remaining: ${escapeHtml(formatCurrency(snapshot.remainingBills))}</span>
        <span>Cash flow: ${escapeHtml(formatSignedCurrency(snapshot.cashFlow))}</span>
        <span>Past due: ${escapeHtml(String(snapshot.pastDueCount))}</span>
      </div>
      <p>Saved ${escapeHtml(formatDateTime(snapshot.savedAt))}${snapshot.updatedAt && snapshot.updatedAt !== snapshot.savedAt ? ` | Updated ${escapeHtml(formatDateTime(snapshot.updatedAt))}` : ""}</p>
    `;
    budgetSnapshotList.appendChild(card);
  });
}

function isBillPastDue(bill) {
  return Boolean(bill.due && bill.status !== "Paid" && bill.status !== "Deferred" && bill.due < getTodayIsoDate());
}

function isBillDueSoon(bill, days = 7) {
  if (!bill?.due || bill.status === "Paid" || bill.status === "Deferred") return false;
  const today = new Date(`${getTodayIsoDate()}T00:00:00`);
  const dueDate = new Date(`${bill.due}T00:00:00`);
  if (Number.isNaN(today.getTime()) || Number.isNaN(dueDate.getTime())) return false;
  if (dueDate < today) return false;
  const end = new Date(today);
  end.setDate(end.getDate() + days);
  return dueDate <= end;
}

function toggleBillHidden(id) {
  const bill = state.bills.find(item => item.id === id);
  if (!ensureCurrentUser("update a monthly bill")) return;
  if (!bill) return;
  bill.hidden = !bill.hidden;
  if (bill.hidden) {
    state.hiddenBillsExpanded = true;
  }
  recordHistoryEntry({
    itemType: "bill",
    itemId: bill.id,
    title: historyTitleFor("bill", bill.name || "Untitled bill"),
    summary: bill.hidden
      ? `Monthly bill hidden${bill.amount ? ` for ${formatCurrency(bill.amount)}` : ""}`
      : `Monthly bill unhidden${bill.amount ? ` for ${formatCurrency(bill.amount)}` : ""}`,
    status: bill.hidden ? "Hidden" : "Visible",
    percent: 0
  });
  syncCurrentBudgetMonth();
  saveState();
  renderBills();
}

function saveBudgetSnapshot() {
  if (!ensureCurrentUser("save a monthly budget")) return;
  syncCurrentBudgetMonth();
  const snapshotData = currentBudgetSnapshot();
  recordHistoryEntry({
    itemType: "bill",
    itemId: snapshotData.month,
    title: historyTitleFor("bill", `Budget snapshot ${snapshotData.month}`),
    summary: `Monthly budget saved for ${snapshotData.month}${snapshotData.covered ? "" : ` with funding gap ${formatCurrency(snapshotData.fundingGap)}`}`,
    status: snapshotData.covered ? "Covered" : "Short",
    percent: snapshotData.covered ? 100 : 0
  });
  saveState();
  renderBills();
}

function copyBillsToNextMonth() {
  if (!ensureCurrentUser("copy monthly bill values to the next month")) return;
  const currentMonth = state.billMonth || defaultBillMonth();
  const nextMonth = shiftMonthString(currentMonth, 1);
  const currentMonthBudget = ensureMonthlyBudgetState(currentMonth);
  const sourceBills = dedupeBudgetBills((currentMonthBudget?.bills || state.bills).map(normalizeBill));
  const copiedBills = sourceBills.map(currentBill => ({
    ...normalizeBill(currentBill),
    previousBalance: normalizeMoney(currentBill.currentBalance),
    currentBalance: normalizeMoney(currentBill.currentBalance),
    creditLimit: normalizeMoney(currentBill.creditLimit),
    amount: normalizeMoney(currentBill.amount),
    due: normalizeBillDateLike(currentBill.due)
      ? moveDateToTargetMonth(normalizeBillDateLike(currentBill.due), nextMonth)
      : "",
    status: "Unpaid",
    paidAmount: 0,
    paidDate: "",
    transactionNumber: "",
    hidden: Boolean(currentBill.hidden)
  }));

  const normalizedNextMonthBudget = normalizeMonthlyBudgetEntry({
    month: nextMonth,
    monthlyBudgetFund: state.monthlyBudgetFund,
    copiedForwardFrom: currentMonth,
    bills: copiedBills,
    deletedBillKeys: [],
    deletedBillNames: []
  }, nextMonth);
  normalizedNextMonthBudget.bills = normalizedNextMonthBudget.bills.map(bill => {
    const sourceBill = copiedBills.find(candidate => (candidate.templateKey || candidate.name) === (bill.templateKey || bill.name));
    if (!sourceBill) return bill;
    return {
      ...bill,
      due: normalizeBillDateLike(sourceBill.due) || bill.due || ""
    };
  });
  state.monthlyBudgets[nextMonth] = normalizedNextMonthBudget;
  syncBudgetSnapshotForMonth(nextMonth);
  loadBudgetMonth(nextMonth, { syncSnapshot: false });
  state.billGroupView = "full";
  saveState();
  renderBills();
  if (copyBillsToNextMonthBtn) {
    copyBillsToNextMonthBtn.textContent = `Copied to ${formatBudgetMonthLabel(nextMonth)}`;
    window.setTimeout(() => {
      if (copyBillsToNextMonthBtn.textContent === `Copied to ${formatBudgetMonthLabel(nextMonth)}`) {
        copyBillsToNextMonthBtn.textContent = "Copy To Next Month";
      }
    }, 2000);
  }
}

function assignDueDatesFromPreviousMonth() {
  if (!ensureCurrentUser("assign due dates from the previous month")) return;
  const targetMonth = state.billMonth || defaultBillMonth();
  const previousMonth = shiftMonthString(targetMonth, -1);
  const previousMonthBudget = ensureMonthlyBudgetState(previousMonth);
  const targetMonthBudget = ensureMonthlyBudgetState(targetMonth);
  const previousBills = dedupeBudgetBills((previousMonthBudget?.bills || []).map(normalizeBill));
  const previousByKey = new Map(
    previousBills.map(bill => [
      (bill.templateKey || bill.name || "").trim().toLowerCase(),
      bill
    ]).filter(([key]) => Boolean(key))
  );

  let updatedCount = 0;
  const updatedBills = dedupeBudgetBills((targetMonthBudget?.bills || []).map(normalizeBill)).map(bill => {
    const key = (bill.templateKey || bill.name || "").trim().toLowerCase();
    const sourceBill = previousByKey.get(key);
    if (!sourceBill) return bill;
    const sourceDue = normalizeBillDateLike(sourceBill.due);
    if (!sourceDue) return bill;
    const shiftedDue = moveDateToTargetMonth(sourceDue, targetMonth);
    if (!shiftedDue || shiftedDue === bill.due) return bill;
    updatedCount += 1;
    return {
      ...bill,
      due: shiftedDue
    };
  });

  state.monthlyBudgets[targetMonth] = normalizeMonthlyBudgetEntry({
    ...targetMonthBudget,
    month: targetMonth,
    bills: updatedBills,
    copiedForwardFrom: targetMonthBudget.copiedForwardFrom || previousMonth
  }, targetMonth);
  loadBudgetMonth(targetMonth, { syncSnapshot: false });
  saveState();
  renderBills();

  if (assignDueDatesBtn) {
    const nextLabel = updatedCount > 0
      ? `Assigned ${updatedCount} due date${updatedCount === 1 ? "" : "s"}`
      : "No due dates found";
    assignDueDatesBtn.textContent = nextLabel;
    window.setTimeout(() => {
      if (assignDueDatesBtn.textContent === nextLabel) {
        assignDueDatesBtn.textContent = "Assign Due Dates";
      }
    }, 2000);
  }
}

function undoCopyBillsToNextMonth() {
  if (!ensureCurrentUser("clear copied monthly bill values from the next month")) return;
  const currentMonth = state.billMonth || defaultBillMonth();
  const nextMonth = shiftMonthString(currentMonth, 1);
  const nextMonthlyBudget = ensureMonthlyBudgetState(nextMonth);

  nextMonthlyBudget.bills.forEach(targetBill => {
    targetBill.previousBalance = 0;
    targetBill.currentBalance = 0;
    targetBill.creditLimit = 0;
    targetBill.amount = 0;
    targetBill.due = "";
    targetBill.status = "Unpaid";
    targetBill.paidAmount = 0;
    targetBill.paidDate = "";
    targetBill.transactionNumber = "";
  });

  state.monthlyBudgets[nextMonth] = normalizeMonthlyBudgetEntry({
    month: nextMonth,
    monthlyBudgetFund: nextMonthlyBudget.monthlyBudgetFund,
    copiedForwardFrom: "",
    bills: nextMonthlyBudget.bills
  }, nextMonth);
  syncBudgetSnapshotForMonth(nextMonth);
  loadBudgetMonth(nextMonth, { syncSnapshot: false });
  state.billGroupView = "full";
  saveState();
  renderBills();
  if (undoCopyBillsToNextMonthBtn) {
    undoCopyBillsToNextMonthBtn.textContent = `Cleared ${formatBudgetMonthLabel(nextMonth)}`;
    window.setTimeout(() => {
      if (undoCopyBillsToNextMonthBtn.textContent === `Cleared ${formatBudgetMonthLabel(nextMonth)}`) {
        undoCopyBillsToNextMonthBtn.textContent = "Undo Next Month Copy";
      }
    }, 2000);
  }
}

function renderLifeAdminNotes() {
  lifeAdminNotes.innerHTML = "";
  state.lifeAdminNotes.forEach(note => {
    const item = document.createElement("article");
    item.className = "life-admin-item";
    item.dataset.noteId = note.id;
    item.innerHTML = `
      <label>Item
        <input class="life-admin-title" value="${escapeAttribute(note.item)}" placeholder="Example: Cancel gym subscription">
      </label>
      <label>Due date
        <input class="life-admin-due" type="date" value="${escapeAttribute(note.due)}">
      </label>
      <label>Status
        <select class="life-admin-status">
          ${["Open", "In progress", "Done", "N/A"].map(status => `<option${status === note.status ? " selected" : ""}>${escapeHtml(status)}</option>`).join("")}
        </select>
      </label>
      <label>Notes
        <textarea class="life-admin-notes" rows="2" placeholder="Who to call, account number hint, deadline, documents needed">${escapeHtml(note.notes)}</textarea>
      </label>
      <button type="button" class="icon-button delete-life-admin-note" aria-label="Delete note">x</button>
    `;

    item.querySelectorAll("input, select, textarea").forEach(input => {
      input.addEventListener("change", () => updateLifeAdminNoteFromItem(item));
    });
    item.querySelector(".delete-life-admin-note").addEventListener("click", () => deleteLifeAdminNote(note.id));
    lifeAdminNotes.appendChild(item);
  });
}

function buildLifeAdminChangeSummary(before, after) {
  const changes = [];
  if ((before.item || "") !== (after.item || "")) changes.push(`Item changed from ${before.item || "Untitled"} to ${after.item || "Untitled"}`);
  if ((before.due || "") !== (after.due || "")) changes.push(`Due date changed from ${before.due || "No due date"} to ${after.due || "No due date"}`);
  if ((before.status || "") !== (after.status || "")) changes.push(`Status changed from ${before.status || "N/A"} to ${after.status || "N/A"}`);
  if ((before.notes || "") !== (after.notes || "")) changes.push("Notes updated");
  return summarizeLines(changes, "Patrick to-do note updated");
}

function updateLifeAdminNoteFromItem(item) {
  const note = state.lifeAdminNotes.find(entry => entry.id === item.dataset.noteId);
  if (!note) return;
  if (!ensureCurrentUser("update a Patrick to-do note")) return;
  const before = { ...note };
  note.item = item.querySelector(".life-admin-title").value.trim();
  note.due = item.querySelector(".life-admin-due").value;
  note.status = item.querySelector(".life-admin-status").value;
  note.notes = item.querySelector(".life-admin-notes").value.trim();
  const summary = buildLifeAdminChangeSummary(before, note);
  if (summary !== "Patrick to-do note updated" || JSON.stringify(before) !== JSON.stringify(note)) {
    recordHistoryEntry({
      itemType: "lifeAdmin",
      itemId: note.id,
      title: historyTitleFor("lifeAdmin", note.item || before.item || "Untitled note"),
      summary,
      status: note.status || "N/A",
      percent: percentFromLifeAdminStatus(note.status)
    });
  }
  saveState();
}

function deleteLifeAdminNote(id) {
  const note = state.lifeAdminNotes.find(entry => entry.id === id);
  if (!ensureCurrentUser("delete a Patrick to-do note")) return;
  if (!note || !confirm(`Delete "${note.item || "this note"}"?`)) return;
  recordHistoryEntry({
    itemType: "lifeAdmin",
    itemId: note.id,
    title: historyTitleFor("lifeAdmin", note.item || "Untitled note"),
    summary: "Patrick to-do note deleted",
    status: "Deleted",
    percent: 0
  });
  state.lifeAdminNotes = state.lifeAdminNotes.filter(entry => entry.id !== id);
  saveState();
  renderLifeAdminNotes();
}

function sortTasksForDashboard(tasks) {
  return [...tasks].sort((a, b) => {
    const groupDifference = taskGroupRank(taskGroupName(a.category)) - taskGroupRank(taskGroupName(b.category));
    if (groupDifference) return groupDifference;

    const dashboardOrderDifference = dashboardTaskOrderRank(a) - dashboardTaskOrderRank(b);
    if (dashboardOrderDifference) return dashboardOrderDifference;

    const categoryDifference = categoryRank(a.category) - categoryRank(b.category);
    if (categoryDifference) return categoryDifference;
    const priorityDifference = priorityRank(a.priority) - priorityRank(b.priority);
    if (priorityDifference) return priorityDifference;
    if (!a.due && b.due) return 1;
    if (a.due && !b.due) return -1;
    if (a.due && b.due && a.due !== b.due) return a.due.localeCompare(b.due);
    return a.title.localeCompare(b.title);
  });
}

function dashboardTaskOrderRank(task) {
  const groupName = taskGroupName(task?.category);
  if (groupName === "Priority To-Do List") return 0;
  if (groupName === "Daily Project Manager") return 0;
  if (groupName === "Health and Insurance") {
    const index = healthAndInsuranceCardOrder.indexOf(task?.seedKey || buildSeedTaskKey(task?.title || ""));
    return index >= 0 ? index : healthAndInsuranceCardOrder.length;
  }
  return Number.MAX_SAFE_INTEGER;
}

function categoryRank(category) {
  const normalized = category || "N/A";
  const index = categoryOrder.indexOf(normalized);
  return index >= 0 ? index : categoryOrder.length;
}

function priorityRank(priority) {
  const index = priorityOptions.indexOf(priority);
  return index >= 0 ? index : priorityOptions.length;
}

function populateCategories() {
  const categories = new Set(baseCategories);
  state.tasks.forEach(task => {
    if (task.category) categories.add(task.category);
  });
  const currentFilter = categoryFilter.value || "all";
  fields.category.innerHTML = "";
  categoryFilter.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "All";
  categoryFilter.appendChild(allOption);
  [...categories].sort((a, b) => categoryRank(a) - categoryRank(b) || a.localeCompare(b)).forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    fields.category.appendChild(option);

    const filterOption = option.cloneNode(true);
    categoryFilter.appendChild(filterOption);
  });
  categoryFilter.value = [...categoryFilter.options].some(option => option.value === currentFilter)
    ? currentFilter
    : "all";
}

function createTaskCard(task) {
  const card = document.createElement("article");
  card.className = "task-card";
  if (isTopTodoListTask(task)) card.classList.add("top-todo-card");
  if (isDailyProjectManagerTask(task)) card.classList.add("daily-project-card");
  if ((task.category || "").startsWith("Job -")) card.classList.add("job-card");

  const header = document.createElement("header");
  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.className = "task-title-input";
  titleInput.value = task.title || "";
  titleInput.setAttribute("aria-label", "Task title");
  const saveTitleChange = () => {
    const nextTitle = titleInput.value.trim();
    if (!nextTitle || nextTitle === task.title) {
      titleInput.value = task.title || "";
      return;
    }
    if (!ensureCurrentUser("rename a task")) {
      titleInput.value = task.title || "";
      return;
    }
    const before = task.title || "Untitled task";
    task.title = nextTitle;
    recordUpdate(task, `Title changed from ${before} to ${nextTitle}`);
    saveState();
    render();
  };
  titleInput.addEventListener("change", saveTitleChange);
  titleInput.addEventListener("blur", saveTitleChange);
  const priority = document.createElement("span");
  priority.className = `pill ${task.priority}`;
  priority.textContent = task.priority;
  const badges = document.createElement("div");
  badges.className = "badge-row";
  badges.appendChild(priority);
  if (task.tag) {
    const tag = document.createElement("button");
    tag.type = "button";
    tag.className = `change-tag${task.tagTone === "purple" ? " change-tag-purple" : ""}`;
    tag.textContent = task.tag;
    tag.title = `Clear ${task.tag} flag`;
    tag.setAttribute("aria-label", `Clear ${task.tag} flag for ${task.title || "this card"}`);
    tag.addEventListener("click", () => clearTaskTag(task));
    badges.appendChild(tag);
  }
  header.append(titleInput, badges);

  const meta = document.createElement("div");
  meta.className = "task-meta";
  meta.innerHTML = `
    <span>${escapeHtml(task.category || "Uncategorized")}</span>
    <span>${escapeHtml(task.owner || "No owner")}</span>
    <span>${normalizePercent(task.percent)}% complete</span>
    <span>Created ${escapeHtml(formatDateTime(task.createdAt))}</span>
    ${task.completedAt ? `<span class="task-completed-date">Completed ${escapeHtml(formatDateTime(task.completedAt))}</span>` : ""}
  `;

  const dueWrap = document.createElement("label");
  dueWrap.className = "due-inline";
  dueWrap.textContent = "Due date";
  const dueInput = document.createElement("input");
  dueInput.type = "date";
  dueInput.value = task.due || "";
  dueInput.addEventListener("change", () => {
    const before = task.due || "No due date";
    task.due = dueInput.value;
    recordUpdate(task, `Due date changed from ${before} to ${task.due || "No due date"}`);
    saveState();
    render();
  });
  dueWrap.appendChild(dueInput);

  const percentWrap = document.createElement("label");
  percentWrap.className = "percent-inline";
  percentWrap.textContent = "Percent complete";
  const percentInput = document.createElement("input");
  percentInput.type = "number";
  percentInput.min = "0";
  percentInput.max = "100";
  percentInput.step = "5";
  percentInput.value = normalizePercent(task.percent);
  percentInput.addEventListener("change", () => {
    const before = normalizePercent(task.percent);
    task.percent = normalizePercent(percentInput.value);
    syncTaskCompletionState(task);
    recordUpdate(task, `Percent complete changed from ${before}% to ${task.percent}%`);
    saveState();
    render();
  });
  percentWrap.appendChild(percentInput);

  const inlineMetrics = document.createElement("div");
  inlineMetrics.className = "task-inline-metrics";
  inlineMetrics.append(dueWrap, percentWrap);

  const meter = document.createElement("div");
  meter.className = "task-meter";
  meter.innerHTML = `<span style="width: ${normalizePercent(task.percent)}%"></span>`;

  const detailsBox = createTaskDetailsBox(task);
  const topTodoList = isTopTodoListTask(task)
    ? createTopTodoListSection(task)
    : null;
  const dailyProjectManager = isDailyProjectManagerTask(task)
    ? createDailyProjectManagerSection(task)
    : null;

  const medicationSummary = isMedicationGridTask(task)
    ? createMedicationSummary(task)
    : null;

  const commentBox = isTopTodoListTask(task) || isDailyProjectManagerTask(task)
    ? null
    : createInlineCommentBox(task);

  const footer = document.createElement("footer");
  const categorySelect = document.createElement("select");
  categorySelect.className = "category-select";
  getCategories().forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    option.selected = (task.category || "N/A") === category;
    categorySelect.appendChild(option);
  });
  categorySelect.addEventListener("change", () => {
    const before = task.category || "N/A";
    task.category = categorySelect.value;
    recordUpdate(task, `Category changed from ${before} to ${categorySelect.value}`);
    populateCategories();
    saveState();
    render();
  });

  const select = document.createElement("select");
  select.className = "status-select";
  statusOptions.forEach(status => {
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
    else if (select.value === "On-Hold" && task.percent === 100) task.percent = statusToPercent(select.value);
    else if (before === "Done" && task.percent === 100) task.percent = statusToPercent(select.value);
    syncTaskCompletionState(task);
    recordUpdate(task, `Status changed from ${before} to ${select.value}`);
    saveState();
    render();
  });

  const prioritySelect = document.createElement("select");
  prioritySelect.className = "priority-select";
  priorityOptions.forEach(priority => {
    const option = document.createElement("option");
    option.value = priority;
    option.textContent = priority;
    option.selected = task.priority === priority;
    prioritySelect.appendChild(option);
  });
  prioritySelect.addEventListener("change", () => {
    const before = task.priority;
    task.priority = prioritySelect.value;
    recordUpdate(task, `Priority changed from ${before} to ${prioritySelect.value}`);
    saveState();
    render();
  });

  const edit = document.createElement("button");
  edit.type = "button";
  edit.textContent = "Edit";
  edit.addEventListener("click", () => openTask(task.id));

  footer.append(categorySelect, select, prioritySelect, edit);
  card.append(header, meta, inlineMetrics, meter, detailsBox);
  if (topTodoList) card.appendChild(topTodoList);
  if (dailyProjectManager) card.appendChild(dailyProjectManager);
  if (medicationSummary) card.appendChild(medicationSummary);
  if (commentBox) card.appendChild(commentBox);
  card.appendChild(footer);
  return card;
}

function createTaskDetailsBox(task) {
  const wrapper = document.createElement("section");
  wrapper.className = "task-details-box";

  const next = document.createElement("p");
  next.className = "task-next-text";
  next.textContent = task.next || "No next step recorded.";

  const notesWrap = createInlineNotesBox(task);
  wrapper.append(next, notesWrap);
  return wrapper;
}

function createInlineNotesBox(task) {
  const wrapper = document.createElement("div");
  wrapper.className = "task-notes-box";

  const textarea = document.createElement("textarea");
  textarea.className = "task-notes-entry";
  textarea.rows = 3;
  textarea.value = task.notes || "";
  textarea.placeholder = "Add or update notes here";

  const saveNotesChange = () => {
    const nextNotes = textarea.value.trim();
    const before = task.notes || "";
    if (nextNotes === before) return;
    if (!ensureCurrentUser("update task notes")) {
      textarea.value = task.notes || "";
      return;
    }
    task.notes = nextNotes;
    recordUpdate(task, "Notes updated");
    saveState();
    render();
  };

  textarea.addEventListener("change", saveNotesChange);
  textarea.addEventListener("blur", saveNotesChange);
  wrapper.appendChild(textarea);
  return wrapper;
}

function createTopTodoListSection(task) {
  task.todoItems = normalizeTodoListItems(task.todoItems);
  task.todoView = task.todoView === "closed" ? "closed" : "active";

  const section = document.createElement("section");
  section.className = "top-todo-section";
  if (task.todoPoppedOut) section.classList.add("top-todo-section-popout");

  const openItems = task.todoItems.filter(item => !isClosedTaskStatus(item.status));
  const closedItems = task.todoItems.filter(item => isClosedTaskStatus(item.status));

  const toolbar = document.createElement("div");
  toolbar.className = "top-todo-toolbar";
  toolbar.innerHTML = `
    <div class="top-todo-metrics">
      <article><strong>${openItems.length}</strong><span>active</span></article>
      <article><strong>${closedItems.length}</strong><span>closed</span></article>
    </div>
  `;

  const viewSwitch = document.createElement("div");
  viewSwitch.className = "top-todo-view-switch";
  const activeButton = document.createElement("button");
  activeButton.type = "button";
  activeButton.className = task.todoView === "active" ? "" : "ghost";
  activeButton.textContent = "Active";
  activeButton.addEventListener("click", () => setTopTodoView(task, "active"));

  const closedButton = document.createElement("button");
  closedButton.type = "button";
  closedButton.className = task.todoView === "closed" ? "" : "ghost";
  closedButton.textContent = "Closed";
  closedButton.addEventListener("click", () => setTopTodoView(task, "closed"));
  const reportButton = document.createElement("button");
  reportButton.type = "button";
  reportButton.className = "ghost";
  reportButton.textContent = "Generate Report";
  reportButton.hidden = !currentClientConfig()?.supportsReports;
  reportButton.addEventListener("click", downloadOpenTodoReportHtml);
  const popoutButton = document.createElement("button");
  popoutButton.type = "button";
  popoutButton.className = "ghost";
  popoutButton.textContent = task.todoPoppedOut ? "Dock" : "Pop Out";
  popoutButton.setAttribute("aria-pressed", String(Boolean(task.todoPoppedOut)));
  popoutButton.addEventListener("click", () => toggleTopTodoPopout(task));
  viewSwitch.append(activeButton, closedButton, reportButton, popoutButton);
  toolbar.appendChild(viewSwitch);

  const addBox = document.createElement("div");
  addBox.className = "top-todo-add-box";
  const newTitle = document.createElement("input");
  newTitle.type = "text";
  newTitle.placeholder = "Create a new to-do item";
  const newStatus = document.createElement("select");
  statusOptions.forEach(status => {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = status;
    option.selected = status === "Not started";
    newStatus.appendChild(option);
  });
  const newNotes = document.createElement("textarea");
  newNotes.rows = 2;
  newNotes.placeholder = "Optional notes";
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "ghost";
  addButton.textContent = "Add item";
  addButton.addEventListener("click", () => addTopTodoItem(task, newTitle.value, newStatus.value, newNotes.value));
  newTitle.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      addTopTodoItem(task, newTitle.value, newStatus.value, newNotes.value);
    }
  });
  addBox.append(newTitle, newStatus, newNotes, addButton);

  const list = document.createElement("div");
  list.className = "top-todo-list";
  const visibleItems = task.todoView === "closed" ? closedItems : openItems;
  if (!visibleItems.length) {
    const empty = document.createElement("p");
    empty.className = "empty-notes";
    empty.textContent = task.todoView === "closed" ? "No closed to-do items yet." : "No active to-do items right now.";
    list.appendChild(empty);
  } else {
    visibleItems.forEach((item, index) => list.appendChild(createTopTodoItem(task, item, visibleItems, index)));
  }

  section.append(toolbar, addBox, list);
  return section;
}

function createTopTodoItem(task, item, visibleItems = [], visibleIndex = 0) {
  const isClosed = isClosedTaskStatus(item.status);
  const article = document.createElement("article");
  article.className = `top-todo-item${isClosed ? " is-closed" : ""}`;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = isClosed;
  checkbox.addEventListener("change", () => updateTopTodoItemStatus(task, item.id, checkbox.checked ? "Done" : "In progress"));

  const title = document.createElement("input");
  title.type = "text";
  title.className = "top-todo-title";
  title.value = item.title;
  title.addEventListener("change", () => updateTopTodoItemField(task, item.id, "title", title.value));
  title.addEventListener("blur", () => updateTopTodoItemField(task, item.id, "title", title.value));

  const status = document.createElement("select");
  status.className = "top-todo-status";
  statusOptions.forEach(statusName => {
    const option = document.createElement("option");
    option.value = statusName;
    option.textContent = statusName;
    option.selected = item.status === statusName;
    status.appendChild(option);
  });
  status.addEventListener("change", () => updateTopTodoItemStatus(task, item.id, status.value));

  const dates = document.createElement("div");
  dates.className = "top-todo-dates";
  dates.innerHTML = `
    <span>Created ${escapeHtml(formatDateTime(item.createdAt))}</span>
    <span>Modified ${escapeHtml(formatDateTime(item.updatedAt || item.createdAt))}</span>
    <span>${item.closedAt ? `Closed ${escapeHtml(formatDateTime(item.closedAt))}` : "Not closed"}</span>
  `;

  const notes = document.createElement("textarea");
  notes.rows = 1;
  notes.className = "top-todo-notes";
  notes.placeholder = "Notes";
  notes.value = item.notes || "";
  notes.addEventListener("change", () => updateTopTodoItemField(task, item.id, "notes", notes.value));
  notes.addEventListener("blur", () => updateTopTodoItemField(task, item.id, "notes", notes.value));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "ghost";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", () => deleteTopTodoItem(task, item.id));

  const moveControls = document.createElement("div");
  moveControls.className = "top-todo-move-controls";

  const moveUpButton = document.createElement("button");
  moveUpButton.type = "button";
  moveUpButton.className = "ghost";
  moveUpButton.textContent = "Up";
  moveUpButton.disabled = visibleIndex === 0;
  moveUpButton.addEventListener("click", () => moveTopTodoItem(task, item.id, -1));

  const moveDownButton = document.createElement("button");
  moveDownButton.type = "button";
  moveDownButton.className = "ghost";
  moveDownButton.textContent = "Down";
  moveDownButton.disabled = visibleIndex === visibleItems.length - 1;
  moveDownButton.addEventListener("click", () => moveTopTodoItem(task, item.id, 1));

  moveControls.append(moveUpButton, moveDownButton, deleteButton);

  article.append(checkbox, title, status, dates, notes, moveControls);
  return article;
}

function setTopTodoView(task, view) {
  task.todoView = view === "closed" ? "closed" : "active";
  saveState();
  render();
}

function toggleTopTodoPopout(task) {
  task.todoPoppedOut = !task.todoPoppedOut;
  saveState();
  render();
}

function syncTopTodoPopoutState() {
  const hasPoppedOutTopTodo = state.tasks.some(task => isTopTodoListTask(task) && task.todoPoppedOut);
  document.body.classList.toggle("top-todo-panel-open", hasPoppedOutTopTodo);
}

function addTopTodoItem(task, title, status = "Not started", notes = "") {
  const user = ensureCurrentUser("add a to-do item");
  if (!user) return;
  const cleanTitle = String(title || "").trim();
  if (!cleanTitle) return;

  const now = new Date().toISOString();
  const itemStatus = statusOptions.includes(status) ? status : "Not started";
  task.todoItems = normalizeTodoListItems(task.todoItems);
  task.todoItems.push({
    id: crypto.randomUUID(),
    title: cleanTitle,
    status: itemStatus,
    createdAt: now,
    updatedAt: now,
    closedAt: isClosedTaskStatus(itemStatus) ? now : "",
    notes: String(notes || "").trim(),
    order: task.todoItems.length
  });
  task.todoView = task.todoView === "closed" ? "closed" : "active";
  task.todoItems = normalizeTodoListItems(task.todoItems);
  recordUpdate(task, `To-do item added: ${cleanTitle}`, {
    status: itemStatus,
    percent: statusToPercent(itemStatus)
  });
  saveState();
  render();
}

function updateTopTodoItemField(task, itemId, field, value) {
  const user = ensureCurrentUser("update a to-do item");
  if (!user) return;
  task.todoItems = normalizeTodoListItems(task.todoItems);
  const item = task.todoItems.find(entry => entry.id === itemId);
  if (!item) return;

  const nextValue = String(value || "").trim();
  if (field === "title" && !nextValue) return;
  if ((item[field] || "") === nextValue) return;

  item[field] = nextValue;
  item.updatedAt = new Date().toISOString();
  task.todoItems = normalizeTodoListItems(task.todoItems);
  recordUpdate(task, `To-do item updated: ${item.title}`, {
    status: item.status,
    percent: statusToPercent(item.status)
  });
  saveState();
  render();
}

function updateTopTodoItemStatus(task, itemId, status) {
  const user = ensureCurrentUser("update a to-do item status");
  if (!user) return;
  task.todoItems = normalizeTodoListItems(task.todoItems);
  const item = task.todoItems.find(entry => entry.id === itemId);
  if (!item || !statusOptions.includes(status)) return;

  const wasClosed = isClosedTaskStatus(item.status);
  const isNowClosed = isClosedTaskStatus(status);
  if (item.status === status) return;

  item.status = status;
  item.updatedAt = new Date().toISOString();
  item.closedAt = isNowClosed ? (wasClosed ? item.closedAt || item.updatedAt : item.updatedAt) : "";
  task.todoItems = normalizeTodoListItems(task.todoItems);
  recordUpdate(task, `To-do item status changed to ${status}: ${item.title}`, {
    status: item.status,
    percent: statusToPercent(item.status)
  });
  saveState();
  render();
}

function moveTopTodoItem(task, itemId, direction) {
  const user = ensureCurrentUser("move a to-do item");
  if (!user) return;
  task.todoItems = normalizeTodoListItems(task.todoItems);
  const visibleItems = task.todoView === "closed"
    ? task.todoItems.filter(item => isClosedTaskStatus(item.status))
    : task.todoItems.filter(item => !isClosedTaskStatus(item.status));
  const currentVisibleIndex = visibleItems.findIndex(item => item.id === itemId);
  if (currentVisibleIndex < 0) return;
  const targetVisibleIndex = currentVisibleIndex + direction;
  if (targetVisibleIndex < 0 || targetVisibleIndex >= visibleItems.length) return;

  const currentItem = visibleItems[currentVisibleIndex];
  const targetItem = visibleItems[targetVisibleIndex];
  const currentOrder = currentItem.order;
  currentItem.order = targetItem.order;
  targetItem.order = currentOrder;
  task.todoItems = normalizeTodoListItems(task.todoItems);
  recordUpdate(task, `To-do item moved ${direction < 0 ? "up" : "down"}: ${currentItem.title}`, {
    status: currentItem.status,
    percent: statusToPercent(currentItem.status)
  });
  saveState();
  render();
}

function clearTaskTag(task) {
  if (!task?.tag) return;
  task.tag = "";
  task.tagTone = "";
  saveState();
  render();
}

function deleteTopTodoItem(task, itemId) {
  const user = ensureCurrentUser("delete a to-do item");
  if (!user) return;
  const item = normalizeTodoListItems(task.todoItems).find(entry => entry.id === itemId);
  if (!item) return;
  if (!confirm(`Delete to-do item "${item.title}"?`)) return;

  task.todoItems = normalizeTodoListItems(task.todoItems).filter(entry => entry.id !== itemId);
  recordUpdate(task, `To-do item deleted: ${item.title}`, {
    status: item.status,
    percent: statusToPercent(item.status)
  });
  saveState();
  render();
}

function createDailyProjectManagerSection(task) {
  task.dailyChecklist = normalizeDailyChecklist(task.dailyChecklist);
  const section = document.createElement("section");
  section.className = "daily-project-section";

  const summary = document.createElement("div");
  summary.className = "daily-project-summary";
  const openItems = task.dailyChecklist.filter(item => item.status === "open");
  const completedItems = task.dailyChecklist.filter(item => item.status === "done");
  const latestDate = task.dailyChecklist
    .map(item => item.taskDate)
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a))[0];
  summary.innerHTML = `
    <article>
      <strong>${openItems.length}</strong>
      <span>active daily tasks</span>
    </article>
    <article>
      <strong>${completedItems.length}</strong>
      <span>completed tasks</span>
    </article>
    <article>
      <strong>${escapeHtml(latestDate ? formatShortDate(latestDate) : "No date set")}</strong>
      <span>latest tracked date</span>
    </article>
  `;

  const addBox = document.createElement("div");
  addBox.className = "daily-project-add-box";

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.placeholder = "Add a new daily task";

  const dateInput = document.createElement("input");
  dateInput.type = "date";

  const notesInput = document.createElement("textarea");
  notesInput.rows = 2;
  notesInput.placeholder = "Add notes for this task";

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "ghost";
  addButton.textContent = "Add daily task";
  addButton.addEventListener("click", () => {
    addDailyProjectItem(task, {
      title: titleInput.value,
      taskDate: dateInput.value,
      notes: notesInput.value
    });
  });

  [titleInput, dateInput, notesInput].forEach(input => {
    input.addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.shiftKey && input !== notesInput) {
        event.preventDefault();
        addDailyProjectItem(task, {
          title: titleInput.value,
          taskDate: dateInput.value,
          notes: notesInput.value
        });
      }
    });
  });

  addBox.append(titleInput, dateInput, notesInput, addButton);

  const list = document.createElement("div");
  list.className = "daily-project-list";

  if (!task.dailyChecklist.length) {
    const empty = document.createElement("p");
    empty.className = "empty-notes";
    empty.textContent = "No daily action items yet. Add the first one above.";
    list.appendChild(empty);
  } else {
    task.dailyChecklist.forEach(item => list.appendChild(createDailyProjectItem(task, item)));
  }

  section.append(summary, addBox, list);
  return section;
}

function createDailyProjectItem(task, item) {
  const article = document.createElement("article");
  article.className = `daily-project-item${item.status === "done" ? " is-complete" : ""}`;

  const topRow = document.createElement("div");
  topRow.className = "daily-project-item-top";

  const checkWrap = document.createElement("label");
  checkWrap.className = "daily-project-check";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = item.status === "done";
  checkbox.addEventListener("change", () => toggleDailyProjectItem(task, item.id, checkbox.checked));

  const title = document.createElement("input");
  title.type = "text";
  title.className = "daily-project-item-title";
  title.value = item.title || "";
  title.placeholder = "Daily task title";
  title.addEventListener("change", () => updateDailyProjectItem(task, item.id, "title", title.value));
  title.addEventListener("blur", () => updateDailyProjectItem(task, item.id, "title", title.value));

  checkWrap.append(checkbox, title);

  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.value = item.taskDate || "";
  dateInput.addEventListener("change", () => updateDailyProjectItem(task, item.id, "taskDate", dateInput.value));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "ghost";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", () => deleteDailyProjectItem(task, item.id));

  topRow.append(checkWrap, dateInput, deleteButton);

  const meta = document.createElement("div");
  meta.className = "daily-project-item-meta";
  meta.innerHTML = `
    <span>${item.status === "done" ? "Completed" : "Active"}</span>
    <span>Created ${escapeHtml(formatDateTime(item.createdAt))}</span>
    ${item.completedAt ? `<span>Completed ${escapeHtml(formatDateTime(item.completedAt))}</span>` : `<span>Updated ${escapeHtml(formatDateTime(item.updatedAt))}</span>`}
  `;

  const notesSection = document.createElement("div");
  notesSection.className = "daily-project-notes-section";

  const notesHeader = document.createElement("div");
  notesHeader.className = "daily-project-notes-header";
  notesHeader.innerHTML = `<strong>Notes</strong><span>${item.noteEntries?.length || 0} entr${(item.noteEntries?.length || 0) === 1 ? "y" : "ies"}</span>`;

  const notesHistory = document.createElement("div");
  notesHistory.className = "daily-project-notes-history";
  const noteEntries = normalizeDailyProjectNoteEntries(item.noteEntries, item.notes, item.updatedAt || item.createdAt || "");
  if (noteEntries.length) {
    noteEntries.forEach(entry => {
      const noteItem = document.createElement("article");
      noteItem.className = "daily-project-note-entry";
      noteItem.innerHTML = `
        <div class="daily-project-note-meta">
          <strong>${escapeHtml(entry.createdByName || "Saved note")}</strong>
          <span>${escapeHtml(formatDateTime(entry.createdAt))}</span>
        </div>
        <p>${escapeHtml(entry.text)}</p>
      `;
      notesHistory.appendChild(noteItem);
    });
  } else {
    const empty = document.createElement("p");
    empty.className = "empty-notes";
    empty.textContent = "No notes saved yet.";
    notesHistory.appendChild(empty);
  }

  const notesComposer = document.createElement("div");
  notesComposer.className = "daily-project-notes-composer";

  const notesInput = document.createElement("textarea");
  notesInput.className = "daily-project-item-note-entry";
  notesInput.rows = 2;
  notesInput.placeholder = "Add a timestamped note";

  const addNoteButton = document.createElement("button");
  addNoteButton.type = "button";
  addNoteButton.className = "ghost";
  addNoteButton.textContent = "Add note";
  addNoteButton.addEventListener("click", () => addDailyProjectNote(task, item.id, notesInput));

  notesComposer.append(notesInput, addNoteButton);
  notesSection.append(notesHeader, notesHistory, notesComposer);

  article.append(topRow, meta, notesSection);
  return article;
}

function addDailyProjectItem(task, { title = "", taskDate = "", notes = "" }) {
  const user = ensureCurrentUser("add a daily project task");
  if (!user) return;
  const cleanTitle = String(title || "").trim();
  const cleanNotes = String(notes || "").trim();
  if (!cleanTitle) return;

  const now = new Date().toISOString();
  task.dailyChecklist = normalizeDailyChecklist(task.dailyChecklist);
  task.dailyChecklist.push({
    id: crypto.randomUUID(),
    title: cleanTitle,
    taskDate,
    status: "open",
    notes: cleanNotes,
    createdAt: now,
    updatedAt: now,
    completedAt: ""
  });
  task.dailyChecklist = normalizeDailyChecklist(task.dailyChecklist);
  recordUpdate(task, `Daily task added: ${cleanTitle}`);
  saveState();
  render();
}

function updateDailyProjectItem(task, itemId, field, value) {
  const user = ensureCurrentUser("update a daily project task");
  if (!user) return;
  task.dailyChecklist = normalizeDailyChecklist(task.dailyChecklist);
  const item = task.dailyChecklist.find(entry => entry.id === itemId);
  if (!item) return;

  const normalizedValue = typeof value === "string" ? value.trim() : value;
  if ((item[field] || "") === (normalizedValue || "")) return;
  if (field === "title" && !normalizedValue) return;

  item[field] = normalizedValue;
  item.updatedAt = new Date().toISOString();
  task.dailyChecklist = normalizeDailyChecklist(task.dailyChecklist);
  const summary = field === "taskDate"
    ? `Daily task date updated: ${item.title}`
    : `Daily task updated: ${item.title}`;
  recordUpdate(task, summary);
  saveState();
  render();
}

function addDailyProjectNote(task, itemId, textarea) {
  const user = ensureCurrentUser("add a daily project note");
  if (!user) return;
  task.dailyChecklist = normalizeDailyChecklist(task.dailyChecklist);
  const item = task.dailyChecklist.find(entry => entry.id === itemId);
  if (!item) return;

  const text = String(textarea?.value || "").trim();
  if (!text) return;

  item.noteEntries = normalizeDailyProjectNoteEntries(item.noteEntries, item.notes, item.updatedAt || item.createdAt || "");
  item.noteEntries.unshift({
    id: crypto.randomUUID(),
    text,
    createdAt: new Date().toISOString(),
    createdByEmail: user.email,
    createdByName: user.name
  });
  item.notes = "";
  item.updatedAt = new Date().toISOString();
  task.dailyChecklist = normalizeDailyChecklist(task.dailyChecklist);
  recordUpdate(task, `Daily task note added: ${item.title}`);
  saveState();
  render();
}

function toggleDailyProjectItem(task, itemId, completed) {
  const user = ensureCurrentUser(completed ? "complete a daily project task" : "reopen a daily project task");
  if (!user) return;
  task.dailyChecklist = normalizeDailyChecklist(task.dailyChecklist);
  const item = task.dailyChecklist.find(entry => entry.id === itemId);
  if (!item) return;

  item.status = completed ? "done" : "open";
  item.updatedAt = new Date().toISOString();
  item.completedAt = completed ? item.updatedAt : "";
  task.dailyChecklist = normalizeDailyChecklist(task.dailyChecklist);
  recordUpdate(task, completed ? `Daily task completed: ${item.title}` : `Daily task reopened: ${item.title}`);
  saveState();
  render();
}

function deleteDailyProjectItem(task, itemId) {
  const user = ensureCurrentUser("delete a daily project task");
  if (!user) return;
  const item = normalizeDailyChecklist(task.dailyChecklist).find(entry => entry.id === itemId);
  if (!item) return;
  if (!confirm(`Delete daily task "${item.title}"?`)) return;

  task.dailyChecklist = normalizeDailyChecklist(task.dailyChecklist).filter(entry => entry.id !== itemId);
  recordUpdate(task, `Daily task deleted: ${item.title}`);
  saveState();
  render();
}

function createInlineCommentBox(task) {
  const wrapper = document.createElement("div");
  wrapper.className = "task-comment-box";

  const headingRow = document.createElement("div");
  headingRow.className = "task-comment-header";

  const heading = document.createElement("div");
  heading.className = "task-comment-history-label";
  heading.textContent = "Previous entries";

  const popoutButton = document.createElement("button");
  popoutButton.type = "button";
  popoutButton.className = "ghost task-comment-popout-button";
  popoutButton.textContent = "Open comments";
  popoutButton.addEventListener("click", () => openCommentHistoryDialog(task.id));
  headingRow.append(heading, popoutButton);

  const commentHistory = document.createElement("div");
  commentHistory.className = "task-comment-history";
  if (Array.isArray(task.comments) && task.comments.length) {
    task.comments.slice().reverse().forEach(comment => {
      commentHistory.appendChild(createCommentHistoryItem(task, comment));
    });
  } else {
    const empty = document.createElement("p");
    empty.className = "latest-comment";
    empty.textContent = "No comments yet.";
    commentHistory.appendChild(empty);
  }

  const textarea = document.createElement("textarea");
  textarea.className = "task-comment-entry";
  textarea.rows = 2;
  textarea.placeholder = "Add comment here";

  const actions = document.createElement("div");
  actions.className = "task-comment-actions";

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "ghost";
  addButton.textContent = "Add comment";
  addButton.addEventListener("click", () => addInlineTaskComment(task, textarea));

  actions.appendChild(addButton);
  wrapper.append(headingRow, commentHistory, textarea, actions);
  return wrapper;
}

function createCommentHistoryItem(task, comment) {
  const item = document.createElement("article");
  item.className = "task-comment-history-item";
  item.appendChild(createCommentHistoryContent(comment));

  const actions = document.createElement("div");
  actions.className = "task-comment-item-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "ghost";
  editButton.textContent = "Edit";
  editButton.addEventListener("click", () => startInlineCommentEdit(task.id, comment.id, item));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "ghost";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", () => deleteSavedComment(task.id, comment.id));

  actions.append(editButton, deleteButton);
  item.appendChild(actions);
  return item;
}

function openCommentHistoryDialog(taskId) {
  const task = state.tasks.find(entry => entry.id === taskId);
  if (!task || !commentHistoryDialog || !commentHistoryTitle || !commentHistoryList) return;

  commentHistoryDialog.dataset.taskId = task.id;
  commentHistoryTitle.textContent = `${task.title || "Task"} Comments`;
  commentHistoryList.innerHTML = "";

  if (Array.isArray(task.comments) && task.comments.length) {
    task.comments.slice().reverse().forEach(comment => {
      commentHistoryList.appendChild(createCommentHistoryItem(task, comment));
    });
  } else {
    const empty = document.createElement("p");
    empty.className = "latest-comment";
    empty.textContent = "No comments yet.";
    commentHistoryList.appendChild(empty);
  }

  commentHistoryDialog.showModal();
}

function addInlineTaskComment(task, textarea) {
  const user = ensureCurrentUser("add a task comment");
  if (!user) return;

  const text = textarea.value.trim();
  if (!text) return;

  if (!Array.isArray(task.comments)) task.comments = [];
  task.comments.push({
    id: crypto.randomUUID(),
    authorEmail: user.email,
    authorName: user.name,
    createdAt: new Date().toISOString(),
    text
  });
  recordUpdate(task, "Comment added");
  saveState();
  render();
}

function createCommentHistoryContent(comment) {
  const wrapper = document.createElement("div");
  wrapper.className = "task-comment-history-meta";
  wrapper.innerHTML = `
    <strong>${escapeHtml(comment.authorName || "Unknown user")}</strong>
    <span>${escapeHtml(formatDateTime(comment.createdAt))}</span>
    ${comment.updatedAt ? `<span class="comment-updated">Edited ${escapeHtml(formatDateTime(comment.updatedAt))}${comment.updatedByName ? ` by ${escapeHtml(comment.updatedByName)}` : ""}</span>` : ""}
  `;

  const body = document.createElement("p");
  body.textContent = comment.text || "";

  const content = document.createElement("div");
  content.className = "task-comment-history-content";
  content.append(wrapper, body);
  return content;
}

function startInlineCommentEdit(taskId, commentId, container) {
  const task = state.tasks.find(entry => entry.id === taskId);
  const comment = task?.comments?.find(entry => entry.id === commentId);
  if (!task || !comment || !container) return;

  const editBox = document.createElement("div");
  editBox.className = "task-comment-edit-box";

  const textarea = document.createElement("textarea");
  textarea.value = comment.text || "";
  textarea.rows = 6;

  const actions = document.createElement("div");
  actions.className = "task-comment-item-actions";

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.textContent = "Save";
  saveButton.addEventListener("click", () => saveEditedComment(taskId, commentId, textarea.value));

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "ghost";
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener("click", () => refreshCommentViews(taskId));

  actions.append(cancelButton, saveButton);
  editBox.append(textarea, actions);

  container.innerHTML = "";
  container.appendChild(editBox);
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

function saveEditedComment(taskId, commentId, nextText) {
  const user = ensureCurrentUser("edit a saved comment");
  if (!user) return;

  const task = state.tasks.find(entry => entry.id === taskId);
  const comment = task?.comments?.find(entry => entry.id === commentId);
  if (!task || !comment) return;

  const trimmed = String(nextText || "").trim();
  if (!trimmed) return;
  if (trimmed === String(comment.text || "").trim()) {
    refreshCommentViews(taskId);
    return;
  }

  comment.text = trimmed;
  comment.updatedAt = new Date().toISOString();
  comment.updatedByEmail = user.email;
  comment.updatedByName = user.name;
  recordUpdate(task, "Comment edited");
  saveState();
  refreshCommentViews(taskId);
}

function deleteSavedComment(taskId, commentId) {
  const user = ensureCurrentUser("delete a saved comment");
  if (!user) return;

  const task = state.tasks.find(entry => entry.id === taskId);
  const comment = task?.comments?.find(entry => entry.id === commentId);
  if (!task || !comment) return;
  if (!confirm("Delete this saved comment?")) return;

  task.comments = task.comments.filter(entry => entry.id !== commentId);
  recordUpdate(task, "Comment deleted");
  saveState();
  refreshCommentViews(taskId);
}

function refreshCommentViews(taskId) {
  const task = state.tasks.find(entry => entry.id === taskId);
  render();

  if (taskDialog?.open && fields.id?.value === taskId && task) {
    renderTaskComments(task);
  }

  if (commentHistoryDialog?.open && commentHistoryDialog.dataset.taskId === taskId && task) {
    openCommentHistoryDialog(taskId);
  }
}

function createMedicationSummary(task) {
  task.medications = normalizeMedicationEntries(task.medications);
  const medications = task.medications.filter(entry => entry.name || entry.dosage || entry.refillDate);
  const nextRefillDate = medications
    .map(entry => entry.refillDate)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))[0];
  const urgentAlerts = medications
    .map(entry => ({ entry, alert: getMedicationRefillAlert(entry) }))
    .filter(item => item.alert);

  const section = document.createElement("section");
  section.className = "medication-summary-section";

  const header = document.createElement("div");
  header.className = "medication-grid-header";

  const title = document.createElement("strong");
  title.textContent = "Medication list";

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "ghost";
  openButton.textContent = "Update medication list";
  openButton.addEventListener("click", () => openMedicationDialog(task.id));

  header.append(title, openButton);

  const summary = document.createElement("div");
  summary.className = "medication-summary-metrics";
  summary.innerHTML = `
    <article>
      <strong>${medications.length}</strong>
      <span>active medication${medications.length === 1 ? "" : "s"}</span>
    </article>
    <article class="${urgentAlerts[0]?.alert?.level === "red" ? "medication-alert-red" : urgentAlerts[0]?.alert?.level === "yellow" ? "medication-alert-yellow" : ""}">
      <strong>${escapeHtml(nextRefillDate ? formatShortDate(nextRefillDate) : "None set")}</strong>
      <span>${escapeHtml(urgentAlerts[0]?.alert?.label || "next refill date")}</span>
    </article>
  `;

  section.append(header, summary);
  return section;
}

function createMedicationGrid(task) {
  task.medications = normalizeMedicationEntries(task.medications);
  const section = document.createElement("section");
  section.className = "medication-grid-section medication-grid-dialog";

  const header = document.createElement("div");
  header.className = "medication-grid-header";

  const title = document.createElement("strong");
  title.textContent = "Medication list editor";

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "ghost";
  addButton.textContent = "Add medication";
  addButton.addEventListener("click", () => {
    task.medications.push(normalizeMedicationEntry());
    recordUpdate(task, "Medication row added");
    saveState();
    renderMedicationDialog(task);
    render();
  });

  header.append(title, addButton);

  const grid = document.createElement("div");
  grid.className = "medication-grid";
  grid.innerHTML = `
    <span class="medication-grid-label">Medication name</span>
    <span class="medication-grid-label">Dosage</span>
    <span class="medication-grid-label">Pills prescribed</span>
    <span class="medication-grid-label">Refill date</span>
    <span class="medication-grid-label">Action</span>
  `;

  task.medications.forEach(entry => {
    const refillAlert = getMedicationRefillAlert(entry);
    const rowClass = refillAlert ? `medication-row-${refillAlert.level}` : "";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = "Medication name";
    nameInput.value = entry.name || "";
    nameInput.className = rowClass;
    nameInput.addEventListener("change", () => updateMedicationEntry(task, entry.id, "name", nameInput.value));

    const dosageInput = document.createElement("input");
    dosageInput.type = "text";
    dosageInput.placeholder = "Dosage";
    dosageInput.value = entry.dosage || "";
    dosageInput.className = rowClass;
    dosageInput.addEventListener("change", () => updateMedicationEntry(task, entry.id, "dosage", dosageInput.value));

    const pillsInput = document.createElement("input");
    pillsInput.type = "number";
    pillsInput.min = "1";
    pillsInput.step = "1";
    pillsInput.placeholder = "30";
    pillsInput.value = normalizeMedicationSupply(entry.pillsPrescribed);
    pillsInput.className = rowClass;
    pillsInput.addEventListener("change", () => updateMedicationEntry(task, entry.id, "pillsPrescribed", normalizeMedicationSupply(pillsInput.value)));

    const refillInput = document.createElement("input");
    refillInput.type = "date";
    refillInput.value = entry.refillDate || "";
    refillInput.className = rowClass;
    refillInput.title = refillAlert?.label || "";
    refillInput.addEventListener("change", () => updateMedicationEntry(task, entry.id, "refillDate", refillInput.value));

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = `ghost medication-remove-button ${rowClass}`.trim();
    removeButton.textContent = "Remove";
    removeButton.title = refillAlert?.label || "";
    removeButton.addEventListener("click", () => {
      task.medications = task.medications.filter(item => item.id !== entry.id);
      recordUpdate(task, "Medication row removed");
      saveState();
      if (!task.medications.length) {
        task.medications = [normalizeMedicationEntry()];
      }
      renderMedicationDialog(task);
      render();
    });

    grid.append(nameInput, dosageInput, pillsInput, refillInput, removeButton);
  });

  section.append(header, grid);
  return section;
}

function openMedicationDialog(taskId) {
  const task = state.tasks.find(item => item.id === taskId);
  if (!task || !isMedicationGridTask(task)) return;
  activeMedicationTaskId = task.id;
  renderMedicationDialog(task);
  if (typeof medicationDialog.showModal === "function") medicationDialog.showModal();
}

function closeMedicationDialog() {
  activeMedicationTaskId = "";
  medicationDialog.close();
}

function renderMedicationDialog(task) {
  medicationDialogBody.innerHTML = "";
  medicationDialogBody.appendChild(createMedicationGrid(task));
}

function updateMedicationEntry(task, entryId, field, value) {
  task.medications = normalizeMedicationEntries(task.medications);
  const entry = task.medications.find(item => item.id === entryId);
  if (!entry) return;

  const before = entry[field] || "";
  const after = typeof value === "string" ? value.trim() : value;
  if (before === after) return;

  entry[field] = after;
  recordUpdate(task, "Medication list updated");
  saveState();
  if (activeMedicationTaskId === task.id) renderMedicationDialog(task);
  render();
}

function formatShortDate(value) {
  if (!value) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function getCategories() {
  const categories = new Set(baseCategories);
  state.tasks.forEach(task => {
    if (task.category) categories.add(task.category);
  });
  return [...categories].sort((a, b) => categoryRank(a) - categoryRank(b) || a.localeCompare(b));
}

function formatLatestComment(task) {
  const latest = task.comments?.[task.comments.length - 1];
  if (!latest) return "No comments yet.";
  return `Latest: ${latest.authorName} on ${formatDateTime(latest.createdAt)} - ${latest.text}`;
}

function updateProgress() {
  const total = state.tasks.length || 1;
  const done = state.tasks.filter(task => isClosedTask(task)).length;
  const blocked = state.tasks.filter(task => task.status === "Blocked").length;
  const active = state.tasks.length - done;
  const average = state.tasks.reduce((sum, task) => sum + normalizePercent(task.percent), 0) / total;
  document.querySelector("#completeCount").textContent = done;
  document.querySelector("#activeCount").textContent = active;
  document.querySelector("#blockedCount").textContent = blocked;
  document.querySelector("#progressFill").style.width = `${Math.round(average)}%`;
}

function openTask(id) {
  if (!ensureCurrentUser("open a task for editing")) return;
  const task = state.tasks.find(item => item.id === id) || {
    id: crypto.randomUUID(),
    title: "",
    category: "N/A",
    owner: "",
    status: "Not started",
    priority: "Medium",
    due: "",
    percent: 0,
    completedAt: "",
    next: "",
    notes: "",
    comments: []
  };
  populateCategories();
  fields.id.value = task.id;
  fields.title.value = task.title;
  fields.category.value = task.category || "N/A";
  fields.owner.value = task.owner;
  fields.status.value = task.status;
  fields.priority.value = task.priority;
  fields.due.value = task.due;
  fields.percent.value = normalizePercent(task.percent);
  fields.next.value = task.next;
  fields.tag.value = task.tag || "";
  fields.tagTone.value = task.tagTone || "";
  fields.notes.value = task.notes;
  fields.comment.value = "";
  updateTaskLabelControls();
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
    const item = createCommentHistoryItem(task, comment);
    item.classList.add("comment-item");
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

function escapeAttribute(value) {
  return escapeHtml(value);
}

function getAllowedUserByEmail(email) {
  return allowedUsers.find(user => user.email === email) || null;
}

function canEditTaskLabels() {
  return state.currentUser === DERIC_EMAIL;
}

function currentUser() {
  return getAllowedUserByEmail(state.currentUser);
}

function setCurrentUserEmail(email, { save = true, renderView = true } = {}) {
  state.currentUser = email;
  userSelect.value = email;
  if (save) saveState();
  if (renderView) render();
}

function accountSelectionMessage(actionText = "make updates") {
  return `Select an account before you ${actionText}.`;
}

function updateClientGatePinVisibility() {
  const needsPin = clientNeedsAccessPin(clientGateSelect.value) && !isClientAccessValidated(clientGateSelect.value);
  clientGatePinWrap.hidden = !needsPin;
  if (!needsPin) clientGatePin.value = "";
}

function updateTopClientPinVisibility() {
  if (!topClientPin) return;
  const needsPin = clientNeedsAccessPin(topClientSelect?.value) && !isClientAccessValidated(topClientSelect?.value);
  if (topClientPinWrapInline) topClientPinWrapInline.hidden = !needsPin;
  topClientPin.hidden = !needsPin;
  if (!needsPin) topClientPin.value = "";
}

function openClientGateDialog() {
  clientGateDialog.hidden = false;
  if (typeof clientGateDialog.showModal === "function" && !clientGateDialog.open) {
    clientGateDialog.showModal();
  } else {
    clientGateDialog.setAttribute("open", "open");
    clientGateDialog.style.display = "block";
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeClientGateDialog() {
  if (clientGateDialog.open && typeof clientGateDialog.close === "function") {
    clientGateDialog.close();
  }
  clientGateDialog.removeAttribute("open");
  clientGateDialog.hidden = true;
  clientGateDialog.style.display = "none";
}

function showClientGate(message = "Choose which client dashboard to open.") {
  clientGateMessage.textContent = message;
  clientGateError.hidden = true;
  clientGateError.textContent = "";
  clientGateSelect.value = activeClientId || "";
  clientGatePin.value = "";
  updateClientGatePinVisibility();
  openClientGateDialog();
}

function updateAccountGatePinVisibility() {
  const needsPin = accountGateSelect.value === DERIC_EMAIL;
  accountGatePinWrap.hidden = !needsPin;
  if (!needsPin) accountGatePin.value = "";
}

function openAccountGateDialog() {
  accountGateDialog.hidden = false;
  if (typeof accountGateDialog.showModal === "function" && !accountGateDialog.open) {
    accountGateDialog.showModal();
  } else {
    accountGateDialog.setAttribute("open", "open");
    accountGateDialog.style.display = "block";
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeAccountGateDialog() {
  if (accountGateDialog.open && typeof accountGateDialog.close === "function") {
    accountGateDialog.close();
  }
  accountGateDialog.removeAttribute("open");
  accountGateDialog.hidden = true;
  accountGateDialog.style.display = "none";
}

function showAccountGate(message = "Choose the account that will be used for updates in this session.") {
  accountGateMessage.textContent = message;
  accountGateError.hidden = true;
  accountGateError.textContent = "";
  accountGateSelect.value = state.currentUser || "";
  accountGatePin.value = "";
  updateAccountGatePinVisibility();
  openAccountGateDialog();
}

function submitAccountGate() {
  const selectedEmail = accountGateSelect.value;
  const pin = accountGatePin.value.trim();
  completeAccountSelection(selectedEmail, pin);
}

function completeAccountSelection(email, pin = "") {
  const user = getAllowedUserByEmail(email);
  if (!user) {
    accountGateError.textContent = "Select an account to continue.";
    accountGateError.hidden = false;
    return false;
  }

  if (user.email === DERIC_EMAIL) {
    if (pin !== DERIC_PIN) {
      accountGateError.textContent = "The PIN for Deric's account is incorrect.";
      accountGateError.hidden = false;
      return false;
    }
    dericPinValidatedForSession = true;
  }

  if (user.email !== DERIC_EMAIL) dericPinValidatedForSession = false;

  closeAccountGateDialog();
  setCurrentUserEmail(user.email, { save: true, renderView: true });
  return true;
}

function handleAccountGateSelection() {
  const selectedEmail = accountGateSelect.value;
  accountGateError.hidden = true;
  accountGateError.textContent = "";
  updateAccountGatePinVisibility();

  if (!selectedEmail) return;
  if (selectedEmail === DERIC_EMAIL) {
    accountGatePin.focus();
    return;
  }

  completeAccountSelection(selectedEmail, "");
}

function maybeSubmitDericPin() {
  if (accountGateSelect.value !== DERIC_EMAIL) return;
  const pin = accountGatePin.value.trim();
  if (pin.length < DERIC_PIN.length) return;
  completeAccountSelection(DERIC_EMAIL, pin);
}

function handleDericPinKeyboardSubmit(event) {
  if (event.key !== "Enter" && event.key !== "Go" && event.key !== "Done") return;
  event.preventDefault();
  const pin = accountGatePin.value.trim();
  if (!pin) return;
  completeAccountSelection(DERIC_EMAIL, pin);
}

function handleDericPinCommit() {
  if (accountGateSelect.value !== DERIC_EMAIL) return;
  const pin = accountGatePin.value.trim();
  if (!pin) return;
  if (pin.length < DERIC_PIN.length) return;
  completeAccountSelection(DERIC_EMAIL, pin);
}

function ensureCurrentUser(actionText = "make updates") {
  const user = currentUser();
  if (user) return user;
  showAccountGate(accountSelectionMessage(actionText));
  return null;
}

function requestUserSwitch(email) {
  if (!email) {
    state.currentUser = "";
    saveState();
    render();
    showAccountGate("Select an account before continuing.");
    return;
  }

  if (email === DERIC_EMAIL && !dericPinValidatedForSession) {
    showAccountGate("Enter Deric's PIN to use Deric's account.");
    accountGateSelect.value = DERIC_EMAIL;
    updateAccountGatePinVisibility();
    accountGatePin.focus();
    return;
  }

  if (email !== DERIC_EMAIL) dericPinValidatedForSession = false;
  setCurrentUserEmail(email, { save: true, renderView: true });
}

async function switchClient(clientId, pin = "") {
  const nextClient = clientConfigs[clientId];
  if (!nextClient) {
    clientGateError.textContent = "Select a client to continue.";
    clientGateError.hidden = false;
    return false;
  }

  const requiredPin = clientAccessPin(nextClient.id);
  if (nextClient.requiresAccessPin && pin !== requiredPin) {
    clientGateError.textContent = `The access code for ${clientAccessLabel(nextClient.id)} is incorrect.`;
    clientGateError.hidden = false;
    return false;
  }

  if (nextClient.requiresAccessPin) {
    validatedProtectedClientIds.add(nextClient.id);
  }

  if (supabaseEnabled && !applyingRemoteState) {
    window.clearTimeout(supabaseSaveTimer);
    await saveSharedStateNow();
  }

  stopSharedStateSync();

  activeClientId = nextClient.id;
  remoteUpdatedAt = readCachedRemoteUpdatedAt();
  state = loadState();
  autoCalculateBillsOnLoadPending = true;
  loadBudgetMonth(defaultBillMonth(), { syncSnapshot: false });
  patrickWatchState = loadPatrickWatchState();
  taskViewMode = loadTaskViewMode();
  updateTopClientPinVisibility();

  closeClientGateDialog();
  if (supabaseEnabled) {
    forceCurrentBillMonthOnNextRemoteApply = true;
    supabaseStatus = `Connecting to Firebase Firestore shared storage for ${nextClient.shortName}`;
    updateDataStoreStatus();
    render();
    await subscribeToSharedState();
  }
  updateSyncStatus();
  render();
  return true;
}

function handleTopClientSelection() {
  if (!topClientSelect) return;
  const selectedClientId = topClientSelect.value;
  updateTopClientPinVisibility();
  if (!selectedClientId) return;
  if (clientNeedsAccessPin(selectedClientId) && !isClientAccessValidated(selectedClientId)) {
    if (topClientPin) topClientPin.focus();
    return;
  }
  switchClient(selectedClientId, "");
}

function maybeSubmitTopClientPin() {
  if (!topClientSelect || !topClientPin) return;
  if (!clientNeedsAccessPin(topClientSelect.value)) return;
  const pin = topClientPin.value.trim();
  if (pin.length < clientAccessPin(topClientSelect.value).length) return;
  switchClient(topClientSelect.value, pin);
}

function handleTopClientPinKeyboardSubmit(event) {
  if (!topClientSelect || !topClientPin) return;
  if (!clientNeedsAccessPin(topClientSelect.value)) return;
  if (event.key !== "Enter" && event.key !== "Go" && event.key !== "Done") return;
  event.preventDefault();
  const pin = topClientPin.value.trim();
  if (!pin) return;
  switchClient(topClientSelect.value, pin);
}

function handleTopClientPinCommit() {
  if (!topClientSelect || !topClientPin) return;
  if (!clientNeedsAccessPin(topClientSelect.value)) return;
  const pin = topClientPin.value.trim();
  if (!pin || pin.length < clientAccessPin(topClientSelect.value).length) return;
  switchClient(topClientSelect.value, pin);
}

function handleClientGateSelection() {
  const selectedClientId = clientGateSelect.value;
  clientGateError.hidden = true;
  clientGateError.textContent = "";
  updateClientGatePinVisibility();

  if (!selectedClientId) return;
  if (clientNeedsAccessPin(selectedClientId) && !isClientAccessValidated(selectedClientId)) {
    clientGatePin.focus();
    return;
  }

  switchClient(selectedClientId, "");
}

function maybeSubmitTheodoreClientPin() {
  if (!clientNeedsAccessPin(clientGateSelect.value)) return;
  const pin = clientGatePin.value.trim();
  if (pin.length < clientAccessPin(clientGateSelect.value).length) return;
  switchClient(clientGateSelect.value, pin);
}

function handleTheodoreClientPinKeyboardSubmit(event) {
  if (!clientNeedsAccessPin(clientGateSelect.value)) return;
  if (event.key !== "Enter" && event.key !== "Go" && event.key !== "Done") return;
  event.preventDefault();
  const pin = clientGatePin.value.trim();
  if (!pin) return;
  switchClient(clientGateSelect.value, pin);
}

function handleTheodoreClientPinCommit() {
  if (!clientNeedsAccessPin(clientGateSelect.value)) return;
  const pin = clientGatePin.value.trim();
  if (!pin || pin.length < clientAccessPin(clientGateSelect.value).length) return;
  switchClient(clientGateSelect.value, pin);
}

function updateTaskLabelControls() {
  const canEdit = canEditTaskLabels();
  if (taskLabelAdminRow) taskLabelAdminRow.hidden = !canEdit;
  if (fields.tag) fields.tag.disabled = !canEdit;
  if (fields.tagTone) fields.tagTone.disabled = !canEdit;
}

function insertEmojiIntoField(targetId, emoji) {
  const field = document.getElementById(targetId);
  if (!field) return;

  const start = field.selectionStart ?? field.value.length;
  const end = field.selectionEnd ?? field.value.length;
  const prefix = field.value.slice(0, start);
  const suffix = field.value.slice(end);
  const spacerBefore = prefix && !/\s$/.test(prefix) ? " " : "";
  const spacerAfter = suffix && !/^\s/.test(suffix) ? " " : "";
  const nextValue = `${prefix}${spacerBefore}${emoji}${spacerAfter}${suffix}`;

  field.value = nextValue;
  const cursor = (prefix + spacerBefore + emoji).length;
  field.focus();
  field.setSelectionRange(cursor, cursor);
}

function summarizeLines(changes, fallback) {
  return changes.filter(Boolean).join("; ") || fallback;
}

function truncateText(value, maxLength = 90) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function historyTitleFor(type, label) {
  const cleanLabel = label || "Untitled";
  const mapping = {
    task: cleanLabel,
    runningNote: `Running note: ${cleanLabel}`,
    bill: `Monthly bill: ${cleanLabel}`,
    lifeAdmin: `Patrick To-Do Note: ${cleanLabel}`,
    document: `PDF document: ${cleanLabel}`
  };
  return mapping[type] || cleanLabel;
}

function historyTypeLabel(type = "task") {
  const mapping = {
    task: "Task",
    runningNote: "Running Note",
    bill: "Bill",
    lifeAdmin: "To-Do Note",
    document: "PDF"
  };
  return mapping[type] || "Change";
}

function historyTypeClass(type = "task") {
  const mapping = {
    task: "task",
    runningNote: "running-note",
    bill: "bill",
    lifeAdmin: "todo-note",
    document: "pdf"
  };
  return mapping[type] || "change";
}

function isPatrickEntryClosed(entry) {
  return Boolean(patrickWatchState.closedEntries?.[entry.id]);
}

function isPatrickEntryReviewed(entry) {
  return Boolean(patrickWatchState.reviewedEntries?.[entry.id]) || isPatrickEntryClosed(entry);
}

function markPatrickEntriesReviewed(entries) {
  if (!entries.length) return;
  entries.forEach(entry => {
    patrickWatchState.reviewedEntries[entry.id] = new Date().toISOString();
  });
  const latestReviewed = entries
    .map(entry => entry.createdAt || "")
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a))[0];
  patrickWatchState.lastReviewedAt = latestReviewed || new Date().toISOString();
  savePatrickWatchState(patrickWatchState);
}

function closePatrickEntries(entries) {
  if (!entries.length) return;
  markPatrickEntriesReviewed(entries);
  entries.forEach(entry => {
    patrickWatchState.closedEntries[entry.id] = new Date().toISOString();
  });
  savePatrickWatchState(patrickWatchState);
}

function reopenPatrickEntry(entryId) {
  delete patrickWatchState.closedEntries[entryId];
  savePatrickWatchState(patrickWatchState);
}

function percentFromBillStatus(status) {
  if (status === "Paid") return 100;
  if (status === "Scheduled") return 60;
  if (status === "Deferred") return 40;
  return 0;
}

function percentFromLifeAdminStatus(status) {
  if (status === "Done") return 100;
  if (status === "In progress") return 50;
  return 0;
}

function recordHistoryEntry({
  itemType = "task",
  itemId = "",
  title = "Tracker item",
  summary = "Updated",
  status = "N/A",
  percent = 0,
  taskId = ""
}) {
  const user = currentUser();
  if (!user) return;
  state.history.unshift({
    id: crypto.randomUUID(),
    itemType,
    itemId,
    taskId,
    taskTitle: title,
    userEmail: user.email,
    userName: user.name,
    createdAt: new Date().toISOString(),
    summary,
    percent: normalizePercent(percent),
    status
  });
  state.history = state.history.slice(0, 500);
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
    if ((before.tag || "") !== (after.tag || "") || (before.tagTone || "") !== (after.tagTone || "")) {
      changes.push("Task label updated");
    }
  }
  if (commentText) changes.push("Comment added");
  return changes.join("; ") || "Task saved";
}

function recordUpdate(task, summary, overrides = {}) {
  recordHistoryEntry({
    itemType: "task",
    itemId: task.id,
    taskId: task.id,
    title: task.title,
    summary,
    percent: Object.prototype.hasOwnProperty.call(overrides, "percent") ? overrides.percent : task.percent,
    status: overrides.status || task.status
  });
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
    const itemType = entry.itemType || "task";
    const item = document.createElement("article");
    item.className = "history-item";
    item.innerHTML = `
      <div class="history-entry-headline">
        <span class="history-type-badge history-type-${escapeHtml(historyTypeClass(itemType))}">${escapeHtml(historyTypeLabel(itemType))}</span>
        <span class="history-user-badge">${escapeHtml(entry.userName || "Unknown user")}</span>
        <strong>${escapeHtml(entry.taskTitle)}</strong>
      </div>
      <span>${escapeHtml(entry.userName)} &lt;${escapeHtml(entry.userEmail)}&gt; - ${escapeHtml(formatDateTime(entry.createdAt))}</span>
      <p>${escapeHtml(entry.summary)}. Status: ${escapeHtml(entry.status)}. Complete: ${normalizePercent(entry.percent)}%.</p>
    `;
    historyList.appendChild(item);
  });
}

function renderUrgencyReport() {
  const report = document.querySelector("#urgencyReport");
  const urgentTasks = getUrgentTasks();
  const jobTasks = urgentTasks.filter(isJobTask);
  const otherTasks = urgentTasks.filter(task => !isJobTask(task));

  const completed = urgentTasks.filter(task => task.status === "Done").length;
  const blocked = urgentTasks.filter(task => task.status === "Blocked").length;
  const average = urgentTasks.length
    ? Math.round(urgentTasks.reduce((sum, task) => sum + normalizePercent(task.percent), 0) / urgentTasks.length)
    : 0;

  report.innerHTML = `
    <section class="report-summary">
      <p class="report-kicker">Generated ${escapeHtml(formatDateTime(new Date().toISOString()))}</p>
      <p>This report summarizes tasks marked with urgent priority, with emphasis on what is due, who owns the task, current progress, and the next action needed.</p>
      <p><strong>Job focus:</strong> Job and income opportunities are grouped first because restoring income is the highest leverage path for transportation, housing, debt, and daily living stability.</p>
      <p><strong>Daily schedule:</strong> This report is intended to be sent every day at 8:30 AM. Automatic sending now runs from the local project Email folder; this button still opens a prepared email for manual sending.</p>
      <div class="report-metrics">
        <article><strong>${urgentTasks.length}</strong><span>urgent tasks</span></article>
        <article><strong>${jobTasks.length}</strong><span>urgent job tasks</span></article>
        <article><strong>${completed}</strong><span>completed</span></article>
        <article><strong>${blocked}</strong><span>blocked</span></article>
        <article><strong>${average}%</strong><span>average complete</span></article>
      </div>
    </section>
  `;

  if (!urgentTasks.length) {
    const empty = document.createElement("p");
    empty.className = "empty-report";
    empty.textContent = "There are no tasks currently marked Urgent.";
    report.appendChild(empty);
    return;
  }

  if (jobTasks.length) report.appendChild(createReportSection("Job Search and Income Opportunities", jobTasks, true));
  if (otherTasks.length) report.appendChild(createReportSection("Other Urgent Tasks", otherTasks, false));
}

function createReportSection(title, tasks, isJobSection) {
  const section = document.createElement("section");
  section.className = isJobSection ? "report-section report-section-jobs" : "report-section";
  const heading = document.createElement("div");
  heading.className = "report-section-heading";
  heading.innerHTML = `
    <h3>${escapeHtml(title)}</h3>
    <span>${tasks.length} task${tasks.length === 1 ? "" : "s"}</span>
  `;
  section.appendChild(heading);

  const list = document.createElement("div");
  list.className = "report-list";
  tasks.forEach(task => {
    const pastDue = isPastDue(task);
    const item = document.createElement("article");
    item.className = [
      "report-item",
      isJobSection ? "report-job-item" : "",
      pastDue ? "report-item-overdue" : ""
    ].filter(Boolean).join(" ");
    item.innerHTML = `
      <header>
        <h3>${escapeHtml(task.title)}</h3>
        <div class="report-flags">
          ${pastDue ? "<span class=\"overdue-flag\">Red Flag: Past Due</span>" : ""}
          <span class="pill Urgent">Urgent</span>
        </div>
      </header>
      <dl>
        <div><dt>Due</dt><dd class="${pastDue ? "due-past" : ""}">${escapeHtml(dueDateLabel(task))}</dd></div>
        <div><dt>Status</dt><dd>${escapeHtml(task.status || "N/A")}</dd></div>
        <div><dt>Complete</dt><dd>${normalizePercent(task.percent)}%</dd></div>
        <div><dt>Owner</dt><dd>${escapeHtml(task.owner || "No owner")}</dd></div>
        <div><dt>Category</dt><dd>${escapeHtml(task.category || "N/A")}</dd></div>
      </dl>
      <p><strong>What is due:</strong> ${escapeHtml(task.next || "No next step recorded.")}</p>
      <p><strong>Context:</strong> ${escapeHtml(task.notes || "No notes recorded.")}</p>
    `;
    list.appendChild(item);
  });
  section.appendChild(list);
  return section;
}

function renderPatrickChangeReport() {
  const entries = getPatrickHistoryEntriesForDate();
  const closedEntries = entries.filter(entry => entry.status === "Done");
  const uniqueItems = new Set(entries.map(entry => entry.taskId || `${entry.itemType}:${entry.itemId || entry.taskTitle}`)).size;
  const latest = entries[0] || null;

  patrickChangeReport.innerHTML = `
    <section class="report-summary">
      <p class="report-kicker">Generated ${escapeHtml(formatDateTime(new Date().toISOString()))}</p>
      <p>This report is built from Patrick's tracked Firebase Firestore history for today and highlights every captured change plus the items he marked done.</p>
      <p><strong>Daily archive flow:</strong> the local report generator saves the current-day file in the Email folder and rolls older dated files into the Archive folder.</p>
      <div class="report-metrics">
        <article><strong>${entries.length}</strong><span>Patrick changes today</span></article>
        <article><strong>${closedEntries.length}</strong><span>closed today</span></article>
        <article><strong>${uniqueItems}</strong><span>unique items touched</span></article>
        <article><strong>${latest ? escapeHtml(formatDateTime(latest.createdAt)) : "None"}</strong><span>latest update</span></article>
        <article><strong>${escapeHtml(getTodayIsoDate())}</strong><span>report date</span></article>
      </div>
    </section>
  `;

  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "empty-report";
    empty.textContent = "No Patrick changes have been captured for today yet.";
    patrickChangeReport.appendChild(empty);
    return;
  }

  patrickChangeReport.appendChild(createPatrickChangeReportSection("Today's Patrick Changes", entries, false));
  patrickChangeReport.appendChild(createPatrickChangeReportSection("Items Patrick Closed Today", closedEntries, true));
}

function createPatrickChangeReportSection(title, entries, closedOnly) {
  const section = document.createElement("section");
  section.className = "report-section";
  const heading = document.createElement("div");
  heading.className = "report-section-heading";
  heading.innerHTML = `
    <h3>${escapeHtml(title)}</h3>
    <span>${entries.length} item${entries.length === 1 ? "" : "s"}</span>
  `;
  section.appendChild(heading);

  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "empty-report";
    empty.textContent = closedOnly
      ? "Patrick has not closed any tracked items today."
      : "No Patrick changes were captured for this section.";
    section.appendChild(empty);
    return section;
  }

  const list = document.createElement("div");
  list.className = "history-list";
  entries.forEach(entry => {
    const itemType = entry.itemType || "task";
    const item = document.createElement("article");
    item.className = "history-item";
    item.innerHTML = `
      <div class="history-entry-headline">
        <span class="history-type-badge history-type-${escapeHtml(historyTypeClass(itemType))}">${escapeHtml(historyTypeLabel(itemType))}</span>
        <span class="history-user-badge">${escapeHtml(entry.userName || "Unknown user")}</span>
        <strong>${escapeHtml(entry.taskTitle)}</strong>
      </div>
      <span>${escapeHtml(formatDateTime(entry.createdAt))}</span>
      <p>${escapeHtml(entry.summary)}. Status: ${escapeHtml(entry.status || "N/A")}. Complete: ${normalizePercent(entry.percent)}%.</p>
    `;
    list.appendChild(item);
  });
  section.appendChild(list);
  return section;
}

function getUrgentTasks() {
  return state.tasks
    .filter(task => task.priority === "Urgent")
    .sort(compareReportTasks);
}

function compareReportTasks(a, b) {
  const categoryDifference = categoryRank(a.category) - categoryRank(b.category);
  if (categoryDifference) return categoryDifference;
  if (!a.due && b.due) return 1;
  if (a.due && !b.due) return -1;
  if (a.due && b.due && a.due !== b.due) return a.due.localeCompare(b.due);
  return a.title.localeCompare(b.title);
}

function isPastDue(task) {
  if (!task.due || isClosedTask(task)) return false;
  return task.due < getTodayIsoDate();
}

function getTodayIsoDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLocalIsoDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPatrickHistoryEntriesForDate(date = getTodayIsoDate()) {
  return state.history
    .filter(entry => entry.userEmail === PATRICK_EMAIL)
    .filter(entry => getLocalIsoDate(entry.createdAt) === date)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

function dueDateLabel(task) {
  const due = task.due || "No due date set";
  return isPastDue(task) ? `${due} - PAST DUE` : due;
}

function isJobTask(task) {
  return (task.category || "").startsWith("Job -");
}

function buildUrgencyReportEmail() {
  const urgentTasks = getUrgentTasks();
  const jobTasks = urgentTasks.filter(isJobTask);
  const otherTasks = urgentTasks.filter(task => !isJobTask(task));
  const completed = urgentTasks.filter(task => task.status === "Done").length;
  const blocked = urgentTasks.filter(task => task.status === "Blocked").length;
  const average = urgentTasks.length
    ? Math.round(urgentTasks.reduce((sum, task) => sum + normalizePercent(task.percent), 0) / urgentTasks.length)
    : 0;

  const lines = [
    "3G Tracking and Notifications - Urgency Report",
    `Generated: ${formatDateTime(new Date().toISOString())}`,
    "Scheduled daily send time: 8:30 AM",
    "",
    "Summary",
    `Urgent tasks: ${urgentTasks.length}`,
    `Urgent job tasks: ${jobTasks.length}`,
    `Completed: ${completed}`,
    `Blocked: ${blocked}`,
    `Average complete: ${average}%`,
    "",
    "Job Search and Income Opportunities"
  ];

  if (!urgentTasks.length) {
    lines.push("No tasks are currently marked Urgent.");
  } else {
    appendReportEmailSection(lines, jobTasks, "No urgent job tasks currently listed.");
    lines.push("", "Other Urgent Tasks");
    appendReportEmailSection(lines, otherTasks, "No other urgent tasks currently listed.");
  }

  lines.push(
    "",
    "Note: This email was prepared from the dashboard. Fully automatic daily sending requires an email backend or scheduled service."
  );

  return lines.join("\n");
}

function appendReportEmailSection(lines, tasks, emptyMessage) {
  if (!tasks.length) {
    lines.push(emptyMessage);
    return;
  }
  tasks.forEach((task, index) => {
    lines.push(
      "",
      `${index + 1}. ${task.title}`,
      `Due: ${dueDateLabel(task)}`,
      `Status: ${task.status || "N/A"}`,
      `Complete: ${normalizePercent(task.percent)}%`,
      `Owner: ${task.owner || "No owner"}`,
      `Category: ${task.category || "N/A"}`,
      `What is due: ${task.next || "No next step recorded."}`,
      `Context: ${task.notes || "No notes recorded."}`
    );
  });
}

function emailUrgencyReport() {
  const recipients = EMAIL_REPORT_RECIPIENTS.join(",");
  const subject = `Patrick Glanville Urgency Report - ${new Date().toISOString().slice(0, 10)}`;
  const body = buildUrgencyReportEmail();
  window.location.href = `mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function buildUrgencyReportHtml() {
  const urgentTasks = getUrgentTasks();
  const jobTasks = urgentTasks.filter(isJobTask);
  const otherTasks = urgentTasks.filter(task => !isJobTask(task));
  const completed = urgentTasks.filter(task => task.status === "Done").length;
  const blocked = urgentTasks.filter(task => task.status === "Blocked").length;
  const average = urgentTasks.length
    ? Math.round(urgentTasks.reduce((sum, task) => sum + normalizePercent(task.percent), 0) / urgentTasks.length)
    : 0;
  const generated = formatDateTime(new Date().toISOString());

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Patrick Glanville Urgency Report</title>
  <style>
    body { margin: 0; background: #f4f6f9; color: #18202a; font-family: Arial, Helvetica, sans-serif; }
    .wrap { max-width: 960px; margin: 0 auto; background: #ffffff; }
    .header { padding: 28px 32px; background: #18324d; color: #ffffff; }
    .header h1 { margin: 0 0 8px; font-size: 28px; }
    .header p { margin: 0; color: #dbe7f5; }
    .content { padding: 26px 32px 34px; }
    .notice { margin: 0 0 18px; padding: 12px 14px; background: #fff8d6; border: 1px solid #e5cd63; border-radius: 6px; }
    .metrics { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 18px 0 22px; }
    .metric { border: 1px solid #d9dee7; border-radius: 6px; padding: 12px; }
    .metric strong { display: block; font-size: 24px; color: #2f6db7; }
    .metric span { color: #5b6573; font-size: 13px; }
    .section { margin-top: 22px; }
    .section-title { border-bottom: 2px solid #d9dee7; padding-bottom: 8px; margin-bottom: 12px; }
    .section-title h2 { margin: 0; font-size: 20px; }
    .job-section { border: 2px solid #2f6db7; border-radius: 8px; padding: 16px; background: #f2f7ff; }
    .task { border: 1px solid #d9dee7; border-radius: 8px; padding: 14px; margin-top: 12px; background: #ffffff; }
    .task-overdue { border-color: #b63b3b; box-shadow: inset 4px 0 0 #b63b3b; }
    .task h3 { margin: 0 0 10px; font-size: 18px; }
    .meta { width: 100%; border-collapse: collapse; margin: 10px 0; }
    .meta th { text-align: left; color: #5b6573; font-size: 12px; text-transform: uppercase; padding: 6px 8px 2px 0; }
    .meta td { padding: 2px 8px 8px 0; vertical-align: top; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 999px; background: #ffe1df; color: #8d2424; font-weight: 700; font-size: 12px; }
    .overdue { display: inline-block; margin-right: 8px; padding: 4px 8px; border-radius: 999px; background: #b63b3b; color: #ffffff; font-weight: 700; font-size: 12px; }
    .due-past { color: #8d2424; font-weight: 700; }
    .label { font-weight: 700; }
    .empty { color: #5b6573; }
    .footer { padding: 18px 32px; color: #5b6573; font-size: 12px; border-top: 1px solid #d9dee7; }
  </style>
</head>
<body>
  <main class="wrap">
    <header class="header">
      <h1>Patrick Glanville Urgency Report</h1>
      <p>Generated ${escapeHtml(generated)} | Scheduled daily send time: 8:30 AM</p>
    </header>
    <section class="content">
      <p class="notice"><strong>Job focus:</strong> Job and income opportunities are grouped first because restoring income is the highest leverage path for transportation, housing, debt, and daily living stability.</p>
      <div class="metrics">
        ${metricHtml(urgentTasks.length, "urgent tasks")}
        ${metricHtml(jobTasks.length, "urgent job tasks")}
        ${metricHtml(completed, "completed")}
        ${metricHtml(blocked, "blocked")}
        ${metricHtml(`${average}%`, "average complete")}
      </div>
      ${reportSectionHtml("Job Search and Income Opportunities", jobTasks, true)}
      ${reportSectionHtml("Other Urgent Tasks", otherTasks, false)}
    </section>
    <footer class="footer">Prepared from 3G Tracking and Notifications. Save this file in the local Email folder and use Send-RichUrgencyReport.ps1 to create a rich Outlook email.</footer>
  </main>
</body>
</html>`;
}

function buildPatrickChangeReportHtml() {
  const entries = getPatrickHistoryEntriesForDate();
  const closedEntries = entries.filter(entry => entry.status === "Done");
  const uniqueItems = new Set(entries.map(entry => entry.taskId || `${entry.itemType}:${entry.itemId || entry.taskTitle}`)).size;
  const generated = formatDateTime(new Date().toISOString());
  const latest = entries[0]?.createdAt ? formatDateTime(entries[0].createdAt) : "None";

  const changesHtml = entries.length
    ? entries.map(entry => `
      <article class="change-item">
        <div class="change-heading">
          <span class="change-badge change-badge-type">${escapeHtml(historyTypeLabel(entry.itemType || "task"))}</span>
          <span class="change-badge change-badge-user">${escapeHtml(entry.userName || "Unknown user")}</span>
          <strong>${escapeHtml(entry.taskTitle)}</strong>
        </div>
        <p class="change-time">${escapeHtml(formatDateTime(entry.createdAt))}</p>
        <p>${escapeHtml(entry.summary)}</p>
        <p><strong>Status:</strong> ${escapeHtml(entry.status || "N/A")} | <strong>Complete:</strong> ${normalizePercent(entry.percent)}%</p>
      </article>
    `).join("")
    : '<p class="empty">No Patrick changes were captured for today.</p>';

  const closedHtml = closedEntries.length
    ? closedEntries.map(entry => `
      <article class="change-item">
        <div class="change-heading">
          <span class="change-badge change-badge-type">${escapeHtml(historyTypeLabel(entry.itemType || "task"))}</span>
          <span class="change-badge change-badge-user">${escapeHtml(entry.userName || "Unknown user")}</span>
          <strong>${escapeHtml(entry.taskTitle)}</strong>
        </div>
        <p class="change-time">${escapeHtml(formatDateTime(entry.createdAt))}</p>
        <p>${escapeHtml(entry.summary)}</p>
      </article>
    `).join("")
    : '<p class="empty">Patrick has not closed any tracked items today.</p>';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Client Change Report</title>
  <style>
    body { margin: 0; background: #f4f6f9; color: #18202a; font-family: Arial, Helvetica, sans-serif; }
    .wrap { max-width: 980px; margin: 0 auto; background: #ffffff; }
    .header { padding: 28px 32px; background: #18324d; color: #ffffff; }
    .header h1 { margin: 0 0 8px; font-size: 28px; }
    .header p { margin: 0; color: #dbe7f5; }
    .content { padding: 26px 32px 34px; }
    .notice { margin: 0 0 18px; padding: 12px 14px; background: #eef3fb; border: 1px solid #c7d7ea; border-radius: 6px; }
    .metrics { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 18px 0 22px; }
    .metric { border: 1px solid #d9dee7; border-radius: 6px; padding: 12px; }
    .metric strong { display: block; font-size: 22px; color: #2f6db7; }
    .metric span { color: #5b6573; font-size: 13px; }
    .section { margin-top: 22px; }
    .section-title { border-bottom: 2px solid #d9dee7; padding-bottom: 8px; margin-bottom: 12px; display:flex; justify-content:space-between; gap:12px; align-items:center; }
    .section-title h2 { margin: 0; font-size: 20px; }
    .section-title span { color: #5b6573; font-weight: 700; }
    .change-item { border: 1px solid #d9dee7; border-radius: 8px; padding: 14px; margin-top: 12px; background: #ffffff; }
    .change-heading { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
    .change-badge { display:inline-block; padding:4px 8px; border-radius:999px; font-weight:700; font-size:12px; }
    .change-badge-type { background:#eef3fb; border:1px solid #c7d7ea; color:#315b8a; }
    .change-badge-user { background:#f4ecff; border:1px solid #d4c0f7; color:#6b35a8; }
    .change-time, .empty { color:#5b6573; }
    .footer { padding: 18px 32px; color: #5b6573; font-size: 12px; border-top: 1px solid #d9dee7; }
  </style>
</head>
<body>
  <main class="wrap">
    <header class="header">
      <h1>Client Change Report</h1>
      <p>Generated ${escapeHtml(generated)} | Report date ${escapeHtml(getTodayIsoDate())}</p>
    </header>
    <section class="content">
      <p class="notice"><strong>Source:</strong> This report is based on Patrick's tracker history captured in Firebase Firestore for the current day, including all changes and any items he marked done.</p>
      <div class="metrics">
        ${metricHtml(entries.length, "Patrick changes today")}
        ${metricHtml(closedEntries.length, "closed today")}
        ${metricHtml(uniqueItems, "unique items touched")}
        ${metricHtml(latest, "latest update")}
        ${metricHtml(getTodayIsoDate(), "report date")}
      </div>
      <section class="section">
        <div class="section-title"><h2>Today's Patrick Changes</h2><span>${entries.length} item${entries.length === 1 ? "" : "s"}</span></div>
        ${changesHtml}
      </section>
      <section class="section">
        <div class="section-title"><h2>Items Patrick Closed Today</h2><span>${closedEntries.length} item${closedEntries.length === 1 ? "" : "s"}</span></div>
        ${closedHtml}
      </section>
    </section>
    <footer class="footer">Prepared from 3G Tracking and Notifications and intended for the local Email folder archive workflow.</footer>
  </main>
</body>
</html>`;
}

function metricHtml(value, label) {
  return `<article class="metric"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></article>`;
}

function reportSectionHtml(title, tasks, isJobSection) {
  const empty = isJobSection ? "No urgent job tasks currently listed." : "No other urgent tasks currently listed.";
  const taskHtml = tasks.length ? tasks.map(taskReportHtml).join("") : `<p class="empty">${escapeHtml(empty)}</p>`;
  return `<section class="section ${isJobSection ? "job-section" : ""}">
    <div class="section-title"><h2>${escapeHtml(title)}</h2></div>
    ${taskHtml}
  </section>`;
}

function taskReportHtml(task) {
  const pastDue = isPastDue(task);
  return `<article class="task ${pastDue ? "task-overdue" : ""}">
    <h3>${escapeHtml(task.title)} ${pastDue ? "<span class=\"overdue\">Red Flag: Past Due</span>" : ""}<span class="badge">Urgent</span></h3>
    <table class="meta">
      <tr>
        <th>Due</th><th>Status</th><th>Complete</th><th>Owner</th><th>Category</th>
      </tr>
      <tr>
        <td class="${pastDue ? "due-past" : ""}">${escapeHtml(dueDateLabel(task))}</td>
        <td>${escapeHtml(task.status || "N/A")}</td>
        <td>${normalizePercent(task.percent)}%</td>
        <td>${escapeHtml(task.owner || "No owner")}</td>
        <td>${escapeHtml(task.category || "N/A")}</td>
      </tr>
    </table>
    <p><span class="label">What is due:</span> ${escapeHtml(task.next || "No next step recorded.")}</p>
    <p><span class="label">Context:</span> ${escapeHtml(task.notes || "No notes recorded.")}</p>
  </article>`;
}

function downloadUrgencyReportHtml() {
  const blob = new Blob([buildUrgencyReportHtml()], { type: "text/html" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `patrick-urgency-report-${new Date().toISOString().slice(0, 10)}.html`;
  link.click();
  URL.revokeObjectURL(link.href);
  alert("Save the HTML report to C:\\Software Developement\\ChatGPT Codex\\Patrick Glanville\\Email. Browsers require you to choose or confirm the save location.");
}

function buildUrgencyReportFileName() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `patrick-urgency-report-${year}-${month}-${day}.html`;
}

function buildPatrickChangeReportFileName() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `patrick-change-report-${year}-${month}-${day}.html`;
}

function buildOpenTodoReportFileName() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `patrick-open-todo-report-${year}-${month}-${day}.html`;
}

function isUrgencyReportFileName(fileName) {
  return /^patrick-urgency-report-\d{4}-\d{2}-\d{2}\.html$/i.test(fileName || "");
}

function isPatrickChangeReportFileName(fileName) {
  return /^patrick-change-report-\d{4}-\d{2}-\d{2}\.html$/i.test(fileName || "");
}

function downloadPatrickChangeReportHtml() {
  const blob = new Blob([buildPatrickChangeReportHtml()], { type: "text/html" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = buildPatrickChangeReportFileName();
  link.click();
  URL.revokeObjectURL(link.href);
  alert("Save the Patrick change report HTML to C:\\Software Developement\\ChatGPT Codex\\Patrick Glanville\\Email if the browser does not save it there automatically.");
}

function buildOpenTodoReportHtml() {
  const task = state.tasks.find(isTopTodoListTask) || {};
  task.todoItems = normalizeTodoListItems(task.todoItems);
  const openItems = task.todoItems.filter(item => !isClosedTaskStatus(item.status));
  const closedItems = task.todoItems.filter(item => isClosedTaskStatus(item.status));
  const ownerLabel = task.owner || "Patrick + Deric";
  const cardStatus = task.status || "N/A";
  const latestUpdate = openItems.length
    ? openItems.reduce((latest, item) => {
      const candidate = item.updatedAt || item.createdAt || "";
      return candidate > latest ? candidate : latest;
    }, "")
    : "";

  const itemHtml = openItems.length
    ? openItems.map((item, index) => {
      const notes = (item.notes || "").trim();
      return `
        <article class="todo-item">
          <div class="todo-item-top">
            <div class="todo-index">#${index + 1}</div>
            <div class="todo-heading">
              <h3>${escapeHtml(item.title || "Untitled to-do item")}</h3>
              <div class="todo-meta-row">
                <span class="status-badge">${escapeHtml(item.status || "Not started")}</span>
                <span class="meta-chip">Created ${escapeHtml(formatDateTime(item.createdAt))}</span>
                <span class="meta-chip">Updated ${escapeHtml(formatDateTime(item.updatedAt || item.createdAt))}</span>
              </div>
            </div>
          </div>
          <div class="todo-notes-box">
            <div class="todo-notes-label">Notes</div>
            <p>${escapeHtml(notes || "No notes recorded.")}</p>
          </div>
        </article>
      `;
    }).join("")
    : '<p class="empty">Patrick has no open priority to-do items right now.</p>';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Patrick Open To-Do Report</title>
  <style>
    body { margin:0; background:#eef2f7; color:#18202a; font-family:Arial, Helvetica, sans-serif; }
    .wrap { max-width:980px; margin:0 auto; background:#ffffff; box-shadow:0 18px 40px rgba(24,32,42,0.08); }
    .header { padding:30px 36px; background:linear-gradient(135deg, #18324d 0%, #244a73 100%); color:#ffffff; }
    .eyebrow { margin:0 0 8px; font-size:12px; letter-spacing:0.12em; text-transform:uppercase; color:#c9d9ec; font-weight:700; }
    .header h1 { margin:0 0 10px; font-size:30px; }
    .header p { margin:0; color:#dbe7f5; }
    .content { padding:28px 36px 38px; }
    .notice { margin:0 0 18px; padding:14px 16px; background:#f3f7fc; border:1px solid #cdddf0; border-radius:10px; line-height:1.5; }
    .metrics { display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; margin:18px 0 24px; }
    .metric { border:1px solid #d9dee7; border-radius:10px; padding:14px; background:#fbfcfe; }
    .metric strong { display:block; font-size:24px; color:#204f86; }
    .metric span { color:#5b6573; font-size:13px; }
    .section-title { display:flex; justify-content:space-between; gap:12px; align-items:flex-end; margin:0 0 14px; padding-bottom:10px; border-bottom:2px solid #d9dee7; }
    .section-title h2 { margin:0; font-size:22px; color:#18324d; }
    .section-title p { margin:4px 0 0; color:#5b6573; font-size:14px; }
    .todo-count { color:#204f86; font-weight:700; font-size:14px; }
    .todo-item { border:1px solid #d9dee7; border-radius:12px; padding:16px; margin-top:14px; background:#ffffff; }
    .todo-item-top { display:flex; gap:14px; align-items:flex-start; }
    .todo-index { width:34px; height:34px; border-radius:999px; background:#eaf1fb; color:#204f86; font-weight:700; display:flex; align-items:center; justify-content:center; flex:0 0 auto; }
    .todo-heading { flex:1; }
    .todo-heading h3 { margin:0 0 8px; font-size:19px; color:#18202a; }
    .todo-meta-row { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
    .status-badge { display:inline-block; padding:5px 10px; border-radius:999px; background:#eef3fb; border:1px solid #c7d7ea; color:#315b8a; font-weight:700; font-size:12px; }
    .meta-chip { display:inline-block; padding:5px 10px; border-radius:999px; background:#f7f9fc; border:1px solid #d9dee7; color:#526173; font-size:12px; }
    .todo-notes-box { margin-top:14px; padding:14px 16px; background:#f8fafc; border:1px solid #e0e6ef; border-radius:10px; }
    .todo-notes-label { font-size:12px; text-transform:uppercase; letter-spacing:0.08em; font-weight:700; color:#5b6573; margin-bottom:8px; }
    .todo-notes-box p { margin:0; line-height:1.55; white-space:pre-wrap; }
    .empty { color:#5b6573; padding:18px 0; }
    .footer { padding: 18px 36px; color: #5b6573; font-size: 12px; border-top: 1px solid #d9dee7; background:#fbfcfe; }
  </style>
</head>
<body>
  <main class="wrap">
    <header class="header">
      <p class="eyebrow">Weekly Open Action Summary</p>
      <h1>Patrick Open To-Do Report</h1>
      <p>Generated ${escapeHtml(formatDateTime(new Date().toISOString()))} | Weekly send schedule: Mondays at 9:30 AM</p>
    </header>
    <section class="content">
      <p class="notice"><strong>Distribution:</strong> This weekly report is sent to Derick, Patrick, and Courtney so everyone sees Patrick's current open priority items, current progress, and any notes that still need attention.</p>
      <div class="metrics">
        ${metricHtml(openItems.length, "open to-do items")}
        ${metricHtml(closedItems.length, "closed to-do items")}
        ${metricHtml(ownerLabel, "owner")}
        ${metricHtml(cardStatus, "card status")}
      </div>
      <div class="section-title">
        <div>
          <h2>Open Priority Items</h2>
          <p>Items remain in their assigned manual order until someone explicitly moves them.</p>
        </div>
        <div class="todo-count">Latest update: ${escapeHtml(latestUpdate ? formatDateTime(latestUpdate) : "None")}</div>
      </div>
      ${itemHtml}
    </section>
    <footer class="footer">Prepared from 3G Tracking and Notifications stored in Firebase Firestore.</footer>
  </main>
</body>
</html>`;
}

function downloadOpenTodoReportHtml() {
  const blob = new Blob([buildOpenTodoReportHtml()], { type: "text/html" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = buildOpenTodoReportFileName();
  link.click();
  URL.revokeObjectURL(link.href);
  alert("Save the Patrick open to-do report HTML to C:\\Software Developement\\ChatGPT Codex\\Patrick Glanville\\Email if the browser does not save it there automatically.");
}

async function moveFileHandleToArchive(sourceDirectoryHandle, archiveDirectoryHandle, fileName) {
  const fileHandle = await sourceDirectoryHandle.getFileHandle(fileName);
  const file = await fileHandle.getFile();
  const archiveHandle = await archiveDirectoryHandle.getFileHandle(fileName, { create: true });
  const writable = await archiveHandle.createWritable();
  try {
    await writable.write(await file.text());
  } finally {
    await writable.close();
  }
  await sourceDirectoryHandle.removeEntry(fileName);
}

async function saveUrgencyReportToEmailFolder() {
  const helperTriggered = await triggerUrgencyReportHelper();
  if (helperTriggered) return;

  if (typeof window.showDirectoryPicker !== "function") {
    downloadUrgencyReportHtml();
    alert("This browser cannot save directly into the Email folder from the dashboard, so the report was downloaded instead.");
    return;
  }

  try {
    const emailFolderHandle = await window.showDirectoryPicker({
      id: "patrick-glanville-email-folder",
      mode: "readwrite",
      startIn: "documents"
    });
    const archiveFolderHandle = await emailFolderHandle.getDirectoryHandle("Archive", { create: true });
    const currentFileName = buildUrgencyReportFileName();
    const archivedFiles = [];

    for await (const [entryName, entryHandle] of emailFolderHandle.entries()) {
      if (entryHandle.kind !== "file") continue;
      if (!isUrgencyReportFileName(entryName) || entryName === currentFileName) continue;
      await moveFileHandleToArchive(emailFolderHandle, archiveFolderHandle, entryName);
      archivedFiles.push(entryName);
    }

    const reportHandle = await emailFolderHandle.getFileHandle(currentFileName, { create: true });
    const writable = await reportHandle.createWritable();
    try {
      await writable.write(buildUrgencyReportHtml());
    } finally {
      await writable.close();
    }

    const archiveMessage = archivedFiles.length
      ? ` Archived: ${archivedFiles.join(", ")}.`
      : " No older urgency report files needed archiving.";
    alert(`Saved urgency report to ${currentFileName}.${archiveMessage}`);
  } catch (error) {
    if (error?.name === "AbortError") return;
    console.error(error);
    downloadUrgencyReportHtml();
    alert("Direct save to the Email folder was not completed. The report was downloaded instead.");
  }
}

async function triggerUrgencyReportHelper() {
  try {
    const response = await fetch(`${URGENCY_REPORT_HELPER_URL}/run-urgency-report`, {
      method: "POST"
    });
    if (!response.ok) return false;

    const payload = await response.json();
    if (!payload?.ok) return false;

    alert(payload.output || "Urgency report process completed.");
    return true;
  } catch {
    return false;
  }
}

async function savePatrickChangeReportToEmailFolder() {
  const helperTriggered = await triggerPatrickChangeReportHelper();
  if (helperTriggered) return;

  if (typeof window.showDirectoryPicker !== "function") {
    downloadPatrickChangeReportHtml();
    alert("This browser cannot save directly into the Email folder from the dashboard, so the Patrick change report was downloaded instead.");
    return;
  }

  try {
    const emailFolderHandle = await window.showDirectoryPicker({
      id: "patrick-glanville-email-folder",
      mode: "readwrite",
      startIn: "documents"
    });
    const archiveFolderHandle = await emailFolderHandle.getDirectoryHandle("Archive", { create: true });
    const currentFileName = buildPatrickChangeReportFileName();
    const archivedFiles = [];

    for await (const [entryName, entryHandle] of emailFolderHandle.entries()) {
      if (entryHandle.kind !== "file") continue;
      if (!isPatrickChangeReportFileName(entryName) || entryName === currentFileName) continue;
      await moveFileHandleToArchive(emailFolderHandle, archiveFolderHandle, entryName);
      archivedFiles.push(entryName);
    }

    const reportHandle = await emailFolderHandle.getFileHandle(currentFileName, { create: true });
    const writable = await reportHandle.createWritable();
    try {
      await writable.write(buildPatrickChangeReportHtml());
    } finally {
      await writable.close();
    }

    const archiveMessage = archivedFiles.length
      ? ` Archived: ${archivedFiles.join(", ")}.`
      : " No older Patrick change report files needed archiving.";
    alert(`Saved Patrick change report to ${currentFileName}.${archiveMessage}`);
  } catch (error) {
    if (error?.name === "AbortError") return;
    console.error(error);
    downloadPatrickChangeReportHtml();
    alert("Direct save to the Email folder was not completed. The Patrick change report was downloaded instead.");
  }
}

async function triggerPatrickChangeReportHelper() {
  try {
    const response = await fetch(`${URGENCY_REPORT_HELPER_URL}/run-patrick-change-report`, {
      method: "POST"
    });
    if (!response.ok) return false;

    const payload = await response.json();
    if (!payload?.ok) return false;

    alert(payload.output || "Patrick change report process completed.");
    return true;
  } catch {
    return false;
  }
}

function populateUsers() {
  userSelect.innerHTML = "";
  accountGateSelect.innerHTML = "";
  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = "Select account...";
  userSelect.appendChild(placeholderOption);

  const gatePlaceholderOption = document.createElement("option");
  gatePlaceholderOption.value = "";
  gatePlaceholderOption.textContent = "Select account...";
  accountGateSelect.appendChild(gatePlaceholderOption);

  allowedUsers.forEach(user => {
    const option = document.createElement("option");
    option.value = user.email;
    option.textContent = `${user.name} <${user.email}>`;
    userSelect.appendChild(option);

    const gateOption = option.cloneNode(true);
    accountGateSelect.appendChild(gateOption);
  });
}

function populateClients() {
  if (clientGateSelect) {
    clientGateSelect.innerHTML = "";
    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = "Select client...";
    clientGateSelect.appendChild(placeholderOption);
  }
  if (topClientSelect) {
    topClientSelect.innerHTML = "";
    const topPlaceholderOption = document.createElement("option");
    topPlaceholderOption.value = "";
    topPlaceholderOption.textContent = "Select client...";
    topClientSelect.appendChild(topPlaceholderOption);
  }

  Object.values(clientConfigs).forEach(client => {
    const option = document.createElement("option");
    option.value = client.id;
    option.textContent = client.fullName;
    if (clientGateSelect) clientGateSelect.appendChild(option);
    if (topClientSelect) topClientSelect.appendChild(option.cloneNode(true));
  });

  if (topClientSelect) topClientSelect.value = activeClientId || "";
  updateTopClientPinVisibility();
}

taskForm.addEventListener("submit", event => {
  event.preventDefault();
  const user = ensureCurrentUser("save a task update");
  if (!user) return;
  const existing = state.tasks.find(item => item.id === fields.id.value);
  const commentText = fields.comment.value.trim();
  const comments = existing?.comments ? [...existing.comments] : [];
  if (commentText) {
    comments.push({
      id: crypto.randomUUID(),
      authorEmail: user.email,
      authorName: user.name,
      createdAt: new Date().toISOString(),
      text: commentText
    });
  }
  const rawTag = fields.tag.value.trim();
  const nextTag = canEditTaskLabels()
    ? (rawTag || "")
    : (existing?.tag || "");
  const nextTagTone = canEditTaskLabels() && nextTag
    ? (fields.tagTone.value || "")
    : (existing?.tagTone || "");
  const task = {
    id: fields.id.value || crypto.randomUUID(),
    title: fields.title.value.trim(),
    category: fields.category.value.trim(),
    owner: fields.owner.value.trim(),
    status: fields.status.value,
    priority: fields.priority.value,
    due: fields.due.value,
    percent: normalizePercent(fields.percent.value),
    completedAt: existing?.completedAt || "",
    next: fields.next.value.trim(),
    notes: fields.notes.value.trim(),
    createdAt: existing?.createdAt || new Date().toISOString(),
    tag: nextTag || undefined,
    tagTone: nextTag ? (nextTagTone || undefined) : undefined,
    comments,
    medications: isMedicationGridTask(existing || { title: fields.title.value.trim() })
      ? normalizeMedicationEntries(existing?.medications)
      : undefined
  };
  normalizeTaskState(task);
  const index = state.tasks.findIndex(item => item.id === task.id);
  if (index >= 0) state.tasks[index] = task;
  else state.tasks.unshift(task);
  recordUpdate(task, buildChangeSummary(existing, task, commentText));
  saveState();
  closeDialog();
  render();
});

document.querySelector("#deleteTaskBtn").addEventListener("click", () => {
  if (!ensureCurrentUser("delete a task")) return;
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
document.querySelector("#closeCommentHistoryDialog").addEventListener("click", () => commentHistoryDialog.close());
document.querySelector("#patrickChangeReportBtn").addEventListener("click", () => {
  renderPatrickChangeReport();
  patrickChangeReportDialog.showModal();
});
document.querySelector("#closePatrickChangeReportDialog").addEventListener("click", () => patrickChangeReportDialog.close());
document.querySelector("#savePatrickChangeReportBtn").addEventListener("click", savePatrickChangeReportToEmailFolder);
document.querySelector("#urgencyReportBtn").addEventListener("click", saveUrgencyReportToEmailFolder);
document.querySelector("#closeUrgencyReportDialog").addEventListener("click", () => urgencyReportDialog.close());
document.querySelector("#emailUrgencyReportBtn").addEventListener("click", emailUrgencyReport);
const emailDashboardReportBtn = document.querySelector("#emailDashboardReportBtn");
if (emailDashboardReportBtn) {
  emailDashboardReportBtn.addEventListener("click", emailUrgencyReport);
}
document.querySelector("#closeMedicationDialog").addEventListener("click", closeMedicationDialog);
document.querySelector("#doneMedicationDialogBtn").addEventListener("click", closeMedicationDialog);
document.querySelector("#htmlEmailUrgencyReportBtn").addEventListener("click", downloadUrgencyReportHtml);
document.querySelector("#htmlEmailDashboardReportBtn").addEventListener("click", downloadUrgencyReportHtml);
searchInput.addEventListener("input", render);
statusFilter.addEventListener("change", render);
priorityFilter.addEventListener("change", render);
categoryFilter.addEventListener("change", render);
togglePatrickWatchBtn.addEventListener("click", () => {
  state.hiddenPanels.patrickWatch = !state.hiddenPanels.patrickWatch;
  saveState();
  renderPatrickWatch();
});
toggleOverviewBtn.addEventListener("click", () => {
  state.hiddenPanels.overview = !state.hiddenPanels.overview;
  saveState();
  renderPanelVisibility();
});
billMonthInput.addEventListener("change", () => {
  syncCurrentBudgetMonth();
  loadBudgetMonth(billMonthInput.value || defaultBillMonth());
  state.billGroupView = defaultBillGroupView(state.billMonth);
  saveState();
  renderBills();
});
if (billPrevMonthBtn) {
  billPrevMonthBtn.addEventListener("click", () => {
    syncCurrentBudgetMonth();
    loadBudgetMonth(shiftMonthString(state.billMonth || defaultBillMonth(), -1));
    state.billGroupView = defaultBillGroupView(state.billMonth);
    saveState();
    renderBills();
  });
}
if (billNextMonthBtn) {
  billNextMonthBtn.addEventListener("click", () => {
    syncCurrentBudgetMonth();
    loadBudgetMonth(shiftMonthString(state.billMonth || defaultBillMonth(), 1));
    state.billGroupView = defaultBillGroupView(state.billMonth);
    saveState();
    renderBills();
  });
}
if (billGroupEarlyBtn) {
  billGroupEarlyBtn.addEventListener("click", () => setBillGroupView("early"));
}
if (billGroupFullBtn) {
  billGroupFullBtn.addEventListener("click", () => setBillGroupView("full"));
}
if (billGroupMidBtn) {
  billGroupMidBtn.addEventListener("click", () => setBillGroupView("mid"));
}
if (billGroupLateBtn) {
  billGroupLateBtn.addEventListener("click", () => setBillGroupView("late"));
}
if (billMBFInput) {
  billMBFInput.addEventListener("input", () => {
    state.monthlyBudgetFund = normalizeMoney(billMBFInput.value);
    syncCurrentBudgetMonth();
    saveState();
    updateBillTotals();
  });
  billMBFInput.addEventListener("change", () => {
    state.monthlyBudgetFund = normalizeMoney(billMBFInput.value);
    syncCurrentBudgetMonth();
    saveState();
    renderBills();
  });
}
const saveBudgetSnapshotBtn = document.querySelector("#saveBudgetSnapshotBtn");
if (saveBudgetSnapshotBtn) {
  saveBudgetSnapshotBtn.addEventListener("click", saveBudgetSnapshot);
}
if (copyBillsToNextMonthBtn) {
  copyBillsToNextMonthBtn.addEventListener("click", copyBillsToNextMonth);
}
if (calculateBillsBtn) {
  calculateBillsBtn.addEventListener("click", calculateAllBillBalances);
}
if (assignDueDatesBtn) {
  assignDueDatesBtn.addEventListener("click", assignDueDatesFromPreviousMonth);
}
if (undoCopyBillsToNextMonthBtn) {
  undoCopyBillsToNextMonthBtn.addEventListener("click", undoCopyBillsToNextMonth);
}
if (upcomingBillsBanner) {
  upcomingBillsBanner.addEventListener("click", openUpcomingBillsDialog);
  upcomingBillsBanner.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openUpcomingBillsDialog();
    }
  });
}
if (closeUpcomingBillsDialogBtn && upcomingBillsDialog) {
  closeUpcomingBillsDialogBtn.addEventListener("click", () => upcomingBillsDialog.close());
}
if (toggleHiddenBillsBtn) {
  toggleHiddenBillsBtn.addEventListener("click", () => {
    state.hiddenBillsExpanded = !state.hiddenBillsExpanded;
    saveState();
    renderBills();
  });
}
document.querySelector("#addBillBtn").addEventListener("click", () => {
  if (!ensureCurrentUser("add a bill")) return;
  const month = state.billMonth || defaultBillMonth();
  ensureMonthlyBudgetState(month);
  const newBill = {
    id: crypto.randomUUID(),
    name: "",
    amount: 0,
    due: "",
    status: "Unpaid",
    notes: ""
  };
  const deletedBillNames = new Set(state.monthlyBudgets[month]?.deletedBillNames || []);
  deletedBillNames.delete("");
  state.monthlyBudgets[month].deletedBillNames = Array.from(deletedBillNames);
  state.bills.push(newBill);
  syncCurrentBudgetMonth();
  recordHistoryEntry({
    itemType: "bill",
    itemId: newBill.id,
    title: historyTitleFor("bill", "Untitled bill"),
    summary: "Monthly bill added",
    status: newBill.status,
    percent: percentFromBillStatus(newBill.status)
  });
  saveState();
  renderBills();
});
toggleBillsBtn.addEventListener("click", () => {
  state.hiddenPanels.bills = !state.hiddenPanels.bills;
  saveState();
  renderPanelVisibility();
});
hideBillsBtn.addEventListener("click", () => {
  state.hiddenPanels.bills = true;
  saveState();
  renderPanelVisibility();
});
if (toggleBillsPopoutBtn) {
  toggleBillsPopoutBtn.addEventListener("click", () => {
    budgetPanel.classList.toggle("budget-panel-popout");
    const isPoppedOut = budgetPanel.classList.contains("budget-panel-popout");
    toggleBillsPopoutBtn.textContent = isPoppedOut ? "Dock" : "Pop Out";
    toggleBillsPopoutBtn.setAttribute("aria-pressed", String(isPoppedOut));
    document.body.classList.toggle("budget-panel-open", isPoppedOut);
  });
}
if (toggleBillsCompactBtn) {
  toggleBillsCompactBtn.addEventListener("click", () => {
    state.billsCompactView = !state.billsCompactView;
    saveState();
    renderBills();
  });
}
if (toggleBudgetSnapshotsBtn) {
  toggleBudgetSnapshotsBtn.addEventListener("click", () => {
    state.hiddenPanels.budgetSnapshots = !state.hiddenPanels.budgetSnapshots;
    saveState();
    renderPanelVisibility();
  });
}
document.querySelector("#addLifeAdminNoteBtn").addEventListener("click", () => {
  if (!ensureCurrentUser("add a Patrick to-do note")) return;
  const newNote = {
    id: crypto.randomUUID(),
    item: "",
    due: "",
    status: "Open",
    notes: ""
  };
  state.lifeAdminNotes.push(newNote);
  recordHistoryEntry({
    itemType: "lifeAdmin",
    itemId: newNote.id,
    title: historyTitleFor("lifeAdmin", "Untitled note"),
    summary: "Patrick to-do note added",
    status: newNote.status,
    percent: percentFromLifeAdminStatus(newNote.status)
  });
  saveState();
  renderLifeAdminNotes();
});
toggleLifeAdminBtn.addEventListener("click", () => {
  state.hiddenPanels.lifeAdmin = !state.hiddenPanels.lifeAdmin;
  saveState();
  renderPanelVisibility();
});
hideLifeAdminBtn.addEventListener("click", () => {
  state.hiddenPanels.lifeAdmin = true;
  saveState();
  renderPanelVisibility();
});
userSelect.addEventListener("change", () => {
  requestUserSwitch(userSelect.value);
});

if (toggleCurrentUserBtn) {
  toggleCurrentUserBtn.addEventListener("click", () => {
    currentUserCollapsed = !currentUserCollapsed;
    updateClientChrome();
  });
}

function openClientSwitcher() {
  if (topClientSelect) {
    if (typeof topClientSelect.showPicker === "function") {
      topClientSelect.showPicker();
    } else {
      topClientSelect.focus();
    }
    return;
  }
  showClientGate("Choose which client dashboard to open. Protected client dashboards require an access code.");
}

window.openClientSwitcher = openClientSwitcher;

if (clientSwitchBtn) {
  clientSwitchBtn.addEventListener("click", openClientSwitcher);
}

if (topClientSwitchBtn) {
  topClientSwitchBtn.addEventListener("click", () => {
    if (topClientSelect) {
      if (typeof topClientSelect.showPicker === "function") {
        topClientSelect.showPicker();
      } else {
        topClientSelect.focus();
      }
      return;
    }
    openClientSwitcher();
  });
}

if (topClientSelect) {
  topClientSelect.addEventListener("change", handleTopClientSelection);
  topClientSelect.addEventListener("input", handleTopClientSelection);
}
if (topClientPin) {
  topClientPin.addEventListener("input", maybeSubmitTopClientPin);
  topClientPin.addEventListener("keydown", handleTopClientPinKeyboardSubmit);
  topClientPin.addEventListener("keyup", handleTopClientPinKeyboardSubmit);
  topClientPin.addEventListener("change", handleTopClientPinCommit);
  topClientPin.addEventListener("blur", handleTopClientPinCommit);
}

accountGateSelect.addEventListener("change", updateAccountGatePinVisibility);
accountGateSelect.addEventListener("change", handleAccountGateSelection);
accountGateSelect.addEventListener("input", handleAccountGateSelection);
accountGateDialog.addEventListener("cancel", event => {
  event.preventDefault();
});
accountGateForm.addEventListener("submit", event => {
  event.preventDefault();
  submitAccountGate();
});
accountGatePin.addEventListener("keydown", handleDericPinKeyboardSubmit);
accountGatePin.addEventListener("keyup", handleDericPinKeyboardSubmit);
accountGatePin.addEventListener("input", maybeSubmitDericPin);
accountGatePin.addEventListener("change", handleDericPinCommit);
accountGatePin.addEventListener("blur", handleDericPinCommit);
if (clientGateSelect) {
  clientGateSelect.addEventListener("change", updateClientGatePinVisibility);
  clientGateSelect.addEventListener("change", handleClientGateSelection);
  clientGateSelect.addEventListener("input", handleClientGateSelection);
}
if (clientGateDialog) {
  clientGateDialog.addEventListener("cancel", event => {
    event.preventDefault();
  });
}
if (clientGateForm) {
  clientGateForm.addEventListener("submit", event => {
    event.preventDefault();
  });
}
if (clientGatePin) {
  clientGatePin.addEventListener("keydown", handleTheodoreClientPinKeyboardSubmit);
  clientGatePin.addEventListener("keyup", handleTheodoreClientPinKeyboardSubmit);
  clientGatePin.addEventListener("input", maybeSubmitTheodoreClientPin);
  clientGatePin.addEventListener("change", handleTheodoreClientPinCommit);
  clientGatePin.addEventListener("blur", handleTheodoreClientPinCommit);
}

document.querySelectorAll(".emoji-button").forEach(button => {
  button.addEventListener("click", () => {
    insertEmojiIntoField(button.dataset.target, button.dataset.emoji || "");
  });
});

document.querySelector("#addRunningNoteBtn").addEventListener("click", addRunningNote);

document.querySelector("#exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
    const exportClient = currentClientConfig();
    const exportPrefix = exportClient
      ? exportClient.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      : "family-support";
    link.download = `${exportPrefix}-tracker-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});

document.querySelector("#importInput").addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const selectedUserEmail = state.currentUser;
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported.tasks)) throw new Error("Missing task list");
      state = initializeState({
        notes: imported.notes || "",
        runningNotes: imported.runningNotes,
        currentUser: imported.currentUser,
        history: imported.history,
        panelVisibilityVersion: imported.panelVisibilityVersion,
        hiddenPanels: imported.hiddenPanels,
        collapsedTaskGroups: imported.collapsedTaskGroups,
        billMonth: imported.billMonth,
        monthlyBudgetFund: imported.monthlyBudgetFund,
        monthlyBudgets: imported.monthlyBudgets,
        budgetSnapshots: imported.budgetSnapshots,
        bills: imported.bills,
        lifeAdminNotes: imported.lifeAdminNotes,
        documents: imported.documents,
        tasks: imported.tasks
      });
      addMissingSeedTasks(state);
      state = initializeState(state);
      if (selectedUserEmail) state.currentUser = selectedUserEmail;
      saveState();
      render();
    } catch (error) {
      alert(`Import failed: ${error.message}`);
    }
  };
  reader.readAsText(file);
  event.target.value = "";
});

const pdfBtn = document.querySelector("#pdfBtn");
if (pdfBtn) {
  pdfBtn.addEventListener("click", () => {
    searchInput.value = "";
    statusFilter.value = "all";
    priorityFilter.value = "all";
    categoryFilter.value = "all";
    render();
    window.print();
  });
}

if (pdfUploadInput) {
  pdfUploadInput.addEventListener("change", async event => {
    const files = [...(event.target.files || [])];
    if (!files.length) return;

    let savedCount = 0;
    for (const file of files) {
      if (await savePdfDocument(file)) savedCount += 1;
    }

    if (savedCount) {
      saveState();
      renderSavedDocuments();
      alert(`Saved ${savedCount} PDF${savedCount === 1 ? "" : "s"} to the shared database.`);
    }

    event.target.value = "";
  });
}

if (viewDocumentsBtn) {
  viewDocumentsBtn.addEventListener("click", () => {
    const hasDocuments = renderSavedDocuments();
    if (!hasDocuments) {
      alert("No document metadata has been saved to the database yet.");
      return;
    }
    if (typeof documentsDialog?.showModal === "function") documentsDialog.showModal();
    else if (typeof documentsDialog?.show === "function") documentsDialog.show();
  });
}

document.querySelector("#processGuideBtn").addEventListener("click", () => {
  window.open(`Patrick_Glanville_Process_Guide_v2.pdf?open=${Date.now()}`, "_blank", "noopener");
});

if (closeDocumentsDialogBtn && documentsDialog) {
  closeDocumentsDialogBtn.addEventListener("click", () => documentsDialog.close());
}

document.querySelector("#resetBtn").addEventListener("click", () => {
  if (!confirm("Reset tracker to the original starting tasks?")) return;
  const selectedUserEmail = state.currentUser;
  state = initializeState(structuredClone(getSeedData()));
  if (selectedUserEmail) state.currentUser = selectedUserEmail;
  saveState();
  render();
});
document.querySelector("#refreshAppBtn").addEventListener("click", () => {
  const url = new URL(window.location.href);
  url.searchParams.set("refresh", Date.now().toString());
  window.location.href = url.toString();
});
if (pullLatestDevicesBtn) {
  pullLatestDevicesBtn.addEventListener("click", () => {
    requestRemoteClientRefresh();
  });
}

markPatrickReviewedBtn.addEventListener("click", () => {
  const openPatrickEntries = state.history
    .filter(entry => entry.userEmail === "patrick.glanville@gmail.com")
    .filter(entry => !isPatrickEntryClosed(entry));
  markPatrickEntriesReviewed(openPatrickEntries);
  renderPatrickWatch();
});

closeAllPatrickBtn.addEventListener("click", () => {
  const openPatrickEntries = state.history
    .filter(entry => entry.userEmail === "patrick.glanville@gmail.com")
    .filter(entry => !isPatrickEntryClosed(entry));
  closePatrickEntries(openPatrickEntries);
  renderPatrickWatch();
});

patrickViewOpenBtn.addEventListener("click", () => {
  patrickWatchState.view = "open";
  savePatrickWatchState(patrickWatchState);
  renderPatrickWatch();
});

patrickViewClosedBtn.addEventListener("click", () => {
  patrickWatchState.view = "closed";
  savePatrickWatchState(patrickWatchState);
  renderPatrickWatch();
});

patrickViewAllBtn.addEventListener("click", () => {
  patrickWatchState.view = "all";
  savePatrickWatchState(patrickWatchState);
  renderPatrickWatch();
});

taskViewActiveBtn.addEventListener("click", () => {
  taskViewMode = "active";
  saveTaskViewMode();
  if (statusFilter.value === "Done") statusFilter.value = "all";
  render();
});

taskViewDoneBtn.addEventListener("click", () => {
  taskViewMode = "done";
  saveTaskViewMode();
  render();
});

taskViewAllBtn.addEventListener("click", () => {
  taskViewMode = "all";
  saveTaskViewMode();
  render();
});

try {
  window.__appBootStage = "populate-users";
  populateUsers();
  window.__appBootStage = "populate-clients";
  populateClients();
  window.__appBootStage = "populate-categories";
  populateCategories();
  window.__appBootStage = "render";
  render();
  window.__appBootStage = "close-account-gate";
  closeAccountGateDialog();
  window.__appBootStage = "close-client-gate";
  closeClientGateDialog();
  window.__appBootStage = "update-sync-status";
  updateSyncStatus();
  window.__appBootStage = "initialize-shared-data-source";
  initializeSharedDataSource();
  window.__appBootStage = "post-init-timeout";
  window.setTimeout(() => {
    finalizeSupabaseInitStatusIfPending();
  }, 3000);
  window.__appBootStage = "boot-complete";
} catch (error) {
  window.__appBootError = error?.message || "unknown boot error";
  window.__appBootStage = "boot-failed";
  updateDataStoreStatus();
}
  const renderSimpleBillRow = (bill, targetList) => {
    const row = document.createElement("article");
    row.className = `budget-bill-item budget-bill-item-simple${isBillPastDue(bill) ? " is-past-due" : ""}${bill.status === "Paid" ? " is-paid" : ""}`;
    row.dataset.billId = bill.id;
    row.innerHTML = `
      <label class="budget-bill-field">
        <span>Bill</span>
        <input class="bill-name" value="${escapeAttribute(bill.name)}" aria-label="Bill name">
      </label>
      <label class="budget-bill-field">
        <span>Amount</span>
        <input class="bill-amount" type="text" inputmode="decimal" value="${escapeAttribute(formatCurrencyInputValue(bill.amount))}" aria-label="Bill amount">
      </label>
      <label class="budget-bill-field">
        <span>Due date</span>
        <input class="bill-due" type="date" value="${escapeAttribute(bill.due)}" aria-label="Bill due date">
      </label>
      <label class="budget-bill-field">
        <span>Status</span>
        <select class="bill-status" aria-label="Bill status">
          ${billStatusOptions.map(status => `<option${status === bill.status ? " selected" : ""}>${escapeHtml(status)}</option>`).join("")}
        </select>
      </label>
      <label class="budget-bill-field budget-bill-notes-box">
        <span>Notes</span>
        <textarea class="bill-notes" rows="2" aria-label="Bill notes" placeholder="Optional notes">${escapeHtml(bill.notes || "")}</textarea>
      </label>
      <div class="budget-bill-actions">
        <button type="button" class="delete-bill-button" aria-label="Delete bill">Delete</button>
      </div>
    `;

    row.querySelector(".bill-name").addEventListener("input", () => updateBillFromRow(row, { recordHistory: false, persist: false }));
    row.querySelector(".bill-amount").addEventListener("input", () => updateBillFromRow(row, { recordHistory: false, persist: false }));
    row.querySelector(".bill-notes").addEventListener("input", () => updateBillFromRow(row, { recordHistory: false, persist: false }));
    row.querySelector(".bill-name").addEventListener("change", () => updateBillFromRow(row));
    row.querySelector(".bill-amount").addEventListener("change", () => updateBillFromRow(row));
    row.querySelector(".bill-due").addEventListener("change", () => updateBillFromRow(row));
    row.querySelector(".bill-status").addEventListener("change", () => updateBillFromRow(row));
    row.querySelector(".bill-notes").addEventListener("change", () => updateBillFromRow(row));
    row.querySelector(".delete-bill-button").addEventListener("click", () => deleteBill(bill.id));
    targetList.appendChild(row);
  };
