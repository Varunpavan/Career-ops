import { chromium } from 'playwright';
import fs from 'fs';

async function main() {
  const userDataDir = './.naukri_user_data';
  console.log(`🚀 Launching browser with persistent context: ${userDataDir}...`);
  
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: null,
    args: ['--start-maximized']
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  try {
    console.log('🔗 Navigating to Naukri home page...');
    await page.goto('https://www.naukri.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    console.log('⏳ Waiting 5 seconds to let the page load...');
    await page.waitForTimeout(5000);
    
    const title = await page.title();
    const url = page.url();
    console.log('Page Title:', title);
    console.log('Current URL:', url);
    
    // Check if logged in by looking for typical profile indicators or logout button/text
    const loginStatus = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const isLoggedIn = bodyText.includes('View Profile') || 
                         bodyText.includes('My Naukri') || 
                         bodyText.includes('LOGOUT') ||
                         document.querySelector('.nI-gD-profile-icon-wrap') !== null ||
                         document.querySelector('a[href*="naukri.com/mnjuser/profile"]') !== null;
                         
      return {
        isLoggedIn,
        hasProfileIcon: document.querySelector('.nI-gD-profile-icon-wrap') !== null,
        hasProfileLink: document.querySelector('a[href*="naukri.com/mnjuser/profile"]') !== null
      };
    });
    
    console.log('🔍 Login Check Result:', loginStatus);
    
    // Save screenshot
    fs.mkdirSync('./output', { recursive: true });
    await page.screenshot({ path: 'output/naukri-login-check.png', fullPage: false });
    console.log('📸 Screenshot saved to output/naukri-login-check.png');
    
  } catch (err) {
    console.error('❌ Error checking Naukri login:', err);
  } finally {
    console.log('👋 Closing browser context...');
    await context.close();
  }
}

main();
