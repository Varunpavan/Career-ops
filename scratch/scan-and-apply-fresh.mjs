/**
 * scan-and-apply-fresh.mjs
 * ──────────────────────────────────────────────────────────────────
 * Since the original 3 job URLs are expired/dead (MindNudge domain sold,
 * Lumel & Netlabs Naukri pages gone), this script:
 *
 *  1. Searches Naukri live for fresher React / Frontend jobs in India
 *  2. Extracts top 3 real, active job links
 *  3. Opens each one in sequence
 *  4. Auto-clicks Apply, fills all fields, uploads your CV
 *  5. Leaves browser open — you review & submit → close → next job
 * ──────────────────────────────────────────────────────────────────
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CV_PDF = path.join(ROOT, 'output/cv-varun-netlabs-2026-05-20.pdf');
const USER_DATA_DIR = path.join(ROOT, '.naukri_user_data');

// ─── Candidate Profile ───────────────────────────────────────────
const P = {
  full_name:   'Varun Pavan Sai Chadalavada',
  first_name:  'Varun Pavan Sai',
  last_name:   'Chadalavada',
  email:       'varunpavan45@gmail.com',
  phone:       '8688128008',
  linkedin:    'https://www.linkedin.com/in/varun-pavan-4b43b2214/',
  github:      'https://github.com/Varunpavan',
  portfolio:   'https://eventify-web-lilac.vercel.app/',
  current_ctc: '0',
  expected_ctc:'500000',   // 5 LPA in numbers
  expected_lpa:'5',
  notice:      '0',
  location:    'Hyderabad',
};


const CHATBOT_CONTAINER_SEL = '._chatBotContainer, [class*="chatBotContainer"], [class*="chatbot-container"], [id*="ChatbotContainer"], [class*="chatbot_Overlay"], [class*="ChatbotContainer"]';

// ─── Utilities ───────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function safeType(pageOrFrame, selector, value) {
  try {
    const el = await pageOrFrame.$(selector);
    if (!el) return false;
    if (!await el.isVisible().catch(() => false)) return false;
    await el.click({ clickCount: 3, timeout: 2000 }).catch(() => {});
    await el.fill(value);
    return true;
  } catch { return false; }
}

async function safeClick(pageOrFrame, selector) {
  try {
    const el = await pageOrFrame.$(selector);
    if (!el) return false;
    if (!await el.isVisible().catch(() => false)) return false;
    await el.click({ timeout: 2000 }).catch(() => {});
    return true;
  } catch { return false; }
}

function safeGetFrames(page) {
  try {
    if (!page || page.isClosed()) return [];
    return [page, ...page.frames()];
  } catch {
    return [];
  }
}

// ─── Step 1: Scan for live jobs ───────────────────────────────────
async function scanNaukriForJobs(page) {
  console.log('\n🔍 Scanning Naukri for live React/Frontend fresher jobs...');

  const searchUrl = 'https://www.naukri.com/react-js-developer-jobs-in-india?experience=0&qtype=cat';
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);

  console.log('   Page title:', await page.title());

  // Extract job listings
  const jobs = await page.evaluate(() => {
    const results = [];
    // Naukri uses article tags for job cards
    const cards = document.querySelectorAll('article.jobTuple, article[class*="jobTuple"], div.cust-job-tuple, div[class*="srp-jobtuple"]');

    for (const card of cards) {
      const titleEl = card.querySelector('a.title, a[class*="title"], h2 a, h3 a');
      const companyEl = card.querySelector('a.subTitle, a[class*="companyInfo"], .companyInfo a, [class*="companyName"], .comp-name, [class*="comp-name"], a[href*="company"]');
      const expEl = card.querySelector('[class*="expwdth"], [class*="experience"], li[class*="fleft"]');

      const title = titleEl?.innerText?.trim() || '';
      const company = companyEl?.innerText?.trim() || '';
      const href = titleEl?.href || '';
      const exp = expEl?.innerText?.trim() || '';

      if (title && href && href.includes('naukri.com')) {
        results.push({ title, company, href, exp });
      }
    }
    return results;
  });

  // Filter job cards to make sure they match fresh status or are actually React-related
  const filtered = jobs.filter(j => {
    const t = j.title.toLowerCase();
    const matchesReact = t.includes('react') || t.includes('frontend') || t.includes('front end') || t.includes('ui');
    const isWomenOnly = t.includes('women') || t.includes('female');
    return matchesReact && !isWomenOnly;
  }).slice(0, 8);

  console.log(`   Found ${filtered.length} matching jobs in search results.`);
  filtered.forEach((j, i) => console.log(`   ${i+1}. [${j.company}] ${j.title} (${j.exp})`));

  return filtered;
}

// ─── Step 2: Auto-fill a Naukri Easy Apply popup ─────────────────
async function fillNaukriEasyApply(page) {
  try {
    if (!page || page.isClosed()) return;
    if (page.naukriEasyFilled) return;
    
    const inputs = await page.$$('input[type="text"], input[type="tel"], input[type="email"]');
    if (inputs.length === 0) return;
    
    console.log('  📋 Attempting Naukri Easy Apply fill...');
    let filledAny = false;
    for (const input of inputs) {
      try {
        if (page.isClosed()) return;
        const val = await input.inputValue();
        if (val) continue; // Skip if already filled
        
        const name = await input.getAttribute('name') || '';
        const placeholder = await input.getAttribute('placeholder') || '';
        const combined = (name + placeholder).toLowerCase();
        
        if (combined.includes('email')) {
          await input.fill(P.email);
          filledAny = true;
        } else if (combined.includes('phone') || combined.includes('mobile')) {
          await input.fill(P.phone);
          filledAny = true;
        } else if (combined.includes('name')) {
          await input.fill(P.full_name);
          filledAny = true;
        } else if (combined.includes('linkedin')) {
          await input.fill(P.linkedin);
          filledAny = true;
        } else if (combined.includes('github')) {
          await input.fill(P.github);
          filledAny = true;
        } else if (combined.includes('current') && combined.includes('ctc')) {
          await input.fill(P.current_ctc);
          filledAny = true;
        } else if (combined.includes('expected') && combined.includes('ctc')) {
          await input.fill(P.expected_lpa);
          filledAny = true;
        } else if (combined.includes('notice')) {
          await input.fill(P.notice);
          filledAny = true;
        } else if (combined.includes('exp')) {
          await input.fill('0');
          filledAny = true;
        }
      } catch {}
    }
    if (filledAny) {
      page.naukriEasyFilled = true;
    }
  } catch (err) {
    console.log(`  ⚠️ Error filling Naukri Easy Apply: ${err.message}`);
  }
}

// ─── Step 3: Setup a job in a new tab ─────────────────────────────
async function setupJobTab(context, jobConfig, idx, total, pdfPath) {
  const { title, company, href } = jobConfig;

  console.log(`\n🚀 Opening Job ${idx}/${total} in new tab: [${company}] ${title}`);
  
  let page;
  const pages = context.pages();
  if (idx === 1 && pages.length > 0) {
    page = pages[0];
  } else {
    page = await context.newPage();
  }

  page.jobCompany = company;
  page.jobTitle = title;
  page.jobIndex = idx;
  page.screenshotTaken = false;

  try {
    await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(1500); // Wait a moment for page load

    // Initial click Apply
    console.log(`  [Tab ${idx}] Clicking Apply for ${company}...`);
    const clicked = await clickApply(page);
    if (clicked) {
      page.clickedApply = true;
    }
    await sleep(1500);

    // Initial form filling and CV upload if visible
    const chatbotOpen = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
    }, CHATBOT_CONTAINER_SEL).catch(() => false);

    if (!chatbotOpen) {
      await fillGenericForm(page, company, title, { done: false });
      await fillNaukriEasyApply(page);
      await tryUpload(page, pdfPath);
    }
  } catch (err) {
    console.log(`  ⚠️ Error setting up Job ${idx} (${company}): ${err.message}`);
  }
}

// ─── Click matching job link on careers portal ────────────────────
async function clickMatchingJobLink(page, role) {
  try {
    if (!page || page.isClosed()) return false;
    const frames = safeGetFrames(page);
    const keywords = ['react', 'frontend', 'front-end', 'ui developer', 'software engineer', 'software developer'];
    
    for (const f of frames) {
      try {
        const links = await f.$$('a');
        for (const link of links) {
          if (!await link.isVisible().catch(() => false)) continue;
          const text = await link.innerText().catch(() => '') || '';
          const href = await link.getAttribute('href').catch(() => '') || '';
          const combined = (text + ' ' + href).toLowerCase();
          
          const isMatch = keywords.some(k => combined.includes(k));
          const isBadLink = ['home', 'login', 'sign in', 'signup', 'register', 'logout', 'blog', 'about', 'contact', 'mission', 'leadership', 'faq'].some(b => combined.includes(b));
          
          if (isMatch && !isBadLink) {
            console.log(`  🔗 Found matching job link: "${text.trim()}" (href: ${href}). Clicking...`);
            await link.click({ timeout: 5000 }).catch(() => {});
            await sleep(3000);
            return true;
          }
        }
      } catch {}
    }
  } catch {}
  return false;
}

// ─── Cookie Consent & Popups helper ───────────────────────────────
async function acceptCookiesAndClosePopups(page) {
  try {
    if (!page || page.isClosed()) return;
    const frames = safeGetFrames(page);
    
    for (const f of frames) {
      try {
        const elements = await f.$$('button, a, div[role="button"]');
        for (const el of elements) {
          if (!await el.isVisible().catch(() => false)) continue;
          const text = (await el.innerText().catch(() => '') || '').trim();
          const id = await el.getAttribute('id').catch(() => '') || '';
          const className = await el.getAttribute('class').catch(() => '') || '';
          const combined = (text + ' ' + id + ' ' + className).toLowerCase();
          
          if (['accept all', 'accept cookies', 'allow cookies', 'agree', 'got it', 'i accept', 'accept'].includes(text.toLowerCase())) {
            console.log(`  🍪 Cookie banner button found: "${text}". Clicking...`);
            await el.click({ timeout: 2000 }).catch(() => {});
            await sleep(1000);
          } else if (combined.includes('close') && (text === '×' || text.length === 0 || text.toLowerCase().includes('close'))) {
            if (text === '×' || text.toLowerCase() === 'close' || className.includes('close') || id.includes('close')) {
              console.log(`  ❌ Popup close button found: "${text}". Clicking...`);
              await el.click({ timeout: 2000 }).catch(() => {});
              await sleep(1000);
            }
          }
        }
      } catch {}
    }
  } catch {}
}

// ─── Click any Apply button ───────────────────────────────────────
async function clickApply(page) {
  try {
    if (!page || page.isClosed()) return false;

    const selectors = [
      'button:has-text("Apply on company site")', 'a:has-text("Apply on company site")',
      'button:has-text("Apply on company website")', 'a:has-text("Apply on company website")',
      'button:has-text("Apply Now")', 'button:has-text("Apply now")',
      'button:has-text("Apply")', 'a:has-text("Apply Now")',
      'a:has-text("Apply now")', 'a:has-text("Apply")',
      '#apply-button', '.apply-button', '[data-ga-track*="Apply"]',
      'button[class*="apply"]', 'a[class*="apply"]',
      'button:has-text("Submit Application")',
      'a[href="#career_detail"]',   // G7CR style
      'button:has-text("Click here")', 'a:has-text("Click here")',
    ];
    
    const frames = safeGetFrames(page);
    for (const f of frames) {
      for (const sel of selectors) {
        try {
          const el = await f.$(sel);
          if (!el) continue;
          if (!await el.isVisible().catch(() => false)) continue;
          await el.click({ timeout: 5000 }).catch(() => {});
          console.log(`  ✅ Clicked Apply: ${sel}`);
          return true;
        } catch {}
      }
    }
  } catch {}
  return false;
}

// ─── Upload resume ────────────────────────────────────────────────
async function tryUpload(page, pdfPath) {
  try {
    if (!page || page.isClosed()) return false;
    const frames = safeGetFrames(page);
    const sels = [
      'input[type="file"]', 'input[accept*="pdf"]',
      'input[name*="resume" i]', 'input[name*="cv" i]',
      'input[id*="resume" i]', 'input[id*="file" i]',
    ];
    
    for (const f of frames) {
      for (const sel of sels) {
        try {
          const els = await f.$$(sel);
          for (const el of els) {
            const hasFile = await el.evaluate(input => input.files && input.files.length > 0).catch(() => false);
            if (hasFile) return true;
            
            await el.setInputFiles(pdfPath);
            console.log(`  ✅ Resume uploaded successfully to ${sel}!`);
            return true;
          }
        } catch {}
      }
    }
  } catch {}
  return false;
}

// ─── Generic form filler ──────────────────────────────────────────
async function fillGenericForm(page, company, role, stop) {
  try {
    if (!page || page.isClosed()) return;
    const frames = safeGetFrames(page);
    for (const f of frames) {
      try {
        // 1. Label-based filling via browser-evaluated script
        await f.evaluate((profile) => {
          const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]), textarea'));
          
          function getLabelText(input) {
            if (input.id) {
              const label = document.querySelector(`label[for="${input.id}"]`);
              if (label) return label.innerText;
            }
            let parent = input.parentElement;
            for (let i = 0; i < 3 && parent; i++) {
              const label = parent.querySelector('label');
              if (label) return label.innerText;
              const text = parent.innerText || '';
              if (text && text.length < 100) return text;
              parent = parent.parentElement;
            }
            return (input.getAttribute('placeholder') || '') + ' ' + 
                   (input.getAttribute('name') || '') + ' ' + 
                   (input.id || '') + ' ' + 
                   (input.getAttribute('aria-label') || '');
          }

          const isVisible = (el) => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
          };
          for (const input of inputs) {
            if (!isVisible(input)) continue;
            if (input.value && input.value !== '') continue;
            
            const labelText = getLabelText(input).toLowerCase();
            let matched = true;
            
            if (labelText.includes('first name') || (labelText.includes('name') && !labelText.includes('last') && !labelText.includes('full'))) {
              input.value = profile.first_name;
            } else if (labelText.includes('last name')) {
              input.value = profile.last_name;
            } else if (labelText.includes('full name') || (labelText.includes('name') && !labelText.includes('first') && !labelText.includes('last'))) {
              input.value = profile.full_name;
            } else if (labelText.includes('email')) {
              input.value = profile.email;
            } else if (labelText.includes('phone') || labelText.includes('mobile') || labelText.includes('contact') || labelText.includes('number')) {
              input.value = profile.phone;
            } else if (labelText.includes('location') || labelText.includes('city') || labelText.includes('town')) {
              input.value = profile.location;
            } else if (labelText.includes('linkedin')) {
              input.value = profile.linkedin;
            } else if (labelText.includes('github')) {
              input.value = profile.github;
            } else if (labelText.includes('portfolio') || labelText.includes('website') || labelText.includes('personal site')) {
              input.value = profile.portfolio;
            } else if (labelText.includes('current ctc') || labelText.includes('current salary') || labelText.includes('current remuneration')) {
              input.value = profile.current_ctc;
            } else if (labelText.includes('expected ctc') || labelText.includes('expected salary') || labelText.includes('expected remuneration')) {
              input.value = profile.expected_ctc;
            } else if (labelText.includes('notice period') || labelText.includes('notice')) {
              input.value = profile.notice;
            } else if (labelText.includes('experience') && (labelText.includes('year') || labelText.includes('total') || labelText.includes('month'))) {
              input.value = '0';
            } else {
              matched = false;
            }
            
            if (matched) {
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        }, P).catch(() => {});

        // 2. Fallback using hardcoded selectors with safeType
        await safeType(f, 'input[name="your-name"], input[name="firstName"], input[name="name"], input[placeholder*="name" i]', P.full_name);
        await safeType(f, 'input[name="lastName"]', P.last_name);
        await safeType(f, 'input[type="email"], input[name*="email" i], input[placeholder*="email" i]', P.email);
        await safeType(f, 'input[type="tel"], input[name*="phone" i], input[name*="mobile" i], input[name="number"], input[placeholder*="phone" i], input[placeholder*="mobile" i]', P.phone);
        await safeType(f, 'input[name="location"], input[placeholder*="city" i], input[placeholder*="location" i]', P.location);
        await safeType(f, 'input[name*="linkedin" i], input[placeholder*="linkedin" i]', P.linkedin);
        await safeType(f, 'input[name*="github" i], input[placeholder*="github" i]', P.github);
        await safeType(f, 'input[name*="portfolio" i], input[name*="website" i]', P.portfolio);
        await safeType(f, 'input[name="remuneration"], input[name*="currentCtc" i], input[name*="current_ctc" i]', P.current_ctc);
        await safeType(f, 'input[name="ex_remuneration"], input[name*="expectedCtc" i], input[name*="expected_ctc" i]', P.expected_ctc);
        await safeType(f, 'input[name*="notice" i]', P.notice);
        await safeType(f, 'input[name*="experience" i]', '0');

        // Checkboxes
        const cbs = await f.$$('input[type="checkbox"]');
        for (const cb of cbs) {
          const checked = await cb.isChecked().catch(() => true);
          if (!checked) await cb.check().catch(() => {});
        }

        // Dropdown Selects
        const selects = await f.$$('select');
        for (const select of selects) {
          try {
            if (!await select.isVisible().catch(() => false)) continue;
            const options = await select.$$('option');
            for (const opt of options) {
              const val = await opt.getAttribute('value') || '';
              const text = await opt.innerText().catch(() => '') || '';
              if (text.toLowerCase().includes('immediate') || text.toLowerCase().includes('0 days') || text.toLowerCase().includes('15 days') || val === '0') {
                await select.selectOption(val);
              }
            }
          } catch {}
        }

        // Cover letter textarea
        const coverTxt = `Dear Hiring Manager,\n\nI am excited to apply for the ${role} position at ${company}. As a B.Tech CSE (AI & ML) 2025 graduate, I have built production-ready React.js applications: Eventify (event discovery app, React Hooks + REST APIs, deployed on Vercel), GitHub User Search (JavaScript + GitHub API), and Food Munch (AWS CloudFront). I am proficient in React.js, JavaScript (ES6+), HTML5, CSS3, and Git. I can join immediately.\n\nBest regards,\nVarun Pavan Sai Chadalavada\nvarunpavan45@gmail.com | +91 8688128008`;
        
        const taSelectors = ['textarea[name*="message" i]', 'textarea[name*="cover" i]', 'textarea'];
        for (const sel of taSelectors) {
          try {
            const ta = await f.$(sel);
            if (!ta || !await ta.isVisible().catch(() => false)) continue;
            const val = await ta.inputValue();
            if (!val) { await ta.fill(coverTxt); break; }
          } catch {}
        }
      } catch {}
    }
  } catch {}
}



// Check if standard form inputs are visible on the page
async function isFormPage(page) {
  try {
    if (!page || page.isClosed()) return false;
    return await page.evaluate(() => {
      const isVisible = (el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
      };
      const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]), textarea, select');
      for (const inp of inputs) {
        if (isVisible(inp) && !inp.disabled) return true;
      }
      return false;
    }).catch(() => false);
  } catch {
    return false;
  }
}

// ─── Fast fill pass on a single page ───────────────────────────────
async function fastFillPass(p, company, role, stop, pdfPath) {
  try {
    if (!p || p.isClosed()) return;
    const url = p.url();
    if (!url || url.includes('about:blank') || url.includes('naukri.com/login')) return;
    
    // Check if chatbot is open
    const chatbotOpen = await p.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
    }, CHATBOT_CONTAINER_SEL).catch(() => false);

    if (!p.tickCount) p.tickCount = 0;
    p.tickCount++;
    if (p.tickCount % 10 === 0) {
      console.log(`  🔄 [Tab ${p.jobIndex || '?'}] Polling. URL: ${url.substring(0, 80)}. Chatbot visible: ${chatbotOpen ? 'YES' : 'NO'}`);
    }

    if (!url.includes('naukri.com')) {
      const formVisible = await isFormPage(p);
      if (formVisible) {
        await fillGenericForm(p, company, role, stop);
        await tryUpload(p, pdfPath);
      } else {
        await acceptCookiesAndClosePopups(p);
        const clickedApply = await clickApply(p);
        if (clickedApply) {
          await sleep(1000);
        } else {
          if (!p.clickedJobLink) {
            const clickedLink = await clickMatchingJobLink(p, role);
            if (clickedLink) {
              p.clickedJobLink = true;
              await sleep(2000);
            }
          }
        }
      }
    } else {
      const isJobListing = url.includes('job-listings-');
      
      if (chatbotOpen) {
        if (!p.chatbotLogged) {
          console.log(`  🤖 [Tab ${p.jobIndex || '?'}] Recruiter Chatbot is open. Please answer the questions manually!`);
          p.chatbotLogged = true;
        }
        await tryUpload(p, pdfPath);
      } else {
        p.chatbotLogged = false;
        if (isJobListing) {
          const easyApplyOpen = await p.evaluate(() => {
            return !!document.querySelector('.apply-container, #easyApply, [class*="apply-form"], [class*="drawer"], [class*="modal"]');
          }).catch(() => false);
          
          if (!easyApplyOpen && !p.clickedApply) {
            const clicked = await clickApply(p);
            if (clicked) {
              p.clickedApply = true;
              await sleep(1500);
            }
          } else if (easyApplyOpen) {
            await fillNaukriEasyApply(p);
            await tryUpload(p, pdfPath);
          }
        } else {
          await fillNaukriEasyApply(p);
          await tryUpload(p, pdfPath);
        }
      }
    }
  } catch (err) {
    console.log(`  ⚠️ [Tab ${p.jobIndex || '?'}] Error in fastFillPass: ${err.message}`);
  }
}

// ─── Background polling filler ────────────────────────────────────
async function startPolling(context, company, role, stop, pdfPath) {
  while (!stop.done) {
    try {
      const pages = context.pages();
      if (pages.length === 0) {
        break;
      }
      let activeCount = 0;
      const promises = pages.map(async (p) => {
        try {
          if (!p || p.isClosed()) return;
          const url = p.url();
          if (!url || url.includes('about:blank')) return;
          
          if (url.includes('naukri.com/login')) {
            if (!p.loginLogged) {
              console.log(`  🔑 [Tab ${p.jobIndex || '?'}] URL is on login page: ${url}. Please log in manually.`);
              p.loginLogged = true;
            }
            return;
          }
          p.loginLogged = false;
          
          activeCount++;
          const comp = p.jobCompany || company;
          const ttl = p.jobTitle || role;
          await fastFillPass(p, comp, ttl, stop, pdfPath);
        } catch (err) {
          console.log(`  ⚠️ Error in tab loop: ${err.message}`);
        }
      });
      await Promise.all(promises);
      if (activeCount === 0) {
        await sleep(1000);
        continue;
      }
    } catch (err) {
      if (context.pages().length === 0) {
        break;
      }
    }
    await sleep(500); // Poll much faster!
  }
}

function getNextIdFromAll() {
  let maxId = 50;
  
  // Check reports
  const reportsDir = path.join(ROOT, 'reports');
  if (fs.existsSync(reportsDir)) {
    const files = fs.readdirSync(reportsDir);
    for (const file of files) {
      const match = file.match(/^(\d{3})-/);
      if (match) {
        const id = parseInt(match[1]);
        if (id > maxId) maxId = id;
      }
    }
  }
  
  // Check applications.md
  const appsFile = path.join(ROOT, 'data/applications.md');
  if (fs.existsSync(appsFile)) {
    const content = fs.readFileSync(appsFile, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.startsWith('|')) {
        const parts = line.split('|').map(s => s.trim());
        if (parts.length >= 2) {
          const id = parseInt(parts[1]);
          if (!isNaN(id) && id > maxId) {
            maxId = id;
          }
        }
      }
    }
  }
  return maxId + 1;
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('\n🎯 Smart Scan & Apply — Finding live fresher React jobs on Naukri...\n');

  if (!fs.existsSync(CV_PDF)) {
    console.error(`❌ CV not found: ${CV_PDF}\n   Generate it first: node generate-pdf.mjs`);
    process.exit(1);
  }
  console.log(`✅ CV ready: ${path.basename(CV_PDF)}\n`);

  // First: scan for live jobs
  const scanContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: null,
    args: ['--start-maximized'],
  });
  const scanPage = scanContext.pages()[0] || await scanContext.newPage();
  
  let jobs = [];
  try {
    jobs = await scanNaukriForJobs(scanPage);
  } finally {
    await scanContext.close();
  }

  if (jobs.length === 0) {
    console.log('❌ No jobs found in scan. Opening Naukri search manually...');
    jobs = [
      {
        company: 'Naukri Search',
        title: 'React Developer (Fresher)',
        href: 'https://www.naukri.com/react-js-developer-jobs-in-india?experience=0',
      }
    ];
  }

  // Take top 3
  const topJobs = jobs.slice(0, 3);
  console.log(`\n✅ Selected ${topJobs.length} jobs to apply:\n`);
  topJobs.forEach((j, i) => console.log(`  ${i+1}. [${j.company}] ${j.title}`));
  console.log('\nLaunching browser and opening all tabs in parallel...\n');

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: null,
    args: ['--start-maximized'],
  });

  const stop = { done: false };

  // Monitor new tabs (Naukri sometimes opens company site in new tab)
  context.on('page', async (newPage) => {
    try {
      await sleep(1000);
      if (newPage.isClosed()) return;
      console.log(`  📄 New tab opened: ${newPage.url().substring(0, 70)}`);
      
      const opener = await newPage.opener().catch(() => null);
      if (opener) {
        newPage.jobCompany = opener.jobCompany;
        newPage.jobTitle = opener.jobTitle;
        newPage.jobIndex = opener.jobIndex;
        console.log(`     Inherited metadata: [${newPage.jobCompany}] ${newPage.jobTitle}`);
      }
    } catch (e) {
      console.log(`  ⚠️ Error on tab creation hook: ${e.message}`);
    }
  });

  // Open all tabs in parallel (with minor delay to prevent network congestion)
  for (let i = 0; i < topJobs.length; i++) {
    await setupJobTab(context, topJobs[i], i + 1, topJobs.length, CV_PDF);
    if (i < topJobs.length - 1) {
      await sleep(1000);
    }
  }

  // Start background polling filler for the entire context
  startPolling(context, 'General', 'React Developer', stop, CV_PDF);

  console.log('\n' + '⚡'.repeat(32));
  console.log('  👉 ALL TABS OPENED AND BEING AUTO-FILLED IN PARALLEL!');
  console.log('  👉 Please check each tab, answer any manual questions, and click Submit.');
  console.log('  👉 CLOSE the main browser window when you are completely finished.');
  console.log('⚡'.repeat(32) + '\n');

  try {
    await new Promise(resolve => context.on('close', resolve));
  } catch {}
  
  stop.done = true;
  await context.close().catch(() => {});

  // Write reports and tracker additions
  console.log('\n📝 Generating reports and tracker additions for applied jobs...');
  let currentId = getNextIdFromAll();
  const today = new Date().toISOString().split('T')[0];
  const trackerAdditionsDir = path.join(ROOT, 'batch/tracker-additions');
  if (!fs.existsSync(trackerAdditionsDir)) {
    fs.mkdirSync(trackerAdditionsDir, { recursive: true });
  }

  const realAppliedJobs = topJobs.filter(j => j.company !== 'Naukri Search');
  for (const job of realAppliedJobs) {
    const paddedId = String(currentId).padStart(3, '0');
    const companySlug = job.company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const reportFilename = `${paddedId}-${companySlug}-${today}.md`;
    const reportPath = path.join(ROOT, 'reports', reportFilename);

    // 1. Generate minimal report
    const reportContent = `# Evaluation: ${job.company} — ${job.title}

**Date:** ${today}
**Score:** N/A
**URL:** ${job.href}
**Legitimacy:** High Confidence
**PDF:** [cv-varun-netlabs-2026-05-20.pdf](output/cv-varun-netlabs-2026-05-20.pdf)

---

## Role Summary
Scanned and applied via Naukri Easy Apply / Manual headed browser flow.
`;
    fs.writeFileSync(reportPath, reportContent, 'utf-8');
    console.log(`   Created report: ${reportFilename}`);

    // 2. Generate TSV tracker addition
    const tsvContent = `${currentId}\t${today}\t${job.company}\t${job.title}\tApplied\tN/A\t✅\t[${paddedId}](reports/${reportFilename})\tApplied via Naukri headed flow`;
    const tsvFilename = `${currentId}-${companySlug}.tsv`;
    fs.writeFileSync(path.join(trackerAdditionsDir, tsvFilename), tsvContent, 'utf-8');
    console.log(`   Created tracker addition: ${tsvFilename}`);

    currentId++;
  }

  console.log('\n🎉 ALL APPLICATIONS PROCESS COMPLETED!');
  if (realAppliedJobs.length > 0) {
    console.log('   Run: node merge-tracker.mjs  to update your tracker.\n');
  } else {
    console.log('   No real applications to merge (only fallback search page opened).\n');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
