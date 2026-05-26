import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    console.log('🔗 Navigating to Netlabs Australia Freshteam /jobs portal...');
    await page.goto('https://netlabsaustralia.freshteam.com/jobs', { waitUntil: 'networkidle' });
    
    // Get page text or link selectors
    const title = await page.title();
    console.log('Title:', title);
    
    await page.screenshot({ path: 'output/netlabs-portal.png' });
    console.log('Screenshot saved to output/netlabs-portal.png');

    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({
        text: a.innerText.trim(),
        href: a.href
      }));
    });

    console.log('--- ALL LINKS ---');
    console.log(JSON.stringify(links, null, 2));

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await browser.close();
  }
}
main();
