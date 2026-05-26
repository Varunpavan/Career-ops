import { chromium } from 'playwright';

async function main() {
  console.log('🚀 Launching browser (headless) to inspect PhonePe jobs on Naukri...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    const url = 'https://www.naukri.com/phonepe-jobs';
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    
    // Wait for the dynamic content / job list to load
    await page.waitForTimeout(5000);
    
    console.log('Page Title:', await page.title());
    console.log('Current URL:', page.url());
    
    // Find all links containing job listings
    const links = await page.evaluate(() => {
      const results = [];
      const anchors = Array.from(document.querySelectorAll('a'));
      for (const a of anchors) {
        const text = a.innerText ? a.innerText.trim() : '';
        const href = a.getAttribute('href') || '';
        // Look for links that might represent individual jobs
        if (href && (href.includes('/job-listings-') || href.includes('phonepe'))) {
          results.push({ text, href });
        }
      }
      return results;
    });
    
    console.log('📋 Found links:', JSON.stringify(links, null, 2));
    
    // Take a screenshot
    await page.screenshot({ path: 'output/phonepe-naukri-inspect.png', fullPage: true });
    console.log('Saved screenshot to output/phonepe-naukri-inspect.png');
    
  } catch (err) {
    console.error('❌ Error during inspection:', err.message);
  } finally {
    await browser.close();
  }
}

main();
