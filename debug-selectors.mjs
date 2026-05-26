import { chromium } from 'playwright';

async function check() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    
    // Naukri
    try {
        console.log('--- NAUKRI ---');
        await page.goto('https://www.naukri.com/react-developer-fresher-jobs-in-hyderabad', { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(3000);
        const html = await page.content();
        if (html.includes('srp-jobtuple-wrapper')) console.log('Found srp-jobtuple-wrapper');
        else if (html.includes('jobTuple')) console.log('Found jobTuple');
        else console.log('Naukri structure unknown');
    } catch(e) { console.log('Naukri error', e.message); }

    // Indeed
    try {
        console.log('\n--- INDEED ---');
        await page.goto('https://in.indeed.com/jobs?q=react+developer+fresher&l=Hyderabad', { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(3000);
        const companySelectors = await page.$$eval('.job_seen_beacon', cards => {
            if (cards.length === 0) return null;
            return cards[0].innerHTML.substring(0, 500); // just print start of first card
        });
        console.log('Indeed first card start:', companySelectors);
    } catch(e) { console.log('Indeed error', e.message); }

    await browser.close();
}
check();
