import { chromium } from 'playwright';
import fs from 'fs';

async function fetchJDs() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    const jobs = [
        { name: 'aidaptive', url: 'https://in.indeed.com/viewjob?jk=6d7d29a339e73cd0' },
        { name: 'narvee', url: 'https://in.indeed.com/viewjob?jk=299ea538b6fb93dc' }
    ];

    for (const job of jobs) {
        console.log(`Fetching ${job.name}...`);
        await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(3000);
        
        try {
            const title = await page.textContent('.jobsearch-JobInfoHeader-title');
            const company = await page.textContent('[data-testid="inlineHeader-companyName"]');
            const jd = await page.textContent('#jobDescriptionText');
            
            fs.writeFileSync(`./jds/${job.name}.txt`, `Title: ${title}\nCompany: ${company}\n\n${jd}`);
            console.log(`Saved ${job.name}.txt`);
        } catch (e) {
            console.error(`Error fetching ${job.name}:`, e.message);
        }
    }

    await browser.close();
}

fetchJDs();
