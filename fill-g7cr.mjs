import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1280, height: 1080 } });

await page.goto('https://g7cr.com/careers/mern-stack-developer/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3000);

const applyBtn = page.locator('text=Apply now').or(page.locator('text=Interested?')).or(page.locator('text=Click here'));
if (await applyBtn.count() > 0) {
  console.log('Clicking Apply Now button...');
  await applyBtn.first().click();
  await page.waitForTimeout(1000);
}

await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(500);

await page.evaluate(() => {
  const forms = document.querySelectorAll('.wpcf7');
  forms.forEach(f => {
    f.style.display = 'block';
    f.style.visibility = 'visible';
    f.style.opacity = '1';
  });
  const hiddenInputs = document.querySelectorAll('.wpcf7-form-control');
  hiddenInputs.forEach(el => {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') {
      el.style.display = 'block';
      el.style.visibility = 'visible';
    }
  });
});

await page.waitForTimeout(500);

const yourNameInputs = page.locator('input[name="your-name"]');
const count = await yourNameInputs.count();
console.log(`Found ${count} your-name inputs`);

const firstFormInputs = yourNameInputs.first();
await firstFormInputs.scrollIntoViewIfNeeded();

try {
  await firstFormInputs.fill('Varun Pavan Sai Chadalavada', { timeout: 5000 });
  console.log('Name filled');

  const emailInput = page.locator('input[name="your-email"]').first();
  await emailInput.fill('varunpavan45@gmail.com');
  console.log('Email filled');

  const phoneInput = page.locator('input[name="your-phone"]');
  if (await phoneInput.count() > 0) {
    await phoneInput.first().fill('+91 8688128008');
    console.log('Phone filled');
  }

  const mobileInput = page.locator('input[name="your-mobile"]');
  if (await mobileInput.count() > 0) {
    await mobileInput.first().fill('+91 8688128008');
  }

  const expSelect = page.locator('select[name="your-experience"]');
  if (await expSelect.count() > 0) {
    await expSelect.first().selectOption('Fresher');
    console.log('Experience selected');
  }

  const msgInput = page.locator('textarea[name="your-message"]').first();
  await msgInput.fill('Hi Team G7 CR,\n\nI am a Computer Science Engineering graduate (AI & ML) with hands-on projects in React.js, Node.js, REST APIs, and AWS deployment. The MERN Stack Developer role aligns perfectly with the work I have already built.\n\nMy project Eventify (React.js, Tailwind CSS, REST APIs, auth flows) demonstrates component-based development with hooks, API integration, and responsive UI. My GitHub User Search app shows JavaScript ES6 proficiency with API integration. I also deployed on AWS (EC2, S3, CloudFront, Route 53).\n\nI am ready to join immediately as a full-time MERN Stack Developer.\n\nBest,\nVarun Pavan Sai Chadalavada');
  console.log('Message filled');

  await page.screenshot({ path: 'output/g7cr-form-filled.png', fullPage: false });
  console.log('Screenshot saved. Form is filled — check your browser window.');
} catch (e) {
  console.log('Error filling form:', e.message);
  await page.screenshot({ path: 'output/g7cr-form-error.png', fullPage: false });
}

await new Promise(() => {});
