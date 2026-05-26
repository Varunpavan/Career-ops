// setup-phase1.mjs
// One-time setup script for Phase 1 upgrades.
// Run this ONCE before using the upgraded career-ops scripts.
//
// Usage: node setup-phase1.mjs

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log(`
╔══════════════════════════════════════════════════════════════╗
║         CAREER-OPS PHASE 1 SETUP — Stealth + Gmail OTP      ║
╚══════════════════════════════════════════════════════════════╝
`);

// ── Step 1: Install stealth packages ─────────────────────────────────────────

console.log('📦 Step 1/3: Installing stealth browser packages...');
try {
  execSync('npm install playwright-extra puppeteer-extra-plugin-stealth', {
    stdio: 'inherit',
    cwd: path.resolve('.'),
  });
  console.log('✅ Stealth packages installed.\n');
} catch (err) {
  console.error('❌ Failed to install stealth packages:', err.message);
  console.error('   Try running manually: npm install playwright-extra puppeteer-extra-plugin-stealth');
  process.exit(1);
}

// ── Step 2: Install googleapis ───────────────────────────────────────────────

console.log('📦 Step 2/3: Installing Gmail API package...');
try {
  execSync('npm install googleapis', {
    stdio: 'inherit',
    cwd: path.resolve('.'),
  });
  console.log('✅ googleapis installed.\n');
} catch (err) {
  console.error('❌ Failed to install googleapis:', err.message);
  process.exit(1);
}

// ── Step 3: Check .gitignore for sensitive files ──────────────────────────────

console.log('🔒 Step 3/3: Checking .gitignore for sensitive files...');
const gitignorePath = path.resolve('.gitignore');
const sensitiveEntries = [
  'config/gmail-credentials.json',
  'config/gmail-token.json',
  '.env',
  'data/naukri-profile/',
];

let gitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
let updated = false;

for (const entry of sensitiveEntries) {
  if (!gitignore.includes(entry)) {
    gitignore += `\n${entry}`;
    updated = true;
    console.log(`   Added to .gitignore: ${entry}`);
  }
}

if (updated) {
  fs.writeFileSync(gitignorePath, gitignore.trimStart());
  console.log('✅ .gitignore updated.\n');
} else {
  console.log('✅ .gitignore already has sensitive entries.\n');
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    SETUP COMPLETE ✅                         ║
╚══════════════════════════════════════════════════════════════╝

What's now active:
  ✅ Stealth browser — all scrapers + auto-apply now use stealth mode
  ✅ AI form filler — external company forms filled automatically
  ✅ Chatbot handler — Naukri chatbot apply automated
  ⏳ Gmail OTP reader — needs one-time setup (see below)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GMAIL OTP SETUP (do this to enable auto OTP reading):

  1. Open: https://console.cloud.google.com/
  2. Create project → name it "career-ops"
  3. Enable Gmail API:
     APIs & Services → Enable APIs → search "Gmail API" → Enable
  4. Create credentials:
     APIs & Services → Credentials → Create Credentials
     → OAuth 2.0 Client ID → Desktop App → Download JSON
  5. Save the downloaded file as:
     config/gmail-credentials.json
  6. Run:
     node read-otp.mjs --setup
  7. Sign in with varunpavan45@gmail.com in the browser
  8. Done! OTP auto-reading is now active.

SKIP GMAIL SETUP? No problem.
  The stealth browser + AI form filler work without Gmail.
  You'll just need to manually check email for OTP during login.
  (Naukri saves sessions for weeks so you rarely need OTP.)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TEST YOUR SETUP:
  node stealth-browser.mjs      — verify stealth is working
  node read-otp.mjs --setup     — set up Gmail OTP
  node scrape-naukri.mjs        — test stealth scraping
  node auto-apply-naukri.mjs    — run full stealth apply

DAILY WORKFLOW (unchanged):
  node scan-all.mjs             — find new jobs
  node auto-apply-naukri.mjs    — apply automatically
  node sync-status.mjs          — sync tracker
`);
