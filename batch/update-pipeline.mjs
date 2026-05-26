#!/usr/bin/env node
// Update pipeline.md - move processed entries from Pendientes to Procesadas

import { readFileSync, writeFileSync } from 'fs';

const pipelinePath = new URL('../data/pipeline.md', import.meta.url).pathname;
const content = readFileSync(pipelinePath, 'utf-8');

// Mapping of pipeline URLs to report data (from reports 054-130)
const processed = [
  { num: '054', url: 'https://www.naukri.com/lumel-technologies-jobs-careers-4813432', company: 'Lumel Technologies', role: 'Junior React Developer (0-2 Years)', score: '4.2', pdf: '✅' },
  { num: '055', url: 'https://www.naukri.com/phonepe-jobs', company: 'PhonePe', role: 'UI Engineer / Frontend Developer', score: '2.5', pdf: '❌' },
  { num: '056', url: 'https://www.naukri.com/urban-company-jobs', company: 'Urban Company', role: 'Frontend Engineer', score: '2.0', pdf: '❌' },
  { num: '057', url: 'https://www.naukri.com/inmobi-jobs', company: 'InMobi', role: 'Software Engineer - Frontend', score: '2.0', pdf: '❌' },
  { num: '058', url: 'https://job-boards.greenhouse.io/postman', company: 'Postman', role: 'Software Engineer (Frontend)', score: '2.0', pdf: '❌' },
  { num: '059', url: 'https://www.naukri.com/salesforce-jobs', company: 'Salesforce', role: 'React Developer', score: '1.5', pdf: '❌' },
  { num: '060', url: 'https://mindnudge.com/jobs/react-developer/', company: 'MindNudge', role: 'React Developer (Freshers Welcome)', score: '1.0', pdf: '❌' },
  { num: '061', url: 'https://g7cr.com/careers/mern-stack-developer/', company: 'G7 CR Technologies', role: 'MERN Stack Developer (Fresher)', score: '4.5', pdf: '✅' },
  { num: '062', url: 'https://job-boards.greenhouse.io/inmobi/jobs/7793050', company: 'InMobi', role: 'Intern - Industrial Trainee', score: '1.0', pdf: '❌' },
  { num: '063', url: 'https://www.naukri.com/nitroxen-tech-india-pvt-ltd-jobs', company: 'Nitroxen Tech India', role: 'ReactJS Developer Intern', score: '3.8', pdf: '✅' },
  { num: '064', url: 'https://www.naukri.com/g7-cr-technologies-jobs', company: 'G7 CR Technologies', role: 'MERN Stack Developer (Fresher/Entry Level)', score: '4.3', pdf: '✅' },
  { num: '065', url: 'https://www.naukri.com/twilio-jobs', company: 'Twilio', role: 'Frontend Engineer (React)', score: '1.5', pdf: '❌' },
  { num: '066', url: 'https://jobs.ashbyhq.com/elevenlabs/fb1fd9cc-bd6d-4895-be29-4bc37d0c31a0', company: 'ElevenLabs', role: 'Solutions Engineer - India', score: '1.5', pdf: '❌' },
  { num: '067', url: 'https://job-boards.greenhouse.io/airtable/jobs/8533547002', company: 'Airtable', role: 'Product Security Engineer', score: '0.5', pdf: '❌' },
  { num: '068', url: 'https://job-boards.eu.greenhouse.io/parloa/jobs/4856335101', company: 'Parloa', role: 'Technical Support Engineer', score: '1.0', pdf: '❌' },
  { num: '069', url: 'https://job-boards.greenhouse.io/gleanwork/jobs/4612849005', company: 'Glean', role: 'Application Security Engineer', score: '0.5', pdf: '❌' },
  { num: '070', url: 'https://job-boards.greenhouse.io/gleanwork/jobs/4665628005', company: 'Glean', role: 'CA Industrial Trainee', score: '0.0', pdf: '❌' },
  { num: '071', url: 'https://job-boards.greenhouse.io/gleanwork/jobs/4012824005', company: 'Glean', role: 'Quality Assurance Engineer', score: '1.5', pdf: '❌' },
  { num: '072', url: 'https://job-boards.greenhouse.io/gleanwork/jobs/4006731005', company: 'Glean', role: 'Software Engineer, Backend', score: '0.5', pdf: '❌' },
  { num: '073', url: 'https://job-boards.greenhouse.io/gleanwork/jobs/4653909005', company: 'Glean', role: 'Technical Support Engineer (EST shift hours)', score: '1.5', pdf: '❌' },
  { num: '074', url: 'https://job-boards.greenhouse.io/gleanwork/jobs/4666849005', company: 'Glean', role: 'Technical Support Engineer (PST shift hours)', score: '1.5', pdf: '❌' },
  { num: '075', url: 'https://job-boards.greenhouse.io/phonepe/jobs/7714563003', company: 'PhonePe', role: 'Product Solution Engineer', score: '1.5', pdf: '❌' },
  { num: '076', url: 'https://jobs.ashbyhq.com/decagon/6431a6f9-2ebe-4b68-beb6-200b42aeeca8', company: 'Decagon', role: 'Strategic Solutions Engineer, East', score: '0.5', pdf: '❌' },
  { num: '077', url: 'https://jobs.ashbyhq.com/decagon/78745829-74ee-41cb-836c-480ca7bf9edc', company: 'Decagon', role: 'Strategic Solutions Engineer, West', score: '0.5', pdf: '❌' },
  { num: '078', url: 'https://jobs.ashbyhq.com/zapier/6948a0e6-a580-4e9d-b109-20652d9a1507', company: 'Zapier', role: 'Software Engineer — Release Engineering', score: '0.5', pdf: '❌' },
  { num: '079', url: 'https://job-boards.greenhouse.io/arizeai/jobs/5969145004', company: 'Arize AI', role: 'AI Application Engineer', score: '0.8', pdf: '❌' },
  { num: '080', url: 'https://job-boards.greenhouse.io/arizeai/jobs/5989512004', company: 'Arize AI', role: 'AI Application Engineer, APJ', score: '0.8', pdf: '❌' },
  { num: '081', url: 'https://job-boards.greenhouse.io/arizeai/jobs/5993755004', company: 'Arize AI', role: 'AI Solutions Engineer, East', score: '0.5', pdf: '❌' },
  { num: '082', url: 'https://job-boards.greenhouse.io/arizeai/jobs/5781408004', company: 'Arize AI', role: 'AI Solutions Engineer, EMEA', score: '0.5', pdf: '❌' },
  { num: '083', url: 'https://job-boards.greenhouse.io/arizeai/jobs/5797408004', company: 'Arize AI', role: 'AI Solutions Engineer, West', score: '0.5', pdf: '❌' },
  { num: '084', url: 'https://job-boards.greenhouse.io/arizeai/jobs/5993317004', company: 'Arize AI', role: 'Forward Deployed Engineer, APJ', score: '0.8', pdf: '❌' },
  { num: '085', url: 'https://job-boards.greenhouse.io/runpod/jobs/5173070008', company: 'RunPod', role: 'Forward Deployed Engineer APAC', score: '1.0', pdf: '❌' },
  { num: '086', url: 'https://boomi.com/boomi-jobs/?gh_jid=5995130004', company: 'Boomi', role: 'Cloud Security Engineer', score: '0.3', pdf: '❌' },
  { num: '087', url: 'https://job-boards.greenhouse.io/postman/jobs/7529471003', company: 'Postman', role: 'Corporate Solutions Engineer, Nordics', score: '0.5', pdf: '❌' },
  { num: '088', url: 'https://job-boards.greenhouse.io/postman/jobs/7528350003', company: 'Postman', role: 'Enterprise Solutions Engineer, Italy', score: '0.5', pdf: '❌' },
  { num: '089', url: 'https://job-boards.greenhouse.io/postman/jobs/7528372003', company: 'Postman', role: 'Enterprise Solutions Engineer, Netherlands', score: '0.5', pdf: '❌' },
  { num: '090', url: 'https://job-boards.greenhouse.io/postman/jobs/7528077003', company: 'Postman', role: 'Strategic Solutions Engineering, Netherlands/Sweden/Denmark', score: '0.5', pdf: '❌' },
  { num: '091', url: 'https://jobs.ashbyhq.com/glacis-ai/feea2cb6-60db-4afa-8358-ba17d05d1cd5', company: 'Glacis AI', role: 'Founding Software Engineer - Agentic AI (Remote)', score: '0.3', pdf: '❌' },
  { num: '092', url: 'https://job-boards.greenhouse.io/celonis/jobs/7681593003?gh_jid=7681593003', company: 'Celonis', role: 'Applied AI Engineer', score: '0.8', pdf: '❌' },
  { num: '093', url: 'https://jobs.ashbyhq.com/photoroom/f4f3a376-7bec-462d-ba8b-6de99d7ae011', company: 'Photoroom', role: 'Contract FastAPI Engineer (6 months)', score: '0.5', pdf: '❌' },
  { num: '094', url: 'https://job-boards.eu.greenhouse.io/amplemarket/jobs/4066888101', company: 'Amplemarket', role: 'Spontaneous Application - Infrastructure Engineer', score: '0.3', pdf: '❌' },
  { num: '095', url: 'https://jobs.ashbyhq.com/supabase/c01f7436-1fdd-4a3e-8b96-8cadc33b006e', company: 'Supabase', role: 'Support Engineer (EMEA)', score: '0.5', pdf: '❌' },
  { num: '096', url: 'https://jobs.ashbyhq.com/supabase/e4e3ccb7-7b7d-42a2-be0f-26cbb5ae4abd', company: 'Supabase', role: 'Support Engineer (AMER)', score: '0.5', pdf: '❌' },
  { num: '097', url: 'https://jobs.ashbyhq.com/supabase/142135ae-a15f-4ec7-90bb-cb4e7968bc09', company: 'Supabase', role: 'Support Engineer (APAC)', score: '0.5', pdf: '❌' },
  { num: '098', url: 'https://jobs.ashbyhq.com/supabase/2e718684-4f75-4a99-8d6b-3b6bd44e4228', company: 'Supabase', role: 'Multigres Engineer', score: '0.3', pdf: '❌' },
  { num: '099', url: 'https://jobs.ashbyhq.com/supabase/c16bd707-29f2-46fb-8409-7270ff00978b', company: 'Supabase', role: 'Postgres Engineer', score: '0.3', pdf: '❌' },
  { num: '100', url: 'https://jobs.ashbyhq.com/supabase/f035bda1-b5d3-4c5b-8736-b9c335fe1c3b', company: 'Supabase', role: 'Multigres Deployment Engineer', score: '0.3', pdf: '❌' },
  { num: '101', url: 'https://jobs.ashbyhq.com/supabase/f18b1173-51c3-4ff6-bcda-89f8111931f4', company: 'Supabase', role: 'Database Support Engineer (AMER)', score: '0.5', pdf: '❌' },
  { num: '102', url: 'https://jobs.ashbyhq.com/supabase/3889002e-536e-4046-a330-70e942b0cc96', company: 'Supabase', role: 'Database Support Engineer (EMEA)', score: '0.5', pdf: '❌' },
  { num: '103', url: 'https://jobs.ashbyhq.com/supabase/62945518-2468-4cf5-9f36-904b60f75183', company: 'Supabase', role: 'Database Support Engineer (APAC)', score: '0.5', pdf: '❌' },
  { num: '104', url: 'https://jobs.ashbyhq.com/supabase/ad92f53a-6d0f-4761-abc3-588c7c7c6cd8', company: 'Supabase', role: 'SDK Engineer - Kotlin', score: '0.3', pdf: '❌' },
  { num: '105', url: 'https://jobs.ashbyhq.com/supabase/14a99b8b-444b-4d28-b4fd-6fa8e71bcb4e', company: 'Supabase', role: 'AI Tooling Engineer', score: '0.3', pdf: '❌' },
  { num: '106', url: 'https://jobs.ashbyhq.com/supabase/48950725-e0d9-4025-92d9-f75e1b60ce45', company: 'Supabase', role: 'Postgres Deployment Engineer (Nix)', score: '0.3', pdf: '❌' },
  { num: '107', url: 'https://jobs.ashbyhq.com/supabase/e569b7f7-fa8f-4139-86f6-4f52b456882d', company: 'Supabase', role: 'Software Engineer (Go) - Auth Product', score: '0.3', pdf: '❌' },
  { num: '108', url: 'https://jobs.ashbyhq.com/supabase/77439e1c-e4eb-483c-aa8e-7686913886e3', company: 'Supabase', role: 'Software Engineer (Go) - Auth', score: '0.3', pdf: '❌' },
  { num: '109', url: 'https://jobs.ashbyhq.com/supabase/847a7bd7-6b75-444a-aeda-d0b28a11c764', company: 'Supabase', role: 'Platform Engineer - Multicloud', score: '0.3', pdf: '❌' },
  { num: '110', url: 'https://jobs.ashbyhq.com/supabase/2e6ee4b3-6573-477f-9c95-d1221cd9f9f9', company: 'Supabase', role: 'Design Engineer', score: '1.5', pdf: '❌' },
  { num: '111', url: 'https://jobs.ashbyhq.com/supabase/dd3f74dc-29f8-46b1-bcfb-b7f090b7146a', company: 'Supabase', role: 'CLI Engineer', score: '0.3', pdf: '❌' },
  { num: '112', url: 'https://jobs.ashbyhq.com/supabase/b7206c22-979f-444a-809b-e70d9ee23c7f', company: 'Supabase', role: 'Software Engineer: IaC Platform Experience', score: '0.3', pdf: '❌' },
  { num: '113', url: 'https://jobs.ashbyhq.com/supabase/3ab0b926-c9b5-4197-aff2-88d5bf009e13', company: 'Supabase', role: 'Edge Functions Engineer', score: '0.3', pdf: '❌' },
  { num: '114', url: 'https://jobs.ashbyhq.com/resend/a95832a8-a2ab-4a63-8303-9989f1fc47d6', company: 'Resend', role: 'Backend Engineer, Core Sending', score: '0.3', pdf: '❌' },
  { num: '115', url: 'https://job-boards.greenhouse.io/hightouch/jobs/4620430004', company: 'Hightouch', role: 'Full Stack Product Engineer', score: '0.8', pdf: '❌' },
  { num: '116', url: 'https://job-boards.greenhouse.io/hightouch/jobs/5542602004', company: 'Hightouch', role: 'Software Engineer, AI Agents', score: '0.3', pdf: '❌' },
  { num: '117', url: 'https://job-boards.greenhouse.io/hightouch/jobs/5983891004', company: 'Hightouch', role: 'Software Engineer, Control Plane', score: '0.3', pdf: '❌' },
  { num: '118', url: 'https://job-boards.greenhouse.io/hightouch/jobs/5983811004', company: 'Hightouch', role: 'Software Engineer, Customer Studio Backend', score: '0.3', pdf: '❌' },
  { num: '119', url: 'https://job-boards.greenhouse.io/hightouch/jobs/4782632004', company: 'Hightouch', role: 'Software Engineer, Distributed Systems', score: '0.3', pdf: '❌' },
  { num: '120', url: 'https://job-boards.greenhouse.io/hightouch/jobs/5983863004', company: 'Hightouch', role: 'Software Engineer, Streaming Systems', score: '0.3', pdf: '❌' },
  { num: '121', url: 'https://job-boards.greenhouse.io/hightouch/jobs/5734303004', company: 'Hightouch', role: 'Web Engineer', score: '0.8', pdf: '❌' },
  { num: '122', url: 'https://job-boards.greenhouse.io/planetscale/jobs/4009926009', company: 'PlanetScale', role: 'Enterprise Support Engineer', score: '0.5', pdf: '❌' },
  { num: '123', url: 'https://job-boards.greenhouse.io/planetscale/jobs/4009938009', company: 'PlanetScale', role: 'Software Engineer - Information Security', score: '0.3', pdf: '❌' },
  { num: '124', url: 'https://job-boards.greenhouse.io/planetscale/jobs/4107018009', company: 'PlanetScale', role: 'Software Engineer - Insights', score: '0.5', pdf: '❌' },
  { num: '125', url: 'https://job-boards.greenhouse.io/planetscale/jobs/4251150009', company: 'PlanetScale', role: 'Software Engineer - PlanetScale Postgres', score: '0.3', pdf: '❌' },
  { num: '126', url: 'https://job-boards.greenhouse.io/planetscale/jobs/4036240009', company: 'PlanetScale', role: 'Software Engineer - Platform', score: '0.3', pdf: '❌' },
  { num: '127', url: 'https://job-boards.greenhouse.io/planetscale/jobs/4009936009', company: 'PlanetScale', role: 'Software Engineer - Sharded Postgres (Neki)', score: '0.3', pdf: '❌' },
  { num: '128', url: 'https://job-boards.greenhouse.io/planetscale/jobs/4052805009', company: 'PlanetScale', role: 'Solutions Engineer', score: '0.5', pdf: '❌' },
  { num: '129', url: 'https://boomi.com/boomi-jobs/?gh_jid=5982491004', company: 'Boomi', role: 'Boomi Support Engineer', score: '0.5', pdf: '❌' },
  { num: '130', url: 'https://boomi.com/boomi-jobs/?gh_jid=5995122004', company: 'Boomi', role: 'Boomi Support Engineer', score: '0.5', pdf: '❌' },
];

// Generate pending lines and processed lines
const processedLines = processed.map(p =>
  `- [x] #${p.num} | ${p.url} | ${p.company} | ${p.role} | ${p.score}/5 | PDF ${p.pdf}`
);

// Build new content
// Find the section boundaries
const pendientesStart = content.indexOf('## Pendientes');
const procesadasStart = content.indexOf('## Procesadas');

const beforePendientes = content.slice(0, pendientesStart);
const afterProcesadas = content.slice(procesadasStart);

// Keep existing processed section header and existing entries, then append new ones
const existingProcesadas = afterProcesadas.trim();
const existingProcesadasLines = existingProcesadas.split('\n');
// Keep header line and any existing processed entries
const headerLine = existingProcesadasLines[0]; // ## Procesadas
const existingEntries = existingProcesadasLines.slice(1).filter(l => l.trim() !== '').join('\n');

const newContent = `${beforePendientes}## Pendientes

*None pending — all 054-130 processed.*

${headerLine}

${existingEntries}
${processedLines.join('\n')}
`;

writeFileSync(pipelinePath, newContent);
console.log(`Updated pipeline.md with ${processedLines.length} processed entries`);
