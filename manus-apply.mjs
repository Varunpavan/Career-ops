// manus-apply.mjs — Manus-style Continuous Vision Loop
//
// HOW IT WORKS (exactly like Manus AI):
//   1. Takes a screenshot of the current browser state
//   2. Sends it to Gemini vision: "What do you see? What should I do next?"
//   3. Gemini returns ONE action (fill this field / click this button / etc.)
//   4. Script executes that action
//   5. Takes another screenshot and repeats
//   6. Stops when Gemini detects success or form is fully submitted
//
// This handles ANY company career portal automatically:
//   Greenhouse, Lever, Ashby, Workday, custom ATS, multi-page forms, etc.
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
  summary:      'Frontend Developer fresher with hands-on React.js experience. Immediate joiner, targeting ₹3.5–6 LPA.',
};

// ── Gemini API ────────────────────────────────────────────────────────────────

async function askGemini(prompt, imageBase64 = null) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env file. Get one free at https://aistudio.google.com/app/apikey');

  const parts = [];
  if (imageBase64) {
    parts.push({ inline_data: { mime_type: 'image/png', data: imageBase64 } });
  }
  parts.push({ text: prompt });

  const models = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];
  let lastError = null;

  for (const model of models) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }] }),
        }
      );

      if (resp.status === 429 || resp.status === 404 || resp.status === 400) {
        const errText = await resp.text().catch(() => '');
        console.log(`   ⚠️  Model ${model} returned status ${resp.status}. Trying next model...`);
        lastError = new Error(`Gemini model ${model} status ${resp.status}: ${errText}`);
        continue;
      }

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        throw new Error(`Gemini API error ${resp.status}: ${errText}`);
      }

      const data = await resp.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (e) {
      console.log(`   ⚠️  Failed to query ${model}: ${e.message}`);
      lastError = e;
    }
  }

  throw new Error(`All Gemini models failed. Last error: ${lastError ? lastError.message : 'Unknown error'}`);
}

// ── Parse JSON from Gemini response ──────────────────────────────────────────

function parseJSON(text) {
  try {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[1] || match[0]);
  } catch {}
  return null;
}

// ── Screenshot ────────────────────────────────────────────────────────────────

async function takeScreenshot(page) {
  try {
    const p = path.resolve('data/manus-screen.png');
    await page.screenshot({ path: p, fullPage: false });
    return fs.readFileSync(p).toString('base64');
  } catch {
    return null;
  }
}

// ── Check if page shows success ───────────────────────────────────────────────

async function isSuccessPage(page) {
  const bodyText = await page.evaluate(() => document.body.innerText).catch(() => '');
  return /thank you|application submitted|successfully applied|we.ve received|application received|you.ve applied|your application/i.test(bodyText);
}

// ── Execute one action from Gemini ────────────────────────────────────────────

async function executeAction(page, instruction, cvPath) {
  const { action, selector, value } = instruction;

  try {
    switch (action) {

      case 'fill': {
        if (!selector) return false;
        
        let cleanSelector = selector
          .replace(/:contains\((.*?)\)/g, ':has-text($1)')
          .replace(/:contains/g, ':has-text');

        const subSelectors = cleanSelector.split(',').map(s => s.trim());
        let el = null;
        for (const subSel of subSelectors) {
          try {
            el = await page.$(subSel);
            if (el) break;
          } catch (selErr) {
            console.log(`   ⚠️ Fill sub-selector "${subSel}" failed: ${selErr.message}`);
          }
        }

        if (!el) {
          console.log(`   ⚠️  Selector not found: ${selector}`);
          return false;
        }

        await el.scrollIntoViewIfNeeded().catch(() => {});
        try {
          await el.click({ clickCount: 3, timeout: 3000 });
          await el.fill('');
          await el.type(String(value || ''), { delay: 25 });
        } catch (fillErr) {
          console.log(`   ⚠️ Standard fill failed (${fillErr.message}). Trying DOM-based value assignment fallback...`);
          await page.evaluate(({ element, val }) => {
            element.value = val;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }, { element: el, val: String(value || '') }).catch(() => {});
        }
        return true;
      }

      case 'select': {
        if (!selector) return false;

        let cleanSelector = selector
          .replace(/:contains\((.*?)\)/g, ':has-text($1)')
          .replace(/:contains/g, ':has-text');

        const subSelectors = cleanSelector.split(',').map(s => s.trim());
        let el = null;
        let matchedSelector = '';
        for (const subSel of subSelectors) {
          try {
            el = await page.$(subSel);
            if (el) {
              matchedSelector = subSel;
              break;
            }
          } catch (selErr) {
            console.log(`   ⚠️ Select sub-selector "${subSel}" failed: ${selErr.message}`);
          }
        }

        if (!el) {
          console.log(`   ⚠️  Select element not found: ${selector}`);
          return false;
        }

        await el.scrollIntoViewIfNeeded().catch(() => {});
        const tagName = await el.evaluate(node => node.tagName.toLowerCase()).catch(() => '');

        if (tagName === 'select') {
          // Native Select element
          console.log(`   📝 Native select element matched.`);
          try {
            // Get available options for logging/matching
            const options = await page.evaluate((sel) => {
              const selectEl = document.querySelector(sel);
              if (!selectEl) return [];
              return Array.from(selectEl.options).map(o => ({ text: o.text.trim(), value: o.value.trim() }));
            }, matchedSelector).catch(() => []);
            console.log(`   📋 Available options:`, options.map(o => `"${o.text}"` || `"${o.value}"`).join(', '));

            // Find closest matching option text/value (case-insensitive fuzzy match)
            const targetVal = String(value).toLowerCase().trim();
            const bestMatch = options.find(o => 
              o.text.toLowerCase().includes(targetVal) || 
              o.value.toLowerCase().includes(targetVal)
            );

            const selectVal = bestMatch ? bestMatch.value : String(value);
            console.log(`   📝 Selecting option value: "${selectVal}"`);

            await page.selectOption(matchedSelector, selectVal);
            
            // Dispatch events to ensure page frameworks detect change
            await page.evaluate((sel) => {
              const selectEl = document.querySelector(sel);
              if (selectEl) {
                selectEl.dispatchEvent(new Event('input', { bubbles: true }));
                selectEl.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }, matchedSelector).catch(() => {});
            
            return true;
          } catch (selectErr) {
            console.log(`   ⚠️ Native select option selection failed: ${selectErr.message}`);
          }
        }

        // Custom Dropdown / Fallback: Click dropdown element, wait, and click the option by text
        console.log(`   📝 Non-native select or fallback dropdown. Triggering click to open...`);
        try {
          await el.click({ timeout: 3000 });
          await page.waitForTimeout(1000);

          // Find option containing the target value text and click it
          const clicked = await page.evaluate((val) => {
            const elements = Array.from(document.querySelectorAll('div, li, span, a, option'));
            const option = elements.find(node => {
              const text = (node.innerText || '').toLowerCase().trim();
              return text === val.toLowerCase().trim() || text.includes(val.toLowerCase().trim());
            });
            if (option) {
              option.click();
              return true;
            }
            return false;
          }, String(value));

          if (clicked) {
            console.log(`   ✅ Selected option "${value}" via custom dropdown click.`);
            return true;
          }
        } catch (dropdownErr) {
          console.log(`   ⚠️ Custom dropdown selection failed: ${dropdownErr.message}`);
        }

        return false;
      }

      case 'click': {
        if (!selector) return false;
        
        // Clean/transform selectors: replace :contains with :has-text
        let cleanSelector = selector
          .replace(/:contains\((.*?)\)/g, ':has-text($1)')
          .replace(/:contains/g, ':has-text');

        // Split comma-separated selectors to try them individually, preventing syntax errors from killing the step
        const subSelectors = cleanSelector.split(',').map(s => s.trim());
        
        let el = null;
        for (const subSel of subSelectors) {
          try {
            el = await page.$(subSel);
            if (el) {
              console.log(`   🎯 Found target element with sub-selector: "${subSel}"`);
              break;
            }
          } catch (selErr) {
            console.log(`   ⚠️ Sub-selector "${subSel}" is invalid or failed: ${selErr.message}`);
          }
        }

        // Fallback: If no element found by selector, try text search for button/link if selector contains text clues
        if (!el) {
          console.log(`   ⚠️ Selector "${selector}" did not find any elements. Trying text-based fallback search...`);
          const textMatch = selector.match(/['"](.*?)['"]/);
          const searchClue = textMatch ? textMatch[1] : (selector.includes('Apply') ? 'Apply' : '');
          if (searchClue) {
            el = await page.evaluateHandle((clue) => {
              const elements = Array.from(document.querySelectorAll('button, a, input[type="submit"], input[type="button"]'));
              const target = elements.find(el => el.innerText && el.innerText.toLowerCase().includes(clue.toLowerCase()));
              return target || null;
            }, searchClue).then(h => h.asElement()).catch(() => null);
          }
        }

        if (!el) {
          // If still no element, let's try a generic text-based fallback for "Apply" button
          if (selector.toLowerCase().includes('apply')) {
            console.log(`   ⚠️ Trying generic "Apply" button fallback...`);
            el = await page.evaluateHandle(() => {
              const elements = Array.from(document.querySelectorAll('button, a, input[type="submit"]'));
              const target = elements.find(el => el.innerText && el.innerText.toLowerCase().includes('apply'));
              return target || null;
            }).then(h => h.asElement()).catch(() => null);
          }
        }

        if (!el) return false;

        await el.scrollIntoViewIfNeeded().catch(() => {});
        try {
          await el.click({ timeout: 5000 });
        } catch (clickErr) {
          console.log(`   ⚠️ Standard click failed (${clickErr.message}). Trying DOM element click fallback...`);
          await page.evaluate(element => element.click(), el).catch(() => {});
        }
        
        // Wait for navigation or modal
        await page.waitForTimeout(2500);
        return true;
      }

      case 'upload': {
        if (!cvPath) {
          console.log('   ⚠️  CV upload requested but no CV path available');
          return false;
        }
        const target = selector ? await page.$(selector) : await page.$('input[type="file"]');
        if (!target) return false;
        await target.setInputFiles(cvPath);
        console.log(`   📎 Uploaded CV: ${path.basename(cvPath)}`);
        await page.waitForTimeout(1500);
        return true;
      }

      case 'scroll': {
        await page.evaluate(() => window.scrollBy(0, 500));
        await page.waitForTimeout(800);
        return true;
      }

      default:
        return false;
    }
  } catch (err) {
    console.log(`   ⚠️  Action "${action}" failed: ${err.message}`);
    return false;
  }
}

// ── Main: manusApply ──────────────────────────────────────────────────────────

/**
 * Manus-style continuous vision loop.
 * Keeps taking screenshots and asking Gemini what to do next until submitted.
 *
 * @param {import('playwright').Page} page
 * @param {object} candidate
 * @param {string|null} cvPath
 * @returns {Promise<{submitted: boolean, steps: number, log: string[]}>}
 */
export async function manusApply(page, candidate = DEFAULT_CANDIDATE, cvPath = null) {
  console.log('\n   🤖 MANUS MODE — Continuous vision loop starting...');
  console.log('   📸 Gemini will see the screen and act like a human\n');

  const MAX_STEPS = 25;
  let step = 0;
  let submitted = false;
  let consecutiveFailures = 0;
  const actionLog = [];

  // Wait for page to fully load
  await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2000);

  while (step < MAX_STEPS) {
    step++;
    console.log(`   ${'─'.repeat(50)}`);
    console.log(`   👁️  Step ${step}/${MAX_STEPS} — capturing screen...`);

    // Check for success first (without AI call)
    if (await isSuccessPage(page)) {
      console.log('   ✅ SUCCESS PAGE DETECTED — Application submitted!');
      submitted = true;
      break;
    }

    // Take screenshot
    const screenshot = await takeScreenshot(page);
    if (!screenshot) {
      console.log('   ⚠️  Screenshot failed — skipping step');
      consecutiveFailures++;
      if (consecutiveFailures >= 3) break;
      continue;
    }

    const currentUrl = page.url();
    const recentLog = actionLog.slice(-5).join('\n') || 'None yet';

    // Build prompt for Gemini
    const prompt = `You are a job application bot controlling a real browser. Look at the screenshot carefully.

== CANDIDATE PROFILE ==
Full Name: ${candidate.fullName}
First Name: ${candidate.firstName}
Last Name: ${candidate.lastName}
Email: ${candidate.email}
Phone: ${candidate.phone}
Location: ${candidate.location}
LinkedIn: ${candidate.linkedin}
GitHub: ${candidate.github}
Years of Experience: 0 (Fresher)
Current CTC: 0
Expected CTC: 4 LPA (400000 rupees)
Notice Period: Immediate (0 days)
Skills: ${candidate.skills}

== CURRENT STATE ==
URL: ${currentUrl}
Step: ${step} of ${MAX_STEPS}

== LAST 5 ACTIONS ==
${recentLog}

== YOUR TASK ==
Look at the screenshot. Decide ONE action to take right now.

Return ONLY this JSON (no explanation outside the code block):
\`\`\`json
{
  "action": "fill|select|click|upload|scroll|done|failed",
  "selector": "CSS selector for the target element",
  "value": "value to enter (for fill/select)",
  "description": "short description of what you are doing",
  "is_success": false,
  "confidence": 0.9
}
\`\`\`

== ACTION RULES ==
- "fill": type text into input or textarea. Use the most specific selector possible.
- "select": pick from a dropdown. Value should match option text exactly.
- "click": click buttons, links, checkboxes. Use after filling all visible fields.
- "upload": set a file input to the CV. Use when you see "Upload Resume/CV" button.
- "scroll": scroll down to reveal more fields (when form continues below fold).
- "done": use when success message visible OR nothing left to fill. Set is_success: true if submitted.
- "failed": use when you are stuck and cannot determine what to do.

== PRIORITY ORDER ==
1. If you see empty required fields → fill them first
2. If you see a file upload → upload CV
3. If all visible fields are filled → click Next/Continue/Submit
4. If page shows success → action: "done", is_success: true
5. If nothing to do → scroll down to check for more fields

== SELECTOR TIPS ==
- Prefer: #elementId
- Then: [name="fieldName"]
- Then: input[placeholder="Email Address"]
- For buttons: button:has-text("Submit"), button[type="submit"]
- For dropdowns: select[name="experience"]

== IMPORTANT ==
- Do exactly ONE action per step
- For "Experience": choose "Fresher" or "0 Years"
- For "Notice Period": choose "Immediate" or "0 Days"
- For CTC fields: currentCTC=0, expectedCTC=400000
- Never fill fields that are already correctly filled`;

    // Ask Gemini
    console.log('   💭 Asking Gemini: "What should I do next?"');
    let instruction;
    try {
      const response = await askGemini(prompt, screenshot);
      instruction = parseJSON(response);

      if (!instruction) {
        console.log('   ⚠️  Could not parse Gemini response');
        consecutiveFailures++;
        if (consecutiveFailures >= 3) {
          console.log('   ❌ Too many parse failures — stopping');
          break;
        }
        continue;
      }
    } catch (err) {
      console.log(`   ❌ Gemini error: ${err.message}`);
      consecutiveFailures++;
      if (consecutiveFailures >= 3) break;
      await page.waitForTimeout(2000);
      continue;
    }

    consecutiveFailures = 0;

    // Log what Gemini decided
    console.log(`   🎯 Gemini says: ${instruction.action.toUpperCase()} — ${instruction.description}`);
    if (instruction.selector) console.log(`   📌 Target: ${instruction.selector}`);
    if (instruction.value)    console.log(`   📝 Value: "${instruction.value}"`);
    actionLog.push(`Step ${step}: [${instruction.action}] ${instruction.description}`);

    // Handle terminal states
    if (instruction.action === 'done') {
      submitted = instruction.is_success === true;
      console.log(submitted
        ? '\n   🎉 SUBMITTED! Gemini confirmed success.'
        : '\n   ℹ️  Done — no more actions needed.');
      break;
    }

    if (instruction.action === 'failed') {
      console.log('   ⚠️  Gemini says it cannot proceed further.');
      break;
    }

    // Execute the action
    const ok = await executeAction(page, instruction, cvPath);
    if (!ok) {
      console.log(`   ⚠️  Action could not be executed — Gemini will try a different approach next step`);
    }

    // After clicking submit-like buttons, check for success
    if (instruction.action === 'click') {
      try {
        await page.waitForTimeout(1000);
        if (await isSuccessPage(page)) {
          console.log('   ✅ Success page detected after click!');
          submitted = true;
          break;
        }
      } catch (err) {
        console.log(`   ⚠️  Post-click check failed (page may have closed): ${err.message}`);
        break;
      }
    }

    // Small pause between actions (human-like)
    try {
      await page.waitForTimeout(800);
    } catch {
      break;
    }
  }

  if (step >= MAX_STEPS && !submitted) {
    console.log(`   ⚠️  Reached max ${MAX_STEPS} steps without confirming submission.`);
  }

  console.log(`\n   📊 Manus loop: ${step} steps taken, submitted: ${submitted}`);
  console.log('   📋 Action history:');
  actionLog.forEach(l => console.log(`      ${l}`));

  return { submitted, steps: step, log: actionLog };
}

// ── CLI test ──────────────────────────────────────────────────────────────────

const isMain = process.argv[1]?.endsWith('manus-apply.mjs');
if (isMain) {
  const testUrl = process.argv[2];
  if (!testUrl) {
    console.log('Usage: node manus-apply.mjs <career-page-url> [cv-path]');
    console.log('Example: node manus-apply.mjs https://jobs.lever.co/company/job-id output/cv.pdf');
    process.exit(0);
  }
  const cvPath = process.argv[3] || null;

  (async () => {
    const { stealthLaunch } = await import('./stealth-browser.mjs');
    const browser = await stealthLaunch({ headless: false });
    const page = await browser.newPage();
    try {
      console.log(`\n🔗 Opening: ${testUrl}`);
      await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const result = await manusApply(page, DEFAULT_CANDIDATE, cvPath);
      console.log('\n📊 Final result:', result);
      console.log('\nBrowser stays open for 60 seconds so you can inspect...');
      await page.waitForTimeout(60000);
    } finally {
      await browser.close();
    }
  })().catch(console.error);
}
