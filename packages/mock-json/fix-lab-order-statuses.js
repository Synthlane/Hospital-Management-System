#!/usr/bin/env node
// Fixes lab order (ServiceRequest) data quality:
// 1. Future-dated "active" orders → "draft" (pre-authorized for upcoming appointments, not yet in the lab)
// 2. Adds 7 genuinely "active" (pending) lab orders for recent past encounters (3-30 days ago)

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DIR = __dirname;

function readJSON(file) {
  return JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
}
function writeJSON(file, data) {
  fs.writeFileSync(path.join(DIR, file), JSON.stringify(data, null, 2), 'utf8');
  console.log(`✓ Wrote ${file} (${data.length} records)`);
}

const serviceRequests = readJSON('serviceRequests.json');
const encounters = readJSON('encounters.json');
const patients = readJSON('patients.json');
const practitioners = readJSON('practitioners.json');

const NOW = new Date('2026-06-22');

// ─── Fix 1: Future-dated "active" orders → "draft" ───────────────────────────
console.log('\n── Fix 1: Future-dated active orders → draft ──');
let fixedToD = 0;

const fixedSR = serviceRequests.map((sr) => {
  if (sr.status !== 'active') return sr;
  const authored = sr.authoredOn ? new Date(sr.authoredOn) : null;
  if (!authored || authored <= NOW) return sr; // today or past — keep active
  fixedToD++;
  return { ...sr, status: 'draft' };
});

console.log(`  Changed ${fixedToD} future-dated "active" → "draft"`);

// ─── Fix 2: Add genuine pending lab orders for recent past encounters ─────────
console.log('\n── Fix 2: Adding genuine pending lab orders for recent visits ──');

// Build patient display map
function patDisplay(p) {
  const n = p.name?.[0];
  return [(n?.given || []).join(' '), n?.family].filter(Boolean).join(' ');
}
function pracDisplay(p) {
  const n = p.name?.[0];
  const prefix = n?.prefix?.[0] ? n.prefix[0] + ' ' : '';
  return prefix + [(n?.given || []).join(' '), n?.family].filter(Boolean).join(' ');
}
const patMap = new Map(patients.map((p) => [`Patient/${p.id}`, patDisplay(p)]));
const pracMap = new Map(practitioners.map((p) => [`Practitioner/${p.id}`, pracDisplay(p)]));

// Recent encounters (3-30 days ago)
const recentEncounters = encounters.filter((e) => {
  if (!e.period?.start) return false;
  const daysAgo = (NOW - new Date(e.period.start)) / 86400000;
  return daysAgo >= 3 && daysAgo <= 30;
});

// Varied pending lab tests to add
const pendingTests = [
  { code: '58410-2', display: 'CBC Panel', text: 'Complete Blood Count' },
  { code: '24325-3', display: 'LFT Panel', text: 'Liver Function Tests' },
  { code: '4548-4', display: 'Hemoglobin A1c', text: 'HbA1c' },
  { code: '57698-3', display: 'Lipid Panel', text: 'Lipid Panel' },
  { code: '51990-0', display: 'BMP Panel', text: 'Basic Metabolic Panel' },
  { code: '3016-3', display: 'TSH', text: 'Thyroid Stimulating Hormone' },
  { code: '24357-6', display: 'Urinalysis', text: 'Urine Analysis' },
];

const newPendingOrders = recentEncounters.map((enc, idx) => {
  const patRef = enc.subject?.reference;
  const docRef = enc.participant?.find((p) => p.individual?.reference?.startsWith('Practitioner/'))?.individual?.reference;
  const labTech = practitioners.find((p) => p.qualification?.[0]?.code?.text === 'Medical Laboratory Technician');

  const test = pendingTests[idx % pendingTests.length];
  const encDate = new Date(enc.period.start);
  // Authored 1 day after the encounter (doctor ordered it during/after the visit)
  const authoredDate = new Date(encDate.getTime() + 86400000);

  return {
    resourceType: 'ServiceRequest',
    id: uuidv4(),
    status: 'active',
    intent: 'order',
    priority: 'routine',
    subject: patRef ? { reference: patRef, display: patMap.get(patRef) } : undefined,
    encounter: { reference: `Encounter/${enc.id}` },
    code: {
      coding: [{ system: 'http://loinc.org', code: test.code, display: test.display }],
      text: test.text,
    },
    authoredOn: authoredDate.toISOString(),
    requester: docRef ? { reference: docRef, display: pracMap.get(docRef) } : undefined,
    performer: labTech
      ? [{ reference: `Practitioner/${labTech.id}`, display: pracMap.get(`Practitioner/${labTech.id}`) }]
      : undefined,
    patientInstruction: 'Sample collection required. Please visit the lab at your earliest convenience.',
  };
}).filter(Boolean);

console.log(`  Created ${newPendingOrders.length} new pending (active) lab orders for recent encounters`);

const allSR = [...fixedSR, ...newPendingOrders];
writeJSON('serviceRequests.json', allSR);

// ─── Summary ─────────────────────────────────────────────────────────────────
const statusCount = {};
allSR.forEach((s) => { statusCount[s.status] = (statusCount[s.status] || 0) + 1; });
console.log('\n✅ Service request status breakdown after fix:');
Object.entries(statusCount).forEach(([k, v]) => console.log(`   ${k}: ${v}`));
console.log('\nExpected dashboard KPI:');
console.log('  Pending Lab Orders (active):', statusCount.active || 0);
console.log('  Completed Reports (final DiagnosticReports): 201');
