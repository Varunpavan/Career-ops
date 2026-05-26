import { chromium } from 'playwright';

async function main() {
  console.log('Launching browser to find email addresses on g7cr.com...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    let emails = [];
    
    // 1. Check careers page
    console.log('Checking g7cr careers page...');
    await page.goto('https://g7cr.com/careers/mern-stack-developer/', {
      waitUntil: 'networkidle',
      timeout: 30000
    }).catch(() => console.log('Failed to navigate to g7cr careers page'));
    
    let pageText = await page.innerText('body').catch(() => '');
    emails = emails.concat(pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []);
    
    // 2. Check contact page
    console.log('Checking g7cr contact page...');
    await page.goto('https://g7cr.com/contact-us/', {
      waitUntil: 'networkidle',
      timeout: 30000
    }).catch(() => console.log('Failed to navigate to g7cr contact-us'));
    
    pageText = await page.innerText('body').catch(() => '');
    emails = emails.concat(pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []);
    
    // 3. Check home page
    console.log('Checking g7cr home page...');
    await page.goto('https://g7cr.com/', {
      waitUntil: 'networkidle',
      timeout: 30000
    }).catch(() => console.log('Failed to navigate to g7cr home'));
    
    pageText = await page.innerText('body').catch(() => '');
    emails = emails.concat(pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []);
    
    console.log('Final unique emails found on g7cr.com:', [...new Set(emails)]);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

main();
