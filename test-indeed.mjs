import { chromium } from 'playwright';

async function check() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    
    await page.goto('https://in.indeed.com/jobs?q=react+developer+fresher&l=Hyderabad', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    const jobs = await page.$$eval('.job_seen_beacon', elements => {
        return elements.map(el => {
            const company = el.querySelector('[data-testid="company-name"]')?.innerText;
            const location = el.querySelector('[data-testid="text-location"]')?.innerText;
            return { company, location };
        });
    });
    console.log(jobs.slice(0, 5));
    await browser.close();
}
check();
