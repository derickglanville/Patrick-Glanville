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
  paidDate: '2026-08-30',
  transactionNumber: 'abc',
  observation: 'Statement balance verified',
};
const [nextBill] = context.buildRolledForwardBills([sourceBill], '2026-09');
assert.equal(nextBill.previousBalance, 4348.88);
assert.equal(nextBill.currentBalance, 4348.88);
assert.equal(nextBill.status, 'Unpaid');
assert.equal(nextBill.paidAmount, 0);
assert.equal(nextBill.paidDate, '');
assert.equal(nextBill.transactionNumber, '');
assert.equal(nextBill.due, '2026-09-31');
assert.equal(nextBill.observation, 'Statement balance verified');

assert.match(source, /targetEntry\.bills = buildRolledForwardBills\(sourceEntry\.bills, targetMonth\);/);
assert.match(source, /class="bill-observation"/);
assert.match(source, /bill-col-observation/);
assert.match(fs.readFileSync('index.html', 'utf8'), />Observation<\/span>\s*<span>Actions<\/span>/);
assert.match(fs.readFileSync('styles.css', 'utf8'), /"selector observation observation observation"/);

console.log('PASS: Admin future-month creation and Copy To Next Month use the prior closing balance for both balance fields, reset payment details, preserve observations, and render the Observation column.');
