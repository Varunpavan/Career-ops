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
    const searchUrl = 'https://www.naukri.com/jobs-in-india?k=Lumel%20Technologies';
    console.log(`🔗 Navigating to search URL: ${searchUrl}...`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);
    
    console.log('Page Title:', await page.title());
    console.log('Current URL:', page.url());
    
    // Extract all job postings on the search page
    const jobs = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('article, .jobTuple, .cust-job-tuple'));
      return cards.map(card => {
        const titleEl = card.querySelector('a.title, .title, h2, h3');
        const companyEl = card.querySelector('.companyName, .comp-name, a.subTitle');
        return {
          title: titleEl ? titleEl.innerText.trim() : 'No Title',
          company: companyEl ? companyEl.innerText.trim() : 'No Company',
          href: titleEl ? titleEl.getAttribute('href') : null
        };
      });
    });
    
    console.log('📋 Search Results Found:');
    console.log(JSON.stringify(jobs, null, 2));
    
  } catch (err) {
    console.error('❌ Error during search:', err);
  } finally {
    console.log('👋 Closing browser context...');
    await context.close();
  }
}

main();
