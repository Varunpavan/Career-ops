import { chromium } from 'playwright';

async function main() {
  console.log('🚀 Launching browser (headless) to inspect PhonePe engineering jobs...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    const url = 'https://www.phonepe.com/careers/job-openings/?department=engineering';
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    
    // Wait for jobs to render
    await page.waitForTimeout(5000);
    
    console.log('Page Title:', await page.title());
    console.log('Current URL:', page.url());
    
    // Find all links and job titles on the page
    const jobListings = await page.evaluate(() => {
      const results = [];
      const anchors = Array.from(document.querySelectorAll('a'));
      for (const a of anchors) {
        const text = a.innerText ? a.innerText.trim() : '';
        const href = a.getAttribute('href') || '';
        // Look for links that might represent individual jobs
        if (href && (href.includes('job') || href.includes('position') || href.includes('careers') || href.includes('greenhouse'))) {
          results.push({ text, href });
        }
      }
      return results;
    });
    
    console.log('📋 Job listings found:', JSON.stringify(jobListings, null, 2));
    
    // Let's also get a snapshot of the text/html of the main container to see what's there
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Body Text length:', bodyText.length);
    // Find lines containing Frontend, UI, Web, or Engineer
    const matches = bodyText.split('\n').filter(line => 
      line.toLowerCase().includes('frontend') || 
      line.toLowerCase().includes('ui ') || 
      line.toLowerCase().includes('ui-') ||
      line.toLowerCase().includes('web') || 
      line.toLowerCase().includes('engineer')
    );
    console.log('Matches in body text:', matches);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await browser.close();
  }
}

main();
