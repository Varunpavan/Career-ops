/**
 * auto-chatbot-apply.mjs
 * ─────────────────────────────────────────────────────────────────
 * FULLY AUTONOMOUS Naukri apply bot:
 *   • Scans for live React/Frontend fresher jobs
 *   • Opens each job, clicks Apply
 *   • Reads every chatbot question and automatically types the answer
 *   • Uploads CV, handles Yes/No questions, fills dropdowns
 *   • Clicks Save/Submit automatically
 *   • Moves to next job automatically
 *   • You just WATCH — no manual input needed
 * ─────────────────────────────────────────────────────────────────
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const ROOT     = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CV_PDF   = path.join(ROOT, 'output/cv-varun-netlabs-2026-05-20.pdf');
const USER_DATA = path.join(ROOT, '.naukri_user_data');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHATBOT_CONTAINER_SEL = '._chatBotContainer, [class*="chatBotContainer"], [class*="chatbot-container"], [id*="ChatbotContainer"], [class*="chatbot_Overlay"], [class*="ChatbotContainer"]';

// ─── Candidate answers ────────────────────────────────────────────
const A = {
  name:         'Varun Pavan Sai Chadalavada',
  email:        'varunpavan45@gmail.com',
  phone:        '8688128008',
  linkedin:     'https://www.linkedin.com/in/varun-pavan-4b43b2214/',
  github:       'https://github.com/Varunpavan',
  grad_year:    '2025',
  experience:   '0',
  current_ctc:  '0',
  expected_ctc: '5',
  notice:       '0',
  location:     'Hyderabad',
  skills:       'React.js, JavaScript, HTML5, CSS3, Git',
};

// ─── Q&A logic — maps question keywords → answer ─────────────────
function getAnswer(question) {
  const q = question.toLowerCase();

  // Graduation / completion year
  if (q.includes('graduation') || q.includes('completion year') || q.includes('pass out') || q.includes('passed out') || q.includes('batch'))
    return A.grad_year;

  // Experience
  if ((q.includes('experience') || q.includes('year') || q.includes('yrs')) && !q.includes('relevant'))
    return A.experience;
  if (q.includes('relevant') && q.includes('experience'))
    return A.experience;

  // CTC / Salary
  if (q.includes('current') && (q.includes('ctc') || q.includes('salary') || q.includes('lpa')))
    return A.current_ctc;
  if ((q.includes('expect') || q.includes('desired')) && (q.includes('ctc') || q.includes('salary') || q.includes('lpa')))
    return A.expected_ctc;
  if (q.includes('hike') || q.includes('increment'))
    return '30';

  // Notice period
  if (q.includes('notice') || q.includes('join') || q.includes('joining') || q.includes('available'))
    return A.notice;

  // Location
  if (q.includes('location') || q.includes('relocat') || q.includes('city') || q.includes('prefer'))
    return A.location;

  // Contact
  if (q.includes('phone') || q.includes('mobile') || q.includes('contact number'))
    return A.phone;
  if (q.includes('email'))
    return A.email;

  // Name
  if (q.includes('your name') || q.includes('full name'))
    return A.name;

  // LinkedIn / GitHub / Portfolio
  if (q.includes('linkedin'))
    return A.linkedin;
  if (q.includes('github') || q.includes('portfolio'))
    return A.github;

  // Skills
  if (q.includes('skill') || q.includes('technolog') || q.includes('language'))
    return A.skills;

  // React specific
  if (q.includes('react') && (q.includes('experience') || q.includes('year') || q.includes('month')))
    return '12 months (project-based)';

  // JavaScript
  if (q.includes('javascript') && (q.includes('experience') || q.includes('year')))
    return '2 years';

  // Willing to work from office / onsite / relocate
  if (q.includes('work from office') || q.includes('onsite') || q.includes('office'))
    return 'Yes';
  if (q.includes('relocat'))
    return 'Yes';
  if (q.includes('immediate') || q.includes('joining immedi'))
    return 'Yes';

  // Fresher / currently working
  if (q.includes('current') && (q.includes('work') || q.includes('employ') || q.includes('job')))
    return 'No';
  if (q.includes('fresher') || q.includes('fresh graduate'))
    return 'Yes';

  // Interview / availability
  if (q.includes('interview') && q.includes('available'))
    return 'Yes';

  // Gender (for Women-only roles — skip those)
  if (q.includes('gender') || q.includes('women') || q.includes('female'))
    return 'Male';

  // Default for any numeric question
  if (q.includes('how many') || q.includes('number of'))
    return '0';

  return null; // unknown question
}

// Check if any interactive answer elements (inputs, options, dropdowns) are visible inside the chatbot
async function isChatbotInputVisible(page) {
  return page.evaluate((containerSel) => {
    const container = document.querySelector(containerSel);
    if (!container) return false;
    
    // Check for visible text inputs, textareas, selects, or custom contenteditable elements
    const inputs = Array.from(container.querySelectorAll('input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]), textarea, select, [contenteditable="true"], [role="textbox"]'));
    for (const inp of inputs) {
      if (inp.offsetParent !== null && !inp.disabled) {
        return true;
      }
    }
    // Check for visible option buttons/chips (excluding submit/save/cancel/close etc)
    const chips = Array.from(container.querySelectorAll('button, [class*="option"], [class*="chip"], [class*="choice"]'));
    for (const chip of chips) {
      if (chip.offsetParent !== null) {
        const txt = chip.innerText?.trim()?.toLowerCase();
        if (txt && !['save', 'submit', 'cancel', 'close', 'send'].includes(txt)) {
          return true;
        }
      }
    }
    return false;
  }, CHATBOT_CONTAINER_SEL).catch(() => false);
}

// ─── Auto-answer the Naukri chatbot ──────────────────────────────
async function runChatbot(page) {
  let lastQuestion = '';
  let noProgressCount = 0;
  let cvUploadedInChat = false;
  let wasOpen = false;
  let closedCount = 0;

  for (let round = 0; round < 30; round++) {
    console.log(`\n  🤖 [Chatbot Round ${round + 1}/30]`);
    await sleep(1500);
    if (page.isClosed()) {
      console.log('  🤖 Page is closed. Exiting.');
      break;
    }

    // Check if chatbot container exists and is visible
    const chatbotOpen = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return !!el && el.offsetParent !== null;
    }, CHATBOT_CONTAINER_SEL).catch(() => false);

    console.log(`  🤖 chatbotOpen: ${chatbotOpen}`);
    if (!chatbotOpen) {
      if (wasOpen) {
        closedCount++;
        console.log(`  🤖 Chatbot was open but is now closed. Closed count: ${closedCount}/3`);
        if (closedCount >= 3) {
          console.log('  🤖 Chatbot remained closed for 3 rounds. Assuming finished or dismissed.');
          break;
        }
      } else {
        console.log('  🤖 Chatbot container not open yet, waiting...');
      }
      continue;
    }

    // Chatbot is open
    wasOpen = true;
    closedCount = 0;

    // Get all chatbot messages
    const messages = await page.evaluate((containerSel) => {
      const container = document.querySelector(containerSel);
      if (!container) return [];
      
      // First try to select only bot messages (excluding user messages)
      let msgs = Array.from(container.querySelectorAll(
        '.botMsg span, .botItem span, [class*="botMsg"] span, [class*="botItem"] span, ' +
        '.botMsg, .botItem, [class*="botMsg"], [class*="botItem"]'
      ));
      
      // Fallback to general message bubbles if bot-specific ones aren't found
      if (msgs.length === 0) {
        msgs = Array.from(container.querySelectorAll(
          '[class*="chatbot"] span, [class*="chatbot"] p, ' +
          '[class*="chat"] span, [class*="chat"] p, ' +
          '[class*="bubble"] span, [class*="bubble"] p, ' +
          '[class*="message"] span, [class*="message"] p, ' +
          '.chatbot-content, [class*="question"]'
        ));
      }
      
      const rawTextList = msgs.map(m => m.innerText?.trim() || '').filter(Boolean);
      
      // Deduplicate consecutive identical text and filter out metadata/errors
      const filtered = [];
      for (const txt of rawTextList) {
        if (txt.length <= 3) continue;
        
        const low = txt.toLowerCase();
        // Ignore files and uploader failures
        if (low.includes('.pdf') || low.includes('.doc') || low.includes('unsuccessful') || low.includes('upload') || low.includes('size limit')) {
          continue;
        }
        // Ignore common button labels that might be scraped
        if (txt === 'Yes' || txt === 'No' || txt === 'Save' || txt === 'Submit' || txt === 'Send' || txt === 'Next') {
          continue;
        }
        
        if (filtered.length === 0 || filtered[filtered.length - 1] !== txt) {
          filtered.push(txt);
        }
      }
      return filtered;
    }, CHATBOT_CONTAINER_SEL).catch(e => {
      console.log(`  🤖 Error getting messages: ${e.message}`);
      return [];
    });

    if (round === 1) {
      const info = await page.evaluate((sel) => {
        const container = document.querySelector(sel);
        if (!container) return { error: 'No chatbot container found' };
        const elements = Array.from(container.querySelectorAll('*'));
        const struct = elements.map(el => {
          const classes = el.className || '';
          const id = el.id || '';
          const text = el.innerText?.trim() || '';
          const tagName = el.tagName.toLowerCase();
          const placeholder = el.getAttribute('placeholder') || '';
          const type = el.getAttribute('type') || '';
          const role = el.getAttribute('role') || '';
          const contentEditable = el.getAttribute('contenteditable') || '';
          
          if (['input', 'textarea', 'button', 'select'].includes(tagName) || 
              contentEditable === 'true' || 
              role === 'textbox' || 
              (text.length > 0 && el.children.length === 0)) {
            return `<${el.tagName} id="${id}" class="${classes}" type="${type}" placeholder="${placeholder}" contenteditable="${contentEditable}" role="${role}">${text.slice(0, 40)}</${el.tagName}>`;
          }
          return null;
        }).filter(Boolean);
        return {
          fullHtml: container.outerHTML,
          text: container.innerText,
          structure: struct
        };
      }, CHATBOT_CONTAINER_SEL).catch(e => ({ error: `Dump failed: ${e.message}` }));
      
      if (info && info.fullHtml) {
        fs.writeFileSync(path.join(ROOT, 'output/chatbot-container.html'), info.fullHtml);
        console.log('🤖 [CHATBOT CONTAINER DUMP]: Full HTML saved to output/chatbot-container.html');
        console.log('🤖 [CHATBOT CONTAINER STRUCTURE]:', JSON.stringify(info.structure.slice(0, 80), null, 2));
      } else {
        console.log('🤖 [CHATBOT CONTAINER DUMP] FAILED:', info);
      }
    }

    console.log(`  🤖 Messages found: ${messages.length}`);
    if (messages.length > 0) {
      console.log(`  🤖 Last 3 messages:`, messages.slice(-3));
    }

    // Find the latest unanswered question
    const question = messages[messages.length - 1] || '';
    console.log(`  🤖 Current Question: "${question}"`);

    // Check if we're done (success message)
    const chatbotText = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? el.innerText : '';
    }, CHATBOT_CONTAINER_SEL).catch(() => '');

    const pageText = await page.evaluate(() => document.body?.innerText || '').catch(() => '');

    if (chatbotText.includes('Application submitted') ||
        chatbotText.includes('Successfully applied') ||
        chatbotText.includes('applied successfully') ||
        chatbotText.includes('Thank you') ||
        chatbotText.includes('Your application has been') ||
        pageText.includes('Application submitted') ||
        pageText.includes('Successfully applied') ||
        pageText.includes('applied successfully') ||
        pageText.includes('Thank you for applying') ||
        pageText.includes('Your application has been')) {
      console.log('  🎉 Application SUBMITTED successfully!');
      return true;
    }

    // Check for "Save" or "Submit" button inside chatbot
    const chatbotSaveBtn = await page.evaluate((sel) => {
      const container = document.querySelector(sel);
      if (!container) return null;
      const btns = Array.from(container.querySelectorAll('button, .sendMsg, [class*="btn"], [class*="button"]'));
      for (const btn of btns) {
        if (btn.offsetParent === null) continue; // not visible
        const txt = btn.innerText?.trim() || '';
        if (txt === 'Save' || txt === 'Submit' || txt === 'Apply' || txt === 'Finish' || btn.classList.contains('sendMsg')) {
          return txt;
        }
      }
      return null;
    }, CHATBOT_CONTAINER_SEL).catch(() => null);

    const inputVisible = await isChatbotInputVisible(page);
    console.log(`  🤖 saveVisible (inside chatbot): ${!!chatbotSaveBtn} (${chatbotSaveBtn}), inputVisible: ${inputVisible}, noProgressCount: ${noProgressCount}, question === lastQuestion: ${question === lastQuestion}`);

    if (chatbotSaveBtn && !inputVisible && question === lastQuestion && noProgressCount >= 2) {
      console.log(`  🤖 Chatbot seems done (save button "${chatbotSaveBtn}" visible, no inputs, settled). Attempting submit...`);
      if (!cvUploadedInChat) {
        console.log('  🤖 Doing final CV upload before save/submit...');
        const uploaded = await tryUploadChatbot(page);
        if (uploaded) cvUploadedInChat = true;
        await sleep(1000);
      }

      const clicked = await page.evaluate((sel, btnText) => {
        const container = document.querySelector(sel);
        if (!container) return false;
        const btns = Array.from(container.querySelectorAll('button, .sendMsg, [class*="btn"], [class*="button"]'));
        for (const btn of btns) {
          const txt = btn.innerText?.trim() || '';
          if (txt === btnText || (btnText === 'sendMsg' && btn.classList.contains('sendMsg'))) {
            btn.click();
            return true;
          }
        }
        return false;
      }, CHATBOT_CONTAINER_SEL, chatbotSaveBtn).catch(() => false);

      if (clicked) {
        console.log(`  ✅ Clicked chatbot save/submit button: "${chatbotSaveBtn}"`);
        await sleep(3000);
        return true;
      }
    }

    if (!question || question === lastQuestion) {
      noProgressCount++;
      console.log(`  🤖 No progress count: ${noProgressCount}/8`);
      if (noProgressCount > 8) {
        console.log('  🤖 No progress for 8 rounds. Trying to click Next/Save/Submit/Send inside chatbot to advance...');
        // Try clicking Next/Save inside the chatbot
        await page.evaluate((sel) => {
          const container = document.querySelector(sel);
          if (!container) return;
          const btns = Array.from(container.querySelectorAll('button, .sendMsg, [class*="btn"], [class*="button"]'));
          for (const btn of btns) {
            const txt = btn.innerText?.trim() || '';
            if (txt === 'Next' || txt === 'Save' || txt === 'Submit' || txt === 'Send') {
              btn.click();
              return;
            }
          }
        }, CHATBOT_CONTAINER_SEL).catch(() => {});
        noProgressCount = 0;
      }
      continue;
    }

    lastQuestion = question;
    noProgressCount = 0;
    console.log(`  ❓ Q: ${question.slice(0, 80)}`);

    // Check if question asks to upload CV/resume
    const qLower = question.toLowerCase();
    if (qLower.includes('upload') && (qLower.includes('resume') || qLower.includes('cv') || qLower.includes('biodata') || qLower.includes('file'))) {
      console.log('  🤖 Detected CV/Resume upload request inside chatbot.');
      const uploaded = await tryUploadChatbot(page);
      if (uploaded) {
        cvUploadedInChat = true;
        await sleep(2000);
        continue;
      }
    }

    // Get the answer
    const answer = getAnswer(question);
    console.log(`  🤖 Answer mapping: "${answer}"`);

    // First check for Yes/No option buttons
    const yesNoHandled = await handleYesNo(page, question);
    if (yesNoHandled) {
      console.log(`  ✅ A: [Yes/No button clicked]`);
      await sleep(1000);
      continue;
    }

    // Check for radio buttons / option list
    const radioHandled = await handleRadioOptions(page, answer);
    if (radioHandled) {
      console.log(`  ✅ A: [option selected]`);
      await sleep(1000);
      continue;
    }

    // Check for dropdown select
    const dropdownHandled = await handleDropdown(page, question, answer);
    if (dropdownHandled) {
      console.log(`  ✅ A: [dropdown selected]`);
      await sleep(500);
      continue;
    }

    // Type in the chatbot input
    if (answer) {
      const typed = await typeChatbotAnswer(page, answer);
      if (typed) {
        console.log(`  ✅ A: ${answer}`);
        await sleep(1000);
        continue;
      }
    }

    // Fallback: try any visible text input
    const fallbackAnswer = answer || '0';
    const fallbackTyped = await typeInAnyInput(page, fallbackAnswer);
    if (fallbackTyped) {
      console.log(`  ✅ A (fallback): ${fallbackAnswer}`);
      await sleep(1000);
      continue;
    } else {
      console.log(`  ❌ Failed to type answer/fallback for question: "${question}"`);
    }
  }
  return false;
}

// ─── Type answer in Naukri chatbot input ─────────────────────────
async function typeChatbotAnswer(page, answer) {
  const chatInputSels = [
    'input[placeholder*="message" i]',
    'input[placeholder*="Type" i]',
    'input[placeholder*="Answer" i]',
    'input[placeholder*="Enter" i]',
    '[class*="chat"] input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"])',
    '[class*="chatbot"] input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"])',
    '.chatbot-input input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"])',
    'input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]):visible',
    'textarea:visible',
    '[contenteditable="true"]:visible',
    '[role="textbox"]:visible'
  ];
  try {
    const container = await page.$(CHATBOT_CONTAINER_SEL);
    for (const sel of chatInputSels) {
      const el = container ? await container.$(sel) : await page.$(sel);
      if (!el) continue;
      if (!await el.isVisible()) continue;
      console.log(`    [typeChatbotAnswer] typing in: ${sel}`);
      await el.click({ clickCount: 3, timeout: 1000 });
      
      const isEditable = await el.evaluate(e => e.getAttribute('contenteditable') === 'true' || e.tagName.toLowerCase() === 'div').catch(() => false);
      if (isEditable) {
        await el.focus();
        await page.keyboard.type(answer);
      } else {
        await el.fill(answer);
      }
      await el.press('Enter');
      
      // Also try to click the Send button
      const sendBtn = container 
        ? await container.$('[class*="SendBtn"], button:has-text("Send"), [class*="sendMsg"], .chatbot_SendBtn')
        : await page.$('[class*="SendBtn"], button:has-text("Send"), [class*="sendMsg"], .chatbot_SendBtn');
        
      if (sendBtn && await sendBtn.isVisible()) {
        await sendBtn.click({ timeout: 1000 }).catch(() => {});
      }
      return true;
    }
  } catch (e) {
    console.log(`    [typeChatbotAnswer] failed: ${e.message}`);
  }
  return false;
}

// ─── Handle Yes/No option buttons ────────────────────────────────
async function handleYesNo(page, question) {
  const q = question.toLowerCase();
  const preferYes = !q.includes('currently working') && !q.includes('employed') && !q.includes('male') && !q.includes('female');
  const preferredText = preferYes ? 'Yes' : 'No';
  const fallbackText  = preferYes ? 'No'  : 'Yes';

  try {
    const container = await page.$(CHATBOT_CONTAINER_SEL);
    for (const text of [preferredText, fallbackText]) {
      const selector = `button:has-text("${text}"), [class*="option"]:has-text("${text}"), [class*="chip"]:has-text("${text}")`;
      const btns = container ? await container.$$(selector) : await page.$$(selector);
      for (const btn of btns) {
        if (await btn.isVisible().catch(() => false)) {
          console.log(`    [handleYesNo] clicking button with text: ${text}`);
          await btn.click({ timeout: 1500 });
          return true;
        }
      }
    }
  } catch (e) {
    console.log(`    [handleYesNo] failed: ${e.message}`);
  }
  return false;
}

// ─── Handle radio / list options ─────────────────────────────────
async function handleRadioOptions(page, preferredAnswer) {
  try {
    const container = await page.$(CHATBOT_CONTAINER_SEL);
    const options = container 
      ? await container.$$('input[type="radio"], [class*="option-item"], [class*="choice"], [class*="chip"]')
      : await page.$$('input[type="radio"], [class*="option-item"], [class*="choice"], [class*="chip"]');
      
    if (options.length === 0) return false;

    for (const opt of options) {
      if (!await opt.isVisible().catch(() => false)) continue;
      const text = await opt.innerText().catch(() => '') || await opt.getAttribute('value') || '';
      if (preferredAnswer && text.toLowerCase().includes(preferredAnswer.toLowerCase())) {
        console.log(`    [handleRadioOptions] clicking option with text: ${text}`);
        await opt.click({ timeout: 1500 });
        return true;
      }
    }
  } catch (e) {
    console.log(`    [handleRadioOptions] failed: ${e.message}`);
  }
  return false;
}

// ─── Handle select dropdown ───────────────────────────────────────
async function handleDropdown(page, question, answer) {
  try {
    const container = await page.$(CHATBOT_CONTAINER_SEL);
    const selects = container 
      ? await container.$$('select:visible, select')
      : await page.$$('select:visible, select');
      
    for (const sel of selects) {
      if (!await sel.isVisible().catch(() => false)) continue;
      const opts = await sel.$$('option');
      // Try to select matching option
      for (const opt of opts) {
        const val = await opt.getAttribute('value') || '';
        const txt = await opt.innerText().catch(() => '');
        if (answer && (val === answer || txt.toLowerCase().includes(answer.toLowerCase()))) {
          console.log(`    [handleDropdown] selecting value: ${val}`);
          await sel.selectOption({ value: val }, { timeout: 1500 });
          return true;
        }
      }
      // Default: select second option (skip blank first)
      if (opts.length > 1) {
        const val = await opts[1].getAttribute('value');
        console.log(`    [handleDropdown] selecting default second value: ${val}`);
        await sel.selectOption({ value: val }, { timeout: 1500 });
        return true;
      }
    }
  } catch (e) {
    console.log(`    [handleDropdown] failed: ${e.message}`);
  }
  return false;
}

// ─── Type in any visible input as fallback ────────────────────────
async function typeInAnyInput(page, value) {
  try {
    const container = await page.$(CHATBOT_CONTAINER_SEL);
    const selector = 'input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"], [role="textbox"]';
    const inputs = container 
      ? await container.$$(selector)
      : await page.$$(selector);
      
    for (const inp of inputs) {
      if (!await inp.isVisible().catch(() => false)) continue;
      
      const isEditable = await inp.evaluate(e => e.getAttribute('contenteditable') === 'true' || e.tagName.toLowerCase() === 'div').catch(() => false);
      const current = isEditable ? await inp.innerText().catch(() => '') : await inp.inputValue().catch(() => '');
      if (!current) {
        console.log(`    [typeInAnyInput] filling fallback value: ${value}`);
        if (isEditable) {
          await inp.focus();
          await page.keyboard.type(value);
        } else {
          await inp.fill(value, { timeout: 1500 });
        }
        await inp.press('Enter');
        
        // Try to click Send button
        const sendBtn = container 
          ? await container.$('[class*="SendBtn"], button:has-text("Send"), [class*="sendMsg"], .chatbot_SendBtn')
          : await page.$('[class*="SendBtn"], button:has-text("Send"), [class*="sendMsg"], .chatbot_SendBtn');
        if (sendBtn && await sendBtn.isVisible()) {
          await sendBtn.click({ timeout: 1000 }).catch(() => {});
        }
        return true;
      }
    }
  } catch (e) {
    console.log(`    [typeInAnyInput] failed: ${e.message}`);
  }
  return false;
}

// ─── Click any matching button ────────────────────────────────────
async function clickAny(page, selectors) {
  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (!el) continue;
      if (!await el.isVisible().catch(() => false)) continue;
      console.log(`    [clickAny] clicking: ${sel}`);
      await el.click({ timeout: 2000 });
      return true;
    } catch (e) {
      console.log(`    [clickAny] failed for ${sel}: ${e.message}`);
    }
  }
  return false;
}

// ─── Upload CV ────────────────────────────────────────────────────
async function tryUpload(page) {
  const sels = ['input[type="file"]', 'input[accept*="pdf"]', 'input[name*="resume" i]'];
  for (const sel of sels) {
    try {
      const els = await page.$$(sel);
      for (const el of els) {
        if (!el) continue;
        if (!await el.isVisible().catch(() => false)) continue;

        // Exclude chatbot upload inputs
        const isChatbotUploader = await el.evaluate((input, chatbotSel) => {
          if (input.classList.contains('chatbot_Uploader') || 
              input.id?.toLowerCase().includes('chatbot') || 
              input.closest(chatbotSel)) {
            return true;
          }
          return false;
        }, CHATBOT_CONTAINER_SEL).catch(() => false);

        if (isChatbotUploader) {
          console.log(`    [tryUpload] skipping chatbot uploader: ${sel}`);
          continue;
        }
        
        // Check if file is already selected/uploaded
        const hasFile = await el.evaluate(input => input.files && input.files.length > 0).catch(() => false);
        if (hasFile) {
          console.log(`    [tryUpload] file already uploaded/selected for: ${sel}`);
          return true;
        }
        
        console.log(`    [tryUpload] setting file for: ${sel}`);
        await el.setInputFiles(CV_PDF, { timeout: 2000 });
        console.log('  📎 CV uploaded!');
        return true;
      }
    } catch (e) {
      console.log(`    [tryUpload] failed for ${sel}: ${e.message}`);
    }
  }
  return false;
}

// ─── Upload CV specifically for Chatbot ───────────────────────────
async function tryUploadChatbot(page) {
  try {
    const el = await page.$('input.chatbot_Uploader, [class*="chatbot"] input[type="file"], [id*="Uploader"]');
    if (el) {
      console.log(`    [tryUploadChatbot] setting file for chatbot uploader`);
      await el.setInputFiles(CV_PDF, { timeout: 3000 });
      console.log('  📎 CV uploaded to Chatbot!');
      return true;
    }
  } catch (e) {
    console.log(`    [tryUploadChatbot] failed: ${e.message}`);
  }
  return false;
}

// ─── Scan Naukri for jobs ─────────────────────────────────────────
async function scanJobs(page) {
  console.log('🔍 Scanning Naukri for live React fresher jobs...');
  await page.goto(
    'https://www.naukri.com/react-js-developer-jobs-in-india?experience=0&qtype=cat',
    { waitUntil: 'domcontentloaded', timeout: 60000 }
  );
  await sleep(5000);

  return page.evaluate(() => {
    const seen = new Set();
    const results = [];
    const links = Array.from(document.querySelectorAll('a[href*="/job-listings-"]'));

    for (const a of links) {
      if (seen.has(a.href)) continue;
      seen.add(a.href);

      const title = a.innerText?.trim() || a.textContent?.trim() || '';
      if (!title || title.length < 5) continue;

      // Find card
      const card = a.closest('article') || a.closest('[class*="tuple"]') || a.parentElement;
      let company = '';
      if (card) {
        const comp = card.querySelector('a[class*="comp"], a[class*="subTitle"], [class*="company"]');
        company = comp?.innerText?.trim() || '';
      }

      // Skip Women-only roles
      if (title.toLowerCase().includes("women") || title.toLowerCase().includes("female")) continue;

      results.push({ title, company, href: a.href });
      if (results.length >= 5) break;
    }
    return results;
  });
}

// ─── Apply to one job ─────────────────────────────────────────────
async function applyToJob(job, idx, total) {
  console.log('\n' + '═'.repeat(65));
  console.log(`🚀  JOB ${idx}/${total}: ${job.company || '?'} — ${job.title}`);
  console.log(`    ${job.href.slice(0, 70)}...`);
  console.log('═'.repeat(65));

  const ctx = await chromium.launchPersistentContext(USER_DATA, {
    headless: false, viewport: null, args: ['--start-maximized'],
  });

  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto(job.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3000);

  // Upload CV before clicking Apply (Naukri resume) if chatbot not open
  const chatbotOpenBefore = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return !!el && el.offsetParent !== null;
  }, CHATBOT_CONTAINER_SEL).catch(() => false);

  if (!chatbotOpenBefore) {
    await tryUpload(page);
  }

  // Click Apply
  const clicked = await clickAny(page, [
    'button:has-text("Apply")', 'button:has-text("Apply Now")',
    'button:has-text("Easy Apply")', 'a:has-text("Apply Now")',
  ]);
  if (clicked) { console.log('  🖱️  Clicked Apply'); await sleep(3000); }
  else { console.log('  ⚠️  No Apply button found'); }

  // Upload CV in the modal too (only if chatbot is not open)
  const chatbotOpen = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return !!el && el.offsetParent !== null;
  }, CHATBOT_CONTAINER_SEL).catch(() => false);

  if (!chatbotOpen) {
    console.log('  📎 Chatbot not open, trying normal CV upload in modal...');
    await tryUpload(page);
  } else {
    console.log('  🤖 Chatbot is open. Skipping initial CV upload to avoid interrupting chatbot flow.');
  }

  // Run the fully autonomous chatbot answerer
  console.log('  🤖 Starting auto-chatbot...');
  const submitted = await runChatbot(page);

  // Take screenshot
  const shot = path.join(ROOT, `output/job${idx}-done.png`);
  await page.screenshot({ path: shot, fullPage: false }).catch(() => {});

  if (submitted) {
    console.log(`  ✅ Job ${idx} APPLIED!`);
  } else {
    // Last resort — click Save
    await clickAny(page, ['button:has-text("Save")', 'button:has-text("Submit")']);
    console.log(`  ⚠️  Job ${idx} — attempted, check browser to confirm.`);

    // Give user 20 seconds to finish any remaining step
    console.log('  ⏳ Waiting 20s for you to confirm/submit if needed...');
    await sleep(20000);
  }

  await ctx.close().catch(() => {});
  console.log(`  ✅ Browser closed — moving to next job.\n`);
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('\n🎯 Fully Autonomous Naukri Apply Bot');
  console.log('   No manual input needed — sit back and watch!\n');

  if (!fs.existsSync(CV_PDF)) {
    console.error(`❌ CV not found: ${CV_PDF}`); process.exit(1);
  }
  console.log(`✅ CV: ${path.basename(CV_PDF)}\n`);

  // Scan for jobs
  const scanCtx = await chromium.launchPersistentContext(USER_DATA, {
    headless: false, viewport: null, args: ['--start-maximized'],
  });
  const scanPage = scanCtx.pages()[0] || await scanCtx.newPage();
  const jobs = await scanJobs(scanPage);
  await scanCtx.close();

  if (jobs.length === 0) {
    console.log('❌ No jobs found. Check Naukri login.'); return;
  }

  console.log(`\n📋 Found ${jobs.length} jobs to apply:\n`);
  jobs.forEach((j, i) => console.log(`  ${i+1}. [${j.company}] ${j.title}`));
  console.log('\n🤖 Starting fully automated applications in 3s...\n');
  await sleep(3000);

  for (let i = 0; i < jobs.length; i++) {
    await applyToJob(jobs[i], i + 1, jobs.length);
    if (i < jobs.length - 1) { console.log('⏳ Next job in 3s...\n'); await sleep(3000); }
  }

  console.log('\n🎉 ALL DONE! Run: node merge-tracker.mjs to update tracker.\n');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
