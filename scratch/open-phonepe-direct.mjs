import { chromium } from 'playwright';

async function main() {
  console.log('🚀 Opening PhonePe direct careers page (Greenhouse)...');

  // Open a fresh browser (no persistent session needed — Greenhouse is public)
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  // Direct Greenhouse board for PhonePe
  const url = 'https://boards.greenhouse.io/phonepe';
  console.log(`🔗 Navigating to: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  console.log('\n==================================================================');
  console.log('👉 BROWSER WINDOW IS OPEN — PhonePe Careers (Greenhouse)');
  console.log('📌 This is the OFFICIAL PhonePe job board.');
  console.log('1. Browse the open roles (use Ctrl+F to search for UI / Frontend).');
  console.log('2. Click the role you want to apply for.');
  console.log('3. Fill in the application form and submit.');
  console.log('4. Close the browser window when done.');
  console.log('==================================================================\n');

  // Keep browser open until user closes it
  await page.waitForEvent('close', { timeout: 0 }).catch(() => {});
  await browser.close();
  console.log('✅ Browser closed. Done!');
}

main();
