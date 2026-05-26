import { chromium } from 'playwright';
async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://oakyaitservices.com/career', { waitUntil: 'networkidle' });
    await page.click('.cr-apply-btn');
    await page.waitForTimeout(2000);
    const formHtml = await page.evaluate(() => {
        const form = document.querySelector('.cr-form');
        return form ? form.outerHTML : 'Form not found';
    });
    console.log('--- FORM HTML ---');
    console.log(formHtml);
    
    const elements = await page.evaluate(() => {
        const form = document.querySelector('.cr-form');
        if (!form) return [];
        return Array.from(form.querySelectorAll('input, select, textarea, button')).map(el => ({
            tagName: el.tagName,
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            value: el.value,
            isVisible: el.offsetWidth > 0 && el.offsetHeight > 0,
            required: el.required
        }));
    });
    console.log('--- FORM ELEMENTS ---');
    console.log(JSON.stringify(elements, null, 2));

  } finally {
    await browser.close();
  }
}
main();
