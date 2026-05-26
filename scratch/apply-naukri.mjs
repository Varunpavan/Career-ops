import { chromium } from 'playwright';

const jobUrls = {
  "1": {
    company: "G7 CR Technologies (MERN Stack Developer - Score 4.2/5)",
    url: "https://www.naukri.com/g7-cr-technologies-jobs"
  },
  "2": {
    company: "Lumel Technologies (Junior React Developer - Score 4.1/5)",
    url: "https://www.naukri.com/lumel-technologies-jobs-careers-4813432"
  },
  "3": {
    company: "PhonePe (UI Engineer / Frontend Developer)",
    url: "https://www.naukri.com/phonepe-jobs"
  },
  "4": {
    company: "Urban Company (Frontend Engineer)",
    url: "https://www.naukri.com/urban-company-jobs"
  },
  "5": {
    company: "InMobi (Software Engineer - Frontend)",
    url: "https://www.naukri.com/inmobi-jobs"
  },
  "6": {
    company: "Salesforce (React Developer)",
    url: "https://www.naukri.com/salesforce-jobs"
  },
  "7": {
    company: "Nitroxen Tech India (ReactJS Developer Intern)",
    url: "https://www.naukri.com/nitroxen-tech-india-pvt-ltd-jobs"
  },
  "8": {
    company: "Twilio (Frontend Engineer - React)",
    url: "https://www.naukri.com/twilio-jobs"
  }
};

async function main() {
  const choice = process.argv[2] || "1";
  const selected = jobUrls[choice];
  
  if (!selected) {
    console.log("Invalid choice. Please run the script with a number from 1 to 8.");
    console.log("Usage: node scratch/apply-naukri.mjs [1-8]");
    process.exit(1);
  }

  console.log(`🚀 Launching non-headless browser to apply for: ${selected.company}...`);
  console.log(`🔗 Target URL: ${selected.url}`);
  
  const userDataDir = './.naukri_user_data';
  console.log(`🚀 Launching browser with persistent context: ${userDataDir}...`);
  
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: null,
    args: ['--start-maximized']
  });
  
  const page = context.pages()[0] || await context.newPage();
  
  try {
    await page.goto(selected.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    console.log('\n==================================================================');
    console.log('👉 BROWSER WINDOW IS OPEN!');
    console.log('1. Solve any Cloudflare/CAPTCHA challenge if prompted.');
    console.log('2. Log in to your Naukri account (if not already logged in).');
    console.log('3. Review the job posting and click "Apply" or "Apply on Company Site".');
    console.log('4. Close this browser window once you are done submitting the application.');
    console.log('==================================================================\n');
    
    // Wait until the user closes the browser window
    await page.waitForEvent('close', { timeout: 0 });
    console.log('✅ Browser window closed. Application step complete.');
  } catch (err) {
    console.error('❌ Error during browser session:', err.message);
  } finally {
    await context.close();
  }
}

main();
