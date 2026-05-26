import { chromium } from 'playwright';
import fs from 'fs';

async function main() {
  const userDataDir = './.naukri_user_data';
  console.log(`🚀 Launching browser with persistent context: ${userDataDir}...`);
  
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: null,
    args: ['--start-maximized']
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  try {
    const url = 'https://www.naukri.com/g7-cr-technologies-jobs';
    console.log(`🔗 Navigating to company page: ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for content to render
    console.log('⏳ Waiting for page content to load...');
    await page.waitForTimeout(5000);
    
    console.log('Page Title:', await page.title());
    console.log('Current URL:', page.url());
    
    // Let's find any links/elements containing "MERN"
    const mernJobs = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('a, h1, h2, h3, h4, p, span, div'));
      return elements
        .map(el => ({
          tagName: el.tagName.toLowerCase(),
          text: el.innerText ? el.innerText.trim() : el.textContent.trim(),
          href: el.getAttribute('href'),
          className: el.className
        }))
        .filter(el => el.text.toLowerCase().includes('mern') && (el.href || el.tagName === 'a' || el.tagName.startsWith('h')));
    });
    
    console.log('🔍 Found potential MERN job links:', JSON.stringify(mernJobs, null, 2));
    
    let clicked = false;
    if (mernJobs.length > 0) {
      // Find the best link that contains "mern"
      const bestJob = mernJobs[0];
      console.log(`🖱️ Attempting to click on the job: "${bestJob.text}"`);
      
      // Click by text content
      const linkLocator = page.locator(`a:has-text("${bestJob.text}"), h2:has-text("${bestJob.text}"), h3:has-text("${bestJob.text}")`).first();
      if (await linkLocator.count() > 0) {
        // If it opens a new tab, we need to wait for it
        const [newPage] = await Promise.all([
          context.waitForEvent('page', { timeout: 10000 }).catch(() => null),
          linkLocator.click()
        ]);
        
        clicked = true;
        let targetPage = page;
        if (newPage) {
          console.log('🆕 Job opened in a new tab!');
          targetPage = newPage;
          await targetPage.waitForLoadState('domcontentloaded');
        } else {
          console.log('🔄 Job loaded in the same tab or redirected.');
          await page.waitForTimeout(3000);
        }
        
        console.log('Target Page Title:', await targetPage.title());
        console.log('Target Page URL:', targetPage.url());
        
        // Save screenshot of the job details page
        fs.mkdirSync('./output', { recursive: true });
        await targetPage.screenshot({ path: 'output/naukri-job-details.png', fullPage: true });
        console.log('📸 Screenshot of job details saved to output/naukri-job-details.png');
        
        // Find the Apply button
        const applyButtons = await targetPage.evaluate(() => {
          return Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]'))
            .map(el => ({
              tagName: el.tagName.toLowerCase(),
              id: el.id,
              className: el.className,
              text: el.innerText ? el.innerText.trim() : el.textContent.trim(),
              href: el.getAttribute('href'),
              type: el.getAttribute('type')
            }))
            .filter(b => b.text.toLowerCase() === 'apply' || b.text.toLowerCase().includes('apply on company'));
        });
        
        console.log('🔍 Found apply buttons:', JSON.stringify(applyButtons, null, 2));
        
        if (applyButtons.length > 0) {
          console.log('🖱️ Clicking the Apply button...');
          // Find the locator for the first apply button
          const btn = applyButtons[0];
          let applyLocator;
          if (btn.id) {
            applyLocator = targetPage.locator(`#${btn.id}`).first();
          } else {
            applyLocator = targetPage.locator(`${btn.tagName}:has-text("${btn.text}")`).first();
          }
          
          await applyLocator.click();
          console.log('✅ Clicked Apply button.');
          
          // Wait for any redirection, dialog, or questionnaire
          await targetPage.waitForTimeout(5000);
          await targetPage.screenshot({ path: 'output/naukri-post-apply.png', fullPage: true });
          console.log('📸 Screenshot after click saved to output/naukri-post-apply.png');
          
        } else {
          console.log('⚠️ Could not find an Apply button on the job details page.');
        }
      }
    }
    
    if (!clicked) {
      console.log('⚠️ Could not find or click any job listing matching "MERN" on the company jobs page.');
      // Take screenshot of the company page for manual troubleshooting
      fs.mkdirSync('./output', { recursive: true });
      await page.screenshot({ path: 'output/naukri-company-page.png', fullPage: true });
      console.log('📸 Saved screenshot of company page to output/naukri-company-page.png');
    }
    
  } catch (err) {
    console.error('❌ Error during application process:', err);
  } finally {
    console.log('👋 Keeping the browser open for 15 seconds so you can see the result, then closing.');
    await page.waitForTimeout(15000);
    await context.close();
  }
}

main();
