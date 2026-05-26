import { chromium } from 'playwright';

async function check() {
    const browser = await chromium.launch({ headless: true });
    
    async function getCard(url, containerSelector) {
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();
        let cardHtml = '';
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await page.waitForTimeout(3000);
            const cards = await page.$$(containerSelector);
            if (cards.length > 0) {
                cardHtml = await cards[0].innerHTML();
            } else {
                cardHtml = 'Container not found. Page HTML: ' + (await page.content()).substring(0, 500);
            }
        } catch(e) { 
            cardHtml = 'Error: ' + e.message; 
        }
        await context.close();
        return cardHtml;
    }

    console.log('--- INDEED ---');
    console.log((await getCard('https://in.indeed.com/jobs?q=react+developer+fresher&l=Hyderabad', '.job_seen_beacon')).substring(0, 1000));
    
    console.log('\n--- INTERNSHALA ---');
    console.log((await getCard('https://internshala.com/jobs/react-js-jobs', '.individual_internship')).substring(0, 1000));

    console.log('\n--- NAUKRI ---');
    console.log((await getCard('https://www.naukri.com/react-developer-fresher-jobs-in-hyderabad', '.srp-jobtuple-wrapper')).substring(0, 1000));

    console.log('\n--- WELLFOUND ---');
    console.log((await getCard('https://wellfound.com/role/r/software-engineer?country=IN', '[data-test="StartupResult"]')).substring(0, 1000));

    await browser.close();
}
check();
