import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const cvPath = path.resolve(__dirname, 'cv-netlabs-tailored.md');
  const templatePath = path.resolve(__dirname, 'templates/cv-template.html');
  const profilePath = path.resolve(__dirname, 'config/profile.yml');

  if (!fs.existsSync(cvPath)) {
    console.error(`❌ Tailored CV not found at ${cvPath}`);
    process.exit(1);
  }

  const cvContent = fs.readFileSync(cvPath, 'utf-8');
  const template = fs.readFileSync(templatePath, 'utf-8');
  const profile = fs.readFileSync(profilePath, 'utf-8');

  // Simple parser for the tailored markdown
  const sections = {};
  const lines = cvContent.split('\n');
  let currentSection = '';
  
  for (const line of lines) {
    if (line.startsWith('## ')) {
      currentSection = line.replace('## ', '').trim();
      sections[currentSection] = [];
    } else if (currentSection && line.trim()) {
      sections[currentSection].push(line);
    }
  }

  // Placeholder mapping
  const placeholders = {
    '{{LANG}}': 'en',
    '{{PAGE_WIDTH}}': '210mm',
    '{{NAME}}': 'Varun Pavan Sai Chadalavada',
    '{{PHONE}}': '+91 8688128008',
    '{{EMAIL}}': 'varunpavan45@gmail.com',
    '{{LINKEDIN_URL}}': 'https://www.linkedin.com/in/varun-pavan-4b43b2214/',
    '{{LINKEDIN_DISPLAY}}': 'linkedin.com/in/varun-pavan-4b43b2214',
    '{{PORTFOLIO_URL}}': 'https://github.com/Varunpavan',
    '{{PORTFOLIO_DISPLAY}}': 'github.com/Varunpavan',
    '{{LOCATION}}': 'India',
    '{{SECTION_SUMMARY}}': 'Professional Summary',
    '{{SECTION_COMPETENCIES}}': 'Core Competencies',
    '{{SECTION_EXPERIENCE}}': 'Work Experience',
    '{{SECTION_PROJECTS}}': 'Projects',
    '{{SECTION_EDUCATION}}': 'Education',
    '{{SECTION_CERTIFICATIONS}}': 'Certifications',
    '{{SECTION_SKILLS}}': 'Skills',
  };

  // Extract Summary
  const summaryLines = sections['Summary'] || [];
  placeholders['{{SUMMARY_TEXT}}'] = summaryLines.join(' ');

  // Extract Competencies from Technical Skills
  const skillLines = sections['Technical Skills'] || [];
  const competencies = skillLines
    .filter(l => l.startsWith('- '))
    .map(l => l.replace('- ', '').split(':').pop().split(','))
    .flat()
    .map(s => s.trim())
    .slice(0, 8);
  
  placeholders['{{COMPETENCIES}}'] = competencies
    .map(c => `<span class="competency-tag">${c}</span>`)
    .join(' ');

  // Projects (Fresher - No experience, so we skip Experience section)
  let experienceHtml = ''; // Empty since fresher
  placeholders['{{EXPERIENCE}}'] = '';

  // Projects
  const projectLines = sections['Projects'] || [];
  let projectsHtml = '';
  let currentProject = null;

  for (const line of projectLines) {
    if (line.startsWith('### ')) {
      if (currentProject) {
        projectsHtml += formatProject(currentProject);
      }
      currentProject = { title: line.replace('### ', '').trim(), tech: '', bullets: [] };
    } else if (line.startsWith('*') && currentProject) {
      currentProject.tech = line.replace('*', '').replace('*', '').trim();
    } else if (line.startsWith('- ') && currentProject) {
      currentProject.bullets.push(line.replace('- ', '').trim());
    }
  }
  if (currentProject) projectsHtml += formatProject(currentProject);
  placeholders['{{PROJECTS}}'] = projectsHtml;

  function formatProject(p) {
    return `
    <div class="project">
      <div class="job-header">
        <span class="project-title">${p.title}</span>
      </div>
      <div class="project-desc">
        ${p.bullets.map(b => `• ${b}`).join('<br>')}
      </div>
      <div class="project-tech"><strong>Technologies:</strong> ${p.tech}</div>
    </div>`;
  }

  // Education
  const eduLines = sections['Education'] || [];
  let eduHtml = '';
  for (const line of eduLines) {
    if (line.startsWith('### ')) {
      const parts = line.replace('### ', '').split('|').map(s => s.trim());
      eduHtml += `
      <div class="edu-item">
        <div class="edu-header">
          <span class="edu-title">${parts[0]}</span>
          <span class="edu-year">${parts[1]}</span>
        </div>
        <div class="edu-desc">${parts[2]}</div>
      </div>`;
    }
  }
  placeholders['{{EDUCATION}}'] = eduHtml;

  // Certifications
  const certLines = sections['Certifications'] || [];
  placeholders['{{CERTIFICATIONS}}'] = certLines
    .filter(l => l.startsWith('- '))
    .map(l => {
      const parts = l.replace('- ', '').split(':').map(s => s.trim());
      const title = parts[0].replace('**', '').replace('**', '');
      return `
      <div class="cert-item">
        <span class="cert-title">${title}</span>
        <span class="cert-org">CCBP Academy</span>
      </div>`;
    })
    .join('');

  // Skills
  placeholders['{{SKILLS}}'] = skillLines
    .filter(l => l.startsWith('- '))
    .map(l => {
      const parts = l.replace('- ', '').split(':').map(s => s.trim());
      return `
      <div class="skill-item">
        <span class="skill-category">${parts[0]}:</span> ${parts[1]}
      </div>`;
    })
    .join('');

  // Generate HTML
  let finalHtml = template;
  for (const [key, value] of Object.entries(placeholders)) {
    finalHtml = finalHtml.split(key).join(value);
  }

  // Remove Work Experience section if empty
  if (placeholders['{{EXPERIENCE}}'] === '') {
    finalHtml = finalHtml.replace(/<!-- WORK EXPERIENCE -->[\s\S]*?<\/div>\s*<\/div>/, '');
  }

  const outputHtmlPath = path.resolve(__dirname, 'output/cv-varun-netlabs.html');
  const outputPdfPath = path.resolve(__dirname, 'output/cv-varun-netlabs-2026-05-20.pdf');

  fs.writeFileSync(outputHtmlPath, finalHtml, 'utf-8');
  console.log(`✅ HTML generated at ${outputHtmlPath}`);

  console.log('Generating PDF...');
  execSync(`node generate-pdf.mjs ${outputHtmlPath} ${outputPdfPath} --format=a4`, { stdio: 'inherit' });
  console.log(`\n🎉 PDF generated at ${outputPdfPath}`);
}

main().catch(console.error);
