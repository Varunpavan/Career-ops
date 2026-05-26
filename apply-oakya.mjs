import { chromium } from 'playwright';
import path from 'path';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    console.log('🚀 Navigating to Oakya Career page...');
    await page.goto('https://oakyaitservices.com/career', { waitUntil: 'networkidle' });

    console.log('✍️ Filling form fields...');
    await page.fill('#full_name', 'Varun Pavan Sai Chadalavada');
    await page.fill('#email', 'varunpavan45@gmail.com');
    await page.fill('#phone', '+91 8688128008');
    await page.selectOption('#position', 'Web Developer');
    await page.fill('#experience', '0');
    
    const message = "As a Frontend Developer focused on React.js, I've built and deployed multiple responsive applications (Eventify, GitHub Search) and am eager to apply these skills in a professional team. Oakya’s focus on full-stack web and mobile development in Vijayawada aligns perfectly with my career goals and my preference for a work-from-office environment where I can collaborate and learn quickly.";
    await page.fill('#message', message);

    console.log('📎 Attaching resume...');
    const resumePath = path.resolve('output/cv-varun-oakya-frontend-2026-05-20.pdf');
    await page.setInputFiles('#resume', resumePath);

    console.log('📸 Taking a snapshot of the filled form...');
    await page.screenshot({ path: 'output/oakya-application-preview.png', fullPage: true });

    console.log('✅ Form is filled and preview saved to output/oakya-application-preview.png');
    console.log('⚠️ I have NOT clicked submit yet. Ready for your final confirmation.');

  } catch (err) {
    console.error('❌ Error filling form:', err.message);
  } finally {
    await browser.close();
  }
}

main();
