const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('C:/Users/deric/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const root = path.resolve(__dirname, '..');
const pin = fs.readFileSync(path.join(root, 'app.js'), 'utf8').match(/const ADMIN_CLIENT_ACCESS_PIN = "([^"]+)"/)?.[1];
if (!pin) throw new Error('Admin access code not found');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
    await page.route(/^https?:\/\//, route => route.abort());
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href, { waitUntil: 'domcontentloaded' });
    await page.locator('#topClientSelect').selectOption('admin');
    await page.locator('#topClientPin').fill(pin);
    await page.locator('#adminNotesRemindersBtn').click();
    await page.locator('#adminNotesRemindersDialog').waitFor({ state: 'visible' });
    assert.match(await page.locator('#adminNotesRemindersBody').innerText(), /Amex case GC-01CT4S9/);
    assert.match(await page.locator('#adminNotesRemindersBody').innerText(), /Meeting with Vanguard/);
    assert.equal(await page.locator('.gather-notes-item').count(), 2);
    if (process.env.NOTES_SCREENSHOT) await page.locator('#adminNotesRemindersDialog').screenshot({ path: process.env.NOTES_SCREENSHOT });
    await page.locator('[data-notes-view="all"]').click();
    await page.locator('.gather-notes-item').filter({ hasText: 'Meeting with Vanguard' }).click();
    assert.equal(await page.locator('.admin-note-title').inputValue(), 'Meeting with Vanguard');
    await page.locator('.admin-note-representative').fill('Test contact');
    await page.locator('.gather-notes-save').click();
    assert.equal(await page.locator('.admin-note-representative').inputValue(), 'Test contact');
    await page.locator('#addAdminNotesReminderBtn').click();
    await page.locator('.admin-note-title').fill('Temporary test note');
    await page.locator('.gather-notes-save').click();
    assert.match(await page.locator('.gather-notes-list').innerText(), /Temporary test note/);
    page.once('dialog', dialog => dialog.accept());
    await page.locator('.gather-notes-delete').click();
    assert.doesNotMatch(await page.locator('.gather-notes-list').innerText(), /Temporary test note/);
    if (process.env.NOTES_MOBILE_SCREENSHOT) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('#adminNotesRemindersDialog').screenshot({ path: process.env.NOTES_MOBILE_SCREENSHOT });
    }
    assert.deepEqual(errors, []);
    process.stdout.write('PASS: Notes dialog overview, navigation, selection, update, add and delete.\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
