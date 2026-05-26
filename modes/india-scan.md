# Mode: india-scan — Indian Portal Scanner

Scans Indian job portals configured in `portals.yml` (Naukri, Indeed India, Internshala, Wellfound), filters for React/Frontend fresher roles, and saves results to `data/india-jobs.tsv`.

## Recommended Execution

Execute directly via Node.js script since it contains the specialized anti-detection Playwright logic.
```bash
node india-scan.mjs
```

## Behavior

1. **Loads Configuration**: Reads `indian_portals` block from `portals.yml`.
2. **Anti-Detection Playwright**: Launches headless Chromium with stealth arguments and rotating User-Agents.
3. **Scrapes Configured Queries**: Hits Naukri, Indeed IN, Internshala, and Wellfound endpoints.
4. **Applies Delays**: Random 2-5 seconds delay to prevent rate-limiting.
5. **Extracts Fields**: Grabs `title`, `company`, `location`, and `url`.
6. **Filters**: Keeps only jobs matching React/Frontend keywords (excluding Java, .NET, senior, etc.).
7. **Deduplicates**: Cross-references against `data/india-jobs.tsv` to prevent appending the same `title + company` twice.
8. **Saves**: Appends to `data/india-jobs.tsv` in TSV format.
9. **Summarizes**: Outputs a portal-by-portal breakdown of newly discovered opportunities.

## Usage Note

This scraper handles specific bot protections (particularly Indeed India) using `india-portals-scraper.mjs`. Since it is highly specific, it runs independently from the core `scan.mjs` pipeline, but generates a TSV output structured similarly to the project's native trackers.
