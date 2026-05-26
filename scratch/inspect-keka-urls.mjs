import { chromium } from 'playwright';

const urls = [
  "https://lumel.keka.com/careers/jobdetails/129650/",
  "https://lumel.keka.com/careers/jobdetails/129647/",
  "https://lumel.keka.com/careers/jobdetails/129005/",
  "https://lumel.keka.com/careers/jobdetails/128397/",
  "https://lumel.keka.com/careers/jobdetails/127785/",
  "https://lumel.keka.com/careers/jobdetails/127341/",
  "https://lumel.keka.com/careers/jobdetails/127338/",
  "https://lumel.keka.com/careers/jobdetails/126119/",
  "https://lumel.keka.com/careers/jobdetails/126118/",
  "https://lumel.keka.com/careers/jobdetails/126104/",
  "https://lumel.keka.com/careers/jobdetails/125249/",
  "https://lumel.keka.com/careers/jobdetails/117555/"
];

async function main() {
  console.log('🚀 Inspecting Keka job boards to find the Junior React / Frontend Developer role...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const results = [];
  
  for (const url of urls) {
    try {
      console.log(`Navigating to ${url}...`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      // Wait for Keka page to render its content
      await page.waitForTimeout(2000);
      
      const details = await page.evaluate(() => {
        // Extract title
        const titleEl = document.querySelector('h1, h2, .job-title, [class*="title"]');
        const title = titleEl ? titleEl.innerText.trim() : 'Unknown';
        
        // Extract all text content to find experience and location
        const text = document.body.innerText;
        
        return {
          title,
          textSnippet: text.substring(0, 1000).replace(/\n+/g, ' ')
        };
      });
      
      console.log(`✅ ${url} -> Title: ${details.title}`);
      results.push({ url, ...details });
    } catch (err) {
      console.error(`❌ Error on ${url}:`, err.message);
    }
  }
  
  await browser.close();
  console.log('\n--- INSPECTION COMPLETE ---');
  console.log(JSON.stringify(results, null, 2));
}

main();
