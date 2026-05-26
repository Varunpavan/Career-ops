import { chromium } from 'playwright';

async function main() {
  console.log('🚀 Launching browser (headless) to map job titles...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    const url = 'https://lumel.com/careers/';
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    const jobListings = await page.evaluate(() => {
      // Find all elements that might contain a job listing card/row
      // Let's inspect the page elements that contain links to keka.com/careers
      const results = [];
      const links = Array.from(document.querySelectorAll('a[href*="keka.com/careers"]'));
      
      for (const link of links) {
        // Find parent container or closest header
        let container = link.closest('.elementor-widget-container, .wpb_wrapper, div[class*="card"], div[class*="row"], div[class*="job"]');
        if (!container) {
          container = link.parentElement;
        }
        
        // Find any headings or titles inside the container
        const headings = Array.from(container.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span'))
          .map(h => h.innerText ? h.innerText.trim() : '')
          .filter(t => t.length > 3 && t !== 'Apply Now' && !t.includes('Chennai') && !t.includes('Experience'));
          
        results.push({
          title: headings[0] || 'Unknown Title',
          href: link.href,
          context: headings.slice(0, 4)
        });
      }
      return results;
    });
    
    console.log('Job Listing Mapping:', JSON.stringify(jobListings, null, 2));
    
  } catch (err) {
    console.error('❌ Error mapping jobs:', err.message);
  } finally {
    await browser.close();
  }
}

main();
