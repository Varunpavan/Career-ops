import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    console.log('🚀 Navigating to Patoliya Careers page...');
    await page.goto('https://www.patoliyainfotech.com/company/careers', { waitUntil: 'networkidle' });

    // Let's find all elements with text 'Apply here'
    const applyButtons = await page.evaluate(() => {
      const elms = Array.from(document.querySelectorAll('*'));
      return elms
        .filter(el => el.textContent.trim().toLowerCase() === 'apply here')
        .map(el => ({
          tagName: el.tagName.toLowerCase(),
          className: el.className,
          href: el.getAttribute('href'),
          outerHTML: el.outerHTML
        }));
    });
    console.log('Apply here elements:', applyButtons);

    // Let's click the first 'Apply here' button and wait for any navigation, modal, or DOM change
    console.log('Clicking the first "Apply here" button...');
    
    // We'll click it and take a screenshot, and look for form inputs again
    await page.locator('text=Apply here').first().click();
    await page.waitForTimeout(2000); // Wait for animations or popups
    
    console.log('After clicking, URL is:', page.url());

    // Check if a modal is visible or if new inputs are on the page
    const elementsAfterClick = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input, textarea, select, button')).map(el => {
        return {
          tagName: el.tagName.toLowerCase(),
          id: el.id,
          name: el.getAttribute('name'),
          type: el.getAttribute('type'),
          placeholder: el.getAttribute('placeholder'),
          labelText: el.labels ? Array.from(el.labels).map(l => l.textContent.trim()).join(', ') : '',
          class: el.getAttribute('class'),
          visible: el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0
        };
      }).filter(el => el.visible);
    });

    console.log('Visible elements after clicking Apply here:', elementsAfterClick);

    await page.screenshot({ path: 'output/patoliya-careers-after-click.png', fullPage: true });
    console.log('Screenshot saved to output/patoliya-careers-after-click.png');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

main();
