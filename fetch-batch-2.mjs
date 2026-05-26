import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function fetchBatch2() {
    const pipelinePath = path.resolve('data/pipeline.md');
    const lines = fs.readFileSync(pipelinePath, 'utf-8').trim().split('\n');
    
    // Extract first 5 URLs from the pipeline
    const urls = lines
        .filter(l => l.startsWith('- http'))
        .map(l => l.replace('- ', '').trim())
        .slice(0, 5);
        
    console.log(`Extracting JDs for ${urls.length} URLs...`);

    const browser = await chromium.launch({ 
        headless: true, // headless works for reading text on most pages
        channel: 'chrome'
    });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    if (!fs.existsSync('jds')) {
        fs.mkdirSync('jds');
    }

    const jdPaths = [];

    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        console.log(`\nNavigating to ${url}...`);
        const page = await context.newPage();
        
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(4000);
            
            // Extract title and text
            const jdText = await page.evaluate(() => {
                const jdEl = document.querySelector('.styles_job-desc-container__txpYf, .job-desc, .dang-inner-html');
                if (jdEl) return jdEl.innerText;
                return document.body.innerText.substring(0, 5000); // fallback
            });
            
            const companySlug = url.split('-').slice(3, 5).join('-');
            const jdPath = path.resolve(`jds/naukri-${companySlug}.txt`);
            fs.writeFileSync(jdPath, `URL: ${url}\n\n${jdText}`);
            console.log(`Saved JD to ${jdPath}`);
            jdPaths.push(jdPath);
            
        } catch (err) {
            console.error(`Error on ${url}:`, err.message);
        }
        await page.close();
    }

    await browser.close();
    
    // Save mapping to a temp file for the evaluation script
    fs.writeFileSync('batch2-jobs.json', JSON.stringify({ urls, jdPaths }, null, 2));
    console.log('\n✅ JD extraction complete.');
}

fetchBatch2();
