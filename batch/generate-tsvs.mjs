#!/usr/bin/env node
// Generate all TSV files from report data

const entries = [
  { num: '054', company: 'Lumel Technologies', role: 'Junior React Developer (0-2 Years)', score: 4.2, date: '2026-05-22', note: 'Strong fresher frontend opportunity, React + data viz in Chennai' },
  { num: '055', company: 'PhonePe', role: 'UI Engineer / Frontend Developer', score: 2.5, date: '2026-05-22', note: 'Generic company page, likely requires 2+ years experience' },
  { num: '056', company: 'Urban Company', role: 'Frontend Engineer', score: 2.0, date: '2026-05-22', note: 'Tech stack mismatch (Angular vs React), generic company page' },
  { num: '057', company: 'InMobi', role: 'Software Engineer - Frontend', score: 2.0, date: '2026-05-22', note: 'Generic company page, no active fresher frontend role' },
  { num: '058', company: 'Postman', role: 'Software Engineer (Frontend)', score: 2.0, date: '2026-05-22', note: 'Requires 3+ years experience, not fresher friendly' },
  { num: '059', company: 'Salesforce', role: 'React Developer', score: 1.5, date: '2026-05-22', note: 'Requires Salesforce platform knowledge, not pure React role' },
  { num: '060', company: 'MindNudge', role: 'React Developer (Freshers Welcome)', score: 1.0, date: '2026-05-22', note: 'Domain is for sale, no active job posting' },
  { num: '061', company: 'G7 CR Technologies (Noventiq Global AI Solutions)', role: 'MERN Stack Developer (Fresher / Entry Level)', score: 4.5, date: '2026-05-22', note: 'Excellent fresher MERN role, apply immediately' },
  { num: '062', company: 'InMobi', role: 'Intern - Industrial Trainee', score: 1.0, date: '2026-05-22', note: 'Non-tech finance/articleship role, SKIP' },
  { num: '063', company: 'Nitroxen Tech India Pvt Ltd', role: 'ReactJS Developer Intern', score: 3.8, date: '2026-05-22', note: 'Decent internship for React experience despite low stipend' },
  { num: '064', company: 'G7 CR Technologies', role: 'MERN Stack Developer (Fresher/Entry Level)', score: 4.3, date: '2026-05-22', note: 'Duplicate of 061, apply only once' },
  { num: '065', company: 'Twilio', role: 'Frontend Engineer (React)', score: 1.5, date: '2026-05-22', note: 'Generic page, roles require 6-8 years experience' },
  { num: '066', company: 'ElevenLabs', role: 'Solutions Engineer - India', score: 1.5, date: '2026-05-22', note: 'Pre-sales role requiring Python, not frontend development' },
  { num: '067', company: 'Airtable', role: 'Product Security Engineer', score: 0.5, date: '2026-05-22', note: 'Security role requiring 4+ years experience, not frontend' },
  { num: '068', company: 'Parloa', role: 'Technical Support Engineer', score: 1.0, date: '2026-05-22', note: 'Support role in Malaysia, wrong location and role type' },
  { num: '069', company: 'Glean', role: 'Application Security Engineer', score: 0.5, date: '2026-05-22', note: 'Security role requiring 3+ years in app sec' },
  { num: '070', company: 'Glean', role: 'CA Industrial Trainee', score: 0.0, date: '2026-05-22', note: 'Chartered Accountancy role, not tech' },
  { num: '071', company: 'Glean', role: 'Quality Assurance Engineer', score: 1.5, date: '2026-05-22', note: 'QA role requiring 2+ years experience, not frontend dev' },
  { num: '072', company: 'Glean', role: 'Software Engineer, Backend', score: 0.5, date: '2026-05-22', note: 'Backend role requiring 3+ years, not frontend' },
  { num: '073', company: 'Glean', role: 'Technical Support Engineer (EST shift hours)', score: 1.5, date: '2026-05-22', note: 'Support role with night shift, not development' },
  { num: '074', company: 'Glean', role: 'Technical Support Engineer (PST shift hours)', score: 1.5, date: '2026-05-22', note: 'Support role with overnight shift, not development' },
  { num: '075', company: 'PhonePe', role: 'Product Solution Engineer', score: 1.5, date: '2026-05-22', note: 'Integration/support role requiring 2-5 years experience' },
  { num: '076', company: 'Decagon', role: 'Strategic Solutions Engineer, East', score: 0.5, date: '2026-05-22', note: 'Senior pre-sales role in US, triple mismatch' },
  { num: '077', company: 'Decagon', role: 'Strategic Solutions Engineer, West', score: 0.5, date: '2026-05-22', note: 'Senior pre-sales role in US, triple mismatch' },
  { num: '078', company: 'Zapier', role: 'Software Engineer — Release Engineering', score: 0.5, date: '2026-05-22', note: 'Senior infrastructure role, zero fit for fresher' },
  { num: '079', company: 'Arize AI', role: 'AI Application Engineer', score: 0.8, date: '2026-05-22', note: 'AI infra role, Buenos Aires, minor TypeScript overlap' },
  { num: '080', company: 'Arize AI', role: 'AI Application Engineer, APJ', score: 0.8, date: '2026-05-22', note: 'AI infra role Singapore-based, minor JS/TS overlap' },
  { num: '081', company: 'Arize AI', role: 'AI Solutions Engineer, East', score: 0.5, date: '2026-05-22', note: 'Pre-sales AI solutions role, no match' },
  { num: '082', company: 'Arize AI', role: 'AI Solutions Engineer, EMEA', score: 0.5, date: '2026-05-22', note: 'Pre-sales AI solutions role, no match' },
  { num: '083', company: 'Arize AI', role: 'AI Solutions Engineer, West', score: 0.5, date: '2026-05-22', note: 'Pre-sales AI solutions role, no match' },
  { num: '084', company: 'Arize AI', role: 'Forward Deployed Engineer, APJ', score: 0.8, date: '2026-05-22', note: 'Client-facing ML infra role, minor TypeScript overlap' },
  { num: '085', company: 'RunPod', role: 'Forward Deployed Engineer APAC', score: 1.0, date: '2026-05-22', note: 'Senior full-stack AI role requiring 3+ years, minor JS overlap' },
  { num: '086', company: 'Boomi', role: 'Cloud Security Engineer', score: 0.3, date: '2026-05-22', note: 'Cloud security role, no frontend overlap' },
  { num: '087', company: 'Postman', role: 'Corporate Solutions Engineer, Nordics', score: 0.5, date: '2026-05-22', note: 'Senior SE role in Denmark, no match' },
  { num: '088', company: 'Postman', role: 'Enterprise Solutions Engineer, Italy', score: 0.5, date: '2026-05-22', note: 'Senior SE role requiring 8+ years Italy-based' },
  { num: '089', company: 'Postman', role: 'Enterprise Solutions Engineer, Netherlands', score: 0.5, date: '2026-05-22', note: 'Senior SE role in Netherlands requiring 5+ years' },
  { num: '090', company: 'Postman', role: 'Strategic Solutions Engineering, Netherlands/Sweden/Denmark', score: 0.5, date: '2026-05-22', note: 'Senior SE role requiring 5+ years consulting exp' },
  { num: '091', company: 'Glacis AI', role: 'Founding Software Engineer - Agentic AI', score: 0.3, date: '2026-05-22', note: 'Founding engineer at AI startup, not fresher level' },
  { num: '092', company: 'Celonis', role: 'Applied AI Engineer', score: 0.8, date: '2026-05-22', note: 'Senior AI engineer requiring 7+ years, Bangalore location' },
  { num: '093', company: 'Photoroom', role: 'Contract FastAPI Engineer (6 months)', score: 0.5, date: '2026-05-22', note: 'Python backend contract, not frontend' },
  { num: '094', company: 'Amplemarket', role: 'Spontaneous Application - Infrastructure Engineer', score: 0.3, date: '2026-05-22', note: 'Infra role spontaneous app, no match' },
  { num: '095', company: 'Supabase', role: 'Support Engineer (EMEA)', score: 0.5, date: '2026-05-22', note: 'Database support role, not frontend' },
  { num: '096', company: 'Supabase', role: 'Support Engineer (AMER)', score: 0.5, date: '2026-05-22', note: 'Database support role, not frontend' },
  { num: '097', company: 'Supabase', role: 'Support Engineer (APAC)', score: 0.5, date: '2026-05-22', note: 'Database support role, not frontend' },
  { num: '098', company: 'Supabase', role: 'Multigres Engineer', score: 0.3, date: '2026-05-22', note: 'Distributed database engineering, no overlap' },
  { num: '099', company: 'Supabase', role: 'Postgres Engineer', score: 0.3, date: '2026-05-22', note: 'Postgres database internals, no overlap' },
  { num: '100', company: 'Supabase', role: 'Multigres Deployment Engineer', score: 0.3, date: '2026-05-22', note: 'Deployment infrastructure engineering, no overlap' },
  { num: '101', company: 'Supabase', role: 'Database Support Engineer (AMER)', score: 0.5, date: '2026-05-22', note: 'Database support requiring Postgres/MySQL, no overlap' },
  { num: '102', company: 'Supabase', role: 'Database Support Engineer (EMEA)', score: 0.5, date: '2026-05-22', note: 'Database support requiring Postgres/MySQL, no overlap' },
  { num: '103', company: 'Supabase', role: 'Database Support Engineer (APAC)', score: 0.5, date: '2026-05-22', note: 'Database support requiring Postgres/MySQL, no overlap' },
  { num: '104', company: 'Supabase', role: 'SDK Engineer - Kotlin', score: 0.3, date: '2026-05-22', note: 'Kotlin SDK requiring 5+ years, no overlap' },
  { num: '105', company: 'Supabase', role: 'AI Tooling Engineer', score: 0.3, date: '2026-05-22', note: 'AI/ML tooling engineering, no frontend overlap' },
  { num: '106', company: 'Supabase', role: 'Postgres Deployment Engineer (Nix)', score: 0.3, date: '2026-05-22', note: 'Nix-based deployment engineering, no overlap' },
  { num: '107', company: 'Supabase', role: 'Software Engineer (Go) - Auth Product', score: 0.3, date: '2026-05-22', note: 'Go backend auth engineering, no frontend overlap' },
  { num: '108', company: 'Supabase', role: 'Software Engineer (Go) - Auth', score: 0.3, date: '2026-05-22', note: 'Go backend auth engineering, no frontend overlap' },
  { num: '109', company: 'Supabase', role: 'Platform Engineer - Multicloud', score: 0.3, date: '2026-05-22', note: 'Multi-cloud infra engineering, no frontend overlap' },
  { num: '110', company: 'Supabase', role: 'Design Engineer', score: 1.5, date: '2026-05-22', note: 'Skills direction right, but requires 3+ years professional exp' },
  { num: '111', company: 'Supabase', role: 'CLI Engineer', score: 0.3, date: '2026-05-22', note: 'CLI tooling engineering, no frontend overlap' },
  { num: '112', company: 'Supabase', role: 'Software Engineer: IaC Platform Experience', score: 0.3, date: '2026-05-22', note: 'IaC platform engineering, no frontend overlap' },
  { num: '113', company: 'Supabase', role: 'Edge Functions Engineer', score: 0.3, date: '2026-05-22', note: 'Edge computing engineering, no frontend overlap' },
  { num: '114', company: 'Resend', role: 'Backend Engineer, Core Sending', score: 0.3, date: '2026-05-22', note: 'Backend infrastructure for email sending, no overlap' },
  { num: '115', company: 'Hightouch', role: 'Full Stack Product Engineer', score: 0.8, date: '2026-05-22', note: 'Senior full-stack role, US-based, skills partially align' },
  { num: '116', company: 'Hightouch', role: 'Software Engineer, AI Agents', score: 0.3, date: '2026-05-22', note: 'Senior AI/backend role, US-based, no overlap' },
  { num: '117', company: 'Hightouch', role: 'Software Engineer, Control Plane', score: 0.3, date: '2026-05-22', note: 'Senior backend/distributed systems, US-based' },
  { num: '118', company: 'Hightouch', role: 'Software Engineer, Customer Studio Backend', score: 0.3, date: '2026-05-22', note: 'Senior backend for data warehouse, US-based' },
  { num: '119', company: 'Hightouch', role: 'Software Engineer, Distributed Systems', score: 0.3, date: '2026-05-22', note: 'Senior distributed systems, US-based' },
  { num: '120', company: 'Hightouch', role: 'Software Engineer, Streaming Systems', score: 0.3, date: '2026-05-22', note: 'Senior streaming systems, Kafka/Kinesis, US-based' },
  { num: '121', company: 'Hightouch', role: 'Web Engineer', score: 0.8, date: '2026-05-22', note: 'Senior web role requiring 5+ years, US-based' },
  { num: '122', company: 'PlanetScale', role: 'Enterprise Support Engineer', score: 0.5, date: '2026-05-22', note: 'Database support, US-based, no frontend overlap' },
  { num: '123', company: 'PlanetScale', role: 'Software Engineer - Information Security', score: 0.3, date: '2026-05-22', note: 'Senior security engineer, US-based' },
  { num: '124', company: 'PlanetScale', role: 'Software Engineer - Insights', score: 0.5, date: '2026-05-22', note: 'Observability engineer requiring 5+ years, US-based' },
  { num: '125', company: 'PlanetScale', role: 'Software Engineer - PlanetScale Postgres', score: 0.3, date: '2026-05-22', note: 'Managed Postgres engineering, US-based' },
  { num: '126', company: 'PlanetScale', role: 'Software Engineer - Platform', score: 0.3, date: '2026-05-22', note: 'Platform engineering requiring 5+ years' },
  { num: '127', company: 'PlanetScale', role: 'Software Engineer - Sharded Postgres (Neki)', score: 0.3, date: '2026-05-22', note: 'Sharded Postgres database engineering' },
  { num: '128', company: 'PlanetScale', role: 'Solutions Engineer', score: 0.5, date: '2026-05-22', note: 'Customer-facing SE requiring 5+ years database ops' },
  { num: '129', company: 'Boomi', role: 'Boomi Support Engineer', score: 0.5, date: '2026-05-22', note: 'Integration platform support, no frontend overlap' },
  { num: '130', company: 'Boomi', role: 'Boomi Support Engineer', score: 0.5, date: '2026-05-22', note: 'Integration platform support, no frontend overlap' },
];

function slugify(s) {
  return s.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const { writeFileSync, mkdirSync } = await import('fs');
import { join } from 'path';

const dir = new URL('../batch/tracker-additions/', import.meta.url).pathname;
mkdirSync(dir, { recursive: true });

for (const e of entries) {
  const slug = slugify(e.company);
  let status, pdfEmoji;
  const scoreNum = e.score;

  if (scoreNum === 0.0) {
    status = 'Discarded';
    pdfEmoji = '❌';
  } else if (scoreNum >= 4.0) {
    status = 'Evaluated';
    pdfEmoji = '✅';
  } else if (scoreNum >= 3.0) {
    status = 'Evaluated';
    pdfEmoji = '✅';
  } else if (scoreNum >= 1.0) {
    status = 'Evaluated';
    pdfEmoji = '❌';
  } else {
    status = 'Discarded';
    pdfEmoji = '❌';
  }

  const reportFile = `reports/${e.num}-${slug}-${e.date}.md`;
  const line = `${e.num}\t${e.date}\t${e.company}\t${e.role}\t${status}\t${e.score.toFixed(1)}/5\t${pdfEmoji}\t[${e.num}](${reportFile})\t${e.note}`;

  const filePath = join(dir, `${e.num}-${slug}.tsv`);
  writeFileSync(filePath, line + '\n');
  console.log(`Created: ${filePath}`);
}

console.log(`\nDone: ${entries.length} TSV files created`);
