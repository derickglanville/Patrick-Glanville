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
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href, { waitUntil: 'domcontentloaded' });
    await page.locator('#topClientSelect').selectOption('admin');
    await page.locator('#topClientPin').fill(pin);
    await page.locator('#cellphoneBillingHistoryBtn').click();
    await page.locator('[data-cellphone-review-tab="att"]').click();
    console.log('AT&T tab opened');
    const note = page.locator('.att-cancellation-notes');
    assert.match(await note.innerText(), /\$542\.74/);
    assert.match(await note.innerText(), /\$416\.70/);
    assert.match(await note.innerText(), /\$126\.04/);
    assert.equal(await note.locator('tbody tr').count(), 6);
    const returns = page.locator('.att-phone-returns');
    assert.match(await returns.innerText(), /3 rejected \/ 2 awaiting/);
    assert.equal(await returns.locator('[data-att-phone-id]').count(), 5);
    assert.equal(await returns.locator('#attPhoneCallReference').inputValue(), '9979-153');
    assert.equal(await returns.locator('[data-att-phone-id="att-phone-1"] .att-phone-shipment').inputValue(), '878520416564');
    await returns.locator('[data-att-phone-id="att-phone-4"] .att-phone-shipment').fill('TEST123');
    await returns.locator('#saveAttPhoneReturnsBtn').click();
    console.log('Phone tracking saved');

    await note.locator('#addAttCancellationTransactionBtn').click();
    await note.locator('#attTransactionDate').fill('2026-10-15');
    await note.locator('#attTransactionType').selectOption('credit');
    await note.locator('#attTransactionAmount').fill('5.00');
    await note.locator('#attTransactionDescription').fill('Test credit');
    await note.locator('button[type="submit"]').click();
    console.log('Transaction added');
    assert.match(await note.innerText(), /\$121\.04/);
    await note.locator('[data-att-transaction-edit]').last().click();
    await note.locator('#attTransactionAmount').fill('10.00');
    await note.locator('button[type="submit"]').click();
    assert.match(await note.innerText(), /\$116\.04/);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('#topClientSelect').selectOption('admin');
    await page.locator('#topClientPin').fill(pin);
    await page.locator('#cellphoneBillingHistoryBtn').click();
    await page.locator('[data-cellphone-review-tab="att"]').click();
    assert.match(await note.innerText(), /\$116\.04/);
    assert.equal(await returns.locator('[data-att-phone-id="att-phone-4"] .att-phone-shipment').inputValue(), 'TEST123');
    page.once('dialog', dialog => dialog.accept());
    await note.locator('[data-att-transaction-delete]').last().click();
    assert.match(await note.innerText(), /\$126\.04/);
    assert.equal(await note.locator('tbody tr').count(), 6);
    assert.deepEqual(errors, []);
    await context.close();
    console.log('PASS: AT&T ledger starts with the revised bank entries and add, update, delete recalculate the net.');
  } finally {
    await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 5000))]);
  }
})().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
