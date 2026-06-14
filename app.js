const STORAGE_KEY = "patrick-glanville-support-tracker-v1";
const PATRICK_WATCH_KEY = "patrick-glanville-patrick-watch-v1";
const TASK_VIEW_KEY = "patrick-glanville-task-view-v1";
const DATA_VERSION = 2026061402;
const PANEL_VISIBILITY_VERSION = 2026052603;
const BUILD_INFO = {
  commit: "926ad52",
  timestamp: "2026-05-25T11:18:12-04:00",
  builtAt: "2026-05-28T00:00:00-04:00",
  label: "Local build"
};
const GITHUB_COMMIT_API = "https://api.github.com/repos/derickglanville/Patrick-Glanville/commits/main";
const SUPABASE_TABLE = "tracker_state";
const SUPABASE_STATE_ID = "patrick-glanville";
const SUPABASE_SAVE_DELAY_MS = 700;
const SUPABASE_REMOTE_UPDATED_AT_KEY = "patrick-glanville-remote-updated-at-v1";
const SUPABASE_SYNC_POLL_MS = 60 * 60 * 1000;
const URGENCY_REPORT_HELPER_URL = "http://127.0.0.1:8767";
const DERIC_EMAIL = "dglanville@gmail.com";
const DERIC_PIN = "3141";
const PATRICK_EMAIL = "patrick.glanville@gmail.com";
const EMAIL_REPORT_RECIPIENTS = [
  DERIC_EMAIL,
  PATRICK_EMAIL
];
const MEDICATION_LIST_TASK_TITLE = "Create medication list with dosage and refill dates";
const HEALTH_INSURANCE_TASK_TITLE = "Get health insurance before current coverage expires";
const DEPRESSION_TASK_TITLE = "Assess depression and anxiety impact on job search";
const ETHOS_TASK_TITLE = "Look into life insurance through Ethos";
const MEDICATION_REFILL_ALERT_WINDOW_DAYS = 7;
let supabaseClient = null;
let supabaseEnabled = false;
let supabaseStatus = "Local browser storage";
let supabaseSaveTimer = null;
let supabaseSyncTimer = null;
let remoteUpdatedAt = "";
let applyingRemoteState = false;
const allowedUsers = [
  { name: "Deric Glanville", email: DERIC_EMAIL },
  { name: "Patrick Glanville", email: PATRICK_EMAIL },
  { name: "Courtney Glanville", email: "courtney.glanville@gmail.com" },
  { name: "Georgette Hemmings", email: "hemmgeor@gmail.com" }
];
const baseCategories = [
  "Job - CloudResearch",
  "Job - Data Annotation",
  "Job - Easy Money (HEB, Walmart, Home Depot, Kroger)",
  "Job - Teaching Assistance",
  "Job - Mercor",
  "Job - Micro1",
  "Job - Outlier",
  "Job - Prolific",
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
  "Jobs and Income",
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
  "Jobs and Income",
  "Benefits and Assistance",
  "Transportation and Vehicle",
  "Debt, Bills, and Legal"
];
const categoryOrder = [
  "Job - CloudResearch",
  "Job - Data Annotation",
  "Job - Prolific",
  "Job - Mercor",
  "Job - Micro1",
  "Job - Outlier",
  "Job - Easy Money (HEB, Walmart, Home Depot, Kroger)",
  "Job - Teaching Assistance",
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

function buildSeedComment(text, authorName = "Opportunity note", authorEmail = "") {
  return {
    id: crypto.randomUUID(),
    authorEmail,
    authorName,
    createdAt: BUILD_INFO.builtAt || new Date().toISOString(),
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

const seedData = {
  dataVersion: DATA_VERSION,
  notes: "",
  lastSavedAt: "",
  panelVisibilityVersion: PANEL_VISIBILITY_VERSION,
  hiddenPanels: {
    overview: true,
    patrickWatch: true,
    bills: true,
    lifeAdmin: true
  },
  runningNotes: [],
  documents: [],
  collapsedTaskGroups: {},
  billMonth: "",
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

seedData.tasks.forEach(task => {
  task.seedKey = task.seedKey || buildSeedTaskKey(task.title);
});

const seedTaskTitleByKey = Object.fromEntries(
  seedData.tasks.map(task => [task.seedKey, task.title])
);

let state = loadState();
let patrickWatchState = loadPatrickWatchState();

const taskList = document.querySelector("#taskList");
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
const overviewPanel = document.querySelector("#overviewPanel");
const overviewContent = document.querySelector("#overviewContent");
const toggleOverviewBtn = document.querySelector("#toggleOverviewBtn");
const accountGateDialog = document.querySelector("#accountGateDialog");
const accountGateForm = document.querySelector("#accountGateForm");
const accountGateSelect = document.querySelector("#accountGateSelect");
const accountGatePinWrap = document.querySelector("#accountGatePinWrap");
const accountGatePin = document.querySelector("#accountGatePin");
const accountGateMessage = document.querySelector("#accountGateMessage");
const accountGateError = document.querySelector("#accountGateError");
const historyDialog = document.querySelector("#historyDialog");
const urgencyReportDialog = document.querySelector("#urgencyReportDialog");
const patrickChangeReportDialog = document.querySelector("#patrickChangeReportDialog");
const documentsDialog = document.querySelector("#documentsDialog");
const medicationDialog = document.querySelector("#medicationDialog");
const medicationDialogBody = document.querySelector("#medicationDialogBody");
const patrickWatchPanel = document.querySelector("#patrickWatchPanel");
const patrickChangeReport = document.querySelector("#patrickChangeReport");
const billMonthInput = document.querySelector("#billMonth");
const billList = document.querySelector("#billList");
const billTotal = document.querySelector("#billTotal");
const billPaid = document.querySelector("#billPaid");
const billRemaining = document.querySelector("#billRemaining");
const billPastDue = document.querySelector("#billPastDue");
const lifeAdminNotes = document.querySelector("#lifeAdminNotes");
const budgetPanel = document.querySelector("#budgetPanel");
const budgetPanelContent = document.querySelector("#budgetPanelContent");
const lifeAdminPanel = document.querySelector("#lifeAdminPanel");
const lifeAdminPanelContent = document.querySelector("#lifeAdminPanelContent");
const patrickWatchContent = document.querySelector("#patrickWatchContent");
const togglePatrickWatchBtn = document.querySelector("#togglePatrickWatchBtn");
const toggleBillsBtn = document.querySelector("#toggleBillsBtn");
const toggleLifeAdminBtn = document.querySelector("#toggleLifeAdminBtn");
const hideBillsBtn = document.querySelector("#hideBillsBtn");
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
let taskViewMode = loadTaskViewMode();
let activeMedicationTaskId = "";

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

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return initializeState(structuredClone(seedData));
  try {
    const parsed = JSON.parse(saved);
    const loaded = {
      dataVersion: Number(parsed.dataVersion) || 0,
      notes: parsed.notes || "",
      runningNotes: Array.isArray(parsed.runningNotes) ? parsed.runningNotes : [],
      documents: Array.isArray(parsed.documents) ? parsed.documents : [],
      currentUser: parsed.currentUser || PATRICK_EMAIL,
      history: Array.isArray(parsed.history) ? parsed.history : [],
      lastSavedAt: parsed.lastSavedAt || "",
      panelVisibilityVersion: Number(parsed.panelVisibilityVersion) || 0,
      hiddenPanels: parsed.hiddenPanels || {},
      collapsedTaskGroups: parsed.collapsedTaskGroups || {},
      billMonth: parsed.billMonth || "",
      bills: Array.isArray(parsed.bills) ? parsed.bills : structuredClone(seedData.bills),
      lifeAdminNotes: Array.isArray(parsed.lifeAdminNotes) ? parsed.lifeAdminNotes : structuredClone(seedData.lifeAdminNotes),
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : structuredClone(seedData.tasks)
    };
    const migrated = applyDataMigrations(loaded);
    const initialized = initializeState(loaded);
    if (migrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(initialized));
    return initialized;
  } catch {
    return initializeState(structuredClone(seedData));
  }
}

function loadTaskViewMode() {
  try {
    const saved = localStorage.getItem(TASK_VIEW_KEY);
    return ["active", "done", "all"].includes(saved) ? saved : "active";
  } catch {
    return "active";
  }
}

function saveTaskViewMode() {
  localStorage.setItem(TASK_VIEW_KEY, taskViewMode);
}

function initializeState(loaded) {
  loaded = loaded && typeof loaded === "object" ? loaded : structuredClone(seedData);
  loaded.notes = loaded.notes || "";
  loaded.tasks = Array.isArray(loaded.tasks) ? loaded.tasks : structuredClone(seedData.tasks);
  let stateAdjusted = assignSeedKeys(loaded.tasks);
  stateAdjusted = addMissingSeedTasks(loaded) || stateAdjusted;
  loaded.bills = Array.isArray(loaded.bills) ? loaded.bills : structuredClone(seedData.bills);
  ensureSeedBills(loaded);
  loaded.dataVersion = Number(loaded.dataVersion) || DATA_VERSION;
  let panelVisibilityReset = false;
  loaded.currentUser = allowedUsers.some(user => user.email === loaded.currentUser)
    ? loaded.currentUser
    : PATRICK_EMAIL;
  loaded.history = Array.isArray(loaded.history) ? loaded.history : [];
  loaded.lastSavedAt = loaded.lastSavedAt || new Date().toISOString();
  loaded.runningNotes = normalizeRunningNotes(loaded.runningNotes, loaded.notes);
  loaded.documents = normalizeDocuments(loaded.documents);
  if (loaded.panelVisibilityVersion !== PANEL_VISIBILITY_VERSION) {
    loaded.hiddenPanels = { overview: true, patrickWatch: true, bills: true, lifeAdmin: true };
    loaded.panelVisibilityVersion = PANEL_VISIBILITY_VERSION;
    panelVisibilityReset = true;
  } else {
    loaded.hiddenPanels = {
      overview: loaded.hiddenPanels?.overview ?? true,
      patrickWatch: loaded.hiddenPanels?.patrickWatch ?? true,
      bills: Boolean(loaded.hiddenPanels?.bills),
      lifeAdmin: Boolean(loaded.hiddenPanels?.lifeAdmin)
    };
  }
  loaded.collapsedTaskGroups = loaded.collapsedTaskGroups && typeof loaded.collapsedTaskGroups === "object"
    ? loaded.collapsedTaskGroups
    : {};
  defaultExpandedTaskGroups.forEach(groupName => {
    loaded.collapsedTaskGroups[groupName] = false;
  });
  loaded.billMonth = loaded.billMonth || defaultBillMonth();
  loaded.bills = loaded.bills.map(normalizeBill);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
  }
  return loaded;
}

function defaultBillMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function normalizeBill(bill) {
  return {
    id: bill.id || crypto.randomUUID(),
    name: bill.name || "",
    amount: normalizeMoney(bill.amount),
    due: bill.due || "",
    status: billStatusOptions.includes(bill.status) ? bill.status : "Unpaid",
    notes: bill.notes || ""
  };
}

function currentMonthlyDueDate(dayOfMonth) {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(dayOfMonth).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

function ensureSeedBills(loaded) {
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

function formatCurrency(value) {
  return normalizeMoney(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
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
  try {
    const saved = localStorage.getItem(PATRICK_WATCH_KEY);
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
  localStorage.setItem(PATRICK_WATCH_KEY, JSON.stringify({
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
  if (isMedicationLikeTask(task)) return buildSeedTaskKey(MEDICATION_LIST_TASK_TITLE);
  const exactSeedTask = seedData.tasks.find(seedTask => seedTask.title === task.title);
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

function applyDataMigrations(loaded) {
  if ((Number(loaded.dataVersion) || 0) >= DATA_VERSION) return false;

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

  updateTaskContent(loaded.tasks, HEALTH_INSURANCE_TASK_TITLE, {
    next: "Confirm the grace-period coverage end date of 2026-07-31, compare replacement coverage options now, and apply for a new plan before there is any gap in appointments or medication access.",
    notes: "Coverage is currently expected to last through 2026-07-31 because of the grace period. Track marketplace or employer options, monthly premium, deductible, out-of-pocket maximum, cardiology and primary-care network coverage, prescription coverage, and the exact date new insurance becomes active.",
    tag: "Updated",
    tagTone: "purple"
  });

  updateTaskContent(loaded.tasks, MEDICATION_LIST_TASK_TITLE, {
    next: "Confirm the strength and dosage for Eloquis, Entresto, Jardiance, Metoprolol, and Rosuvastatin, then add refill dates, prescribing doctor, pharmacy, and days of supply remaining.",
    notes: "Use this notes field to track medication details, refill timing, side effects, copay, prior authorization issues, pharmacy contact information, and any gaps caused by insurance changes. Current medications to verify for strength/dosage: Eloquis, Entresto, Jardiance, Metoprolol, and Rosuvastatin.",
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

  loaded.dataVersion = DATA_VERSION;
  loaded.lastSavedAt = new Date().toISOString();
  return true;
}

function updateTaskFields(tasks, title, updates) {
  const task = tasks.find(item => item.title === title);
  if (!task) return;
  Object.assign(task, updates);
}

function applyTaskDefaults(tasks, title, updates) {
  const task = tasks.find(item => item.title === title);
  if (!task) return;

  Object.entries(updates).forEach(([field, value]) => {
    const currentValue = task[field];
    if (currentValue === undefined || currentValue === null || currentValue === "") {
      task[field] = value;
    }
  });
}

function updateTaskContent(tasks, title, updates) {
  const task = tasks.find(item => item.title === title);
  if (!task) return;
  Object.assign(task, updates);
}

function ensureTaskComment(tasks, title, text, authorName = "Opportunity note", authorEmail = "") {
  const task = tasks.find(item => item.title === title);
  if (!task) return;
  if (!Array.isArray(task.comments)) task.comments = [];
  const normalizedText = String(text || "").trim();
  const hasMatch = task.comments.some(comment => String(comment?.text || "").trim() === normalizedText);
  if (hasMatch) return;
  task.comments.push(buildSeedComment(normalizedText, authorName, authorEmail));
}

function ensureMedicationListDefaults(tasks) {
  const task = tasks.find(item => item.title === MEDICATION_LIST_TASK_TITLE);
  if (!task) return;

  const requiredNames = ["Eloquis", "Entresto", "Jardiance", "Metoprolol", "Rosuvastatin"];
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
    const percent = normalizePercent(task.percent);
    const due = task.due || "";
    const looksLikeMigrationOverride = task.status === "In progress"
      && percent === 15
      && (
        (task.title === "Apply for CloudResearch Connect studies" && due === "2026-05-25") ||
        (task.title === "Apply for Data Annotation work" && due === "2026-05-24") ||
        (task.title === "Apply for Prolific research studies" && due === "2026-05-24")
      );

    if (!looksLikeMigrationOverride) return;

    task.status = "On-Hold";
    task.percent = 0;
    task.priority = "Urgent";
    task.completedAt = task.completedAt || new Date().toISOString();
  });
}

function mergeTaskData(primary, duplicate) {
  if (!primary || !duplicate) return;

  primary.seedKey = primary.seedKey || duplicate.seedKey || inferSeedTaskKey(primary) || inferSeedTaskKey(duplicate);
  const seedTitle = primary.seedKey ? seedTaskTitleByKey[primary.seedKey] : "";
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

  const primaryMedications = normalizeMedicationEntries(primary.medications);
  const duplicateMedications = normalizeMedicationEntries(duplicate.medications);
  const primaryHasMedicationValues = primaryMedications.some(entry => entry.name || entry.dosage || entry.refillDate);
  const duplicateHasMedicationValues = duplicateMedications.some(entry => entry.name || entry.dosage || entry.refillDate);
  if (!primaryHasMedicationValues && duplicateHasMedicationValues) {
    primary.medications = duplicateMedications;
  }

  if (!primary.tag && duplicate.tag) primary.tag = duplicate.tag;
  if (!primary.tagTone && duplicate.tagTone) primary.tagTone = duplicate.tagTone;
}

function taskMergeScore(task) {
  const medications = normalizeMedicationEntries(task.medications);
  const medicationValueCount = medications.filter(entry => entry.name || entry.dosage || entry.refillDate).length;
  const commentCount = Array.isArray(task.comments) ? task.comments.length : 0;
  const seedTitle = task.seedKey ? seedTaskTitleByKey[task.seedKey] : "";
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
  state.lastSavedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateDataStoreStatus();
  queueSharedStateSave();
}

function cacheRemoteUpdatedAt(value) {
  remoteUpdatedAt = value || "";
  if (remoteUpdatedAt) localStorage.setItem(SUPABASE_REMOTE_UPDATED_AT_KEY, remoteUpdatedAt);
  else localStorage.removeItem(SUPABASE_REMOTE_UPDATED_AT_KEY);
}

function readCachedRemoteUpdatedAt() {
  return localStorage.getItem(SUPABASE_REMOTE_UPDATED_AT_KEY) || "";
}

function supabaseConfig() {
  return window.PATRICK_SUPABASE_CONFIG || {};
}

function hasSupabaseConfig() {
  const config = supabaseConfig();
  return Boolean(config.url && config.anonKey && window.supabase?.createClient);
}

async function initializeSharedDataSource() {
  if (!hasSupabaseConfig()) {
    supabaseStatus = "Local browser storage; Supabase is not configured";
    updateDataStoreStatus();
    return;
  }

  const config = supabaseConfig();
  try {
    supabaseClient = window.supabase.createClient(config.url, config.anonKey);
    supabaseEnabled = true;
    supabaseStatus = "Connecting to Supabase shared storage";
    updateDataStoreStatus();
    await loadSharedState();
    startSharedStatePolling();
  } catch (error) {
    supabaseEnabled = false;
    supabaseStatus = `Supabase unavailable: ${error.message}`;
    updateDataStoreStatus();
  }
}

async function fetchRemoteUpdatedAt() {
  const { data, error } = await supabaseClient
    .from(SUPABASE_TABLE)
    .select("updated_at")
    .eq("id", SUPABASE_STATE_ID)
    .maybeSingle();

  if (error) throw error;
  return data?.updated_at || "";
}

async function fetchSharedState() {
  const { data, error } = await supabaseClient
    .from(SUPABASE_TABLE)
    .select("state, updated_at")
    .eq("id", SUPABASE_STATE_ID)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function loadSharedState(force = false) {
  if (!supabaseEnabled) return;

  const cachedRemoteUpdatedAt = readCachedRemoteUpdatedAt();
  const latestRemoteUpdatedAt = await fetchRemoteUpdatedAt();
  const hasLocalTasks = Array.isArray(state.tasks) && state.tasks.length > 0;

  if (!latestRemoteUpdatedAt) {
    await saveSharedStateNow();
    return;
  }

  if (!force && hasLocalTasks && cachedRemoteUpdatedAt && latestRemoteUpdatedAt === cachedRemoteUpdatedAt) {
    cacheRemoteUpdatedAt(latestRemoteUpdatedAt);
    supabaseStatus = `Supabase shared storage; synced ${formatDateTime(latestRemoteUpdatedAt)}`;
    updateDataStoreStatus();
    return;
  }

  const data = await fetchSharedState();

  if (!data?.state || !Array.isArray(data.state.tasks)) {
    cacheRemoteUpdatedAt(data?.updated_at || latestRemoteUpdatedAt);
    await saveSharedStateNow();
    return;
  }

  const originalStateJson = JSON.stringify(data.state);
  const remoteState = structuredClone(data.state);
  applyDataMigrations(remoteState);
  const selectedUserEmail = state.currentUser;
  applyingRemoteState = true;
  state = initializeState(remoteState);
  if (selectedUserEmail) state.currentUser = selectedUserEmail;
  cacheRemoteUpdatedAt(data.updated_at || latestRemoteUpdatedAt);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  supabaseStatus = `Supabase shared storage; synced ${formatDateTime(remoteUpdatedAt || state.lastSavedAt)}`;
  render();
  updateDataStoreStatus();
  applyingRemoteState = false;

  if (JSON.stringify(state) !== originalStateJson) {
    await saveSharedStateNow();
  }
}

function queueSharedStateSave() {
  if (!supabaseEnabled || applyingRemoteState) return;
  window.clearTimeout(supabaseSaveTimer);
  supabaseSaveTimer = window.setTimeout(() => {
    saveSharedStateNow();
  }, SUPABASE_SAVE_DELAY_MS);
}

async function saveSharedStateNow() {
  if (!supabaseEnabled) return;

  const payload = {
    id: SUPABASE_STATE_ID,
    state,
    updated_by: state.currentUser || "",
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabaseClient
    .from(SUPABASE_TABLE)
    .upsert(payload, { onConflict: "id" })
    .select("updated_at")
    .single();

  if (error) {
    supabaseStatus = `Supabase save failed: ${error.message}`;
    updateDataStoreStatus();
    return;
  }

  cacheRemoteUpdatedAt(data?.updated_at || payload.updated_at);
  supabaseStatus = `Supabase shared storage; saved ${formatDateTime(remoteUpdatedAt)}`;
  updateDataStoreStatus();
}

async function pollForSharedStateChanges() {
  if (!supabaseEnabled || applyingRemoteState) return;

  try {
    const latestRemoteUpdatedAt = await fetchRemoteUpdatedAt();
    if (!latestRemoteUpdatedAt || latestRemoteUpdatedAt === remoteUpdatedAt) return;
    await loadSharedState(true);
  } catch (error) {
    supabaseStatus = `Supabase sync check failed: ${error.message}`;
    updateDataStoreStatus();
  }
}

function startSharedStatePolling() {
  if (!supabaseEnabled || supabaseSyncTimer) return;
  supabaseSyncTimer = window.setInterval(() => {
    pollForSharedStateChanges();
  }, SUPABASE_SYNC_POLL_MS);
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
  const locationLabel = supabaseEnabled ? supabaseStatus : `${fallbackLabel}; ${supabaseStatus}`;
  dataStoreStatus.textContent = `${locationLabel}; local backup ${formatDateTime(state.lastSavedAt)}`;
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;
  const priority = priorityFilter.value;
  const category = categoryFilter.value;

  const filtered = state.tasks.filter(task => {
    const haystack = Object.values(task).join(" ").toLowerCase();
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
  userSelect.value = state.currentUser || "";
  updateTaskLabelControls();
}

function renderPatrickWatch() {
  const isDeric = state.currentUser === DERIC_EMAIL;
  patrickWatchPanel.hidden = !isDeric;
  if (!isDeric) return;

  setPanelCollapsed(
    patrickWatchPanel,
    patrickWatchContent,
    togglePatrickWatchBtn,
    state.hiddenPanels.patrickWatch,
    "Patrick Change Watch"
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
    patrickWatchList.textContent = "No Patrick updates have been recorded yet.";
    return;
  }

  if (!visibleEntries.length) {
    patrickWatchList.textContent = currentView === "closed"
      ? "No closed Patrick changes yet."
      : currentView === "all"
        ? "No Patrick changes are available."
        : "No open Patrick changes right now.";
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
    empty.textContent = "No running notes have been saved yet.";
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
        <p>Only document metadata is kept in Supabase to reduce bandwidth use.</p>
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
    alert("This document no longer has an openable PDF stored in Supabase.");
    return;
  }
  alert(`Open this PDF from its saved path instead:\n${savedDocument.path}`);
}

function savePdfDocument(file) {
  alert("PDF uploads to Supabase have been disabled to reduce egress. Keep only file metadata or a shared file path outside tracker_state.");
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
  if (category.startsWith("Job -") || category === "Income" || category === "Cash") return "Jobs and Income";
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
  setPanelHidden(
    budgetPanel,
    budgetPanelContent,
    toggleBillsBtn,
    state.hiddenPanels.bills,
    "Monthly Bills"
  );
  setPanelHidden(
    lifeAdminPanel,
    lifeAdminPanelContent,
    toggleLifeAdminBtn,
    state.hiddenPanels.lifeAdmin,
    "Patrick To-Do Notes"
  );
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
  billMonthInput.value = state.billMonth || defaultBillMonth();
  billList.innerHTML = "";

  state.bills.forEach(bill => {
    const row = document.createElement("tr");
    row.dataset.billId = bill.id;
    row.innerHTML = `
      <td><input class="bill-name" value="${escapeAttribute(bill.name)}" aria-label="Bill name"></td>
      <td><input class="bill-amount" type="number" min="0" step="0.01" value="${normalizeMoney(bill.amount)}" aria-label="Bill amount"></td>
      <td><input class="bill-due" type="date" value="${escapeAttribute(bill.due)}" aria-label="Bill due date"></td>
      <td>
        <select class="bill-status" aria-label="Bill status">
          ${billStatusOptions.map(status => `<option${status === bill.status ? " selected" : ""}>${escapeHtml(status)}</option>`).join("")}
        </select>
      </td>
      <td><input class="bill-notes" value="${escapeAttribute(bill.notes)}" aria-label="Bill notes"></td>
      <td><button type="button" class="icon-button delete-bill" aria-label="Delete bill">x</button></td>
    `;

    row.querySelectorAll("input, select").forEach(input => {
      input.addEventListener("change", () => updateBillFromRow(row));
    });
    row.querySelector(".delete-bill").addEventListener("click", () => deleteBill(bill.id));
    billList.appendChild(row);
  });

  updateBillTotals();
}

function buildBillChangeSummary(before, after) {
  const changes = [];
  if ((before.name || "") !== (after.name || "")) changes.push(`Name changed from ${before.name || "Untitled"} to ${after.name || "Untitled"}`);
  if (normalizeMoney(before.amount) !== normalizeMoney(after.amount)) changes.push(`Amount changed from ${formatCurrency(before.amount)} to ${formatCurrency(after.amount)}`);
  if ((before.due || "") !== (after.due || "")) changes.push(`Due date changed from ${before.due || "No due date"} to ${after.due || "No due date"}`);
  if ((before.status || "") !== (after.status || "")) changes.push(`Status changed from ${before.status || "N/A"} to ${after.status || "N/A"}`);
  if ((before.notes || "") !== (after.notes || "")) changes.push("Notes updated");
  return summarizeLines(changes, "Monthly bill updated");
}

function updateBillFromRow(row) {
  const bill = state.bills.find(item => item.id === row.dataset.billId);
  if (!bill) return;
  if (!ensureCurrentUser("update a monthly bill")) return;
  const before = { ...bill };
  bill.name = row.querySelector(".bill-name").value.trim();
  bill.amount = normalizeMoney(row.querySelector(".bill-amount").value);
  bill.due = row.querySelector(".bill-due").value;
  bill.status = row.querySelector(".bill-status").value;
  bill.notes = row.querySelector(".bill-notes").value.trim();
  const summary = buildBillChangeSummary(before, bill);
  if (summary !== "Monthly bill updated" || JSON.stringify(before) !== JSON.stringify(bill)) {
    recordHistoryEntry({
      itemType: "bill",
      itemId: bill.id,
      title: historyTitleFor("bill", bill.name || before.name || "Untitled bill"),
      summary,
      status: bill.status || "N/A",
      percent: percentFromBillStatus(bill.status)
    });
  }
  saveState();
  updateBillTotals();
}

function updateBillTotals() {
  const total = state.bills.reduce((sum, bill) => sum + normalizeMoney(bill.amount), 0);
  const paid = state.bills
    .filter(bill => bill.status === "Paid")
    .reduce((sum, bill) => sum + normalizeMoney(bill.amount), 0);
  const remaining = Math.max(0, total - paid);
  const pastDue = state.bills.filter(bill => isBillPastDue(bill)).length;

  billTotal.textContent = formatCurrency(total);
  billPaid.textContent = formatCurrency(paid);
  billRemaining.textContent = formatCurrency(remaining);
  billPastDue.textContent = pastDue;
}

function isBillPastDue(bill) {
  return Boolean(bill.due && bill.status !== "Paid" && bill.status !== "Deferred" && bill.due < getTodayIsoDate());
}

function deleteBill(id) {
  const bill = state.bills.find(item => item.id === id);
  if (!ensureCurrentUser("delete a monthly bill")) return;
  if (!bill || !confirm(`Delete "${bill.name || "this bill"}"?`)) return;
  recordHistoryEntry({
    itemType: "bill",
    itemId: bill.id,
    title: historyTitleFor("bill", bill.name || "Untitled bill"),
    summary: `Monthly bill deleted${bill.amount ? ` for ${formatCurrency(bill.amount)}` : ""}`,
    status: "Deleted",
    percent: 0
  });
  state.bills = state.bills.filter(item => item.id !== id);
  saveState();
  renderBills();
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
    const tag = document.createElement("span");
    tag.className = `change-tag${task.tagTone === "purple" ? " change-tag-purple" : ""}`;
    tag.textContent = task.tag;
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

  const medicationSummary = isMedicationGridTask(task)
    ? createMedicationSummary(task)
    : null;

  const commentBox = createInlineCommentBox(task);

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
  if (medicationSummary) card.appendChild(medicationSummary);
  card.append(commentBox, footer);
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
      commentHistory.appendChild(createCommentHistoryItem(comment));
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

function createCommentHistoryItem(comment) {
  const item = document.createElement("article");
  item.className = "task-comment-history-item";
  item.innerHTML = `
    <strong>${escapeHtml(comment.authorName || "Unknown user")}</strong>
    <span>${escapeHtml(formatDateTime(comment.createdAt))}</span>
    <p>${escapeHtml(comment.text || "")}</p>
  `;
  return item;
}

function openCommentHistoryDialog(taskId) {
  const task = state.tasks.find(entry => entry.id === taskId);
  if (!task || !commentHistoryDialog || !commentHistoryTitle || !commentHistoryList) return;

  commentHistoryTitle.textContent = `${task.title || "Task"} Comments`;
  commentHistoryList.innerHTML = "";

  if (Array.isArray(task.comments) && task.comments.length) {
    task.comments.slice().reverse().forEach(comment => {
      commentHistoryList.appendChild(createCommentHistoryItem(comment));
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

function updateAccountGatePinVisibility() {
  const needsPin = accountGateSelect.value === DERIC_EMAIL;
  accountGatePinWrap.hidden = !needsPin;
  if (!needsPin) accountGatePin.value = "";
}

function openAccountGateDialog() {
  accountGateDialog.hidden = false;
  accountGateDialog.setAttribute("open", "open");
  accountGateDialog.style.display = "block";
}

function closeAccountGateDialog() {
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

function recordUpdate(task, summary) {
  recordHistoryEntry({
    itemType: "task",
    itemId: task.id,
    taskId: task.id,
    title: task.title,
    summary,
    percent: task.percent,
    status: task.status
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
      <p>This report is built from Patrick's tracked Supabase history for today and highlights every captured change plus the items he marked done.</p>
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
    "Patrick Glanville Support Tracker - Urgency Report",
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
    <footer class="footer">Prepared from the Patrick Glanville Support Tracker. Save this file in the local Email folder and use Send-RichUrgencyReport.ps1 to create a rich Outlook email.</footer>
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
  <title>Patrick Change Report</title>
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
      <h1>Patrick Change Report</h1>
      <p>Generated ${escapeHtml(generated)} | Report date ${escapeHtml(getTodayIsoDate())}</p>
    </header>
    <section class="content">
      <p class="notice"><strong>Source:</strong> This report is based on Patrick's tracker history captured in Supabase for the current day, including all changes and any items he marked done.</p>
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
    <footer class="footer">Prepared from the Patrick Glanville Support Tracker and intended for the local Email folder archive workflow.</footer>
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
  state.billMonth = billMonthInput.value || defaultBillMonth();
  saveState();
});
document.querySelector("#addBillBtn").addEventListener("click", () => {
  if (!ensureCurrentUser("add a bill")) return;
  const newBill = {
    id: crypto.randomUUID(),
    name: "",
    amount: 0,
    due: "",
    status: "Unpaid",
    notes: ""
  };
  state.bills.push(newBill);
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
  state = initializeState(structuredClone(seedData));
  if (selectedUserEmail) state.currentUser = selectedUserEmail;
  saveState();
  render();
});
document.querySelector("#refreshAppBtn").addEventListener("click", () => {
  const url = new URL(window.location.href);
  url.searchParams.set("refresh", Date.now().toString());
  window.location.href = url.toString();
});

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

populateUsers();
populateCategories();
render();
closeAccountGateDialog();
updateSyncStatus();
initializeSharedDataSource();
