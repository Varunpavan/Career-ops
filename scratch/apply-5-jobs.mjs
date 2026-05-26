import { chromium } from 'playwright';

const JOBS = [
  {
    num: 1,
    company: 'Service Pack',
    role: 'React Developer - Freshers',
    score: '4.2/5',
    url: 'https://cutshort.io/job/React-Developer-Freshers-Hyderabad-Service-Pack-lg1OIRUn',
    location: 'Hyderabad',
    note: 'Click "Apply" → Login with LinkedIn/Google → Submit'
  },
  {
    num: 2,
    company: 'G7 CR Technologies',
    role: 'MERN Stack Developer (Fresher)',
    score: '4.2/5',
    url: 'https://g7cr.com/careers/mern-stack-developer/',
    location: 'Bengaluru',
    note: 'Fill the application form directly on their site'
  },
  {
    num: 3,
    company: 'Lumel Technologies',
    role: 'Junior React Developer (0-2 Yrs)',
    score: '4.1/5',
    url: 'https://www.naukri.com/lumel-technologies-jobs-careers-4813432',
    location: 'Chennai',
    note: 'Click "Apply" on Naukri — should apply directly'
  },
  {
    num: 4,
    company: 'MindNudge',
    role: 'React Developer (Freshers Welcome)',
    score: '🆕 New',
    url: 'https://mindnudge.com/jobs/react-developer/',
    location: 'Remote',
    note: 'Direct company site — fill the form and submit'
  },
  {
    num: 5,
    company: 'Netlabs Australia',
    role: 'Front End Developer (Remote)',
    score: '4.2/5',
    url: 'https://www.naukri.com/job-listings-front-end-developer-netlabs-australia-remote-0-to-3-years-120526007765',
    location: 'Remote',
    note: 'Click Apply on Naukri'
  },
];

async function openJob(job) {
  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  console.log('\n' + '═'.repeat(60));
  console.log(`🚀 JOB ${job.num}/5 — ${job.company}`);
  console.log(`   Role   : ${job.role}`);
  console.log(`   Score  : ${job.score}`);
  console.log(`   Location: ${job.location}`);
  console.log(`   Action : ${job.note}`);
  console.log('═'.repeat(60));

  await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  console.log(`\n✅ Page loaded. Apply now, then CLOSE this browser window.`);
  console.log(`   Waiting for you to finish and close the browser...\n`);

  await new Promise(resolve => {
    page.on('close', resolve);
    context.on('close', resolve);
    browser.on('disconnected', resolve);
  });

  await browser.close().catch(() => {});
  console.log(`\n✅ Done with Job ${job.num}: ${job.company}. Moving to next...\n`);
}

async function main() {
  console.log('\n🎯 Starting 5-Job Application Session');
  console.log('   Apply to each job, then close the browser to proceed to the next.\n');

  for (const job of JOBS) {
    await openJob(job);
    if (job.num < JOBS.length) {
      console.log('⏳ Opening next job in 3 seconds...');
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.log('\n🎉 ALL 5 JOBS DONE! Great work!');
  console.log('   Remember to update your tracker with the statuses.');
}

main().catch(console.error);
