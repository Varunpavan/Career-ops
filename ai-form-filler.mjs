// ai-form-filler.mjs
// Uses Google Gemini AI to analyze company career page forms and fill them.
// Gemini vision reads the form screenshot and returns selectors + values to fill.
//
// SETUP: Add GEMINI_API_KEY=your-key to your .env file
// Get free key at: https://aistudio.google.com/app/apikey

import fs from 'fs';
import path from 'path';

// ── Load .env ─────────────────────────────────────────────────────────────────

function loadEnv() {
  try {
    const env = fs.readFileSync('.env', 'utf8');
    env.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    });
  } catch {}
}
loadEnv();

// ── Candidate profile ─────────────────────────────────────────────────────────

const DEFAULT_CANDIDATE = {
  fullName:     'Varun Pavan Sai Chadalavada',
  firstName:    'Varun',
  lastName:     'Pavan Sai Chadalavada',
  email:        'varunpavan45@gmail.com',
  phone:        '8688128008',
  location:     'Hyderabad, Telangana, India',
  linkedin:     'https://www.linkedin.com/in/varun-pavan-4b43b2214/',
  github:       'https://github.com/Varunpavan',
  experience:   '0',
  ctc:          '0',
  expectedCtc:  '400000',
  noticePeriod: '0',
  skills:       'HTML, CSS, Bootstrap, JavaScript, React.js, TypeScript, REST APIs, AWS, Figma',
  summary:      'Frontend Developer fresher with hands-on React.js project experience. Immediate joiner, targeting ₹3.5–6 LPA.',
};

// ── Gemini API call ───────────────────────────────────────────────────────────

async function askGemini(prompt, imageBase64 = null) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env file');

  const parts = [];
  if (imageBase64) {
    parts.push({ inline_data: { mime_type: 'image/png', data: imageBase64 } });
  }
  parts.push({ text: prompt });

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }] }),
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Gemini API error ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ── Screenshot helper ─────────────────────────────────────────────────────────

async function takeFormScreenshot(page) {
  try {
    const screenshotPath = path.resolve('data/form-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const buf = fs.readFileSync(screenshotPath);
    return buf.toString('base64');
  } catch {
    return null;
  }
}

// ── Parse Gemini JSON response ────────────────────────────────────────────────

function parseGeminiResponse(text) {
  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                      text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    }
  } catch { /* ignore */ }
  return null;
}

// ── Main: aiFillForm ──────────────────────────────────────────────────────────

export async function aiFillForm(page, candidate = DEFAULT_CANDIDATE, cvPath = null) {
  const notes = [];
  let filled = 0;
  let submitted = false;

  console.log('\n   🤖 AI Form Filler (Gemini) activated...');

  try {
    await page.waitForTimeout(2000);
    const pageUrl = page.url();
    const pageTitle = await page.title().catch(() => '');
    console.log(`   📄 Analyzing: ${pageTitle || pageUrl}`);

    // Screenshot for visual analysis
    const screenshot = await takeFormScreenshot(page);

    // Simplified form HTML
    const formHTML = await page.evaluate(() => {
      const forms = document.querySelectorAll('form, [role="form"], .application-form, #application');
      const target = forms[0] || document.body;
      const elements = [];
      target.querySelectorAll('input, select, textarea, button[type="submit"], label').forEach(el => {
        const info = {
          tag: el.tagName.toLowerCase(),
          type: el.type || '',
          name: el.name || '',
          id: el.id || '',
          placeholder: el.placeholder || '',
          label: '',
          required: el.required,
          options: [],
        };
        if (el.id) {
          const label = document.querySelector(`label[for="${el.id}"]`);
          if (label) info.label = label.textContent.trim();
        }
        if (el.tagName === 'SELECT') {
          info.options = Array.from(el.options).map(o => ({ value: o.value, text: o.text }));
        }
        if (info.type !== 'hidden') elements.push(info);
      });
      return JSON.stringify(elements.slice(0, 40));
    }).catch(() => '[]');

    const prompt = `You are helping fill a job application form automatically using Gemini vision.

CANDIDATE PROFILE:
${JSON.stringify(candidate, null, 2)}

FORM URL: ${pageUrl}
PAGE TITLE: ${pageTitle}

FORM ELEMENTS DETECTED:
${formHTML}

Look at the screenshot and the form elements above.

Return ONLY a JSON object (no explanation outside json block):
\`\`\`json
{
  "fills": [
    {
      "selector": "CSS selector to target the field",
      "value": "value to fill",
      "action": "fill|select|click|upload",
      "label": "what field this is"
    }
  ],
  "can_submit": true,
  "notes": ["any notes"]
}
\`\`\`

Rules:
- Use most specific CSS selector (prefer id > name > placeholder)
- fill = text inputs, select = dropdowns, click = checkboxes/radio, upload = file
- For file upload: action = "upload"
- Fresher = 0 years experience, immediate joiner
- Expected CTC: 4 LPA (400000)
- Only include fields you are confident about`;

    console.log('   💭 Asking Gemini to analyze the form...');
    const geminiResponse = await askGemini(prompt, screenshot);
    const instructions = parseGeminiResponse(geminiResponse);

    if (!instructions || !instructions.fills?.length) {
      console.log('   ⚠️  Gemini could not identify fillable fields');
      notes.push('Gemini analysis returned no fills');
      return { filled: 0, submitted: false, notes };
    }

    notes.push(...(instructions.notes || []));
    console.log(`   📋 Gemini identified ${instructions.fills.length} fields to fill:`);

    // Execute fills
    for (const fill of instructions.fills) {
      try {
        console.log(`   → ${fill.label}: "${fill.value}" (${fill.action})`);

        if (fill.action === 'fill') {
          const el = await page.$(fill.selector);
          if (el) {
            await el.click({ clickCount: 3 });
            await el.fill('');
            await el.type(fill.value, { delay: 30 });
            filled++;
          }
        } else if (fill.action === 'select') {
          await page.selectOption(fill.selector, { label: fill.value }).catch(async () => {
            await page.selectOption(fill.selector, { value: fill.value }).catch(() => {});
          });
          filled++;
        } else if (fill.action === 'click') {
          const el = await page.$(fill.selector);
          if (el) { await el.click(); filled++; }
        } else if (fill.action === 'upload' && cvPath) {
          const fileInput = await page.$(fill.selector);
          if (fileInput) {
            await fileInput.setInputFiles(cvPath);
            console.log(`   📎 Uploaded CV: ${path.basename(cvPath)}`);
            filled++;
          }
        }
      } catch (err) {
        notes.push(`Failed to fill "${fill.label}": ${err.message}`);
      }
      await page.waitForTimeout(300);
    }

    // Auto-upload CV if not done yet
    if (cvPath && !instructions.fills.some(f => f.action === 'upload')) {
      const fileInputs = await page.$$('input[type="file"]');
      for (const fi of fileInputs) {
        try {
          await fi.setInputFiles(cvPath);
          console.log(`   📎 Auto-uploaded CV: ${path.basename(cvPath)}`);
          filled++;
          break;
        } catch { /* try next */ }
      }
    }

    // Auto-submit if Gemini says it's safe
    if (instructions.can_submit) {
      await page.waitForTimeout(1000);
      const submitBtn = await page.$('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Apply")');
      if (submitBtn) {
        const btnText = await submitBtn.innerText().catch(() => '');
        console.log(`   🚀 Auto-submitting (button: "${btnText}")...`);
        await submitBtn.click();
        await page.waitForTimeout(3000);

        const bodyText = await page.evaluate(() => document.body.innerText).catch(() => '');
        if (bodyText.toLowerCase().match(/thank|success|submitted|applied|received/)) {
          submitted = true;
          console.log('   ✅ Form submitted successfully!');
        }
      }
    }

    console.log(`   ✅ Gemini fill complete: ${filled} fields filled, submitted: ${submitted}`);

  } catch (err) {
    const msg = `AI form filler error: ${err.message}`;
    console.error(`   ❌ ${msg}`);
    notes.push(msg);
  }

  return { filled, submitted, notes };
}

// ── CLI test ──────────────────────────────────────────────────────────────────

const isMain = process.argv[1]?.endsWith('ai-form-filler.mjs');
if (isMain) {
  const testUrl = process.argv[2];
  if (!testUrl) {
    console.log('Usage: node ai-form-filler.mjs <career-page-url>');
    process.exit(0);
  }
  (async () => {
    const { stealthLaunch } = await import('./stealth-browser.mjs');
    const browser = await stealthLaunch({ headless: false });
    const page = await browser.newPage();
    try {
      await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      const result = await aiFillForm(page, DEFAULT_CANDIDATE, null);
      console.log('\n📊 Result:', result);
      await page.waitForTimeout(30000);
    } finally {
      await browser.close();
    }
  })().catch(console.error);
}
