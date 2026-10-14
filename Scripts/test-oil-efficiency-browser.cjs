const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('C:/Users/deric/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const root = path.resolve(__dirname, '..');
const pin = fs.readFileSync(path.join(root, 'app.js'), 'utf8').match(/const ADMIN_CLIENT_ACCESS_PIN = "([^"]+)"/)?.[1];

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href, { waitUntil: 'domcontentloaded' });
    await page.locator('#topClientSelect').selectOption('admin');
    await page.locator('#topClientPin').fill(pin);
    await page.locator('#homeHeatingOilBtn').click();
    await page.locator('[data-oil-tab="efficiency"]').click();
    const view = page.locator('.oil-efficiency');
    assert.match(await view.innerText(), /700 gal\/year/);
    assert.match(await view.innerText(), /617 gal\/year/);
    assert.match(await view.innerText(), /11\.9% fewer gallons delivered/);
    assert.match(await view.innerText(), /12\.8% lower/);
    assert.equal(await view.locator('.oil-efficiency-bar').count(), 11);
    assert.deepEqual(errors, []);
    if (process.env.OIL_EFFICIENCY_SCREENSHOT) await page.locator('#homeHeatingOilDialog').screenshot({ path: process.env.OIL_EFFICIENCY_SCREENSHOT });
    console.log('PASS: oil efficiency review compares complete pre/post years and heating seasons.');
  } finally {
    await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 5000))]);
  }
})().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
