import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function fetchRemainingJDs() {
    console.log('Fetching PlanetScale JD...');
    const psRes = await fetch('https://boards-api.greenhouse.io/v1/boards/planetscale/jobs/4257174009');
    if (psRes.ok) {
        const psData = await psRes.json();
        fs.writeFileSync('jds/planetscale.txt', psData.content || 'No content found');
        console.log('Saved PlanetScale JD.');
    }

    console.log('Launching browser for Valuelabs...');
    const browser = await chromium.launch({ headless: false, channel: 'chrome' });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        await page.goto('https://www.naukri.com/job-listings-react-developer-valuelabs-hyderabad-4-to-9-years-210526011509', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);
        const jdText = await page.evaluate(() => {
            const el = document.querySelector('.job-desc, .styles_job-desc-container__txpYf');
            return el ? el.innerText : document.body.innerText.substring(0, 5000);
        });
        fs.writeFileSync('jds/valuelabs.txt', jdText);
        console.log('Saved Valuelabs JD.');
    } catch (err) {
        console.error('Error fetching Valuelabs:', err);
    }
    
    await browser.close();
}

fetchRemainingJDs();
