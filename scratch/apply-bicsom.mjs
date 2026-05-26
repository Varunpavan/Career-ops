import { stealthPersistent } from '../stealth-browser.mjs';
import path from 'path';
import fs from 'fs';
import readline from 'readline';

const PROFILE_PATH = path.resolve('data/naukri-profile');
const JOB_URL = 'https://www.naukri.com/job-listings-web-developer-fresher-bicsom-technologies-pvt-ltd-bengaluru-0-to-1-years-131025500173';

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

(async () => {
  console.log('🚀 Launching stealth browser in headed mode...');
  const browser = await stealthPersistent(PROFILE_PATH, {
    headless: false, // Show on user's screen
    viewport: { width: 1280, height: 900 },
    args: ['--start-maximized'],
  });

  const page = await browser.newPage();
  
  try {
    console.log(`Navigating to ${JOB_URL}...`);
    await page.goto(JOB_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Set up listener for new page/tab opening
    const newPagePromise = page.context().waitForEvent('page', { timeout: 15000 }).catch(() => null);

    // Find and click the apply button
    const applySelectors = [
      'button:has-text("Apply")',
      'a:has-text("Apply")',
      'button[class*="apply" i]',
      'a[class*="apply" i]',
    ];

    let applyClicked = false;
    for (const sel of applySelectors) {
      const btn = await page.$(sel);
      if (btn && await btn.isVisible()) {
        const text = await btn.innerText();
        console.log(`🖱️ Clicking button: "${text.trim()}"`);
        await btn.click();
        applyClicked = true;
        break;
      }
    }

    if (!applyClicked) {
      console.log('⚠️ Could not find Apply button. Please check the browser window.');
    } else {
      console.log('⏳ Waiting for the external page to open in a new tab...');
      const newPage = await newPagePromise;
      if (newPage) {
        await newPage.waitForLoadState('domcontentloaded').catch(() => {});
        console.log(`🌐 Redirected to external page: ${newPage.url()}`);
        
        // Take a screenshot of the external page for our logs
        await newPage.waitForTimeout(5000);
        await newPage.screenshot({ path: path.resolve('scratch/external_apply_page.png') });
        console.log('📸 Screenshot of external page saved to scratch/external_apply_page.png');
      } else {
        console.log('⚠️ No new tab opened. The external page might have opened in the same tab or was blocked.');
      }
    }

    console.log('\n==================================================================');
    console.log('👉 Please review and complete the application in the open browser.');
    console.log('==================================================================\n');

    await prompt('Press Enter once you have submitted the application on the company site...');
    
    // Update TSV
    console.log('Updating job status to applied in india-jobs.tsv...');
    const tsvPath = path.resolve('data/india-jobs.tsv');
    const raw = fs.readFileSync(tsvPath, 'utf8');
    const updated = raw.split('\n').map(line => {
      if (line.startsWith(JOB_URL + '\t')) {
        const cols = line.split('\t');
        cols[5] = 'applied';
        return cols.join('\t');
      }
      return line;
    }).join('\n');
    fs.writeFileSync(tsvPath, updated, 'utf8');
    console.log('✅ TSV updated.');

  } catch (err) {
    console.error('Error during execution:', err);
  } finally {
    console.log('Closing browser...');
    await browser.close();
    console.log('Finished.');
  }
})();
