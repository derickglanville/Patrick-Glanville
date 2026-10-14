const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('C:/Users/deric/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const root = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href, { waitUntil: 'load' });
    errors.length = 0;
    await page.evaluate(() => {
      const preview = document.createElement('div');
      preview.className = 'home-oil-dialog';
      preview.innerHTML = oilInvestmentView({ deliveries: window.HOME_HEATING_OIL_HISTORY, investment: {} });
      document.body.append(preview);
    });
    const view = page.locator('.oil-investment');
    const content = await view.innerText();
    assert.match(content, /Siding, windows and insulation/);
    assert.match(content, /121\.1/);
    assert.match(content, /107\.6/);
    assert.match(content, /11\.1% lower oil \/ HDD/);
    assert.match(content, /5,240 HDD/);
    assert.match(content, /Not reached/);
    assert.equal(await view.locator('.oil-investment-table').count(), 2);
    assert.equal(await view.locator('.oil-investment-table').last().locator('tbody tr').count(), 15);
    assert.match(content, /cooling savings cannot be calculated/i);
    const scenarioCheck = await page.evaluate(() => {
      const analysis = oilInvestmentAnalysis(window.HOME_HEATING_OIL_HISTORY, window.HOME_OIL_WEATHER, '2026-10-14');
      const central = oilInvestmentProjection(analysis, oilInvestmentInputs({ scenario: 'central' }));
      const conservative = oilInvestmentProjection(analysis, oilInvestmentInputs({ scenario: 'conservative' }));
      return {
        historicalSame: central.rows.slice(0, 4).every((row, index) => row.oil === conservative.rows[index].oil),
        conservativeFutureZero: conservative.rows.slice(4).every(row => row.oil === 0),
        centralFuturePositive: central.rows.slice(4).every(row => row.oil > 0),
        negativeSeasonPreserved: central.rows[1].oil < 0
      };
    });
    assert.deepEqual(scenarioCheck, { historicalSame: true, conservativeFutureZero: true, centralFuturePositive: true, negativeSeasonPreserved: true });
    assert.deepEqual(errors, []);
    if (process.env.OIL_INVESTMENT_SCREENSHOT) await view.screenshot({ path: process.env.OIL_INVESTMENT_SCREENSHOT });
    console.log('PASS: weather-normalized oil history and 15-year investment view render without page errors.');
  } finally {
    await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 5000))]);
  }
})().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
