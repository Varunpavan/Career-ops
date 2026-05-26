import { chromium } from 'playwright';

async function main() {
  console.log('🚀 Launching browser (headless) to check official Lumel Careers page...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    const url = 'https://lumel.com/careers/';
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    console.log('Page Title:', await page.title());
    
    // Find all links on the page that could be jobs
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .map(a => ({
          text: a.innerText ? a.innerText.trim() : a.textContent.trim(),
          href: a.href
        }))
        .filter(l => {
          const t = l.text.toLowerCase();
          return t.includes('developer') || t.includes('react') || t.includes('frontend') || t.includes('engineer') || l.href.includes('/careers/');
        });
    });
    
    console.log('Found potential job links:', JSON.stringify(links, null, 2));
    
    await page.screenshot({ path: 'output/lumel-careers-page.png', fullPage: true });
    console.log('Saved screenshot to output/lumel-careers-page.png');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await browser.close();
  }
}

main();
