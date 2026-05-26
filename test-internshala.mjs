import { chromium } from 'playwright';

async function check() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('https://internshala.com/jobs/react-js-jobs', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    const html = await page.$$eval('.individual_internship', elements => {
        if (elements.length > 1) {
            return elements[1].innerHTML;
        }
        return '';
    });
    console.log(html.substring(0, 1000));
    await browser.close();
}
check();
