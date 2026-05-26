// scrape-linkedin.mjs
// Scrapes LinkedIn India for React/Frontend fresher jobs and saves to data/india-jobs.tsv
// Usage: node scrape-linkedin.mjs
// Note: LinkedIn may require login for full results. If blocked, it falls back to partial data.

import { stealthLaunch } from './stealth-browser.mjs';
import fs from 'fs';
import path from 'path';

const TSV_PATH = path.resolve('data/india-jobs.tsv');

const LINKEDIN_URLS = [
  {
    url: 'https://www.linkedin.com/jobs/search/?keywords=React+JS+Frontend+Developer&location=India&f_TPR=r86400&f_E=1%2C2&sortBy=DD',
    portal: 'LinkedIn',
    titleHint: 'React JS Frontend Developer India',
  },
  {
    url: 'https://www.linkedin.com/jobs/search/?keywords=React+JS+Developer&location=Hyderabad%2C+Telangana%2C+India&f_TPR=r86400&sortBy=DD',
    portal: 'LinkedIn',
    titleHint: 'React JS Developer Hyderabad',
  },
  {
    url: 'https://www.linkedin.com/jobs/search/?keywords=Frontend+Developer+React+Tailwind+REST+API&location=India&f_TPR=r86400&sortBy=DD',
    portal: 'LinkedIn',
    titleHint: 'Frontend Developer React Tailwind REST API',
  },
];

// Keywords that indicate the job is NOT for freshers (block these)
const BLOCK_KEYWORDS = [
  'senior', 'lead', 'principal', 'manager', 'architect', 'director', 'vp ', 'head of',
  '3+ years', '4+ years', '5+ years', '6+ years', '7+ years', '8+ years',
  'java developer', 'python developer', 'backend developer', 'devops', 'data scientist',
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

async function scrapeLinkedIn() {
  console.log('🚀 Launching Playwright to scrape LinkedIn...');

  const browser = await stealthLaunch({ headless: true });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'en-IN',
  });

  const existingURLs = loadExistingURLs();
  let allNewJobs = [];

  for (const target of LINKEDIN_URLS) {
    console.log(`\n🔍 Scraping: ${target.titleHint}`);
    const page = await context.newPage();

    try {
      await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 40000 });
      await page.waitForTimeout(4000);

      // LinkedIn job cards (public / unauthenticated)
      const jobs = await page.$$eval(
        'ul.jobs-search__results-list li, div.base-card',
        (cards) => {
          return cards.slice(0, 25).map(card => {
            const titleEl = card.querySelector(
              'h3.base-search-card__title, h3.job-search-card__title, a.base-card__full-link'
            );
            const companyEl = card.querySelector(
              'h4.base-search-card__subtitle, h4.job-search-card__company-name, a.job-search-card__subtitle-link'
            );
            const locationEl = card.querySelector(
              'span.job-search-card__location, div.job-search-card__location'
            );
            const linkEl = card.querySelector('a[href*="linkedin.com/jobs/view"]');

            return {
              title: (titleEl?.innerText || '').trim(),
              company: (companyEl?.innerText || '').trim(),
              location: (locationEl?.innerText || '').trim(),
              url: linkEl?.href || '',
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
    console.log(`\n✅ Appended ${allNewJobs.length} new LinkedIn jobs to ${TSV_PATH}`);
  } else {
    console.log('\n📭 No new LinkedIn jobs found (all duplicates or scraper blocked).');
    console.log('   Tip: LinkedIn often blocks headless scrapers. Try logging in or running with headless: false.');
  }

  return allNewJobs.length;
}

scrapeLinkedIn().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
