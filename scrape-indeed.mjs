// scrape-indeed.mjs
// Scrapes Indeed India for React/Frontend fresher jobs and saves to data/india-jobs.tsv
// Replaces the old test-indeed.mjs which only printed to console.
// Usage: node scrape-indeed.mjs

import { stealthLaunch } from './stealth-browser.mjs';
import fs from 'fs';
import path from 'path';

const TSV_PATH = path.resolve('data/india-jobs.tsv');

const INDEED_URLS = [
  {
    url: 'https://in.indeed.com/jobs?q=react+js+frontend+developer+fresher&l=Hyderabad%2C+Telangana&fromage=1',
    portal: 'Indeed',
    titleHint: 'React JS Frontend Developer Fresher Hyderabad',
  },
];

const BLOCK_KEYWORDS = [
  'senior', 'lead', 'principal', 'manager', 'architect', 'director',
  '3+ year', '4+ year', '5+ year', '6+ year', '7+ year',
  'java', 'python', 'backend', 'devops', 'data scientist', 'machine learning',
  'angular developer', '.net developer',
];

function isBadJob(title) {
  const lower = title.toLowerCase();
  return BLOCK_KEYWORDS.some(kw => lower.includes(kw));
}

// ─── TSV helpers ──────────────────────────────────────────────────────────────

function loadExistingURLs() {
  if (!fs.existsSync(TSV_PATH)) return new Set();
  const raw = fs.readFileSync(TSV_PATH, 'utf8');
  return new Set(raw.split('\n').slice(1).map(l => l.split('\t')[0]).filter(Boolean));
}

function appendToTSV(jobs) {
  const header = 'url\tfirst_seen\tportal\ttitle\tcompany\tstatus\tlocation\n';
  if (!fs.existsSync(TSV_PATH)) {
    fs.writeFileSync(TSV_PATH, header, 'utf8');
  }
  const lines = jobs.map(j =>
    [j.url, j.first_seen, j.portal, j.title, j.company, 'added', j.location].join('\t')
  ).join('\n');
  if (lines) fs.appendFileSync(TSV_PATH, lines + '\n', 'utf8');
}

// ─── Scraper ──────────────────────────────────────────────────────────────────

async function scrapeIndeed() {
  console.log('🚀 Launching Playwright to scrape Indeed India...');

  const browser = await stealthLaunch({ headless: true });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'en-IN',
    geolocation: { latitude: 17.385, longitude: 78.4867 }, // Hyderabad
    permissions: ['geolocation'],
  });

  const existingURLs = loadExistingURLs();
  let allNewJobs = [];

  for (const target of INDEED_URLS) {
    console.log(`\n🔍 Scraping: ${target.titleHint}`);
    const page = await context.newPage();

    try {
      await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 40000 });
      await page.waitForTimeout(3500);

      // Indeed job card selectors (current DOM as of 2026)
      const jobs = await page.$$eval(
        'div.job_seen_beacon, li.css-5lfssm, div[class*="jobsearch-ResultsList"] > li',
        (cards) => {
          return cards.slice(0, 25).map(card => {
            const titleEl = card.querySelector(
              'h2.jobTitle a span[id^="jobTitle"], h2.jobTitle a, a[data-jk]'
            );
            const companyEl = card.querySelector(
              '[data-testid="company-name"], span[class*="company"]'
            );
            const locationEl = card.querySelector(
              '[data-testid="text-location"], div[class*="location"]'
            );
            const linkEl = card.querySelector('a[href*="/rc/clk"], a[href*="/pagead/clk"], h2 a');

            let url = linkEl?.href || '';
            // Normalise relative URLs
            if (url && !url.startsWith('http')) {
              url = 'https://in.indeed.com' + url;
            }

            return {
              title: (titleEl?.innerText || titleEl?.textContent || '').trim(),
              company: (companyEl?.innerText || companyEl?.textContent || '').trim(),
              location: (locationEl?.innerText || locationEl?.textContent || '').trim(),
              url,
            };
          });
        }
      );

      const filtered = jobs.filter(j => j.url && j.title && !isBadJob(j.title));
      const newJobs = filtered
        .filter(j => !existingURLs.has(j.url))
        .map(j => ({
          ...j,
          first_seen: new Date().toISOString().split('T')[0],
          portal: target.portal,
        }));

      console.log(`   Found ${jobs.length} cards → ${filtered.length} valid → ${newJobs.length} new`);
      newJobs.forEach(j => {
        console.log(`   ✅ ${j.title} @ ${j.company} (${j.location})`);
        existingURLs.add(j.url);
      });

      allNewJobs = allNewJobs.concat(newJobs);
    } catch (err) {
      console.log(`   ⚠️  Error scraping ${target.titleHint}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();

  if (allNewJobs.length > 0) {
    appendToTSV(allNewJobs);
    console.log(`\n✅ Appended ${allNewJobs.length} new Indeed jobs to ${TSV_PATH}`);
  } else {
    console.log('\n📭 No new Indeed jobs found (all duplicates or scraper blocked).');
  }

  return allNewJobs.length;
}

scrapeIndeed().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
