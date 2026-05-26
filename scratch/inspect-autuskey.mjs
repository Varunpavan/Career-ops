import { chromium } from 'playwright';

async function main() {
  console.log('Navigating to Autuskey career page...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://autuskey.com/careers/react-js-developer-job', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    console.log('Page Title:', await page.title());
    
    // Check for chatbot
    const chatbotContainer = await page.$('._chatBotContainer, [class*="chatBotContainer"], [class*="chatbot-container"], [id*="ChatbotContainer"], [class*="chatbot_Overlay"], [class*="ChatbotContainer"]');
    console.log('Chatbot Container Present:', !!chatbotContainer);
    
    // Dump all visible inputs
    const inputs = await page.evaluate(() => {
      const getLabelText = (input) => {
        if (input.id) {
          const label = document.querySelector(`label[for="${input.id}"]`);
          if (label) return label.innerText;
        }
        let parent = input.parentElement;
        for (let i = 0; i < 3 && parent; i++) {
          const label = parent.querySelector('label');
          if (label) return label.innerText;
          parent = parent.parentElement;
        }
        return '';
      };
      
      const elements = Array.from(document.querySelectorAll('input, textarea, select, button'));
      return elements.map(el => {
        const rect = el.getBoundingClientRect();
        const visible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
        if (!visible) return null;
        
        return {
          tagName: el.tagName,
          type: el.getAttribute('type') || '',
          name: el.getAttribute('name') || '',
          id: el.id || '',
          placeholder: el.getAttribute('placeholder') || '',
          labelText: getLabelText(el),
          innerText: el.innerText || '',
        };
      }).filter(Boolean);
    });
    
    console.log('\n--- Visible Elements on Page ---');
    console.log(JSON.stringify(inputs, null, 2));
    
  } catch (err) {
    console.error('Error during inspection:', err.message);
  } finally {
    await browser.close();
  }
}

main();
