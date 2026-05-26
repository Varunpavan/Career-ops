// scrape-naukri.mjs
// Fixed version: updated CSS selectors for current Naukri DOM + fixed TSV escape bug
import { stealthLaunch } from './stealth-browser.mjs';
import fs from 'fs';
import path from 'path';

const NAUKRI_URLS = [
  { url: 'https://www.naukri.com/react-js-developer-jobs-in-hyderabad-secunderabad?experience=0', portal: 'Naukri', titleHint: 'React JS Hyderabad 0 Exp' },
  { url: 'https://www.naukri.com/frontend-developer-jobs-in-hyderabad-secunderabad?experience=0', portal: 'Naukri', titleHint: 'Frontend Developer Hyderabad 0 Exp' },
  { url: 'https://www.naukri.com/react-developer-fresher-jobs-in-hyderabad', portal: 'Naukri', titleHint: 'React Fresher Hyderabad' },
  { url: 'https://www.naukri.com/frontend-developer-fresher-jobs-in-bangalore', portal: 'Naukri', titleHint: 'Frontend Fresher Bangalore' },
  { url: 'https://www.naukri.com/react-developer-fresher-jobs-in-bangalore', portal: 'Naukri', titleHint: 'React Fresher Bangalore' },
  { url: 'https://www.naukri.com/ui-developer-jobs?experience=0', portal: 'Naukri', titleHint: 'UI Developer 0 Exp' },
  { url: 'https://www.naukri.com/react-js-developer-jobs?experience=0&workMode=3', portal: 'Naukri', titleHint: 'React JS Remote 0 Exp' },
  { url: 'https://www.naukri.com/frontend-developer-jobs?experience=0&workMode=3', portal: 'Naukri', titleHint: 'Frontend Developer Remote 0 Exp' },
];

// Updated selectors matching current Naukri SRP DOM (May 2026)
const SELECTORS = {
  jobCard: [
    'article.jobTuple',
    'div.cust-job-tuple',
    'div.srp-jobtuple-wrapper',
    'div[class*="JobTuple"]',
    'div[class*="job-tuple"]',
    'li.job-container',
  ],
  title: [
    'a.title',
    '.jobTitle a',
    'a[class*="title"]',
    'h2 a',
    '.job-title a',
  ],
  company: [
    'a.comp-name',
    '.comp-name',
    '.subTitle',
    'span[class*="comp-name"]',
    '.company-name',
  ],
  location: [
    'span.locWdth',
    '.location',
    'span[class*="loc"]',
    '.job-location',
  ],
};

function trySelector(el, selectors) {
  for (const sel of selectors) {
    const found = el.querySelector(sel);
    if (found) return found;
  }
  return null;
}

async function scrapeNaukri() {
  console.log('🚀 Launching Playwright to scrape Naukri (fixed selectors)...');

  const browser = await stealthLaunch({
    headless: true,
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'en-IN',
  });

  let allJobs = [];

  for (const target of NAUKRI_URLS) {
    console.log(`\n🔍 Scraping: ${target.titleHint}`);
    const page = await context.newPage();

    try {
      await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 40000 });
      // Give JS time to render job cards
      await page.waitForTimeout(3500);

      // Try each card selector until we find cards
      let jobs = [];
      for (const cardSel of SELECTORS.jobCard) {
        const count = await page.locator(cardSel).count();
        if (count > 0) {
          console.log(`  ✅ Found ${count} cards with selector: ${cardSel}`);
          jobs = await page.$$eval(
            cardSel,
            (elements, sels) => {
              return elements.map((el) => {
                function qs(selList) {
                  for (const s of selList) {
                    const f = el.querySelector(s);
                    if (f) return f.textContent.trim();
                  }
                  return '';
                }
                function qsHref(selList) {
                  for (const s of selList) {
                    const f = el.querySelector(s);
                    if (f && f.href) return f.href;
                  }
                  return '';
                }
                return {
                  title: qs(sels.title),
                  company: qs(sels.company),
                  location: qs(sels.location),
                  link: qsHref(sels.title),
                };
              });
            },
            SELECTORS
          );
          break;
        }
      }

      console.log(`  📋 Raw jobs extracted: ${jobs.length}`);

      jobs.forEach((j) => {
        if (j.link && j.title) {
          allJobs.push({
            url: j.link,
            first_seen: new Date().toISOString().split('T')[0],
            portal: target.titleHint,
            title: j.title,
            company: j.company || 'Unknown Company',
            status: 'added',
            location: j.location || 'India',
          });
        }
      });
    } catch (err) {
      console.error(`  ❌ Error scraping ${target.url}:`, err.message);
    }

    await page.close();
  }

  await browser.close();
  console.log(`\n✅ Total valid Naukri jobs extracted: ${allJobs.length}`);

  // --- Write to TSV (fixed: use real \t not \\t) ---
  const tsvPath = path.resolve('data/india-jobs.tsv');
  const header = 'url\tfirst_seen\tportal\ttitle\tcompany\tstatus\tlocation\n';

  if (!fs.existsSync(tsvPath)) {
    fs.mkdirSync('data', { recursive: true });
    fs.writeFileSync(tsvPath, header);
    console.log(`Created ${tsvPath} with header`);
  }

  // Deduplicate against existing URLs
  const existingContent = fs.existsSync(tsvPath) ? fs.readFileSync(tsvPath, 'utf8') : '';
  const existingUrls = new Set(
    existingContent
      .split('\n')
      .slice(1)
      .map((l) => l.split('\t')[0])
      .filter(Boolean)
  );

  const newJobs = allJobs.filter((j) => !existingUrls.has(j.url));
  console.log(`New jobs (not in TSV yet): ${newJobs.length}`);

  if (newJobs.length > 0) {
    const clean = (s) => (s || '').replace(/[\t\n\r]/g, ' ').trim();
    const lines = newJobs
      .map(
        (j) =>
          `${clean(j.url)}\t${clean(j.first_seen)}\t${clean(j.portal)}\t${clean(j.title)}\t${clean(j.company)}\t${clean(j.status)}\t${clean(j.location)}`
      )
      .join('\n') + '\n';
    fs.appendFileSync(tsvPath, lines);
    console.log(`✅ Appended ${newJobs.length} new jobs to ${tsvPath}`);
  } else {
    console.log('No new jobs to append (all already in TSV).');
  }

  if (allJobs.length > 0) {
    console.log('\nSample jobs found:');
    allJobs.slice(0, 5).forEach((j, i) =>
      console.log(`  ${i + 1}. [${j.portal}] ${j.title} @ ${j.company} — ${j.location}`)
    );
  }
}

scrapeNaukri();
