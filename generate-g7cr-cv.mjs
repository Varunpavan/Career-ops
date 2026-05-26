import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const templatePath = path.resolve(__dirname, 'templates/cv-template.html');
  let html = fs.readFileSync(templatePath, 'utf-8');

  // Replace standard placeholders
  html = html.replace(/{{LANG}}/g, 'en');
  html = html.replace(/{{PAGE_WIDTH}}/g, '210mm');
  html = html.replace(/{{NAME}}/g, 'Varun Pavan Sai Chadalavada');
  html = html.replace(/{{PHONE}}/g, '+91 8688128008');
  html = html.replace(/{{EMAIL}}/g, 'varunpavan45@gmail.com');
  html = html.replace(/{{LINKEDIN_URL}}/g, 'https://www.linkedin.com/in/varun-pavan-4b43b2214/');
  html = html.replace(/{{LINKEDIN_DISPLAY}}/g, 'linkedin.com/in/varun-pavan-4b43b2214');
  html = html.replace(/{{PORTFOLIO_URL}}/g, 'https://github.com/Varunpavan');
  html = html.replace(/{{PORTFOLIO_DISPLAY}}/g, 'github.com/Varunpavan');
  html = html.replace(/{{LOCATION}}/g, 'India');
  
  html = html.replace(/{{SECTION_SUMMARY}}/g, 'Professional Summary');
  html = html.replace(/{{SECTION_COMPETENCIES}}/g, 'Core Competencies');
  html = html.replace(/{{SECTION_EXPERIENCE}}/g, 'Work Experience');
  html = html.replace(/{{SECTION_PROJECTS}}/g, 'Projects');
  html = html.replace(/{{SECTION_EDUCATION}}/g, 'Education');
  html = html.replace(/{{SECTION_CERTIFICATIONS}}/g, 'Certifications');
  html = html.replace(/{{SECTION_SKILLS}}/g, 'Skills');

  // Professional Summary
  const summaryText = 'Enthusiastic MERN Stack Developer fresher with hands-on experience building modern, responsive full-stack web applications using MongoDB, Express.js, React.js, and Node.js. Proficient in frontend technologies like HTML, CSS, JavaScript, React.js, Bootstrap, and Tailwind CSS. Eager to leverage project experience in building and deploying web applications.';
  html = html.replace(/{{SUMMARY_TEXT}}/g, summaryText);

  // Competencies
  const competencies = `
    <span class="competency-tag">React.js</span>
    <span class="competency-tag">JavaScript (ES6+)</span>
    <span class="competency-tag">Node.js</span>
    <span class="competency-tag">Express.js (basic)</span>
    <span class="competency-tag">MongoDB (basic)</span>
    <span class="competency-tag">REST APIs</span>
    <span class="competency-tag">AWS Deployment</span>
    <span class="competency-tag">UI/UX (Figma)</span>
  `;
  html = html.replace(/{{COMPETENCIES}}/g, competencies);

  // Experience (remove section completely for freshers)
  // Find experience container or remove
  // In the template, experience is wrapped like:
  // <div class="section">
  //   <div class="section-title">{{SECTION_EXPERIENCE}}</div>
  //   {{EXPERIENCE}}
  // </div>
  // We can replace {{EXPERIENCE}} with empty string and we can also remove the title / section or leave it clean.
  // Let's replace the whole experience block.
  const expPattern = /<div class="section">\s*<div class="section-title">\{\{SECTION_EXPERIENCE\}\}<\/div>[\s\S]*?\{\{EXPERIENCE\}\}\s*<\/div>/;
  html = html.replace(expPattern, '');

  // Projects
  const projectsHtml = `
    <div class="project">
      <div class="job-header">
        <span class="project-title">Eventify - Event Discovery Web App <span class="project-badge">Live</span></span>
        <span class="job-period">2024</span>
      </div>
      <div class="project-desc">
        • Built a responsive event discovery web app to browse recommended shows and upcoming events with smooth navigation and a mobile-friendly UI.<br>
        • Leveraged React.js, Tailwind CSS, Bootstrap, React Router DOM, and REST APIs for frontend development.<br>
        • Integrated REST APIs to fetch event details including location, date, weather, and distance.<br>
        • Implemented horizontal scrolling for recommended shows with lazy loading for upcoming events.<br>
        • Developed authentication flows for signup and login with session management, validation, and error handling.<br>
        • Optimized the app using React Hooks and responsive layouts, demonstrating understanding of asynchronous programming and state management.
      </div>
      <div class="project-tech"><strong>Technologies:</strong> React.js, JavaScript, Tailwind CSS, Bootstrap, React Router DOM, REST APIs, Vercel</div>
    </div>

    <div class="project">
      <div class="job-header">
        <span class="project-title">GitHub User Search Application <span class="project-badge">Live</span></span>
        <span class="job-period">2024</span>
      </div>
      <div class="project-desc">
        • Built a responsive web app to search GitHub users and explore profile stats with real-time repository insights.<br>
        • Used HTML5, Tailwind CSS, JavaScript ES6, and the GitHub REST API.<br>
        • Integrated the GitHub REST API using fetch() with repository filtering by language and sorting by stars or recent activity.<br>
        • Developed search history using localStorage with quick access and clear-history functionality.<br>
        • Enhanced usability with dark/light mode, copy-to-clipboard profile sharing, responsive UI, and error handling, showcasing understanding of asynchronous operations and client-side data persistence.
      </div>
      <div class="project-tech"><strong>Technologies:</strong> HTML5, CSS3, Tailwind CSS, JavaScript (ES6+), GitHub API, LocalStorage, Vercel</div>
    </div>

    <div class="project">
      <div class="job-header">
        <span class="project-title">Food Munch Website - Deployed on AWS <span class="project-badge">Live</span></span>
        <span class="job-period">2023</span>
      </div>
      <div class="project-desc">
        • Built a fully responsive food website with structured sections including Explore Menu, Delivery & Payment, and social links.<br>
        • Demonstrated awareness of deployment processes using AWS EC2, AWS S3, Route 53, and CloudFront.<br>
        • Designed a clean mobile-first UI with smooth navigation and a modern layout for better user experience.<br>
        • Deployed the website on AWS with CloudFront CDN and Route 53 for reliable hosting and fast delivery.
      </div>
      <div class="project-tech"><strong>Technologies:</strong> HTML5, CSS3, AWS EC2, AWS S3, Route 53, CloudFront</div>
    </div>

    <div class="project">
      <div class="job-header">
        <span class="project-title">UI/UX App Redesign in Figma</span>
        <span class="job-period">2023</span>
      </div>
      <div class="project-desc">
        • Redesigned a mobile application in Figma with improved navigation, modern visual design, and smoother user flows.<br>
        • Conducted user research and created a high-fidelity clickable prototype in Figma with accessibility improvements.<br>
        • Delivered finalized UI screens, interaction designs, and design assets to support developer handoff and implementation.
      </div>
      <div class="project-tech"><strong>Technologies:</strong> Figma, UI/UX Design, Prototyping, Wireframing</div>
    </div>
  `;
  html = html.replace(/{{PROJECTS}}/g, projectsHtml);

  // Education
  const educationHtml = `
    <div class="edu-item">
      <div class="edu-header">
        <span class="edu-title">B.Tech in Computer Science Engineering (AI & ML) <span class="edu-org">— Sri Vasavi Institute of Engineering & Technology (SVIET)</span></span>
        <span class="edu-year">2021 - 2025</span>
      </div>
      <div class="edu-desc">CGPA: 7.19 | Nandamuru, Andhra Pradesh</div>
    </div>
    <div class="edu-item">
      <div class="edu-header">
        <span class="edu-title">Intermediate / 12th <span class="edu-org">— Star Junior College</span></span>
        <span class="edu-year">2020</span>
      </div>
      <div class="edu-desc">CGPA: 6.03</div>
    </div>
    <div class="edu-item">
      <div class="edu-header">
        <span class="edu-title">10th Grade / SSC <span class="edu-org">— Dr. K.K.R's Gowtham Concept School</span></span>
        <span class="edu-year">2018</span>
      </div>
      <div class="edu-desc">CGPA: 7.7</div>
    </div>
  `;
  html = html.replace(/{{EDUCATION}}/g, educationHtml);

  // Certifications
  const certificationsHtml = `
    <div class="cert-item">
      <span class="cert-title"><a href="https://certificates.ccbp.in/academy/react-js?id=OWCJURNWIN">React JS Certification</a></span>
      <span class="cert-org">NxtWave CCBP Academy</span>
      <span class="cert-year">2024</span>
    </div>
    <div class="cert-item">
      <span class="cert-title"><a href="https://certificates.ccbp.in/academy/node-js?id=ANAEBCIJAB">Node.js Certification</a></span>
      <span class="cert-org">NxtWave CCBP Academy</span>
      <span class="cert-year">2024</span>
    </div>
    <div class="cert-item">
      <span class="cert-title"><a href="https://certificates.ccbp.in/academy/javascript-essentials?id=NFJLBZBLKL">JavaScript Essentials</a></span>
      <span class="cert-org">NxtWave CCBP Academy</span>
      <span class="cert-year">2024</span>
    </div>
    <div class="cert-item">
      <span class="cert-title"><a href="https://certificates.ccbp.in/academy/responsive-web-design-using-flexbox?id=XOMNIQAGOE">Responsive Web Design Using Flexbox</a></span>
      <span class="cert-org">NxtWave CCBP Academy</span>
      <span class="cert-year">2023</span>
    </div>
    <div class="cert-item">
      <span class="cert-title"><a href="https://certificates.ccbp.in/academy/introduction-to-databases?id=JRXTUTFZYK">Introduction to Databases</a></span>
      <span class="cert-org">NxtWave CCBP Academy</span>
      <span class="cert-year">2023</span>
    </div>
    <div class="cert-item">
      <span class="cert-title"><a href="https://certificates.ccbp.in/academy/dynamic-web-application?id=VQYJSKXPTH">Dynamic Web Applications</a></span>
      <span class="cert-org">NxtWave CCBP Academy</span>
      <span class="cert-year">2023</span>
    </div>
  `;
  html = html.replace(/{{CERTIFICATIONS}}/g, certificationsHtml);

  // Skills
  const skillsHtml = `
    <div class="skills-grid">
      <div class="skill-item"><span class="skill-category">Frontend Development:</span> HTML, CSS, Bootstrap, JavaScript, React.js</div>
      <div class="skill-item"><span class="skill-category">Backend Development:</span> Node.js, Express.js (basic understanding), SQL</div>
      <div class="skill-item"><span class="skill-category">Database:</span> MongoDB (basic understanding)</div>
      <div class="skill-item"><span class="skill-category">Programming Languages:</span> Python, JavaScript</div>
      <div class="skill-item"><span class="skill-category">Tools & Platforms:</span> React Router DOM, REST APIs, GitHub REST API, AWS (EC2, S3, Route 53, CloudFront), Figma, npm/yarn, Postman/Thunder Client (familiarity)</div>
      <div class="skill-item"><span class="skill-category">Soft Skills:</span> Communication, teamwork and collaboration, problem-solving, error handling and debugging, time management, critical thinking</div>
    </div>
  `;
  html = html.replace(/{{SKILLS}}/g, skillsHtml);

  // Write HTML output
  const outputHtmlPath = path.resolve(__dirname, 'output/cv-varun-g7cr.html');
  fs.writeFileSync(outputHtmlPath, html, 'utf-8');
  console.log(`✅ Manually generated G7CR HTML CV written to: ${outputHtmlPath}`);

  // Compile PDF using generate-pdf.mjs
  const dateStr = new Date().toISOString().split('T')[0];
  const outputPdfPath = path.resolve(__dirname, `output/cv-varun-g7cr-${dateStr}.pdf`);
  console.log('Generating PDF from HTML...');
  execSync(`node generate-pdf.mjs ${outputHtmlPath} ${outputPdfPath} --format=a4`, { stdio: 'inherit' });
  console.log(`\n🎉 Tailored CV PDF successfully generated at: ${outputPdfPath}`);
}

main().catch(console.error);
