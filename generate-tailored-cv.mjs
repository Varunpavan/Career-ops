import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

try {
  const { config } = await import('dotenv');
  config();
} catch {
  // Ignore if dotenv is not installed
}

import { GoogleGenerativeAI } from '@google/generative-ai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ GEMINI_API_KEY is not defined in the environment or .env file.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('❌ Provide a valid JD or Report path. Usage: node generate-tailored-cv.mjs <path>');
    process.exit(1);
  }

  const resolvedInputPath = path.resolve(__dirname, inputPath);
  if (!fs.existsSync(resolvedInputPath)) {
    console.error(`❌ Input file not found at ${resolvedInputPath}`);
    process.exit(1);
  }

  // Determine output slug
  const basename = path.basename(resolvedInputPath, path.extname(resolvedInputPath));
  // e.g. 037-oakya-frontend-2026-05-20 -> oakya-frontend
  const match = basename.match(/^\d+-(.*?)-\d{4}-\d{2}-\d{2}$/);
  const slug = match ? match[1] : basename;

  const cvPath = path.resolve(__dirname, 'cv.md');
  const profileYmlPath = path.resolve(__dirname, 'config/profile.yml');
  const templatePath = path.resolve(__dirname, 'templates/cv-template.html');

  const jdContent = fs.readFileSync(resolvedInputPath, 'utf-8');
  const cv = fs.readFileSync(cvPath, 'utf-8');
  const profileYml = fs.readFileSync(profileYmlPath, 'utf-8');
  const template = fs.readFileSync(templatePath, 'utf-8');

  console.log('🤖 Initializing Gemini to generate tailored CV HTML...');

  // User changed the model, let's use gemini-1.5-pro or gemini-2.5-pro just in case they meant to change it here but didn't save, or we use what's there. 
  // We'll use gemini-1.5-pro as it's more stable for these long generations if flash is 503ing.
  const modelName = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `
You are an expert technical resume writer. Your task is to customize the candidate's HTML resume template to match a specific Job Description (JD).
You must follow the instructions in the project's PDF CV mode exactly.

Candidate Resume (cv.md):
\`\`\`markdown
${cv}
\`\`\`

Candidate Profile (profile.yml):
\`\`\`yaml
${profileYml}
\`\`\`

Job Description / Report Context:
\`\`\`text
${jdContent}
\`\`\`

HTML Template:
\`\`\`html
${template}
\`\`\`

INSTRUCTIONS:
1. Replace all placeholders in the HTML template:
   - {{LANG}}: "en"
   - {{PAGE_WIDTH}}: "210mm" (A4 since location is India)
   - {{NAME}}: "Varun Pavan Sai Chadalavada"
   - {{PHONE}}: "+91 8688128008"
   - {{EMAIL}}: "varunpavan45@gmail.com"
   - {{LINKEDIN_URL}}: "https://www.linkedin.com/in/varun-pavan-4b43b2214/"
   - {{LINKEDIN_DISPLAY}}: "linkedin.com/in/varun-pavan-4b43b2214"
   - {{PORTFOLIO_URL}}: "https://github.com/Varunpavan"
   - {{PORTFOLIO_DISPLAY}}: "github.com/Varunpavan"
   - {{LOCATION}}: "India"
   - {{SECTION_SUMMARY}}: "Professional Summary"
   - {{SECTION_COMPETENCIES}}: "Core Competencies"
   - {{SECTION_EXPERIENCE}}: "Work Experience"
   - {{SECTION_PROJECTS}}: "Projects"
   - {{SECTION_EDUCATION}}: "Education"
   - {{SECTION_CERTIFICATIONS}}: "Certifications"
   - {{SECTION_SKILLS}}: "Skills"
   
2. Dynamic Content Generation:
   - {{SUMMARY_TEXT}}: Write a keyword-dense 3-4 line professional summary tailored to this JD. Target terms from the JD.
   - {{COMPETENCIES}}: Output 6-8 tags representing core technologies/skills matching the JD, formatted as:
     \`<span class="competency-tag">React.js</span> <span class="competency-tag">JavaScript (ES6)</span> ...\`
   - {{EXPERIENCE}}: Since the candidate is a fresher and has NO formal work experience, please remove the entire Work Experience section block from the HTML template. Do NOT output a blank Work Experience section.
   - {{PROJECTS}}: Format the 4 projects in cv.md (Eventify, GitHub User Search, Food Munch, UI/UX App Redesign) to fit the project-list layout. Ensure the description bullets focus on the frontend development, responsive design, REST API integration, and performance aspects highlighted in the JD. Maintain the HTML structure for each project:
     \`\`\`html
     <div class="project">
       <div class="job-header">
         <span class="project-title">Project Name <span class="project-badge">Live</span></span>
         <span class="job-period">Year</span>
       </div>
       <div class="project-desc">
         • Detail 1<br>
         • Detail 2
       </div>
       <div class="project-tech"><strong>Technologies:</strong> Tech 1, Tech 2</div>
     </div>
     \`\`\`
   - {{EDUCATION}}: Format the education entries from cv.md into the edu-item layout.
   - {{CERTIFICATIONS}}: Format certifications from cv.md using the cert-item grid layout.
   - {{SKILLS}}: Format categories from cv.md using the skills-grid layout.

3. Do NOT make any changes to the CSS/styles, colors, font families, margins, or basic layout structure. Return the FULL HTML document with placeholders resolved, and wrap it in a single \`\`\`html ... \`\`\` block. Do not write any explanations before or after.
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const htmlMatch = text.match(/```html([\s\S]*?)```/);
    const htmlContent = htmlMatch ? htmlMatch[1].trim() : text.trim();

    const outputHtmlPath = path.resolve(__dirname, `output/cv-varun-${slug}.html`);
    // Format date as YYYY-MM-DD
    const dateStr = new Date().toISOString().split('T')[0];
    const outputPdfPath = path.resolve(__dirname, `output/cv-varun-${slug}-${dateStr}.pdf`);

    fs.writeFileSync(outputHtmlPath, htmlContent, 'utf-8');
    console.log(`✅ Customized HTML CV written to: ${outputHtmlPath}`);

    // Call generate-pdf.mjs
    console.log('Generating ATS-compliant PDF...');
    execSync(`node generate-pdf.mjs ${outputHtmlPath} ${outputPdfPath} --format=a4`, { stdio: 'inherit' });
    console.log(`\n🎉 PDF successfully generated at: ${outputPdfPath}`);

  } catch (err) {
    console.error('❌ Failed to generate tailored CV:', err.message);
    process.exit(1);
  }
}

main().catch(console.error);