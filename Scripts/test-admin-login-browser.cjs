const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('C:/Users/deric/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const pin = source.match(/const ADMIN_CLIENT_ACCESS_PIN = "([^"]+)"/)?.[1];
if (!pin) throw new Error('Admin access code was not found in the app source.');
const backupPath = path.join(root, 'admin-firebase-backup.json');
const backup = fs.existsSync(backupPath) ? JSON.parse(fs.readFileSync(backupPath, 'utf8')) : null;

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const scenario of ['fresh', ...(backup ? ['backup'] : [])]) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.stack || error.message));
      if (scenario === 'backup') {
        await page.addInitScript(state => {
          localStorage.setItem('admin-glanville-support-tracker-v1', JSON.stringify(state));
        }, backup.state || backup);
      }
      await page.goto(pathToFileURL(path.join(root, 'index.html')).href, { waitUntil: 'domcontentloaded' });
      await page.locator('#topClientSelect').selectOption('admin');
      await page.locator('#topClientPin').fill(pin);
      await page.waitForTimeout(800);
      const result = await page.evaluate(() => ({
        selector: document.querySelector('#topClientSelect')?.value,
        title: document.querySelector('#appEyebrow')?.textContent,
        header: document.querySelector('#clientSwitchBtn')?.textContent,
        bootStage: window.__appBootStage,
        bootError: window.__appBootError,
        pinVisible: !document.querySelector('#topClientPin')?.hidden
      }));
      assert.match(result.title || '', /Admin/);
      assert.equal(result.header, 'Client: Admin');
      assert.equal(result.pinVisible, false);
      assert.deepEqual(errors, []);
      await page.locator('#adminNotesRemindersBtn').click();
      await page.locator('#adminNotesRemindersDialog').waitFor({ state: 'visible' });
      assert.match(await page.locator('#adminNotesRemindersBody').innerText(), /Amex case GC-01CT4S9/);
      assert.match(await page.locator('#adminNotesRemindersBody').innerText(), /Meeting with Vanguard/);
      process.stdout.write(`${scenario}: ${JSON.stringify({ ...result, errors: errors.slice(0, 5) })}\n`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
