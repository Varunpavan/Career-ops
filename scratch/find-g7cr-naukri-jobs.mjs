import { chromium } from 'playwright';
import fs from 'fs';

async function main() {
  const userDataDir = './.naukri_user_data';
  console.log(`🚀 Launching browser with persistent context: ${userDataDir} (headless: false)...`);
  
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: null,
    args: ['--start-maximized']
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  try {
    const url = 'https://www.naukri.com/g7-cr-technologies-jobs';
    console.log(`🔗 Navigating to company page: ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    console.log('⏳ Waiting for page content to load...');
    await page.waitForTimeout(5000);
    
    console.log('Page Title:', await page.title());
    console.log('Current URL:', page.url());
    
    // Scrape all job listing titles and company names
    const jobs = await page.evaluate(() => {
      // Look for any job title links
      const titleLinks = Array.from(document.querySelectorAll('a.title, a[href*="/job-listings-"]'));
      return titleLinks.map(el => ({
        title: el.innerText ? el.innerText.trim() : '',
        href: el.getAttribute('href')
      })).filter(j => j.title.length > 0);
    });
    
    console.log('📋 Job Listings Found on Company Page:', JSON.stringify(jobs, null, 2));
    
    // Check if there is a search bar or if we should search specifically for "MERN"
    // Save screenshot
    fs.mkdirSync('./output', { recursive: true });
    await page.screenshot({ path: 'output/g7cr-naukri-list-non-headless.png', fullPage: true });
    console.log('📸 Screenshot saved to output/g7cr-naukri-list-non-headless.png');
    
  } catch (err) {
    console.error('❌ Error during inspection:', err);
  } finally {
    console.log('👋 Closing browser context in 5 seconds...');
    await page.waitForTimeout(5000);
    await context.close();
  }
}

main();
