import { chromium } from 'playwright';

async function main() {
  console.log('🚀 Launching browser (non-headless) to inspect Naukri job page...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    const url = 'https://www.naukri.com/lumel-technologies-jobs-careers-4813432';
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    
    // Wait for the page to load completely
    await page.waitForTimeout(5000);
    
    console.log('Page Title:', await page.title());
    console.log('Current URL:', page.url());
    
    // Check for "Apply" button or "Apply on Company Site" button
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]'))
        .map(el => ({
          tagName: el.tagName.toLowerCase(),
          id: el.id,
          className: el.className,
          text: el.innerText ? el.innerText.trim() : el.textContent.trim(),
          href: el.getAttribute('href'),
          type: el.getAttribute('type')
        }))
        .filter(b => b.text.toLowerCase().includes('apply') || b.className.toLowerCase().includes('apply'));
    });
    
    console.log('Found potential apply buttons:', JSON.stringify(buttons, null, 2));
    
    // Take a screenshot of the initial page state
    await page.screenshot({ path: 'output/naukri-job-inspect.png', fullPage: true });
    console.log('Saved screenshot to output/naukri-job-inspect.png');
    
  } catch (err) {
    console.error('❌ Error during inspection:', err.message);
  } finally {
    // Keep it open for 10 seconds or close
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

main();
