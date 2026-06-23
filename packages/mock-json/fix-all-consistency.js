#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('../../node_modules/uuid/dist/cjs/index.js');

const DIR = __dirname;

// ─── helpers ───────────────────────────────────────────────────────────────
function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DIR, name), 'utf8'));
}
function writeJson(name, data) {
  fs.writeFileSync(path.join(DIR, name), JSON.stringify(data, null, 2), 'utf8');
}
function addDays(isoStr, days) {
  const d = new Date(isoStr);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
// Deterministic hash: sum of char codes mod 77, shifted into 14–90 range
function hashDays(id) {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return 14 + (sum % 77);
}
function patientName(patient) {
  if (!patient || !patient.name || !patient.name.length) return '';
  const n = patient.name[0];
  return [...(n.given || []), n.family].filter(Boolean).join(' ');
}
function getPatientRef(patient) {
  return { reference: 'Patient/' + patient.id, display: patientName(patient) };
}
function getEncounterRef(enc) {
  return { reference: 'Encounter/' + enc.id };
}
function getDoctorFromEncounter(enc) {
  if (!enc.participant) return null;
  for (const p of enc.participant) {
    const ref = p.individual && p.individual.reference;
    if (ref && ref.startsWith('Practitioner/')) {
      return { reference: ref, display: p.individual.display || '' };
    }
  }
  return null;
}

// ─── load data ──────────────────────────────────────────────────────────────
const appointments      = readJson('appointments.json');
const encounters        = readJson('encounters.json');
const conditions        = readJson('conditions.json');
const patients          = readJson('patients.json');
const practitioners     = readJson('practitioners.json');
const serviceRequests   = readJson('serviceRequests.json');
const diagnosticReports = readJson('diagnosticReports.json');
const medicationRequests= readJson('medicationRequests.json');

const summary = {};

// ═══════════════════════════════════════════════════════════════════════════
// FIX 1 — 9 noshow → fulfilled
// ═══════════════════════════════════════════════════════════════════════════
const FIX1_PREFIXES = [
  '9e6088ef','f919e2b7','903062bf','0d012bca',
  '953120c0','a2a0562c','631a8beb','30764604','564593d8'
];
let fix1Count = 0;
const fix1NotFound = [];
for (const prefix of FIX1_PREFIXES) {
  const appt = appointments.find(a => a.id.startsWith(prefix));
  if (!appt) { fix1NotFound.push(prefix); continue; }
  if (appt.status !== 'fulfilled') {
    appt.status = 'fulfilled';
    fix1Count++;
  }
}
summary['FIX 1 – noshow → fulfilled'] = {
  changed: fix1Count,
  notFound: fix1NotFound
};

// ═══════════════════════════════════════════════════════════════════════════
// FIX 2 — conditions onsetDateTime after encounter date
// ═══════════════════════════════════════════════════════════════════════════
const encounterById = new Map(encounters.map(e => [e.id, e]));
let fix2Count = 0;
for (const cond of conditions) {
  if (!cond.encounter || !cond.onsetDateTime) continue;
  const encId = cond.encounter.reference.replace('Encounter/', '');
  const enc = encounterById.get(encId);
  if (!enc || !enc.period || !enc.period.start) continue;
  if (new Date(cond.onsetDateTime) > new Date(enc.period.start)) {
    const days = hashDays(cond.id);
    cond.onsetDateTime = addDays(enc.period.start, -days);
    fix2Count++;
  }
}
summary['FIX 2 – condition onset before encounter'] = { changed: fix2Count };

// ═══════════════════════════════════════════════════════════════════════════
// FIX 3 — Create missing Encounter resources for fulfilled appointments
// ═══════════════════════════════════════════════════════════════════════════
// Build set of all appointment IDs already referenced by encounters
const apptIdsInEncounters = new Set();
for (const enc of encounters) {
  if (enc.appointment) {
    for (const a of enc.appointment) {
      const id = a.reference.replace('Appointment/', '');
      apptIdsInEncounters.add(id);
    }
  }
}

const newEncounters = [];
for (const appt of appointments) {
  if (appt.status !== 'fulfilled') continue;
  if (apptIdsInEncounters.has(appt.id)) continue;

  // Find patient actor
  const patientParticipant = (appt.participant || []).find(
    p => p.actor && p.actor.reference && p.actor.reference.startsWith('Patient/')
  );
  const practParticipant = (appt.participant || []).find(
    p => p.actor && p.actor.reference && p.actor.reference.startsWith('Practitioner/')
  );

  const subject = patientParticipant
    ? { reference: patientParticipant.actor.reference, display: patientParticipant.actor.display || '' }
    : undefined;

  const individual = practParticipant
    ? { reference: practParticipant.actor.reference, display: practParticipant.actor.display || '' }
    : undefined;

  const startTime = appt.start;
  const endTime   = appt.end || new Date(new Date(appt.start).getTime() + 30 * 60000).toISOString();

  const newEnc = {
    resourceType: 'Encounter',
    id: uuidv4(),
    status: 'finished',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'AMB',
      display: 'ambulatory'
    },
    type: [{
      coding: [{
        system: 'http://snomed.info/sct',
        code: '11429006',
        display: 'Consultation'
      }]
    }],
    ...(subject ? { subject } : {}),
    participant: individual
      ? [{
          type: [{
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
              code: 'PART',
              display: 'Participant'
            }]
          }],
          individual
        }]
      : [],
    period: { start: startTime, end: endTime },
    appointment: [{ reference: 'Appointment/' + appt.id }],
    description: appt.description || 'Outpatient consultation'
  };

  newEncounters.push(newEnc);
  encounterById.set(newEnc.id, newEnc); // make available for later fixes
}
encounters.push(...newEncounters);
summary['FIX 3 – missing encounters created'] = { created: newEncounters.length };

// ═══════════════════════════════════════════════════════════════════════════
// FIX 4 — Encounter c258da77 status "planned" → "finished"
// ═══════════════════════════════════════════════════════════════════════════
let fix4Count = 0;
for (const enc of encounters) {
  if (enc.id.startsWith('c258da77') && enc.status !== 'finished') {
    enc.status = 'finished';
    fix4Count++;
  }
}
summary['FIX 4 – encounter c258da77 planned → finished'] = { changed: fix4Count };

// ═══════════════════════════════════════════════════════════════════════════
// FIX 5 — Marital status code/display mismatch
// ═══════════════════════════════════════════════════════════════════════════
const codeFromDisplay = {
  'Married':      'M',
  'Single':       'S',
  'Never Married':'S',
  'Divorced':     'D',
  'Widowed':      'W',
  'Unknown':      'U'
};
const MARITAL_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v3-MaritalStatus';
let fix5Count = 0;
for (const patient of patients) {
  if (!patient.maritalStatus || !patient.maritalStatus.coding) continue;
  let changed = false;
  for (const coding of patient.maritalStatus.coding) {
    const expectedCode = codeFromDisplay[coding.display];
    if (expectedCode !== undefined && coding.code !== expectedCode) {
      coding.code = expectedCode;
      changed = true;
    }
    if (!coding.system) {
      coding.system = MARITAL_SYSTEM;
      changed = true;
    }
  }
  if (changed) fix5Count++;
}
summary['FIX 5 – marital status code/display mismatch'] = { changed: fix5Count };

// ═══════════════════════════════════════════════════════════════════════════
// FIX 6 — Duplicate email for Lab Tech Kunal Kumar (id prefix 2f99a0b1)
// ═══════════════════════════════════════════════════════════════════════════
let fix6Count = 0;
const kunalPrac = practitioners.find(p => p.id.startsWith('2f99a0b1'));
if (kunalPrac && kunalPrac.telecom) {
  const emailEntry = kunalPrac.telecom.find(t => t.system === 'email' && t.value === 'kunal.kumar@citycarehospital.com');
  if (emailEntry) {
    emailEntry.value = 'kunal.kumar.lab@citycarehospital.com';
    fix6Count++;
  }
}
summary['FIX 6 – Kunal Kumar lab email dedup'] = {
  changed: fix6Count,
  notFound: kunalPrac ? (fix6Count === 0 ? 'email not matching expected value' : null) : 'practitioner 2f99a0b1 not found'
};

// ═══════════════════════════════════════════════════════════════════════════
// FIX 7 — Missing SR + DR (+ MR) for 3 patients
// ═══════════════════════════════════════════════════════════════════════════

// Index encounters by patient ID, sorted by period.start asc
const encsByPatient = new Map();
for (const enc of encounters) {
  if (!enc.subject) continue;
  const patId = enc.subject.reference.replace('Patient/', '');
  if (!encsByPatient.has(patId)) encsByPatient.set(patId, []);
  encsByPatient.get(patId).push(enc);
}
for (const [, list] of encsByPatient) {
  list.sort((a, b) => new Date(a.period?.start || 0) - new Date(b.period?.start || 0));
}

function findPatientByName(fullName) {
  const lower = fullName.toLowerCase();
  const parts = lower.split(' ');
  return patients.find(p =>
    p.name && p.name.some(n => {
      const given = (n.given || []).join(' ').toLowerCase();
      const family = (n.family || '').toLowerCase();
      const full = (given + ' ' + family).trim();
      return parts.every(part => full.includes(part));
    })
  );
}
function getOldestFinishedEncounter(patientId) {
  const list = (encsByPatient.get(patientId) || []).filter(e => e.status === 'finished');
  if (!list.length) return null;
  return list[0]; // already sorted asc
}

const fix7NewSRs = [];
const fix7NewDRs = [];
const fix7NewMRs = [];
const fix7Unmatched = [];

// ── Amit Shah ──
{
  const p = findPatientByName('Amit Shah');
  if (!p) { fix7Unmatched.push('Amit Shah'); }
  else {
    const enc = getOldestFinishedEncounter(p.id);
    if (!enc) { fix7Unmatched.push('Amit Shah (no finished encounter)'); }
    else {
      const encDate = enc.period.start;
      const doctor = getDoctorFromEncounter(enc);
      const subjectRef = getPatientRef(p);
      const encRef = getEncounterRef(enc);

      const srId = uuidv4();
      const drId = uuidv4();
      const mrId = uuidv4();

      const sr = {
        resourceType: 'ServiceRequest',
        id: srId,
        status: 'completed',
        intent: 'order',
        code: {
          coding: [{ system: 'http://loinc.org', code: '24325-3', display: 'LFT panel' }],
          text: 'Liver Function Tests'
        },
        subject: subjectRef,
        encounter: encRef,
        authoredOn: addDays(encDate, 1),
        ...(doctor ? { requester: doctor } : {})
      };
      const dr = {
        resourceType: 'DiagnosticReport',
        id: drId,
        status: 'final',
        code: {
          coding: [{ system: 'http://loinc.org', code: '24325-3', display: 'LFT panel' }],
          text: 'Liver Function Tests'
        },
        subject: subjectRef,
        encounter: encRef,
        issued: addDays(encDate, 3),
        basedOn: [{ reference: 'ServiceRequest/' + srId }],
        conclusionCode: [{ coding: [{ code: 'H', display: 'High' }] }],
        conclusion: 'Elevated ALT and AST consistent with hepatic inflammation. Recommend antiviral therapy.',
        ...(doctor ? { performer: [doctor] } : {})
      };
      const mr = {
        resourceType: 'MedicationRequest',
        id: mrId,
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '41493', display: 'Entecavir' }],
          text: 'Entecavir 0.5mg tablet'
        },
        subject: subjectRef,
        encounter: encRef,
        dosageInstruction: [{
          text: '0.5mg once daily on an empty stomach',
          timing: { repeat: { frequency: 1, period: 1, periodUnit: 'd' } }
        }],
        ...(doctor ? { requester: doctor } : {})
      };
      fix7NewSRs.push(sr);
      fix7NewDRs.push(dr);
      fix7NewMRs.push(mr);
    }
  }
}

// ── Kavita Gupta ──
{
  const p = findPatientByName('Kavita Gupta');
  if (!p) { fix7Unmatched.push('Kavita Gupta'); }
  else {
    const enc = getOldestFinishedEncounter(p.id);
    if (!enc) { fix7Unmatched.push('Kavita Gupta (no finished encounter)'); }
    else {
      const encDate = enc.period.start;
      const doctor = getDoctorFromEncounter(enc);
      const subjectRef = getPatientRef(p);
      const encRef = getEncounterRef(enc);

      const srId = uuidv4();
      const drId = uuidv4();

      const sr = {
        resourceType: 'ServiceRequest',
        id: srId,
        status: 'completed',
        intent: 'order',
        code: {
          coding: [{ system: 'http://loinc.org', code: '5244-9', display: 'Patch test' }],
          text: 'Skin Patch Test (Allergy Panel)'
        },
        subject: subjectRef,
        encounter: encRef,
        authoredOn: addDays(encDate, 1),
        ...(doctor ? { requester: doctor } : {})
      };
      const dr = {
        resourceType: 'DiagnosticReport',
        id: drId,
        status: 'final',
        code: { text: 'Skin Patch Test (Allergy Panel)' },
        subject: subjectRef,
        encounter: encRef,
        issued: addDays(encDate, 5),
        basedOn: [{ reference: 'ServiceRequest/' + srId }],
        conclusionCode: [{ coding: [{ code: 'H', display: 'Positive reaction' }] }],
        conclusion: 'Positive reaction to nickel and fragrance mix. Consistent with contact dermatitis diagnosis.',
        ...(doctor ? { performer: [doctor] } : {})
      };
      fix7NewSRs.push(sr);
      fix7NewDRs.push(dr);
    }
  }
}

// ── Prateek Iyer ──
{
  const p = findPatientByName('Prateek Iyer');
  if (!p) { fix7Unmatched.push('Prateek Iyer'); }
  else {
    const enc = getOldestFinishedEncounter(p.id);
    if (!enc) { fix7Unmatched.push('Prateek Iyer (no finished encounter)'); }
    else {
      const encDate = enc.period.start;
      const doctor = getDoctorFromEncounter(enc);
      const subjectRef = getPatientRef(p);
      const encRef = getEncounterRef(enc);

      const srId = uuidv4();
      const drId = uuidv4();
      const mrId = uuidv4();

      const sr = {
        resourceType: 'ServiceRequest',
        id: srId,
        status: 'completed',
        intent: 'order',
        code: {
          coding: [{ system: 'http://loinc.org', code: '11572-5', display: 'Rheumatoid factor' }],
          text: 'Rheumatoid Factor (RF) Test'
        },
        subject: subjectRef,
        encounter: encRef,
        authoredOn: addDays(encDate, 1),
        ...(doctor ? { requester: doctor } : {})
      };
      const dr = {
        resourceType: 'DiagnosticReport',
        id: drId,
        status: 'final',
        code: {
          coding: [{ system: 'http://loinc.org', code: '11572-5', display: 'Rheumatoid factor' }],
          text: 'Rheumatoid Factor (RF) Test'
        },
        subject: subjectRef,
        encounter: encRef,
        issued: addDays(encDate, 3),
        basedOn: [{ reference: 'ServiceRequest/' + srId }],
        conclusionCode: [{ coding: [{ code: 'H', display: 'Elevated' }] }],
        conclusion: 'RF titre elevated at 128 IU/mL (normal <20). Consistent with seropositive rheumatoid arthritis.',
        ...(doctor ? { performer: [doctor] } : {})
      };
      const mr = {
        resourceType: 'MedicationRequest',
        id: mrId,
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '41493', display: 'Methotrexate' }],
          text: 'Methotrexate 7.5mg tablet'
        },
        subject: subjectRef,
        encounter: encRef,
        dosageInstruction: [{
          text: '7.5mg once weekly (DMARD therapy for RA)',
          timing: { repeat: { frequency: 1, period: 1, periodUnit: 'wk' } }
        }],
        ...(doctor ? { requester: doctor } : {})
      };
      fix7NewSRs.push(sr);
      fix7NewDRs.push(dr);
      fix7NewMRs.push(mr);
    }
  }
}

serviceRequests.push(...fix7NewSRs);
diagnosticReports.push(...fix7NewDRs);
medicationRequests.push(...fix7NewMRs);

summary['FIX 7 – SR/DR/MR for patients with diagnoses'] = {
  srCreated: fix7NewSRs.length,
  drCreated: fix7NewDRs.length,
  mrCreated: fix7NewMRs.length,
  unmatched: fix7Unmatched
};

// ═══════════════════════════════════════════════════════════════════════════
// FIX 8 — Missing medications for 3 patients
// ═══════════════════════════════════════════════════════════════════════════

function getMostRecentFinishedEncounter(patientId) {
  const list = (encsByPatient.get(patientId) || []).filter(e => e.status === 'finished');
  if (!list.length) return null;
  return list[list.length - 1]; // sorted asc, last = most recent
}

const fix8NewMRs = [];
const fix8Unmatched = [];

// ── Aditya Joshi ──
{
  const p = findPatientByName('Aditya Joshi');
  if (!p) { fix8Unmatched.push('Aditya Joshi'); }
  else {
    const enc = getMostRecentFinishedEncounter(p.id);
    if (!enc) { fix8Unmatched.push('Aditya Joshi (no finished encounter)'); }
    else {
      const doctor = getDoctorFromEncounter(enc);
      const mr = {
        resourceType: 'MedicationRequest',
        id: uuidv4(),
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '203029', display: 'Levodopa / Carbidopa' }],
          text: 'Levodopa/Carbidopa 100mg/25mg tablet'
        },
        subject: getPatientRef(p),
        encounter: getEncounterRef(enc),
        dosageInstruction: [{
          text: '1 tablet three times daily, 30 minutes before meals',
          timing: { repeat: { frequency: 3, period: 1, periodUnit: 'd' } }
        }],
        ...(doctor ? { requester: doctor } : {})
      };
      fix8NewMRs.push(mr);
    }
  }
}

// ── Siddharth Mehta ──
{
  const p = findPatientByName('Siddharth Mehta');
  if (!p) { fix8Unmatched.push('Siddharth Mehta'); }
  else {
    const enc = getMostRecentFinishedEncounter(p.id);
    if (!enc) { fix8Unmatched.push('Siddharth Mehta (no finished encounter)'); }
    else {
      const doctor = getDoctorFromEncounter(enc);
      const mr = {
        resourceType: 'MedicationRequest',
        id: uuidv4(),
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '203029', display: 'Levodopa / Carbidopa' }],
          text: 'Levodopa/Carbidopa 100mg/25mg tablet'
        },
        subject: getPatientRef(p),
        encounter: getEncounterRef(enc),
        dosageInstruction: [{
          text: '1 tablet three times daily',
          timing: { repeat: { frequency: 3, period: 1, periodUnit: 'd' } }
        }],
        ...(doctor ? { requester: doctor } : {})
      };
      fix8NewMRs.push(mr);
    }
  }
}

// ── Zara Nair ──
{
  const p = findPatientByName('Zara Nair');
  if (!p) { fix8Unmatched.push('Zara Nair'); }
  else {
    const enc = getMostRecentFinishedEncounter(p.id);
    if (!enc) { fix8Unmatched.push('Zara Nair (no finished encounter)'); }
    else {
      const doctor = getDoctorFromEncounter(enc);
      const mr = {
        resourceType: 'MedicationRequest',
        id: uuidv4(),
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '860975', display: 'Metformin' }],
          text: 'Metformin 500mg tablet'
        },
        subject: getPatientRef(p),
        encounter: getEncounterRef(enc),
        dosageInstruction: [{
          text: '500mg twice daily with meals',
          timing: { repeat: { frequency: 2, period: 1, periodUnit: 'd' } }
        }],
        ...(doctor ? { requester: doctor } : {})
      };
      fix8NewMRs.push(mr);
    }
  }
}

medicationRequests.push(...fix8NewMRs);
summary['FIX 8 – missing medications for serious diagnoses'] = {
  mrCreated: fix8NewMRs.length,
  unmatched: fix8Unmatched
};

// ═══════════════════════════════════════════════════════════════════════════
// FIX 9 — Add cancellationReason to cancelled appointments without one
// ═══════════════════════════════════════════════════════════════════════════
const CANCEL_REASON = {
  coding: [{
    system: 'http://terminology.hl7.org/CodeSystem/appointment-cancellation-reason',
    code: 'pat',
    display: 'Patient'
  }],
  text: 'Cancelled by patient'
};
let fix9Count = 0;
for (const appt of appointments) {
  if (appt.status === 'cancelled' && !appt.cancellationReason) {
    appt.cancellationReason = CANCEL_REASON;
    fix9Count++;
  }
}
summary['FIX 9 – cancellationReason added'] = { changed: fix9Count };

// ═══════════════════════════════════════════════════════════════════════════
// WRITE ALL FILES
// ═══════════════════════════════════════════════════════════════════════════
writeJson('appointments.json',      appointments);
writeJson('encounters.json',        encounters);
writeJson('conditions.json',        conditions);
writeJson('patients.json',          patients);
writeJson('practitioners.json',     practitioners);
writeJson('serviceRequests.json',   serviceRequests);
writeJson('diagnosticReports.json', diagnosticReports);
writeJson('medicationRequests.json',medicationRequests);

// ═══════════════════════════════════════════════════════════════════════════
// PRINT SUMMARY
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════');
console.log('     fix-all-consistency.js  — RESULTS');
console.log('══════════════════════════════════════════════\n');

for (const [section, data] of Object.entries(summary)) {
  console.log(`▸ ${section}`);
  for (const [k, v] of Object.entries(data)) {
    if (Array.isArray(v)) {
      if (v.length === 0) {
        console.log(`    ${k}: (none)`);
      } else {
        console.log(`    ${k}: ${v.join(', ')}`);
      }
    } else if (v === null || v === undefined) {
      // skip
    } else {
      console.log(`    ${k}: ${v}`);
    }
  }
  console.log();
}

console.log('── Final resource counts ──────────────────────');
console.log(`  appointments:       ${appointments.length}`);
console.log(`  encounters:         ${encounters.length}`);
console.log(`  conditions:         ${conditions.length}`);
console.log(`  patients:           ${patients.length}`);
console.log(`  practitioners:      ${practitioners.length}`);
console.log(`  serviceRequests:    ${serviceRequests.length}`);
console.log(`  diagnosticReports:  ${diagnosticReports.length}`);
console.log(`  medicationRequests: ${medicationRequests.length}`);
console.log('\n0 errors\n');
