import fs from 'fs';
import path from 'path';
import { scrapeAllIndianPortals } from './india-portals-scraper.mjs';

const OUTPUT_FILE = path.join('data', 'india-jobs.tsv');

function passesFilter(title) {
    if (!title) return false;
    const lowerTitle = title.toLowerCase();
    
    // Positive keywords
    const positives = ['react', 'frontend', 'front end', 'front-end', 'ui developer', 'javascript', 'fullstack', 'full stack'];
    const hasPositive = positives.some(kw => lowerTitle.includes(kw));
    
    // Negative keywords
    const negatives = ['.net', 'java ', 'php', 'ruby', 'python', 'angular', 'vue', 'senior', 'lead', 'manager', 'principal'];
    const hasNegative = negatives.some(kw => lowerTitle.includes(kw));
    
    return hasPositive && !hasNegative;
}

export async function runIndiaScan() {
    console.log('Starting Indian Portal Scan for Fresher Roles...');
    
    const jobs = await scrapeAllIndianPortals();
    
    console.log(`\nTotal jobs scraped: ${jobs.length}`);
    
    // Filter
    const filteredJobs = jobs.filter(job => passesFilter(job.title));
    console.log(`Jobs passing title filter: ${filteredJobs.length}`);
    
    // Load existing seen to deduplicate
    const seenSignatures = new Set();
    const seenUrls = new Set();
    if (fs.existsSync(OUTPUT_FILE)) {
        const lines = fs.readFileSync(OUTPUT_FILE, 'utf8').split('\n');
        for (const line of lines) {
            if (!line.trim() || line.startsWith('url\t')) continue;
            const parts = line.split('\t');
            if (parts.length >= 5) {
                const url = parts[0];
                const title = parts[3];
                const company = parts[4];
                seenUrls.add(url);
                seenSignatures.add(`${title}::${company}`.toLowerCase());
            }
        }
    } else {
        // Create file with header
        fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
        fs.writeFileSync(OUTPUT_FILE, 'url\tfirst_seen\tportal\ttitle\tcompany\tstatus\tlocation\n');
    }
    
    // Deduplicate
    const newJobs = [];
    for (const job of filteredJobs) {
        const signature = `${job.title}::${job.company}`.toLowerCase();
        if (!seenUrls.has(job.url) && !seenSignatures.has(signature)) {
            newJobs.push(job);
            seenUrls.add(job.url);
            seenSignatures.add(signature);
        }
    }
    
    console.log(`New deduplicated jobs: ${newJobs.length}`);
    
    // Save to TSV
    if (newJobs.length > 0) {
        const linesToAppend = newJobs.map(j => {
            // Clean up tabs/newlines in fields to avoid breaking TSV
            const clean = str => (str || '').replace(/[\t\n\r]/g, ' ').trim();
            return `${clean(j.url)}\t${clean(j.first_seen)}\t${clean(j.query_name || j.portal)}\t${clean(j.title)}\t${clean(j.company)}\tadded\t${clean(j.location)}`;
        }).join('\n') + '\n';
        
        fs.appendFileSync(OUTPUT_FILE, linesToAppend);
    }
    
    // Print Summary
    console.log('\n========================================');
    console.log('       India Scan Summary');
    console.log('========================================');
    const portalCounts = newJobs.reduce((acc, job) => {
        acc[job.portal] = (acc[job.portal] || 0) + 1;
        return acc;
    }, {});
    
    for (const [portal, count] of Object.entries(portalCounts)) {
        console.log(`- ${portal}: ${count} new jobs`);
    }
    
    if (newJobs.length === 0) {
        console.log('No new jobs found.');
    } else {
        console.log('\nDetails:');
        newJobs.forEach((j, i) => {
            console.log(`  ${i+1}. [${j.portal}] ${j.title} @ ${j.company} (${j.location})`);
        });
        console.log(`\nSaved to ${OUTPUT_FILE}`);
    }
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runIndiaScan().catch(console.error);
}
