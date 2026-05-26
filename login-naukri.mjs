import { stealthPersistent } from './stealth-browser.mjs';
import path from 'path';

const PROFILE_PATH = path.resolve('data/naukri-profile');

(async () => {
  console.log('🚀 Launching stealth browser for Naukri Login...');
  const browser = await stealthPersistent(PROFILE_PATH, {
    headless: false,
    viewport: { width: 1280, height: 900 },
    args: ['--start-maximized'],
  });

  const page = await browser.newPage();
  await page.goto('https://www.naukri.com/nlogin/login');
  
  console.log('====================================================');
  console.log('✅ BROWSER OPENED ON YOUR SCREEN!');
  console.log('👉 Please log into Naukri using the Chrome window.');
  console.log('⏳ Waiting for you to log in...');
  console.log('====================================================');

  // Loop checking for successful login
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(3000);
    const loggedIn = await page.evaluate(() => {
      // Look for profile indicators or redirect to homepage
      return !!document.querySelector('.nI-gNb-lcm-lnk, .user-name, [class*="loggedIn"], [class*="logged-in"]') || 
             document.location.pathname === '/mnjuser/homepage';
    }).catch(() => false);
    
    if (loggedIn) {
      console.log('✅ Login detected! Saving session...');
      await page.waitForTimeout(2000); // Give it a moment to save cookies
      await browser.close();
      console.log('✅ Session saved successfully!');
      process.exit(0);
    }
  }

  console.log('⏳ Time out. Closing browser...');
  await browser.close();
  process.exit(1);
})();
