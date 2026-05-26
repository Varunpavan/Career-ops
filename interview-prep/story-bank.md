# Story Bank — Master STAR+R Stories

This file accumulates your best interview stories over time. Each evaluation (Block F) adds new stories here. Instead of memorizing 100 answers, maintain 5-10 deep stories that you can bend to answer almost any behavioral question.

## How it works

1. Every time `/career-ops oferta` generates Block F (Interview Plan), new STAR+R stories get appended here
2. Before your next interview, review this file — your stories are already organized by theme
3. The "Big Three" questions can be answered with stories from this bank:
   - "Tell me about yourself" → combine 2-3 stories into a narrative
   - "Tell me about your most impactful project" → pick your highest-impact story
   - "Tell me about a conflict you resolved" → find a story with a Reflection

---

## Stories

---

### [Problem Solving] Building a Real-Time Event Discovery App from Scratch
**Source:** Personal Project — Eventify
**S (Situation):** I wanted to build a portfolio project that was more than a tutorial clone — something with real API integration, authentication, and a production-quality UI.
**T (Task):** Design and build a full event discovery web app using React.js that fetches live event data, handles user authentication, and works flawlessly on mobile.
**A (Action):** I used React.js with React Router DOM for navigation, integrated a REST API to fetch event details including location, date, weather, and distance. I built authentication flows with session management, validation, and error handling. I implemented horizontal scrolling for recommended shows with lazy loading for performance, and used Tailwind CSS for responsive layout.
**R (Result):** Delivered a fully deployed app on Vercel (https://eventify-web-lilac.vercel.app/) that works across devices, handles API errors gracefully, and demonstrates real React patterns like hooks, routing, and component-based architecture.
**Reflection:** I learned that lazy loading and proper error boundaries make a huge difference to UX. Next time I'd add TypeScript from the start.
**Best for questions about:** "Tell me about a project you're proud of", "How do you handle API integration", "How do you approach building from scratch"

---

### [Technical Depth] Deploying a Website on AWS with CDN
**Source:** Personal Project — Food Munch Website
**S (Situation):** I had built a responsive food website and wanted to understand cloud deployment beyond just Vercel or GitHub Pages.
**T (Task):** Deploy the website using AWS services with proper CDN setup for fast delivery globally.
**A (Action):** I set up AWS EC2 for compute, S3 for static asset hosting, configured Route 53 for DNS, and set up CloudFront as a CDN in front of S3. I learned how cache invalidation works and configured HTTPS.
**R (Result):** The site is live at https://d25wpjg4cz9y1d.cloudfront.net/ with fast load times via CDN. I can now confidently discuss S3 static hosting, CloudFront distributions, and Route 53 DNS records in interviews.
**Reflection:** AWS has a learning curve but the hands-on experience is irreplaceable. I'd next explore CI/CD pipelines to automate deployments.
**Best for questions about:** "What do you know about cloud/AWS?", "How do you deploy web applications?", "Tell me about your technical depth outside frontend"

---

### [API Integration & Debugging] GitHub API with Error Handling and Edge Cases
**Source:** Personal Project — GitHub User Search Application
**S (Situation):** I wanted to build a real JavaScript app (no framework) that made real API calls and handled all the edge cases properly.
**T (Task):** Build a GitHub user search app that fetches live profile data, handles API rate limits, invalid users, and provides a polished UX with dark/light mode.
**A (Action):** I used the GitHub REST API with fetch(), implemented repository filtering by language and sorting by stars or recent activity. I built search history using localStorage with quick access and clear-history functionality. I added dark/light mode toggle, copy-to-clipboard profile sharing, and proper error handling for both invalid users and API rate limits.
**R (Result):** Deployed app at https://git-hub-user-search-application.vercel.app/. Demonstrates vanilla JS skills, API integration, localStorage patterns, and complete error handling — not just "happy path" development.
**Reflection:** Working with API rate limits taught me to always design for failure, not just success. A retry mechanism or caching layer would improve it further.
**Best for questions about:** "How do you handle errors in JavaScript?", "Tell me about working with REST APIs", "What JavaScript projects have you built without a framework?"

---

### [Design Thinking] UI/UX Redesign Process in Figma
**Source:** Personal Project — Mobile App Redesign
**S (Situation):** I wanted to understand the full design-to-development workflow, not just the code side. I took an existing mobile app and redesigned it from a user perspective.
**T (Task):** Conduct user research, identify UX pain points, redesign the app in Figma with improved navigation and modern visuals, and deliver developer-ready assets.
**A (Action):** I studied the original app's navigation flows, identified friction points, and created wireframes first before moving to high-fidelity designs. I incorporated accessibility improvements (contrast ratios, tap target sizes), built a clickable prototype for testing flows, and delivered finalized UI screens and design assets for handoff.
**R (Result):** Completed Figma prototype: https://drive.google.com/file/d/1YzftDd-JAkhQTGc22WGILduha_ZRD48q/view. I can now bridge the gap between design and development — I understand both sides of the UI conversation.
**Reflection:** Design thinking first saves development time. I'd involve real users earlier in the wireframe stage next time.
**Best for questions about:** "How do you work with designers?", "Tell me about your UI/UX awareness", "How do you approach a new feature or page?"

---

### [Learning & Adaptability] Completing 8 Certifications While Building Projects
**Source:** NxtWave CCBP Academy Certifications
**S (Situation):** As a fresher with a B.Tech in AI & ML, I needed to deliberately build frontend skills since my degree was more theory-focused.
**T (Task):** Gain structured, verifiable frontend skills in React.js, Node.js, JavaScript, responsive design, and databases — alongside building real projects.
**A (Action):** Completed 8 certifications covering React JS, Node.js, JavaScript Essentials, Responsive Web Design with Flexbox, Introduction to Databases, Dynamic Web Applications, Responsive Websites, and Static Websites. Didn't stop at courses — applied each skill in a real deployed project.
**R (Result):** Graduated with both certifications and a live portfolio demonstrating those skills. I can discuss what I learned and show the code.
**Reflection:** Certifications are starting points, not endpoints. The real learning came from building the projects. I now invest time in both structured learning and hands-on application.
**Best for questions about:** "Why should we hire a fresher?", "How do you upskill?", "What have you done to prepare for this role?"

---

## Fresher Script: "Why hire me over experienced candidates?"

> "I'm a fresher, but I've built and deployed 4 real projects that I can demo right now — not just show code for. I understand React patterns like hooks, routing, and API integration from building them, not from watching tutorials. My AWS deployment experience and Figma design awareness also mean I can contribute beyond just writing components. I learn fast and I'm not carrying bad habits from years of legacy codebases. I'd be fully committed from day one."

## Fresher Script: "What's your salary expectation?"

> "For an entry-level frontend role in India, I'm targeting between 3.5 to 6 LPA depending on the role scope, learning opportunity, and company. I'm flexible for the right opportunity where I can grow quickly."

## Fresher Script: "What's your notice period?"

> "I'm a fresher — I can join immediately or within a week of receiving an offer letter."
