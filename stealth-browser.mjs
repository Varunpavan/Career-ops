// stealth-browser.mjs
// Drops in as a replacement for plain chromium.launch() / launchPersistentContext()
// Uses playwright-extra + puppeteer-extra-plugin-stealth to mask 30+ bot signals.
//
// HOW TO INSTALL (run once):
//   npm install playwright-extra puppeteer-extra-plugin-stealth
//
// HOW TO USE in any script:
//   import { stealthLaunch, stealthPersistent } from './stealth-browser.mjs';
//
//   // Instead of: chromium.launch({ headless: false })
//   const browser = await stealthLaunch({ headless: false });
//
//   // Instead of: chromium.launchPersistentContext(profilePath, { headless: false })
//   const ctx = await stealthPersistent(profilePath, { headless: false });

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// ── Detect stealth availability ──────────────────────────────────────────────

let stealthAvailable = false;
let chromiumExtra = null;
let StealthPlugin = null;

try {
  const playwrightExtra = require('playwright-extra');
  StealthPlugin = require('puppeteer-extra-plugin-stealth');
  chromiumExtra = playwrightExtra.chromium;
  chromiumExtra.use(StealthPlugin());
  stealthAvailable = true;
  console.log('🛡️  Stealth mode: ACTIVE (playwright-extra loaded)');
} catch {
  // Fallback to plain playwright if stealth package not installed yet
  const { chromium } = await import('playwright');
  chromiumExtra = chromium;
  console.warn('⚠️  Stealth mode: INACTIVE — run: npm install playwright-extra puppeteer-extra-plugin-stealth');
  console.warn('   Falling back to plain Playwright (bot detection may trigger)');
}

// ── Shared launch args — hides automation signals even without stealth ────────

const BASE_ARGS = [
  '--disable-blink-features=AutomationControlled',  // removes navigator.webdriver
  '--disable-features=IsolateOrigins,site-per-process',
  '--disable-site-isolation-trials',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-dev-shm-usage',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  // Note: NOT adding --no-sandbox here — it's a dead giveaway on Linux
];

const BASE_CONTEXT = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  viewport: { width: 1280, height: 900 },
  locale: 'en-IN',
  timezoneId: 'Asia/Kolkata',
  geolocation: { latitude: 17.3850, longitude: 78.4867 },  // Hyderabad coords
  permissions: ['geolocation'],
};

// ── stealthLaunch — replaces chromium.launch() ───────────────────────────────

export async function stealthLaunch(opts = {}) {
  const { headless = true, ...rest } = opts;

  const browser = await chromiumExtra.launch({
    headless,
    channel: 'chrome',    // use real Chrome, not bundled Chromium
    args: [...BASE_ARGS, ...(rest.args || [])],
    ...rest,
    args: undefined,      // already merged above
  });

  // Patch every new page with extra anti-detection JS
  browser.on('page', async (page) => {
    await patchPage(page).catch(() => {});
  });

  return browser;
}

// ── stealthPersistent — replaces chromium.launchPersistentContext() ──────────

export async function stealthPersistent(userDataDir, opts = {}) {
  const { headless = false, ...rest } = opts;

  const ctx = await chromiumExtra.launchPersistentContext(userDataDir, {
    headless,
    channel: 'chrome',
    args: [...BASE_ARGS, ...(rest.args || [])],
    ...BASE_CONTEXT,
    ...rest,
    args: undefined,
  });

  // Patch every new page with extra anti-detection JS
  ctx.on('page', async (page) => {
    await patchPage(page).catch(() => {});
  });

  // Also patch any pages already open
  for (const page of ctx.pages()) {
    await patchPage(page).catch(() => {});
  }

  return ctx;
}

// ── patchPage — injects JS overrides that stealth plugin might miss ───────────

async function patchPage(page) {
  await page.addInitScript(() => {
    // Remove navigator.webdriver
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

    // Fake plugins list (real Chrome has plugins)
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
        { name: 'Native Client', filename: 'internal-nacl-plugin' },
      ],
    });

    // Fake language settings
    Object.defineProperty(navigator, 'languages', { get: () => ['en-IN', 'en-US', 'en'] });

    // Chrome runtime should exist
    if (!window.chrome) {
      window.chrome = { runtime: {} };
    }

    // Permissions API — pretend we're a normal browser
    const originalQuery = window.navigator.permissions?.query;
    if (originalQuery) {
      window.navigator.permissions.query = (params) =>
        params.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(params);
    }
  });
}

export { stealthAvailable };

// ── CLI: quick test ───────────────────────────────────────────────────────────

const isMain = process.argv[1]?.endsWith('stealth-browser.mjs');

if (isMain) {
  (async () => {
    console.log('\n🧪 Testing stealth browser...');
    const browser = await stealthLaunch({ headless: true });
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('https://www.naukri.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const title = await page.title();
    console.log(`✅ Naukri loaded: "${title}"`);
    
    // Check if navigator.webdriver is hidden
    const webdriver = await page.evaluate(() => navigator.webdriver);
    console.log(`🛡️  navigator.webdriver: ${webdriver} (should be undefined/false)`);
    
    await browser.close();
    console.log('\n✅ Stealth browser test passed!');
    if (!stealthAvailable) {
      console.log('\n⚠️  Run "npm install playwright-extra puppeteer-extra-plugin-stealth" for full stealth mode.');
    }
  })().catch(err => {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  });
}
