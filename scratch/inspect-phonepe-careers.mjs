import { chromium } from 'playwright';

async function main() {
  console.log('🚀 Launching browser (headless) to inspect PhonePe careers page...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    const url = 'https://www.phonepe.com/careers/';
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    
    // Wait for the page/iframe/dynamic content to load
    await page.waitForTimeout(5000);
    
    console.log('Page Title:', await page.title());
    console.log('Current URL:', page.url());
    
    // Find all links containing "jobs", "careers", "position", or "details"
    const links = await page.evaluate(() => {
      const results = [];
      const anchors = Array.from(document.querySelectorAll('a'));
      for (const a of anchors) {
        const text = a.innerText ? a.innerText.trim() : '';
        const href = a.getAttribute('href') || '';
        if (href && (href.includes('job') || href.includes('career') || href.includes('position') || text.toLowerCase().includes('engineer') || text.toLowerCase().includes('developer') || text.toLowerCase().includes('ui') || text.toLowerCase().includes('frontend'))) {
          results.push({ text, href });
        }
      }
      return results;
    });
    
    console.log('📋 Found potential job-related links on page:', JSON.stringify(links, null, 2));
    
  } catch (err) {
    console.error('❌ Error during inspection:', err.message);
  } finally {
    await browser.close();
  }
}

main();
