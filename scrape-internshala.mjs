// scrape-internshala.mjs
// Scrapes Internshala for React/Frontend fresher jobs and saves to data/india-jobs.tsv
// Replaces old test-internshala.mjs which only printed raw HTML.
// Usage: node scrape-internshala.mjs

import { stealthLaunch } from './stealth-browser.mjs';
import fs from 'fs';
import path from 'path';

const TSV_PATH = path.resolve('data/india-jobs.tsv');

const INTERNSHALA_URLS = [
  {
    url: 'https://internshala.com/jobs/react-jobs/',
    portal: 'Internshala',
    titleHint: 'React Jobs',
  },
  {
    url: 'https://internshala.com/fresher-jobs/front-end-development-jobs/',
    portal: 'Internshala',
    titleHint: 'Front-End Development Jobs',
  },
];

const BLOCK_KEYWORDS = [
  'senior', 'lead', 'manager', 'architect', 'director',
  'java developer', 'python developer', 'backend developer',
  'data scientist', 'devops', 'angular developer',
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

async function scrapeInternshala() {
  console.log('🚀 Launching Playwright to scrape Internshala...');

  const browser = await stealthLaunch({ headless: true });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'en-IN',
  });

  const existingURLs = loadExistingURLs();
  let allNewJobs = [];

  for (const target of INTERNSHALA_URLS) {
    console.log(`\n🔍 Scraping: ${target.titleHint}`);
    const page = await context.newPage();

    try {
      await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 40000 });
      await page.waitForTimeout(4000);

      // Internshala job card selectors (current DOM 2026)
      const jobs = await page.$$eval(
        '.individual_internship, .job-internship-card, div[class*="internship_meta"]',
        (cards) => {
          return cards.slice(0, 20).map(card => {
            // Title
            const titleEl = card.querySelector(
              'h3.job-internship-name a, h3 a, .profile a, a[class*="view-internship-"]'
            );
            // Company
            const companyEl = card.querySelector(
              '.company-name a, .company-name, p.company-name, a[class*="link_display_"]'
            );
            // Location
            const locationEl = card.querySelector(
              '.location_link, .location a, span[class*="location"]'
            );
            // URL
            const linkEl = card.querySelector(
              'h3 a, a[class*="view-internship-"], .profile a'
            );

            let url = linkEl?.href || '';
            if (url && !url.startsWith('http')) {
              url = 'https://internshala.com' + url;
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
    console.log(`\n✅ Appended ${allNewJobs.length} new Internshala jobs to ${TSV_PATH}`);
  } else {
    console.log('\n📭 No new Internshala jobs found.');
  }

  return allNewJobs.length;
}

scrapeInternshala().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
