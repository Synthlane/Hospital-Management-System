#!/usr/bin/env node
// Fixes data quality issues:
// 1. Past appointments stuck in "booked" status → change to "fulfilled"
// 2. Encounters missing Encounter.appointment link → match by same-day, same-patient
// 3. Conditions missing Condition.encounter link → match to closest patient encounter

const fs = require('fs');
const path = require('path');

const DIR = __dirname;

function readJSON(file) {
  return JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
}
function writeJSON(file, data) {
  fs.writeFileSync(path.join(DIR, file), JSON.stringify(data, null, 2), 'utf8');
  console.log(`✓ Wrote ${file} (${data.length} records)`);
}

function isoDay(isoString) {
  return isoString ? isoString.split('T')[0] : null;
}

const appointments = readJSON('appointments.json');
const encounters = readJSON('encounters.json');
const conditions = readJSON('conditions.json');

const NOW = new Date('2026-06-22');

// ─── Fix 1: Past appointments with "booked" status ───────────────────────────
console.log('\n── Fix 1: Past appointments with stale "booked" status ──');
let fixedStatusCount = 0;
const fixedAppts = appointments.map((a) => {
  if (a.status !== 'booked' || !a.start) return a;
  const apptDate = new Date(a.start);
  if (apptDate >= NOW) return a; // future — keep "booked"
  fixedStatusCount++;
  // 90% fulfilled, 10% noshow (realistic split for appointments from yesterday/2 days ago)
  const newStatus = Math.random() < 0.9 ? 'fulfilled' : 'noshow';
  return { ...a, status: newStatus };
});
console.log(`  Fixed ${fixedStatusCount} past appointments from "booked" → "fulfilled/noshow"`);
writeJSON('appointments.json', fixedAppts);

// ─── Fix 2: Link Encounters → Appointments ───────────────────────────────────
console.log('\n── Fix 2: Linking encounters to same-day appointments ──');

// Build: patientRef + day → appointment list
const apptByPatientDay = new Map();
fixedAppts.forEach((a) => {
  if (!a.start) return;
  const patRef = a.participant?.find((p) => p.actor?.reference?.startsWith('Patient/'))?.actor?.reference;
  if (!patRef) return;
  const day = isoDay(a.start);
  const key = `${patRef}|${day}`;
  if (!apptByPatientDay.has(key)) apptByPatientDay.set(key, []);
  apptByPatientDay.get(key).push(a);
});

let linkedEncounters = 0;
let linkedEncountersFuzzy = 0;

const fixedEncounters = encounters.map((enc) => {
  // Already linked
  if (enc.appointment && enc.appointment.length > 0) return enc;

  const patRef = enc.subject?.reference;
  const day = isoDay(enc.period?.start);
  if (!patRef || !day) return enc;

  // Try exact same day
  const exactKey = `${patRef}|${day}`;
  if (apptByPatientDay.has(exactKey)) {
    const matches = apptByPatientDay.get(exactKey);
    linkedEncounters++;
    return {
      ...enc,
      appointment: [{ reference: `Appointment/${matches[0].id}` }],
    };
  }

  // Try ±1 day fuzzy match
  const encDate = new Date(enc.period.start);
  for (let delta = -1; delta <= 1; delta++) {
    if (delta === 0) continue;
    const tryDate = new Date(encDate);
    tryDate.setDate(tryDate.getDate() + delta);
    const tryDay = tryDate.toISOString().split('T')[0];
    const fuzzyKey = `${patRef}|${tryDay}`;
    if (apptByPatientDay.has(fuzzyKey)) {
      const matches = apptByPatientDay.get(fuzzyKey);
      linkedEncountersFuzzy++;
      return {
        ...enc,
        appointment: [{ reference: `Appointment/${matches[0].id}` }],
      };
    }
  }

  return enc;
});

console.log(`  Exact same-day matches: ${linkedEncounters}`);
console.log(`  ±1-day fuzzy matches: ${linkedEncountersFuzzy}`);
console.log(`  Unmatched encounters: ${fixedEncounters.filter((e) => !e.appointment).length}`);
writeJSON('encounters.json', fixedEncounters);

// ─── Fix 3: Link Conditions → Encounters ─────────────────────────────────────
console.log('\n── Fix 3: Linking conditions to closest encounter ──');

// Build per-patient encounter list sorted by date
const encountersByPatient = new Map();
fixedEncounters.forEach((enc) => {
  const patRef = enc.subject?.reference;
  if (!patRef || !enc.period?.start) return;
  if (!encountersByPatient.has(patRef)) encountersByPatient.set(patRef, []);
  encountersByPatient.get(patRef).push(enc);
});
// Sort each patient's encounters by date
encountersByPatient.forEach((encs) => encs.sort((a, b) => new Date(a.period.start) - new Date(b.period.start)));

let linkedConditions = 0;
let unmatchedConditions = 0;

const fixedConditions = conditions.map((cond) => {
  if (cond.encounter) return cond; // already linked

  const patRef = cond.subject?.reference;
  if (!patRef) return cond;

  const patEncounters = encountersByPatient.get(patRef);
  if (!patEncounters || patEncounters.length === 0) {
    unmatchedConditions++;
    return cond;
  }

  // Onset date for matching
  const onsetStr = cond.onsetDateTime || cond.onsetPeriod?.start;
  if (!onsetStr) {
    // No onset — use the patient's first encounter
    linkedConditions++;
    return { ...cond, encounter: { reference: `Encounter/${patEncounters[0].id}` } };
  }

  const onsetDate = new Date(onsetStr);

  // Find the encounter closest to onset (prefer on/after onset, then before)
  let best = patEncounters[0];
  let bestDelta = Math.abs(new Date(best.period.start) - onsetDate);

  for (const enc of patEncounters) {
    const delta = Math.abs(new Date(enc.period.start) - onsetDate);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = enc;
    }
  }

  linkedConditions++;
  return { ...cond, encounter: { reference: `Encounter/${best.id}` } };
});

console.log(`  Conditions linked to encounters: ${linkedConditions}`);
console.log(`  Conditions unmatched (no patient encounters): ${unmatchedConditions}`);
writeJSON('conditions.json', fixedConditions);

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('\n✅ Data quality fixes complete!');
console.log('   • Appointment statuses corrected for past dates');
console.log('   • Encounters now reference their matching appointments');
console.log('   • Conditions now reference the encounter where they were diagnosed');
console.log('\nNext: Re-seed the database to apply these changes.');
console.log('  docker compose down && docker compose up -d');
console.log('  npm run seed:mock-data (from packages/server)');
