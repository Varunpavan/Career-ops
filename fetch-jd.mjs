import { stealthLaunch } from './stealth-browser.mjs';

(async () => {
  const url = process.argv[2];
  const browser = await stealthLaunch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  const text = await page.evaluate(() => document.body.innerText);
  console.log("===JD_START===");
  console.log(text);
  console.log("===JD_END===");
  await browser.close();
})();
