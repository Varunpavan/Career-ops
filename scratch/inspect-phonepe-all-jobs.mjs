import { chromium } from 'playwright';

async function main() {
  console.log('🚀 Launching browser (headless) to inspect all PhonePe job openings...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    const url = 'https://www.phonepe.com/careers/job-openings/';
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    
    // Wait for jobs to render
    await page.waitForTimeout(5000);
    
    console.log('Page Title:', await page.title());
    console.log('Current URL:', page.url());
    
    const jobListings = await page.evaluate(() => {
      const results = [];
      const anchors = Array.from(document.querySelectorAll('a'));
      for (const a of anchors) {
        const text = a.innerText ? a.innerText.trim() : '';
        const href = a.getAttribute('href') || '';
        if (href && (href.includes('boards.greenhouse.io') || href.includes('/jobs/'))) {
          results.push({ text, href });
        }
      }
      return results;
    });
    
    console.log('📋 All potential job links:', JSON.stringify(jobListings, null, 2));
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await browser.close();
  }
}

main();
