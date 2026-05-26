import { chromium } from 'playwright';
import fs from 'fs';

async function main() {
  const userDataDir = './.naukri_user_data';
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  try {
    const url = 'https://www.naukri.com/g7-cr-technologies-jobs';
    console.log(`🔗 Navigating to company page: ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);
    
    // Scrape all job listing titles and company names
    const jobs = await page.evaluate(() => {
      // Naukri job cards typically have class "jobTuple" or similar, or article tags
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
    
    console.log('📋 All Job Listings Found:');
    console.log(JSON.stringify(jobs, null, 2));
    
    // Let's also take a screenshot of the main body
    await page.screenshot({ path: 'output/g7cr-naukri-list.png', fullPage: true });
    
  } catch (err) {
    console.error('❌ Error during inspection:', err);
  } finally {
    await context.close();
  }
}

main();
