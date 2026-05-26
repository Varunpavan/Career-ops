import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    
    await page.goto('https://www.naukri.com/react-developer-fresher-jobs-in-hyderabad', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'naukri-screenshot.png' });
    
    // Also print out the top-level body classes or elements
    const bodyHTML = await page.evaluate(() => document.body.innerHTML.substring(0, 500));
    console.log('Body snippet:', bodyHTML);
    
    await browser.close();
})();
