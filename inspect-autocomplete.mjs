import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    console.log('🚀 Navigating to Patoliya Careers page...');
    await page.goto('https://www.patoliyainfotech.com/company/careers', { waitUntil: 'networkidle' });

    console.log('Clicking the first "Apply here" button...');
    await page.locator('text=Apply here').first().click();
    await page.waitForTimeout(2000);

    // Focus and click on the Autocomplete field to open the dropdown
    console.log('Focusing and clicking the Autocomplete input...');
    const inputLocator = page.locator('input[label="Area of Interest"], input[placeholder="Area of Interest"], .MuiAutocomplete-input').first();
    await inputLocator.click();
    await page.waitForTimeout(1000);

    // Let's dump all DOM elements with class containing 'MuiAutocomplete-option' or listbox items
    const options = await page.evaluate(() => {
      // Look for any visible popup/listbox or option classes
      const listbox = document.querySelector('[role="listbox"]');
      if (listbox) {
        return Array.from(listbox.querySelectorAll('[role="option"]')).map(el => el.textContent.trim());
      }
      return Array.from(document.querySelectorAll('.MuiAutocomplete-option, [role="option"]')).map(el => el.textContent.trim());
    });
    console.log('Dropdown options found:', options);

    // If options are found, let's try typing "MERN" and see
    console.log('Typing "MERN"...');
    await inputLocator.fill('MERN');
    await page.waitForTimeout(1000);
    
    const filteredOptions = await page.evaluate(() => {
      const listbox = document.querySelector('[role="listbox"]');
      if (listbox) {
        return Array.from(listbox.querySelectorAll('[role="option"]')).map(el => el.textContent.trim());
      }
      return Array.from(document.querySelectorAll('.MuiAutocomplete-option, [role="option"]')).map(el => el.textContent.trim());
    });
    console.log('Filtered options after typing MERN:', filteredOptions);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

main();
