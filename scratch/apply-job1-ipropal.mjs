import { chromium } from 'playwright';

async function main() {
  console.log('🚀 Opening Job #1: Ipropal (ALLPS) — Front End Developer (4.6/5)');

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: null,
    // Use stored session if available
  });

  const page = await context.newPage();

  const url = 'https://www.naukri.com/job-listings-front-end-developer-ipropal-allps-kolkata-mumbai-new-delhi-hyderabad-pune-chennai-bengaluru-0-to-2-years-010426505767';
  console.log(`🔗 Navigating to: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  console.log('\n════════════════════════════════════════════════════');
  console.log('📋 JOB #1: Ipropal (ALLPS) — Front End Developer');
  console.log('⭐ Score: 4.6/5 — APPLY IMMEDIATELY');
  console.log('📍 Locations: Kolkata, Mumbai, Delhi, Hyderabad, Pune, Chennai, Bengaluru');
  console.log('🎓 Experience: 0-2 years (FRESHER FRIENDLY)');
  console.log('💻 Stack: React.js, HTML, CSS, JavaScript, REST APIs, Git');
  console.log('════════════════════════════════════════════════════');
  console.log('👉 Steps:');
  console.log('  1. Click "Apply" button on the page');
  console.log('  2. If asked to login — you are already logged in');
  console.log('  3. Fill in any extra questions and SUBMIT');
  console.log('  4. After submitting, close this browser');
  console.log('════════════════════════════════════════════════════\n');

  // Keep browser open until user closes it
  await new Promise(resolve => {
    page.on('close', resolve);
    context.on('close', resolve);
    browser.on('disconnected', resolve);
  });

  console.log('✅ Browser closed. Moving to next job...');
  await browser.close().catch(() => {});
}

main().catch(console.error);
