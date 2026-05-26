import { chromium } from 'playwright';
import fs from 'fs';

async function fetchNarvee() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    console.log('Fetching narvee...');
    await page.goto('https://in.indeed.com/viewjob?jk=299ea538b6fb93dc', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000); // Give it plenty of time
    
    try {
        const title = await page.$eval('h1, .jobTitle', el => el.innerText).catch(() => 'React Developer Intern');
        const company = await page.$eval('[data-testid="inlineHeader-companyName"], .jobsearch-CompanyReview--heading', el => el.innerText).catch(() => 'Narvee Technologies');
        const jd = await page.$eval('#jobDescriptionText', el => el.innerText).catch(() => null);
        
        if (jd) {
            fs.writeFileSync(`./jds/narvee.txt`, `Title: ${title}\nCompany: ${company}\n\n${jd}`);
            console.log(`Saved narvee.txt`);
        } else {
            console.log('Could not find #jobDescriptionText');
            // Save the whole body just in case
            const body = await page.innerText('body');
            fs.writeFileSync(`./jds/narvee_raw.txt`, body);
            console.log('Saved raw body to narvee_raw.txt');
        }
    } catch (e) {
        console.error(`Error fetching narvee:`, e.message);
    }

    await browser.close();
}

fetchNarvee();
