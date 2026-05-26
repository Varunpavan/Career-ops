import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto('https://g7cr.com/careers/mern-stack-developer/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2000);

await page.fill('input[name="your-name"]', 'Varun Pavan Sai Chadalavada');
await page.fill('input[name="your-email"]', 'varunpavan45@gmail.com');
await page.fill('input[name="your-phone"]', '+91 8688128008');
await page.selectOption('select[name="your-experience"]', 'Fresher');
await page.fill('textarea[name="your-message"]', `Hi Team G7 CR,

I am a Computer Science Engineering graduate (AI & ML) with hands-on projects in React.js, Node.js, REST APIs, and AWS deployment. The MERN Stack Developer role aligns perfectly with the work I have already built.

My project Eventify (React.js, Tailwind CSS, REST APIs, auth flows) demonstrates component-based development with hooks, API integration, and responsive UI. My GitHub User Search app shows JavaScript ES6 proficiency with API integration and localStorage. I also deployed a responsive website on AWS (EC2, S3, CloudFront, Route 53).

I am looking for a full-time opportunity where I can grow into a complete product developer. I am based in India and ready to join immediately.

Best,
Varun Pavan Sai Chadalavada`);

await page.waitForTimeout(500);

await page.click('input[type="submit"]');
await page.waitForTimeout(5000);

console.log('Submit clicked. Final URL:', page.url());
await page.screenshot({ path: 'output/g7cr-submit-result.png', fullPage: false });

const text = await page.textContent('body');
if (text.includes('success') || text.includes('Thank you') || text.includes('sent') || text.includes('received')) {
  console.log('Submission successful!');
} else {
  console.log('Page content after submit (first 500 chars):', text.substring(0, 500));
}

await browser.close();
