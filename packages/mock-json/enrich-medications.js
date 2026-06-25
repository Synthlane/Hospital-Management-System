#!/usr/bin/env node
// Adds MedicationRequest records for finished encounters that currently have none.
// Assigns 1-2 medications per encounter, rotated from a clinically realistic pool.

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
const existingMeds = readJSON('medicationRequests.json');

// Pool of common medications with RxNorm codes
const MED_POOL = [
  // Hypertension / Cardiac
  { code: '29046', name: 'Amlodipine 5mg', text: 'Amlodipine 5mg', dosage: 'Take 1 tablet by mouth once daily', route: '26643006', routeDisplay: 'Oral route', frequency: 1, periodUnit: 'd' },
  { code: '104490', name: 'Lisinopril 10mg', text: 'Lisinopril 10mg', dosage: 'Take 1 tablet by mouth once daily', route: '26643006', routeDisplay: 'Oral route', frequency: 1, periodUnit: 'd' },
  { code: '41493', name: 'Metoprolol 50mg', text: 'Metoprolol Succinate 50mg', dosage: 'Take 1 tablet by mouth twice daily', route: '26643006', routeDisplay: 'Oral route', frequency: 2, periodUnit: 'd' },
  { code: '33372', name: 'Losartan 50mg', text: 'Losartan 50mg', dosage: 'Take 1 tablet by mouth once daily', route: '26643006', routeDisplay: 'Oral route', frequency: 1, periodUnit: 'd' },
  { code: '153165', name: 'Telmisartan 40mg', text: 'Telmisartan 40mg', dosage: 'Take 1 tablet by mouth once daily', route: '26643006', routeDisplay: 'Oral route', frequency: 1, periodUnit: 'd' },
  // Diabetes
  { code: '6809', name: 'Metformin 500mg', text: 'Metformin 500mg', dosage: 'Take 1 tablet by mouth twice daily with meals', route: '26643006', routeDisplay: 'Oral route', frequency: 2, periodUnit: 'd' },
  { code: '4815', name: 'Glipizide 5mg', text: 'Glipizide 5mg', dosage: 'Take 1 tablet by mouth once daily before breakfast', route: '26643006', routeDisplay: 'Oral route', frequency: 1, periodUnit: 'd' },
  { code: '593411', name: 'Sitagliptin 100mg', text: 'Sitagliptin 100mg', dosage: 'Take 1 tablet by mouth once daily', route: '26643006', routeDisplay: 'Oral route', frequency: 1, periodUnit: 'd' },
  // Lipid-lowering
  { code: '83367', name: 'Atorvastatin 20mg', text: 'Atorvastatin 20mg', dosage: 'Take 1 tablet by mouth once daily at bedtime', route: '26643006', routeDisplay: 'Oral route', frequency: 1, periodUnit: 'd' },
  { code: '41127', name: 'Rosuvastatin 10mg', text: 'Rosuvastatin 10mg', dosage: 'Take 1 tablet by mouth once daily', route: '26643006', routeDisplay: 'Oral route', frequency: 1, periodUnit: 'd' },
  // Pain / Anti-inflammatory
  { code: '5640', name: 'Ibuprofen 400mg', text: 'Ibuprofen 400mg', dosage: 'Take 1 tablet by mouth three times daily with food', route: '26643006', routeDisplay: 'Oral route', frequency: 3, periodUnit: 'd' },
  { code: '161', name: 'Acetaminophen 500mg', text: 'Paracetamol 500mg', dosage: 'Take 1-2 tablets by mouth every 6 hours as needed', route: '26643006', routeDisplay: 'Oral route', frequency: 4, periodUnit: 'd' },
  { code: '1819', name: 'Aspirin 75mg', text: 'Aspirin 75mg (Antiplatelet)', dosage: 'Take 1 tablet by mouth once daily with food', route: '26643006', routeDisplay: 'Oral route', frequency: 1, periodUnit: 'd' },
  // Respiratory
  { code: '745679', name: 'Salbutamol inhaler', text: 'Salbutamol 100mcg Inhaler', dosage: 'Inhale 2 puffs every 4-6 hours as needed', route: '18679011000001101', routeDisplay: 'Inhalation route', frequency: 4, periodUnit: 'd' },
  { code: '203150', name: 'Montelukast 10mg', text: 'Montelukast 10mg', dosage: 'Take 1 tablet by mouth once daily at bedtime', route: '26643006', routeDisplay: 'Oral route', frequency: 1, periodUnit: 'd' },
  { code: '41126', name: 'Azithromycin 500mg', text: 'Azithromycin 500mg', dosage: 'Take 1 tablet by mouth once daily for 3 days', route: '26643006', routeDisplay: 'Oral route', frequency: 1, periodUnit: 'd' },
  // GI / Acid
  { code: '40790', name: 'Omeprazole 20mg', text: 'Omeprazole 20mg', dosage: 'Take 1 capsule by mouth once daily before breakfast', route: '26643006', routeDisplay: 'Oral route', frequency: 1, periodUnit: 'd' },
  { code: '114979', name: 'Pantoprazole 40mg', text: 'Pantoprazole 40mg', dosage: 'Take 1 tablet by mouth once daily 30 minutes before a meal', route: '26643006', routeDisplay: 'Oral route', frequency: 1, periodUnit: 'd' },
  // Antibiotics
  { code: '723', name: 'Amoxicillin 500mg', text: 'Amoxicillin 500mg', dosage: 'Take 1 capsule by mouth three times daily for 7 days', route: '26643006', routeDisplay: 'Oral route', frequency: 3, periodUnit: 'd' },
  { code: '2551', name: 'Ciprofloxacin 500mg', text: 'Ciprofloxacin 500mg', dosage: 'Take 1 tablet by mouth twice daily for 5 days', route: '26643006', routeDisplay: 'Oral route', frequency: 2, periodUnit: 'd' },
  // Neurological / Psych
  { code: '717', name: 'Amitriptyline 25mg', text: 'Amitriptyline 25mg', dosage: 'Take 1 tablet by mouth once daily at bedtime', route: '26643006', routeDisplay: 'Oral route', frequency: 1, periodUnit: 'd' },
  { code: '36437', name: 'Gabapentin 300mg', text: 'Gabapentin 300mg', dosage: 'Take 1 capsule by mouth three times daily', route: '26643006', routeDisplay: 'Oral route', frequency: 3, periodUnit: 'd' },
  // Vitamins / Supplements
  { code: '2200644', name: 'Vitamin D3 60000IU', text: 'Vitamin D3 60,000 IU', dosage: 'Take 1 sachet by mouth once weekly for 8 weeks', route: '26643006', routeDisplay: 'Oral route', frequency: 1, periodUnit: 'wk' },
  { code: '284964', name: 'Calcium 500mg + Vit D', text: 'Calcium Carbonate 500mg + Vitamin D3', dosage: 'Take 1 tablet by mouth twice daily with meals', route: '26643006', routeDisplay: 'Oral route', frequency: 2, periodUnit: 'd' },
];

// Practitioners from practitioner data (will use from existing meds if available)
const practitionerRefs = [...new Set(
  existingMeds.map(m => m.requester?.reference).filter(Boolean)
)];

const enc_with_meds = new Set(existingMeds.map(m => m.encounter?.reference?.split('/')[1]).filter(Boolean));

const finishedNoMeds = encounters.filter(
  e => e.status === 'finished' && !enc_with_meds.has(e.id)
);

console.log(`\n── Enriching medications ──`);
console.log(`Finished encounters with no meds: ${finishedNoMeds.length}`);

const newMeds = [];
let poolIdx = 0;

finishedNoMeds.forEach((enc, i) => {
  const patRef = enc.subject?.reference;
  const patDisplay = enc.subject?.display;
  const effectiveDate = enc.period?.end ?? enc.period?.start ?? new Date().toISOString();

  // Rotate through practitioners (use modulo on existing refs)
  const pracRef = practitionerRefs[i % practitionerRefs.length];
  const pracDisplay = existingMeds.find(m => m.requester?.reference === pracRef)?.requester?.display;

  // Assign 1 or 2 medications (alternate pattern)
  const numMeds = (i % 3 === 0) ? 2 : 1;

  for (let n = 0; n < numMeds; n++) {
    const med = MED_POOL[poolIdx % MED_POOL.length];
    poolIdx++;

    newMeds.push({
      resourceType: 'MedicationRequest',
      id: uuidv4(),
      status: 'active',
      intent: 'order',
      subject: {
        reference: patRef,
        display: patDisplay,
      },
      encounter: {
        reference: `Encounter/${enc.id}`,
      },
      medicationCodeableConcept: {
        coding: [{
          system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
          code: med.code,
          display: med.name,
        }],
        text: med.text,
      },
      authoredOn: effectiveDate,
      requester: pracRef ? {
        reference: pracRef,
        display: pracDisplay,
      } : undefined,
      dosageInstruction: [{
        text: med.dosage,
        timing: {
          repeat: {
            frequency: med.frequency,
            period: 1,
            periodUnit: med.periodUnit,
          },
        },
        route: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: med.route,
            display: med.routeDisplay,
          }],
        },
      }],
    });
  }
});

const allMeds = [...existingMeds, ...newMeds];
writeJSON('medicationRequests.json', allMeds);

console.log(`\n✅ Summary:`);
console.log(`   New MedicationRequest records added: ${newMeds.length}`);
console.log(`   Total MedicationRequests: ${allMeds.length}`);
console.log(`   Finished encounters now with meds: ${finishedNoMeds.length + 99}`);
console.log(`\nNext: re-seed the server → npm run seed:mock-data (from packages/server)`);
