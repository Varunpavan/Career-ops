import { chromium } from 'playwright';
import path from 'path';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    console.log('🚀 Navigating...');
    await page.goto('https://oakyaitservices.com/career', { waitUntil: 'networkidle' });

    console.log('🖱️ Clicking Apply...');
    await page.click('.cr-apply-btn');
    await page.waitForTimeout(2000);

    console.log('✍️ Filling details...');
    await page.fill('input[name="full_name"]', 'Varun Pavan Sai Chadalavada');
    await page.fill('input[name="email"]', 'varunpavan45@gmail.com');
    await page.fill('input[name="mobile_number"]', '+91 8688128008');
    
    // Use evaluate to avoid $ symbol in selector checks
    const hasPosition = await page.evaluate(() => !!document.querySelector('select[name="position"]'));
    if (hasPosition) await page.selectOption('select[name="position"]', 'Web Developer');

    const hasExperience = await page.evaluate(() => !!document.querySelector('input[name="experience"]'));
    if (hasExperience) await page.fill('input[name="experience"]', '0');

    const msg = "As a Frontend Developer focused on React.js, I've built and deployed multiple responsive applications (Eventify, GitHub Search) and am eager to apply these skills in a professional team. Oakya’s focus on full-stack web and mobile development in Vijayawada aligns perfectly with my career goals and my preference for a work-from-office environment where I can collaborate and learn quickly.";
    const hasMsg = await page.evaluate(() => !!document.querySelector('textarea[name="message"]'));
    if (hasMsg) await page.fill('textarea[name="message"]', msg);

    console.log('📎 Attaching resume...');
    const resumePath = path.resolve('output/cv-varun-oakya-frontend-2026-05-20.pdf');
    await page.setInputFiles('input[name="resume"]', resumePath);

    console.log('📸 Saving preview...');
    await page.screenshot({ path: 'output/oakya-application-ready.png', fullPage: true });

    console.log('✅ Form filled! Ready for confirmation.');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await browser.close();
  }
}
main();
