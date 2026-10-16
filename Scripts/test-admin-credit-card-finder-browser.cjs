const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('C:/Users/deric/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    await page.goto(pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href, { waitUntil: 'load' });
    const result = await page.evaluate(() => {
      state.bills = [{
        id: 'test-card', name: 'Test Card', type: 'Credit Card', status: 'Open',
        amount: 100, previousBalance: 600, currentBalance: 500,
        creditLimit: 3000, apr: '19.9%'
      }];
      state.monthlyBudgetFund = 1500;
      const comparison = getAdminCreditCardCandidates(420.55);
      renderAdminCreditCardFinderResults(420.55);
      return {
        cashAvailable: comparison.cashAvailable,
        cardCharge: comparison.cardCharge,
        candidateCount: comparison.candidates.length,
        rowCount: document.querySelectorAll('.admin-credit-card-finder-table tbody tr').length,
        text: document.querySelector('#adminCreditCardFinderBody').textContent
      };
    });
    assert.ok(result.cashAvailable >= 420.55);
    assert.equal(result.cardCharge, 420.55);
    assert.equal(result.candidateCount, 1);
    assert.equal(result.rowCount, 1);
    assert.match(result.text, /Cash alternative/);
    assert.match(result.text, /full \$420\.55 charge/);
    console.log('PASS: available cash does not hide full-charge credit options.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
