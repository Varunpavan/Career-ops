import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Your personal details from profile.yml
const PROFILE = {
  first_name: 'Varun',
  last_name: 'Chadalavada',
  full_name: 'Varun Pavan Sai Chadalavada',
  email: 'varunpavan45@gmail.com',
  phone: '8688128008',
  linkedin: 'https://www.linkedin.com/in/varun-pavan-4b43b2214/',
  github: 'https://github.com/Varunpavan',
  portfolio: 'https://eventify-web-lilac.vercel.app/',
};

const JOBS = [
  {
    num: 1,
    company: 'Lumel Technologies',
    role: 'Junior React Developer (0-2 Yrs)',
    score: '4.1/5',
    url: 'https://www.naukri.com/lumel-technologies-jobs-careers-4813432',
    pdf: path.join(ROOT, 'output/cv-varun-netlabs-2026-05-20.pdf'),
    platform: 'naukri',
  },
  {
    num: 2,
    company: 'MindNudge',
    role: 'React Developer (Freshers Welcome)',
    score: 'New',
    url: 'https://mindnudge.com/jobs/react-developer/',
    pdf: path.join(ROOT, 'output/cv-varun-netlabs-2026-05-20.pdf'),
    platform: 'generic',
  },
  {
    num: 3,
    company: 'Netlabs Australia',
    role: 'Front End Developer (Remote)',
    score: '4.2/5',
    url: 'https://www.naukri.com/job-listings-front-end-developer-netlabs-australia-remote-0-to-3-years-120526007765',
    pdf: path.join(ROOT, 'output/cv-varun-netlabs-2026-05-20.pdf'),
    platform: 'naukri',
  },
];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Background auto-filler loop
async function startAutoFiller(page, job, stopSignal) {
  console.log(`  🤖 Background auto-filler loop started on: ${page.url().substring(0, 60)}...`);
  let hasUploadedResume = false;
  let hasClickedApply = false;
  const filledFields = new Set();

  const resumeSelectors = [
    'input[type="file"]',
    'input[accept*="pdf"]',
    'input[accept*=".pdf"]',
    'input[name*="resume" i]',
    'input[name*="cv" i]',
    'input[id*="resume" i]',
    'input[id*="cv" i]',
  ];

  const applySelectors = [
    'button:has-text("Apply")',
    'a:has-text("Apply")',
    'button:has-text("Apply on company site")',
    'a:has-text("Apply on company site")',
    'button:has-text("Apply Now")',
    'a:has-text("Apply Now")',
    'button:has-text("Apply now")',
    'a:has-text("Apply now")',
    '.apply-button',
    '.apply-btn',
    '#apply-button',
    '#apply-btn',
    'button:has-text("Apply on company website")',
    'a:has-text("Apply on company website")',
  ];

  const TEXT_FILLERS = [
    {
      name: 'email',
      selectors: ['input[type="email"]', 'input[name*="email" i]', 'input[id*="email" i]', 'input[placeholder*="email" i]'],
      value: PROFILE.email
    },
    {
      name: 'name',
      selectors: ['input[name="name" i]', 'input[name*="fullname" i]', 'input[name*="full_name" i]', 'input[id*="name" i]', 'input[placeholder*="name" i]'],
      value: PROFILE.full_name
    },
    {
      name: 'phone',
      selectors: ['input[type="tel"]', 'input[name*="phone" i]', 'input[name*="mobile" i]', 'input[id*="phone" i]', 'input[placeholder*="phone" i]', 'input[placeholder*="mobile" i]'],
      value: PROFILE.phone
    },
    {
      name: 'github',
      selectors: ['input[name*="github" i]', 'input[placeholder*="github" i]', 'input[id*="github" i]'],
      value: PROFILE.github
    },
    {
      name: 'linkedin',
      selectors: ['input[name*="linkedin" i]', 'input[placeholder*="linkedin" i]', 'input[id*="linkedin" i]'],
      value: PROFILE.linkedin
    },
    {
      name: 'portfolio',
      selectors: ['input[name*="portfolio" i]', 'input[placeholder*="portfolio" i]', 'input[name*="website" i]', 'input[placeholder*="website" i]'],
      value: PROFILE.portfolio
    }
  ];

  while (!stopSignal.stop) {
    try {
      if (page.isClosed()) break;

      // 1. Click Apply button if present
      if (!hasClickedApply) {
        for (const selector of applySelectors) {
          const btn = await page.$(selector);
          if (btn) {
            const isVisible = await btn.isVisible().catch(() => false);
            if (isVisible) {
              try {
                await btn.click();
                hasClickedApply = true;
                console.log(`  ✨ [Auto] Clicked apply button: ${selector}`);
                await sleep(3000);
                break;
              } catch (e) {
                // ignore
              }
            }
          }
        }
      }

      // 2. Upload Resume if not done yet
      if (!hasUploadedResume) {
        for (const selector of resumeSelectors) {
          const el = await page.$(selector);
          if (el) {
            try {
              await el.setInputFiles(job.pdf);
              hasUploadedResume = true;
              console.log(`  ✨ [Auto] Uploaded resume: ${path.basename(job.pdf)}`);
              break;
            } catch (e) {
              // ignore
            }
          }
        }
      }

      // 3. Fill Text Fields
      for (const filler of TEXT_FILLERS) {
        if (filledFields.has(filler.name)) continue;
        for (const selector of filler.selectors) {
          const el = await page.$(selector);
          if (el) {
            try {
              const val = await el.inputValue();
              if (!val) {
                await el.fill(filler.value);
                filledFields.add(filler.name);
                console.log(`  ✨ [Auto] Filled ${filler.name} field.`);
                break;
              }
            } catch (e) {
              // ignore
            }
          }
        }
      }

    } catch (err) {
      // ignore page destruction/navigation errors
    }
    await sleep(2000);
  }
}

async function applyToJob(job) {
  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = await browser.newContext({ viewport: null });

  console.log('\n' + '═'.repeat(65));
  console.log(`🚀  JOB ${job.num}/3 — ${job.company}`);
  console.log(`    Role    : ${job.role}`);
  console.log(`    Score   : ${job.score}`);
  console.log(`    PDF     : ${path.basename(job.pdf)}`);
  console.log(`    Platform: ${job.platform}`);
  console.log('═'.repeat(65));

  const stopSignal = { stop: false };

  // Automatically monitor and auto-fill any pages or new tabs opened in this browser session
  context.on('page', (newPage) => {
    // Wait for the new page URL to resolve a bit before starting auto-filler
    newPage.on('domcontentloaded', () => {
      startAutoFiller(newPage, job, stopSignal);
    });
    // Fallback in case DOMContentLoaded was already fired
    startAutoFiller(newPage, job, stopSignal);
  });

  const page = await context.newPage();
  await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log('  ✅ Initial page loaded');

  console.log('\n' + '⚡'.repeat(30));
  console.log('  👉 The script will automatically detect fields, click "Apply",');
  console.log('     upload your resume, and fill your details in any tab!');
  console.log('  👉 REVIEW the form — fix anything if needed — then SUBMIT');
  console.log('  👉 When done, CLOSE the browser to open the next job');
  console.log('⚡'.repeat(30) + '\n');

  await new Promise(resolve => {
    browser.on('disconnected', resolve);
  });

  stopSignal.stop = true;
  await browser.close().catch(() => {});
  console.log(`  ✅ Job ${job.num} (${job.company}) — done!\n`);
}

async function main() {
  console.log('\n🎯 Smart Auto-Apply Session — 3 Jobs');
  console.log('   Continuous multi-tab background loop to auto-click and auto-fill.');
  console.log('   Just close browser to move to the next job.\n');

  for (const job of JOBS) {
    await applyToJob(job);
    if (job.num < JOBS.length) {
      console.log('⏳ Next job opens in 3 seconds...\n');
      await sleep(3000);
    }
  }

  console.log('\n🎉 ALL 3 APPLICATIONS DONE!');
  console.log('   Update your tracker with the statuses.');
}

main().catch(console.error);
