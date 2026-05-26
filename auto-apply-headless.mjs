import { chromium } from 'playwright';
import path from 'path';

async function autoApplyNaukriHeadless() {
    const jobUrl = "https://www.naukri.com/job-listings-frontend-developer-gozo-technologies-pvt-ltd-mumbai-delhi-ncr-bengaluru-2-to-5-years-220526919444";
    const profilePath = path.resolve('data/naukri-profile');

    console.log("🚀 Launching automation browser (headless)...");
    const browser = await chromium.launchPersistentContext(profilePath, { 
        headless: true, // We can run headless now that they are logged in!
        channel: 'chrome',
        viewport: null,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await browser.newPage();

    console.log(`➡️ Navigating to Job: ${jobUrl}`);
    await page.goto(jobUrl, { waitUntil: 'domcontentloaded' });
    
    // Give it a moment to load
    await page.waitForTimeout(5000);

    try {
        console.log("🎯 Searching for Apply button...");
        // Naukri apply buttons usually have id="apply-button" or classes like .apply-message
        const applyBtn = await page.waitForSelector('button#apply-button, .apply-message button, button:has-text("Apply")', { timeout: 10000 });
        
        if (applyBtn) {
            console.log("🖱️ Clicking Apply...");
            await applyBtn.click();
            await page.waitForTimeout(3000);
            
            // Check if there are any specific popups after applying
            console.log("✅ Successfully clicked Apply! Checking for success message...");
        } else {
            console.log("⚠️ Could not find the Apply button. It might already be applied or the layout changed.");
        }
    } catch (e) {
        console.log("⚠️ Error clicking Apply:", e.message);
        console.log("The button might have been already clicked.");
    }

    console.log("🎉 Automation complete!");
    await browser.close();
}

autoApplyNaukriHeadless();
