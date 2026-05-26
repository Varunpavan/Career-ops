# Recent Updates: Indian Portals Scraping Feature

**Date:** 2026-05-22

## Overview
Added native support for scanning Indian job portals using a specialized Playwright-based scraper. This handles React, Frontend, and UI Developer fresher roles across Naukri, Indeed India, Internshala, and Wellfound.

## Components Implemented

1. **Configuration (`portals.yml`)**
   - Added an `indian_portals` block containing query URLs and specific DOM selectors for title, company, location, and links.

2. **Scraper Logic (`india-portals-scraper.mjs`)**
   - **Anti-Detection**: Built an evasive Playwright script utilizing `headless: true`, custom arguments (`--disable-blink-features=AutomationControlled`), User-Agent rotation (Windows, Mac, Linux profiles), and randomized delays between 2s - 5s.
   - Iterates cleanly over each portal configuration and extracts job metadata robustly.

3. **CLI Runner (`india-scan.mjs`)**
   - Triggers the scraper and aggregates results.
   - Applies strict keyword filtering:
     - **Positive**: React, Frontend, UI Developer, JavaScript
     - **Negative**: .NET, Java, Senior, Lead, Manager, Principal
   - Implements deduplication against an `india-jobs.tsv` file based on a `Title + Company` signature.
   - Provides a console summary showing the counts from each portal.

4. **Agent Integration**
   - Created `modes/india-scan.md` to instruct the AI agent on how to run and interpret the `india-scan` mode.
   - Updated `CLAUDE.md` with the new `/career-ops-india-scan` command.

## Next Steps
- You can trigger the new scraper manually by running: `node india-scan.mjs`.
- Run `/career-ops-india-scan` in the CLI to trigger it via Agent.
