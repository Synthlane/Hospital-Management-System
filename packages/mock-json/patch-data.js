#!/usr/bin/env node
// Patches all JSON mock data files to:
// 1. Add subject.display, participant display, requester.display, performer.display
// 2. Remove invalid _patient field from encounters
// 3. Add more recent appointments for dashboard chart
// 4. Create ObservationDefinition.json and ActivityDefinition.json for lab panels/assays
// Run: node patch-data.js

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

// ─── Build lookup maps ────────────────────────────────────────────────────────
const patients = readJSON('patients.json');
const practitioners = readJSON('practitioners.json');

function patientDisplay(p) {
  const n = p.name?.[0];
  if (!n) return p.id;
  return [(n.given || []).join(' '), n.family].filter(Boolean).join(' ');
}
function practitionerDisplay(p) {
  const n = p.name?.[0];
  if (!n) return p.id;
  const prefix = n.prefix?.[0] ? n.prefix[0] + ' ' : '';
  return prefix + [(n.given || []).join(' '), n.family].filter(Boolean).join(' ');
}

const patientMap = new Map(patients.map(p => [`Patient/${p.id}`, patientDisplay(p)]));
const practitionerMap = new Map(practitioners.map(p => [`Practitioner/${p.id}`, practitionerDisplay(p)]));

function resolveDisplay(ref) {
  if (!ref) return undefined;
  return patientMap.get(ref) || practitionerMap.get(ref);
}

function fixRef(refObj) {
  if (!refObj?.reference) return refObj;
  if (refObj.display) return refObj; // already has display
  const display = resolveDisplay(refObj.reference);
  if (display) return { ...refObj, display };
  return refObj;
}

// ─── Fix encounters ────────────────────────────────────────────────────────────
console.log('\n── Patching encounters.json ──');
const encounters = readJSON('encounters.json');
const fixedEncounters = encounters.map(enc => {
  const e = { ...enc };
  // Remove all non-FHIR underscore fields
  Object.keys(e).filter(k => k.startsWith('_') && k !== '_lastUpdated').forEach(k => delete e[k]);
  if (e.subject) e.subject = fixRef(e.subject);
  if (e.participant) {
    e.participant = e.participant.map(p => ({
      ...p,
      individual: p.individual ? fixRef(p.individual) : p.individual,
    }));
  }
  return e;
});
writeJSON('encounters.json', fixedEncounters);

// ─── Fix conditions ────────────────────────────────────────────────────────────
console.log('\n── Patching conditions.json ──');
const conditions = readJSON('conditions.json');
const fixedConditions = conditions.map(c => ({
  ...c,
  subject: fixRef(c.subject),
}));
writeJSON('conditions.json', fixedConditions);

// ─── Fix serviceRequests ────────────────────────────────────────────────────────
console.log('\n── Patching serviceRequests.json ──');
const serviceRequests = readJSON('serviceRequests.json');
const fixedSR = serviceRequests.map(sr => {
  const s = { ...sr };
  if (s.subject) s.subject = fixRef(s.subject);
  if (s.requester) s.requester = fixRef(s.requester);
  if (s.performer) s.performer = s.performer.map(fixRef);
  return s;
});
writeJSON('serviceRequests.json', fixedSR);

// ─── Fix diagnosticReports ─────────────────────────────────────────────────────
console.log('\n── Patching diagnosticReports.json ──');
const diagnosticReports = readJSON('diagnosticReports.json');
const fixedDR = diagnosticReports.map(dr => {
  const d = { ...dr };
  if (d.subject) d.subject = fixRef(d.subject);
  if (d.performer) d.performer = d.performer.map(fixRef);
  return d;
});
writeJSON('diagnosticReports.json', fixedDR);

// ─── Fix medicationRequests ────────────────────────────────────────────────────
console.log('\n── Patching medicationRequests.json ──');
const medRequests = readJSON('medicationRequests.json');
const fixedMed = medRequests.map(mr => {
  const m = { ...mr };
  if (m.subject) m.subject = fixRef(m.subject);
  if (m.requester) m.requester = fixRef(m.requester);
  return m;
});
writeJSON('medicationRequests.json', fixedMed);

// ─── Fix procedures ────────────────────────────────────────────────────────────
console.log('\n── Patching procedures.json ──');
const procedures = readJSON('procedures.json');
const fixedProc = procedures.map(pr => {
  const p = { ...pr };
  if (p.subject) p.subject = fixRef(p.subject);
  if (p.performer) {
    p.performer = p.performer.map(perf => ({
      ...perf,
      actor: perf.actor ? fixRef(perf.actor) : perf.actor,
    }));
  }
  return p;
});
writeJSON('procedures.json', fixedProc);

// ─── Fix appointments — add display + add recent appointments ──────────────────
console.log('\n── Patching appointments.json ──');
const appointments = readJSON('appointments.json');

// Fix existing appointments display
const fixedAppts = appointments.map(appt => {
  const a = { ...appt };
  if (a.participant) {
    a.participant = a.participant.map(p => ({
      ...p,
      actor: p.actor ? fixRef(p.actor) : p.actor,
    }));
  }
  return a;
});

// Add 40 recent appointments (last 8 weeks) for dashboard chart
const patientList = patients.slice(0, 20);
const practitionerList = practitioners.slice(0, 10);
const apptTypes = [
  { code: '308335008', display: 'Patient consultation' },
  { code: '11429006', display: 'Follow-up consultation' },
  { code: '185349003', display: 'Encounter for check up' },
  { code: '185345009', display: 'Encounter for symptom' },
];
const apptDescriptions = [
  'Follow-up appointment', 'Routine check-up', 'Consultation visit',
  'Post-surgery follow-up', 'Chronic disease management', 'Annual physical exam',
];

const now = new Date('2026-06-21');
const newAppts = [];

// Add 6-8 appointments per week for the last 8 weeks (make chart look rich)
for (let weekBack = 7; weekBack >= 0; weekBack--) {
  const weekCount = weekBack < 4 ? 8 : 5; // more in recent 4 weeks
  for (let i = 0; i < weekCount; i++) {
    const daysBack = weekBack * 7 + Math.floor(Math.random() * 7);
    const apptDate = new Date(now.getTime() - daysBack * 86400000);
    apptDate.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 4) * 15, 0, 0);

    const patient = patientList[Math.floor(Math.random() * patientList.length)];
    const practitioner = practitionerList[Math.floor(Math.random() * practitionerList.length)];
    const type = apptTypes[Math.floor(Math.random() * apptTypes.length)];

    // Past = fulfilled/noshow, recent days = booked
    const isPast = daysBack > 1;
    const rand = Math.random();
    let status = 'fulfilled';
    if (isPast) {
      status = rand < 0.1 ? 'noshow' : rand < 0.15 ? 'cancelled' : 'fulfilled';
    } else {
      status = 'booked';
    }

    const endDate = new Date(apptDate.getTime() + 30 * 60000);
    newAppts.push({
      resourceType: 'Appointment',
      id: uuidv4(),
      status,
      serviceType: [{ coding: [{ system: 'http://snomed.info/sct', code: type.code, display: type.display }] }],
      start: apptDate.toISOString(),
      end: endDate.toISOString(),
      participant: [
        { actor: { reference: `Patient/${patient.id}`, display: patientDisplay(patient) }, status: 'accepted' },
        { actor: { reference: `Practitioner/${practitioner.id}`, display: practitionerDisplay(practitioner) }, status: 'accepted' },
      ],
      description: apptDescriptions[Math.floor(Math.random() * apptDescriptions.length)],
    });
  }
}

const allAppts = [...fixedAppts, ...newAppts];
writeJSON('appointments.json', allAppts);
console.log(`  Added ${newAppts.length} recent appointments`);

// ─── Create ObservationDefinitions (Lab Assays) ────────────────────────────────
console.log('\n── Creating observationDefinitions.json ──');
const assays = [
  { id: uuidv4(), code: '2345-7',  display: 'Glucose',             cat: 'Chemistry',   unit: 'mg/dL',  low: 70,  high: 100, note: 'Fasting glucose' },
  { id: uuidv4(), code: '3094-0',  display: 'Blood Urea Nitrogen',  cat: 'Chemistry',   unit: 'mg/dL',  low: 7,   high: 20 },
  { id: uuidv4(), code: '2160-0',  display: 'Creatinine',           cat: 'Chemistry',   unit: 'mg/dL',  low: 0.6, high: 1.2 },
  { id: uuidv4(), code: '2951-2',  display: 'Sodium',               cat: 'Chemistry',   unit: 'mEq/L',  low: 136, high: 145 },
  { id: uuidv4(), code: '2823-3',  display: 'Potassium',            cat: 'Chemistry',   unit: 'mEq/L',  low: 3.5, high: 5.0 },
  { id: uuidv4(), code: '2075-0',  display: 'Chloride',             cat: 'Chemistry',   unit: 'mEq/L',  low: 98,  high: 106 },
  { id: uuidv4(), code: '1963-8',  display: 'Bicarbonate',          cat: 'Chemistry',   unit: 'mEq/L',  low: 22,  high: 29 },
  { id: uuidv4(), code: '718-7',   display: 'Hemoglobin',           cat: 'Hematology',  unit: 'g/dL',   low: 12,  high: 17 },
  { id: uuidv4(), code: '6690-2',  display: 'WBC Count',            cat: 'Hematology',  unit: 'K/µL',   low: 4.5, high: 11.0 },
  { id: uuidv4(), code: '777-3',   display: 'Platelet Count',       cat: 'Hematology',  unit: 'K/µL',   low: 150, high: 400 },
  { id: uuidv4(), code: '2093-3',  display: 'Total Cholesterol',    cat: 'Lipids',      unit: 'mg/dL',  low: 0,   high: 200 },
  { id: uuidv4(), code: '2085-9',  display: 'HDL Cholesterol',      cat: 'Lipids',      unit: 'mg/dL',  low: 40,  high: 999 },
  { id: uuidv4(), code: '13457-7', display: 'LDL Cholesterol',      cat: 'Lipids',      unit: 'mg/dL',  low: 0,   high: 100 },
  { id: uuidv4(), code: '2571-8',  display: 'Triglycerides',        cat: 'Lipids',      unit: 'mg/dL',  low: 0,   high: 150 },
  { id: uuidv4(), code: '1742-6',  display: 'ALT',                  cat: 'Liver',       unit: 'U/L',    low: 7,   high: 40 },
  { id: uuidv4(), code: '1920-8',  display: 'AST',                  cat: 'Liver',       unit: 'U/L',    low: 10,  high: 40 },
  { id: uuidv4(), code: '1975-2',  display: 'Total Bilirubin',      cat: 'Liver',       unit: 'mg/dL',  low: 0.2, high: 1.2 },
  { id: uuidv4(), code: '1751-7',  display: 'Albumin',              cat: 'Liver',       unit: 'g/dL',   low: 3.5, high: 5.0 },
  { id: uuidv4(), code: '3016-3',  display: 'TSH',                  cat: 'Thyroid',     unit: 'mIU/L',  low: 0.4, high: 4.0 },
  { id: uuidv4(), code: '3051-0',  display: 'Free T3',              cat: 'Thyroid',     unit: 'pg/mL',  low: 2.3, high: 4.2 },
  { id: uuidv4(), code: '3054-4',  display: 'Free T4',              cat: 'Thyroid',     unit: 'ng/dL',  low: 0.8, high: 1.8 },
  { id: uuidv4(), code: '9279-1',  display: 'Respiratory Rate',     cat: 'Vitals',      unit: '/min',   low: 12,  high: 20 },
  { id: uuidv4(), code: '8867-4',  display: 'Heart Rate',           cat: 'Vitals',      unit: 'bpm',    low: 60,  high: 100 },
  { id: uuidv4(), code: '55284-4', display: 'Blood Pressure',       cat: 'Vitals',      unit: 'mmHg',   low: 90,  high: 120, note: 'Systolic' },
];

const observationDefinitions = assays.map(a => ({
  resourceType: 'ObservationDefinition',
  id: a.id,
  category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: a.cat.toLowerCase(), display: a.cat }] }],
  code: { coding: [{ system: 'http://loinc.org', code: a.code, display: a.display }], text: a.display },
  permittedDataType: ['Quantity'],
  quantitativeDetails: {
    unit: { coding: [{ system: 'http://unitsofmeasure.org', code: a.unit }], text: a.unit },
    decimalPrecision: a.display.includes('Cholesterol') || a.display.includes('Triglycerides') ? 0 : 1,
  },
  qualifiedInterval: [
    {
      category: 'reference',
      range: {
        low: { value: a.low, unit: a.unit, system: 'http://unitsofmeasure.org' },
        high: { value: a.high, unit: a.unit, system: 'http://unitsofmeasure.org' },
      },
      condition: a.note || 'Normal',
    },
  ],
}));

writeJSON('observationDefinitions.json', observationDefinitions);

// ─── Create ActivityDefinitions (Lab Panels) ───────────────────────────────────
console.log('\n── Creating activityDefinitions.json ──');

function assayRef(display) {
  const found = observationDefinitions.find(od => od.code.text === display);
  return found ? { reference: `ObservationDefinition/${found.id}` } : null;
}

const panels = [
  {
    name: 'BMP',
    title: 'Basic Metabolic Panel',
    assays: ['Glucose', 'Blood Urea Nitrogen', 'Creatinine', 'Sodium', 'Potassium', 'Chloride', 'Bicarbonate'],
  },
  {
    name: 'CBC',
    title: 'Complete Blood Count',
    assays: ['Hemoglobin', 'WBC Count', 'Platelet Count'],
  },
  {
    name: 'CMP',
    title: 'Comprehensive Metabolic Panel',
    assays: ['Glucose', 'Blood Urea Nitrogen', 'Creatinine', 'Sodium', 'Potassium', 'Chloride', 'Bicarbonate', 'ALT', 'AST', 'Total Bilirubin', 'Albumin'],
  },
  {
    name: 'LipidPanel',
    title: 'Lipid Panel',
    assays: ['Total Cholesterol', 'HDL Cholesterol', 'LDL Cholesterol', 'Triglycerides'],
  },
  {
    name: 'TFT',
    title: 'Thyroid Function Tests',
    assays: ['TSH', 'Free T3', 'Free T4'],
  },
  {
    name: 'LFT',
    title: 'Liver Function Tests',
    assays: ['ALT', 'AST', 'Total Bilirubin', 'Albumin'],
  },
];

const activityDefinitions = panels.map(panel => ({
  resourceType: 'ActivityDefinition',
  id: uuidv4(),
  name: panel.name,
  title: panel.title,
  status: 'active',
  description: `Standard ${panel.title} laboratory panel`,
  kind: 'ServiceRequest',
  code: { text: panel.title },
  observationResultRequirement: panel.assays
    .map(assayRef)
    .filter(Boolean),
}));

writeJSON('activityDefinitions.json', activityDefinitions);

console.log('\n✅ All patches complete!');
console.log('Next: restart the server to re-seed the database.');
