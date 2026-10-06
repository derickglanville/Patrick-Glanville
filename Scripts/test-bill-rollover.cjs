const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const source = fs.readFileSync('app.js', 'utf8');

function extract(name) {
  const start = source.search(new RegExp(`function ${name}\\(`));
  assert.notEqual(start, -1, `Could not find ${name}`);
  const rest = source.slice(start);
  const end = rest.slice(1).search(/\nfunction /);
  return end < 0 ? rest : rest.slice(0, end + 1);
}

const context = {
  activeClientId: 'admin',
  normalizeMoney: value => Math.round((Number(value) || 0) * 100) / 100,
  normalizeBillDateLike: value => value || '',
  moveDateToTargetMonth: (value, month) => value ? `${month}-${String(value).slice(-2)}` : '',
  normalizeBill: bill => ({ ...bill, observation: String(bill.observation || '').trim().slice(0, 500) }),
  dedupeBudgetBills: bills => bills,
};
vm.createContext(context);
vm.runInContext([
  extract('isPatrickEyeGlassesBill'),
  extract('buildRolledForwardBills'),
].join('\n'), context);

const sourceBill = {
  name: 'Apple Card',
  currentBalance: 4348.88,
  previousBalance: 4200,
  creditLimit: 10000,
  amount: 250,
  due: '2026-08-31',
  status: 'Paid',
  paidAmount: 250,
  proposedAmount: 2000,
  paidDate: '2026-08-30',
  transactionNumber: 'abc',
  observation: 'Statement balance verified',
};
const [nextBill] = context.buildRolledForwardBills([sourceBill], '2026-09');
assert.equal(nextBill.previousBalance, 4348.88);
assert.equal(nextBill.currentBalance, 4348.88);
assert.equal(nextBill.status, 'Unpaid');
assert.equal(nextBill.paidAmount, 0);
assert.equal(nextBill.proposedAmount, 0);
assert.equal(nextBill.paidDate, '');
assert.equal(nextBill.transactionNumber, '');
assert.equal(nextBill.due, '2026-09-31');
assert.equal(nextBill.observation, 'Statement balance verified');

assert.match(source, /targetEntry\.bills = buildRolledForwardBills\(sourceEntry\.bills, targetMonth\);/);
assert.match(source, /class="bill-observation"/);
assert.match(source, /bill-col-observation/);
assert.match(fs.readFileSync('index.html', 'utf8'), />Observation<\/span>\s*<span>Actions<\/span>/);
const styles = fs.readFileSync('styles.css', 'utf8');
assert.match(styles, /"selector observation observation observation"/);
assert.match(styles, /minmax\(96px, \.58fr\)\s+minmax\(142px, \.82fr\)/);
assert.match(source, /Expected Paid Off Date": "Estimate based on Current Balance, APR, and a fixed monthly Recommended amount/);
assert.match(source, /function applyBillHeaderTooltips\(header\)/);
assert.match(source, /getExpectedBillPayoff\(bill, getEffectiveBillAmount\(bill\), "Due Amt"\)/);
assert.match(source, /bill-col-payoff-date-due/);
assert.match(styles, /\.budget-bill-item input\.bill-payoff-date-due\[data-payoff-year\]/);
assert.match(fs.readFileSync('index.html', 'utf8'), /id="balanceProgressReportBtn"[^>]*>Balance Progress/);
assert.match(source, /const ADMIN_BALANCE_PROGRESS_BILL_ORDER = \[/);
assert.match(source, /getMonthlyBillReportEntries\(\)\s*\.filter\(entry => entry\.month <= selectedMonth\)\s*\.slice\(-4\)/);
assert.match(source, /Start = 100/);
assert.match(source, /const minIndex = 78;/);
assert.match(source, /const maxIndex = 150;/);
assert.match(source, /const directLabels = endpointLabels\.map/);
assert.match(source, /Above 100: \$\{aboveStart\}/);
assert.match(source, /Below 100: \$\{improved\}/);

const totalsContext = {
  normalizeMoney: value => Math.round((Number(value) || 0) * 100) / 100,
  getEffectiveBillAmount: bill => Number(bill.amount) || 0,
  isBillPastDue: () => false,
  isBillPayoffComplete: bill => ['Paid Off', 'Fully Paid'].includes(bill.status),
};
vm.createContext(totalsContext);
vm.runInContext(extract('calculateBudgetTotals'), totalsContext);
const totals = totalsContext.calculateBudgetTotals(5000, [{ amount: 3472.99, status: 'Paid' }], 1000);
assert.equal(totals.cashUsed, 1000);
assert.equal(totals.cashFlow, 527.01);
const settledTotals = totalsContext.calculateBudgetTotals(5000, [
  { amount: 3392.99, status: 'Paid' },
  { amount: 80, status: 'Paid Off', currentBalance: 0 },
], 1000);
assert.equal(settledTotals.totalBills, 3392.99);
assert.equal(settledTotals.remainingBills, 0);
class FixedDate extends Date {
  constructor(...args) {
    super(...(args.length ? args : ['2026-10-01T12:00:00']));
  }
}
const upcomingContext = {
  Date: FixedDate,
  isBillPayoffComplete: bill => ['Paid Off', 'Fully Paid'].includes(bill.status),
};
vm.createContext(upcomingContext);
vm.runInContext(extract('getBillsDueWithinDays'), upcomingContext);
const upcomingBills = upcomingContext.getBillsDueWithinDays([
  { name: "BJ's Club", due: '2026-10-02', status: 'Paid Off', currentBalance: 0 },
  { name: 'Active bill', due: '2026-10-03', status: 'Unpaid', currentBalance: 80 },
], 7);
assert.equal(upcomingBills.length, 1);
assert.equal(upcomingBills[0].bill.name, 'Active bill');
assert.match(source, /const cardCharge = normalizeMoney\(Math\.max\(0, charge - cashAvailable\)\);/);
assert.match(source, /calculateBudgetTotals\(state\.monthlyBudgetFund, state\.bills, getCurrentMonthlyCashUsed\(\)\)/);
assert.match(source, /Scheduled bill amounts not yet marked Paid: \$\{formatCurrency\(remaining\)\}/);
assert.match(source, /unpaidScheduledBills\.join\("\\n"\)/);
assert.match(fs.readFileSync('index.html', 'utf8'), /<span>Not marked Paid<\/span>/);
assert.match(fs.readFileSync('index.html', 'utf8'), /id="billPaidPercent">0% paid/);
assert.match(fs.readFileSync('index.html', 'utf8'), /id="billRemainingPercent">100% remaining/);
assert.doesNotMatch(fs.readFileSync('index.html', 'utf8'), /optional-section-controls/);
assert.match(fs.readFileSync('index.html', 'utf8'), /id="hideBillsBtn"[^>]*>Hide Monthly Bills/);
assert.match(source, /const toggleBillsBtn = document\.querySelector\("#hideBillsBtn"\);/);
assert.match(source, /const billPaidPercent = billTotals\.totalBills > 0/);
assert.match(source, /progressFill"\)\.style\.width = `\$\{billPaidPercent\}%`/);

const proposedPreviewContext = {
  state: { bills: [{ id: 'citi-money', currentBalance: 3887.53, amount: 180, proposedAmount: 1000 }] },
  isAdminBillSimulationActive: () => false,
  isAdminProposedPreviewActive: () => true,
  normalizeMoney: value => Math.round((Number(value) || 0) * 100) / 100,
  getEffectiveBillCurrentBalance: bill => Number(bill.proposedCurrentBalance ?? bill.currentBalance) || 0,
};
vm.createContext(proposedPreviewContext);
vm.runInContext(extract('getBillsForCurrentDisplay'), proposedPreviewContext);
const [proposedPreviewBill] = proposedPreviewContext.getBillsForCurrentDisplay();
assert.equal(proposedPreviewBill.proposedCurrentBalance, 2887.53);
assert.equal(proposedPreviewBill.amount, 180, 'a proposed cash reduction must not reduce the scheduled Due Amt');
assert.equal(proposedPreviewBill.proposedDueAmount, undefined);
assert.match(source, /getBillsForCurrentDisplay\(\{ includeProposedPreview: false \}\)/);
assert.match(source, /row\.addEventListener\("dblclick", event => \{/);
vm.runInContext([
  extract('getEffectiveBillPreviousBalance'),
  extract('getEffectiveBillInterestBalance'),
].join('\n'), proposedPreviewContext);
assert.equal(proposedPreviewContext.getEffectiveBillInterestBalance(proposedPreviewBill), 2887.53);

const observationContext = {
  state: {
    billMonth: '2026-09',
    monthlyBudgets: {
      '2026-07': { bills: [{ templateKey: 'apple-card', name: 'Apple Card', currentBalance: 4500 }] },
      '2026-08': { bills: [{ templateKey: 'apple-card', name: 'Apple Card', currentBalance: 4348.88 }] },
      '2026-09': { bills: [{ templateKey: 'apple-card', name: 'Apple Card', currentBalance: 4197.93 }] },
    },
  },
  defaultBillMonth: () => '2026-09',
  buildBudgetBillTemplateKey: name => String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  normalizeBill: bill => ({ ...bill }),
  normalizeMoney: value => Math.round((Number(value) || 0) * 100) / 100,
  formatCurrency: value => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  formatBudgetMonthLabel: month => month,
};
vm.createContext(observationContext);
vm.runInContext(extract('getBillCurrentBalanceObservation'), observationContext);
const observation = observationContext.getBillCurrentBalanceObservation({ templateKey: 'apple-card', name: 'Apple Card' });
assert.equal(observation.value, '$4,197.93 / $4,348.88 / $4,500.00');
assert.match(observation.title, /newest first/);
assert.match(observation.title, /Apple Card/);
assert.match(observation.title, /\n2026-09: \$4,197\.93\n2026-08: \$4,348\.88/);

console.log('PASS: Admin future-month creation and Copy To Next Month use the prior closing balance for both balance fields, reset payment details, render the Observation column with the three latest validated balances, and account for monthly cash used in cash flow and Card Finder.');
