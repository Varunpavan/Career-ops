import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.tcsion.com/jobs/Oakya-IT-Services-Private-Limited/FrontEnd-Developer-21007/', { waitUntil: 'networkidle' });
    
    // Give it a bit more time for any JS to settle
    await page.waitForTimeout(5000);

    const title = await page.title();
    console.log('Title:', title);

    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, a.btn, .button, [role="button"]'))
        .map(b => ({
          text: b.innerText.trim(),
          id: b.id,
          class: b.className,
          visible: b.offsetWidth > 0 && b.offsetHeight > 0
        }))
        .filter(b => b.text.length > 0);
    });

    console.log('--- Visible Buttons ---');
    console.log(JSON.stringify(buttons.filter(b => b.visible), null, 2));

    const iframes = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('iframe')).map(i => i.src);
    });
    console.log('--- Iframes ---', iframes);

    // Look for text that might indicate a login requirement
    const bodyText = await page.innerText('body');
    if (bodyText.includes('Login') || bodyText.includes('Sign in')) {
        console.log('Detected Login/Sign in keywords in body text.');
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

main();
