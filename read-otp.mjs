// read-otp.mjs
// Automatically reads OTP codes from Gmail when Naukri / Indeed sends them.
// Zero cost — uses Google Gmail API (free tier, no billing needed).
//
// ── ONE-TIME SETUP (do this once) ───────────────────────────────────────────
//
//  Step 1: Go to https://console.cloud.google.com/
//  Step 2: Create a new project (e.g. "career-ops")
//  Step 3: Enable the Gmail API:
//           APIs & Services → Enable APIs → search "Gmail API" → Enable
//  Step 4: Create credentials:
//           APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
//           Application type: Desktop App
//           Download the JSON file → save as config/gmail-credentials.json
//  Step 5: Run this once to authorize:
//           node read-otp.mjs --setup
//           → Opens browser → Sign in with varunpavan45@gmail.com → allow access
//           → Saves token to config/gmail-token.json (never share this file)
//  Step 6: Add to .gitignore:
//           config/gmail-token.json
//           config/gmail-credentials.json
//
// ── USAGE ───────────────────────────────────────────────────────────────────
//
//  Standalone test:
//    node read-otp.mjs
//    → waits 60s for a new OTP email, prints the code
//
//  From another script:
//    import { waitForOTP } from './read-otp.mjs';
//    const code = await waitForOTP({ from: 'naukri', timeoutMs: 60000 });
//    if (code) console.log('OTP:', code);

import fs from 'fs';
import path from 'path';
import http from 'http';
import { execSync } from 'child_process';

const CREDENTIALS_PATH = path.resolve('config/gmail-credentials.json');
const TOKEN_PATH        = path.resolve('config/gmail-token.json');
const SCOPES           = ['https://www.googleapis.com/auth/gmail.readonly'];

// ── Install googleapis if missing ─────────────────────────────────────────────

async function ensureGoogleApis() {
  try {
    await import('googleapis');
  } catch {
    console.log('📦 Installing googleapis (one-time)...');
    execSync('npm install googleapis', { stdio: 'inherit', cwd: path.resolve('.') });
    console.log('✅ googleapis installed.\n');
  }
}

// ── OAuth2 setup ──────────────────────────────────────────────────────────────

async function getAuthClient() {
  await ensureGoogleApis();
  const { google } = await import('googleapis');

  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error(`\n❌ Gmail credentials not found at: ${CREDENTIALS_PATH}`);
    console.error('   Follow the setup steps in the comments at the top of read-otp.mjs');
    console.error('   Or run: node read-otp.mjs --setup-help');
    process.exit(1);
  }

  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const { client_secret, client_id, redirect_uris } = creds.installed || creds.web;

  const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    auth.setCredentials(token);

    // Auto-refresh if expired
    if (token.expiry_date && Date.now() > token.expiry_date - 60000) {
      try {
        const { credentials } = await auth.refreshAccessToken();
        auth.setCredentials(credentials);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials, null, 2));
        console.log('🔄 Gmail token refreshed.');
      } catch (e) {
        console.warn('⚠️  Token refresh failed — re-running setup...');
        return await runSetup(auth);
      }
    }
  } else {
    return await runSetup(auth);
  }

  return { auth, google };
}

async function runSetup(auth) {
  const { google } = await import('googleapis');
  console.log('\n🔐 Gmail Authorization Required\n');
  console.log('Opening browser for Gmail login...\n');

  const authUrl = auth.generateAuthUrl({ access_type: 'offline', scope: SCOPES });

  // Try to open browser
  try {
    const open = (await import('open').catch(() => null))?.default;
    if (open) await open(authUrl);
    else console.log('Open this URL in your browser:\n', authUrl);
  } catch {
    console.log('Open this URL in your browser:\n', authUrl);
  }

  // Start local server to capture the code
  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost:3000');
      const code = url.searchParams.get('code');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>✅ Gmail authorized! You can close this tab.</h1>');
      server.close();
      if (code) resolve(code);
      else reject(new Error('No code in redirect'));
    });
    server.listen(3000, () => console.log('Waiting for Gmail authorization on http://localhost:3000 ...'));
    setTimeout(() => { server.close(); reject(new Error('Timeout')); }, 120000);
  });

  const { tokens } = await auth.getToken(code);
  auth.setCredentials(tokens);
  fs.mkdirSync('config', { recursive: true });
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log('✅ Gmail authorized! Token saved to config/gmail-token.json\n');

  return { auth, google };
}

// ── OTP extraction from email body ────────────────────────────────────────────

function extractOTP(text) {
  if (!text) return null;

  // Patterns: 6-digit codes, sometimes with spaces, dashes, or "OTP is XXXXXX"
  const patterns = [
    /\b(\d{6})\b/,                          // plain 6-digit
    /OTP[:\s]+(\d{6})/i,                    // "OTP: 123456"
    /code[:\s]+(\d{6})/i,                   // "code: 123456"
    /verification[:\s]+(\d{6})/i,           // "verification: 123456"
    /one[- ]time[- ]password[:\s]+(\d{6})/i,// "one-time password: 123456"
    /(\d{3})[- ](\d{3})/,                  // "123 456" or "123-456"
  ];

  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) {
      // Join split patterns
      return (m[2] ? m[1] + m[2] : m[1]).replace(/\D/g, '');
    }
  }
  return null;
}

function decodeBase64(data) {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function extractTextFromMessage(msg) {
  const parts = msg.payload?.parts || [];
  const body = msg.payload?.body;

  // Single-part message
  if (body?.data) return decodeBase64(body.data);

  // Multi-part — prefer text/plain
  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return decodeBase64(part.body.data);
    }
  }
  // Fall back to text/html
  for (const part of parts) {
    if (part.mimeType === 'text/html' && part.body?.data) {
      return decodeBase64(part.body.data).replace(/<[^>]+>/g, ' ');
    }
  }
  return '';
}

// ── Main export: waitForOTP ───────────────────────────────────────────────────

/**
 * Wait for an OTP email and return the code.
 *
 * @param {object} opts
 * @param {string} opts.from     - Filter by sender keyword: 'naukri', 'indeed', 'linkedin', or null for any
 * @param {number} opts.timeoutMs - How long to wait (default: 60000ms = 60s)
 * @param {number} opts.pollMs   - How often to check (default: 4000ms)
 * @returns {Promise<string|null>} - 6-digit OTP string or null if timed out
 */
export async function waitForOTP({ from = null, timeoutMs = 60000, pollMs = 4000 } = {}) {
  const { auth, google } = await getAuthClient();
  const gmail = google.gmail({ version: 'v1', auth });

  console.log(`\n📬 Watching Gmail for OTP${from ? ` from ${from}` : ''}...`);
  console.log(`   (waiting up to ${timeoutMs / 1000}s)`);

  const startTime = Date.now();
  const seenIds = new Set();

  // Pre-load existing message IDs so we only catch NEW ones
  try {
    const existing = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 20,
      q: buildQuery(from),
    });
    (existing.data.messages || []).forEach(m => seenIds.add(m.id));
  } catch { /* ignore on first run */ }

  while (Date.now() - startTime < timeoutMs) {
    await sleep(pollMs);

    try {
      const res = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 10,
        q: buildQuery(from),
      });

      const messages = res.data.messages || [];
      for (const { id } of messages) {
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        const msg = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
        const text = extractTextFromMessage(msg.data);
        const otp = extractOTP(text);

        if (otp) {
          console.log(`\n✅ OTP found: ${otp}`);
          return otp;
        }
      }
    } catch (err) {
      console.warn('  ⚠️  Gmail poll error:', err.message);
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    process.stdout.write(`\r   ⏳ Waiting... ${elapsed}s / ${timeoutMs / 1000}s`);
  }

  console.log('\n⏰ OTP timeout — no code received within the time limit.');
  return null;
}

function buildQuery(from) {
  const senders = from
    ? [`from:${from}`]
    : ['from:naukri', 'from:indeed', 'from:linkedin', 'from:internshala'];
  return `(${senders.join(' OR ')}) subject:(OTP OR verification OR code OR login) newer_than:2m`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── CLI: standalone test / setup ──────────────────────────────────────────────

const isMain = process.argv[1]?.endsWith('read-otp.mjs');

if (isMain) {
  const arg = process.argv[2];

  if (arg === '--setup-help') {
    console.log(`
Gmail OTP Setup Guide
═════════════════════
1. Go to: https://console.cloud.google.com/
2. Create project → "career-ops"
3. Enable Gmail API: APIs & Services → Enable APIs → Gmail API
4. Create credentials: OAuth 2.0 Client ID → Desktop App
5. Download JSON → save as: config/gmail-credentials.json
6. Run: node read-otp.mjs --setup
7. Sign in with varunpavan45@gmail.com in the browser
8. Done — token saved to config/gmail-token.json

Add to .gitignore:
  config/gmail-credentials.json
  config/gmail-token.json
`);
  } else if (arg === '--setup') {
    console.log('Starting Gmail OAuth setup...');
    getAuthClient().then(() => {
      console.log('✅ Setup complete! Run: node read-otp.mjs   to test OTP reading.');
    }).catch(console.error);
  } else {
    console.log('Testing Gmail OTP reader...');
    console.log('Send an OTP to varunpavan45@gmail.com now (e.g. trigger a Naukri login)');
    waitForOTP({ timeoutMs: 90000 })
      .then(code => {
        if (code) console.log(`\n🎉 SUCCESS — OTP code: ${code}`);
        else console.log('\n❌ No OTP received. Try again or check setup.');
      })
      .catch(console.error);
  }
}
