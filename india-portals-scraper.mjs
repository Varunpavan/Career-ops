import fs from 'fs';
import yaml from 'js-yaml';
import { chromium } from 'playwright';

// Anti-detection user agents
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

const delay = (min, max) => new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));

export async function scrapeAllIndianPortals() {
    console.log('Loading configuration from portals.yml...');
    const configContent = fs.readFileSync('portals.yml', 'utf8');
    const config = yaml.load(configContent);
    const indianPortals = config.indian_portals || {};

    const allJobs = [];

    const browser = await chromium.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--window-size=1920,1080'
        ]
    });

    for (const [portalName, queries] of Object.entries(indianPortals)) {
        console.log(`\n=== Scraping portal: ${portalName} ===`);
        
        for (const query of queries) {
            console.log(`\nQuery: ${query.name}`);
            console.log(`URL: ${query.url}`);
            
            const context = await browser.newContext({
                userAgent: getRandomUserAgent(),
                locale: 'en-IN',
                timezoneId: 'Asia/Kolkata',
                viewport: { width: 1920, height: 1080 },
                extraHTTPHeaders: {
                    'Accept-Language': 'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
                }
            });
            
            // Add scripts to evade detection
            await context.addInitScript(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                window.chrome = { runtime: {} };
            });

            const page = await context.newPage();
            
            try {
                await page.goto(query.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                console.log(`Loaded page. Waiting for randomized delay...`);
                await delay(2000, 5000);
                
                // Wait for the container selector
                try {
                    await page.waitForSelector(query.selector, { timeout: 15000 });
                } catch (e) {
                    console.log(`Warning: Selector ${query.selector} not found within timeout. Page might be empty, blocked or layout changed.`);
                }
                
                const jobs = await page.$$eval(query.selector, (elements, { fields, portalName }) => {
                    return elements.map(el => {
                        const getFieldText = (selector) => {
                            if (!selector) return '';
                            // Handle multiple selectors separated by comma if provided as a single string
                            const selectors = selector.split(',').map(s => s.trim());
                            for (const s of selectors) {
                                const node = el.querySelector(s);
                                if (node && node.innerText.trim()) {
                                    return node.innerText.trim();
                                }
                            }
                            return '';
                        };
                        
                        const getFieldLink = (selector) => {
                            if (!selector) return '';
                            const selectors = selector.split(',').map(s => s.trim());
                            for (const s of selectors) {
                                const node = el.querySelector(s);
                                if (node && node.href) {
                                    return node.href;
                                }
                            }
                            return '';
                        };

                        return {
                            title: getFieldText(fields?.title),
                            company: getFieldText(fields?.company),
                            location: getFieldText(fields?.location),
                            url: getFieldLink(fields?.link) || window.location.href,
                            portal: portalName
                        };
                    });
                }, { fields: query.fields, portalName });
                
                console.log(`Extracted ${jobs.length} jobs for this query.`);
                
                const timestamp = new Date().toISOString().split('T')[0];
                for (const job of jobs) {
                    if (job.title) {
                        job.first_seen = timestamp;
                        job.query_name = query.name;
                        allJobs.push(job);
                    }
                }
                
            } catch (error) {
                console.error(`Error scraping ${query.url}:`, error.message);
            } finally {
                await context.close();
            }
        }
    }

    await browser.close();
    
    return allJobs;
}
