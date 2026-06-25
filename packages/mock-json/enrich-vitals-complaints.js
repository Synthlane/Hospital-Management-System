#!/usr/bin/env node
// Enriches mock data:
// 1. Adds reasonCode (chief complaint) to every Encounter
// 2. Generates vital-sign Observation records for every Encounter

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

const encounters = readJSON('encounters.json');
const observations = readJSON('observations.json');

// ─── Chief complaints ────────────────────────────────────────────────────────
const CHIEF_COMPLAINTS = [
  { code: '267036007', display: 'Shortness of breath',    system: 'http://snomed.info/sct' },
  { code: '29857009',  display: 'Chest pain',             system: 'http://snomed.info/sct' },
  { code: '386661006', display: 'Fever',                  system: 'http://snomed.info/sct' },
  { code: '49727002',  display: 'Persistent cough',       system: 'http://snomed.info/sct' },
  { code: '25064002',  display: 'Headache',               system: 'http://snomed.info/sct' },
  { code: '84229001',  display: 'Fatigue and weakness',   system: 'http://snomed.info/sct' },
  { code: '21522001',  display: 'Abdominal pain',         system: 'http://snomed.info/sct' },
  { code: '57676002',  display: 'Joint pain and stiffness', system: 'http://snomed.info/sct' },
  { code: '161891005', display: 'Lower back pain',        system: 'http://snomed.info/sct' },
  { code: '80313002',  display: 'Palpitations',           system: 'http://snomed.info/sct' },
  { code: '422587007', display: 'Nausea and vomiting',    system: 'http://snomed.info/sct' },
  { code: '404640003', display: 'Dizziness',              system: 'http://snomed.info/sct' },
  { code: '274640006', display: 'Fever with chills',      system: 'http://snomed.info/sct' },
  { code: '413308001', display: 'Follow-up consultation', system: 'http://snomed.info/sct' },
  { code: '185349003', display: 'Routine health check',   system: 'http://snomed.info/sct' },
  { code: '267102003', display: 'Swelling in legs',       system: 'http://snomed.info/sct' },
  { code: '230145002', display: 'Difficulty breathing',   system: 'http://snomed.info/sct' },
  { code: '78001009',  display: 'Chest tightness',        system: 'http://snomed.info/sct' },
];

// ─── Vital-sign category ─────────────────────────────────────────────────────
const VITAL_CATEGORY = [{
  coding: [{
    system: 'http://terminology.hl7.org/CodeSystem/observation-category',
    code: 'vital-signs',
    display: 'Vital Signs',
  }],
}];

function rand(min, max, decimals) {
  decimals = decimals === undefined ? 0 : decimals;
  const val = min + Math.random() * (max - min);
  return parseFloat(val.toFixed(decimals));
}

function makeVitalsForEncounter(encId, patRef, effectiveDateTime) {
  const subject = patRef ? { reference: patRef } : undefined;
  const encounter = { reference: `Encounter/${encId}` };
  const vitals = [];

  // Blood Pressure (panel with systolic + diastolic components)
  const systolic = rand(108, 158);
  const diastolic = rand(65, 96);
  vitals.push({
    resourceType: 'Observation',
    id: uuidv4(),
    status: 'final',
    category: VITAL_CATEGORY,
    code: {
      coding: [{ system: 'http://loinc.org', code: '85354-9', display: 'Blood pressure panel with all children optional' }],
      text: 'Blood Pressure',
    },
    subject,
    encounter,
    effectiveDateTime,
    component: [
      {
        code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }], text: 'Systolic' },
        valueQuantity: { value: systolic, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
      },
      {
        code: { coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' }], text: 'Diastolic' },
        valueQuantity: { value: diastolic, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
      },
    ],
  });

  // Heart Rate
  vitals.push({
    resourceType: 'Observation',
    id: uuidv4(),
    status: 'final',
    category: VITAL_CATEGORY,
    code: {
      coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }],
      text: 'Heart Rate',
    },
    subject,
    encounter,
    effectiveDateTime,
    valueQuantity: { value: rand(58, 106), unit: 'beats/min', system: 'http://unitsofmeasure.org', code: '/min' },
  });

  // Body Temperature
  vitals.push({
    resourceType: 'Observation',
    id: uuidv4(),
    status: 'final',
    category: VITAL_CATEGORY,
    code: {
      coding: [{ system: 'http://loinc.org', code: '8310-5', display: 'Body temperature' }],
      text: 'Temperature',
    },
    subject,
    encounter,
    effectiveDateTime,
    valueQuantity: { value: rand(36.1, 38.6, 1), unit: '°C', system: 'http://unitsofmeasure.org', code: 'Cel' },
  });

  // Respiratory Rate
  vitals.push({
    resourceType: 'Observation',
    id: uuidv4(),
    status: 'final',
    category: VITAL_CATEGORY,
    code: {
      coding: [{ system: 'http://loinc.org', code: '9279-1', display: 'Respiratory rate' }],
      text: 'Respiratory Rate',
    },
    subject,
    encounter,
    effectiveDateTime,
    valueQuantity: { value: rand(13, 22), unit: 'breaths/min', system: 'http://unitsofmeasure.org', code: '/min' },
  });

  // Oxygen Saturation
  vitals.push({
    resourceType: 'Observation',
    id: uuidv4(),
    status: 'final',
    category: VITAL_CATEGORY,
    code: {
      coding: [{ system: 'http://loinc.org', code: '59408-5', display: 'Oxygen saturation by pulse oximetry' }],
      text: 'SpO2',
    },
    subject,
    encounter,
    effectiveDateTime,
    valueQuantity: { value: rand(92, 100), unit: '%', system: 'http://unitsofmeasure.org', code: '%' },
  });

  return vitals;
}

// ─── 1. Enrich encounters with reasonCode ───────────────────────────────────
console.log('\n── Enriching encounters with chief complaints ──');
const enrichedEncounters = encounters.map((enc, idx) => {
  if (enc.reasonCode && enc.reasonCode.length > 0) return enc; // already has one
  const complaint = CHIEF_COMPLAINTS[idx % CHIEF_COMPLAINTS.length];
  return {
    ...enc,
    reasonCode: [{
      coding: [{ system: complaint.system, code: complaint.code, display: complaint.display }],
      text: complaint.display,
    }],
  };
});

writeJSON('encounters.json', enrichedEncounters);

// ─── 2. Generate vital-sign observations ────────────────────────────────────
console.log('\n── Generating vital-sign observations ──');
const newVitals = [];
encounters.forEach((enc) => {
  const patRef = enc.subject?.reference;
  const effectiveDateTime = enc.period?.start ?? new Date().toISOString();
  newVitals.push(...makeVitalsForEncounter(enc.id, patRef, effectiveDateTime));
});

// Remove any stale vitals that may exist before appending
const nonVitalObs = observations.filter(
  (o) => !o.category?.some((c) => c.coding?.some((cd) => cd.code === 'vital-signs'))
);
const allObservations = [...nonVitalObs, ...newVitals];
writeJSON('observations.json', allObservations);

console.log(`\n✅ Summary:`);
console.log(`   Encounters enriched with reasonCode: ${enrichedEncounters.length}`);
console.log(`   Vital-sign observations added: ${newVitals.length} (${newVitals.length / encounters.length} per encounter)`);
console.log(`   Total observations: ${allObservations.length}`);
console.log(`\nNext: re-seed the server → npm run seed:mock-data (from packages/server)`);
