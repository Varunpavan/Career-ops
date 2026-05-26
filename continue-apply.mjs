import { chromium } from 'playwright';

(async () => {
  try {
    console.log('Connecting to browser...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const contexts = browser.contexts();
    let activePage = contexts[0].pages().find(p => p.url().includes('indeed.com'));
    if (!activePage) activePage = contexts[0].pages()[0];

    console.log('Clicking "Apply with Indeed" or "Apply now"...');
    // Look for the apply button
    const applyButton = activePage.locator('button:has-text("Apply with Indeed"), button:has-text("Apply now"), a:has-text("Apply now")').first();
    
    if (await applyButton.isVisible()) {
        await applyButton.click();
        console.log('Clicked apply button. Waiting for next step...');
        // Wait a bit
        await activePage.waitForTimeout(3000);
        
        // Take a screenshot of what's currently on screen
        await activePage.screenshot({ path: 'screenshot-apply-step1.png' });
        console.log('Took screenshot: screenshot-apply-step1.png');
    } else {
        console.log('Apply button not found. Maybe already clicked?');
        await activePage.screenshot({ path: 'screenshot-apply-step1.png' });
    }
    
    await browser.close();
  } catch (err) {
    console.error('Error:', err);
  }
})();
