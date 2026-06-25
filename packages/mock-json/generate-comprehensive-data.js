#!/usr/bin/env node
/* eslint-disable */
/* eslint-env node */
/**
 * Comprehensive script to generate all mock data for Medplum seeding
 * - Patients with specific disease categories (Pulmonary, Cardiac, Respiratory, Surgical)
 * - 30+ Practitioners (Doctors, Nurses, Lab Technicians)
 * - Organizations (hospital branches, test lab, other hospital orgs)
 * - Appointments (history + current bookings)
 * - Diagnostic Requests appropriate for patient diseases
 * - Questionnaires (2-3 mock questionnaires)
 */
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const mockJsonDir = __dirname;

// Realistic Indian names
const FIRST_NAMES = {
  male: [
    'Arjun',
    'Rohan',
    'Vikram',
    'Amit',
    'Rahul',
    'Suresh',
    'Rajesh',
    'Karan',
    'Ankit',
    'Nikhil',
    'Aditya',
    'Siddharth',
    'Varun',
    'Kunal',
    'Prateek',
  ],
  female: [
    'Priya',
    'Anjali',
    'Sneha',
    'Kavita',
    'Meera',
    'Radha',
    'Pooja',
    'Neha',
    'Shreya',
    'Isha',
    'Aanya',
    'Diya',
    'Riya',
    'Sara',
    'Zara',
  ],
};

const LAST_NAMES = [
  'Sharma',
  'Patel',
  'Kumar',
  'Singh',
  'Gupta',
  'Verma',
  'Mehta',
  'Shah',
  'Reddy',
  'Rao',
  'Joshi',
  'Malhotra',
  'Agarwal',
  'Nair',
  'Iyer',
];

// Disease categories with specific conditions
const DISEASE_CATEGORIES = {
  pulmonary: [
    { code: '13645005', display: 'Chronic obstructive pulmonary disease', text: 'COPD', snomed: '13645005' },
    { code: '195967001', display: 'Asthma', text: 'Asthma', snomed: '195967001' },
    { code: '444814009', display: 'Viral pneumonia', text: 'Viral Pneumonia', snomed: '444814009' },
    { code: '233604007', display: 'Pulmonary embolism', text: 'Pulmonary Embolism', snomed: '233604007' },
    { code: '233604007', display: 'Pulmonary fibrosis', text: 'Pulmonary Fibrosis', snomed: '51615001' },
    { code: '51615001', display: 'Pleural effusion', text: 'Pleural Effusion', snomed: '40055000' },
    { code: '40055000', display: 'Tuberculosis', text: 'Tuberculosis', snomed: '56717001' },
    { code: '56717001', display: 'Lung cancer', text: 'Lung Cancer', snomed: '363358000' },
  ],
  cardiac: [
    { code: '38341003', display: 'Hypertensive disorder', text: 'Hypertension', snomed: '38341003' },
    { code: '56265001', display: 'Heart failure', text: 'Heart Failure', snomed: '56265001' },
    { code: '22298006', display: 'Myocardial infarction', text: 'Myocardial Infarction', snomed: '22298006' },
    { code: '49436004', display: 'Atrial fibrillation', text: 'Atrial Fibrillation', snomed: '49436004' },
    { code: '53741008', display: 'Coronary artery disease', text: 'Coronary Artery Disease', snomed: '53741008' },
    { code: '84114007', display: 'Angina pectoris', text: 'Angina Pectoris', snomed: '84114007' },
    { code: '429622005', display: 'Cardiac arrhythmia', text: 'Cardiac Arrhythmia', snomed: '49436004' },
    { code: '42399007', display: 'Valvular heart disease', text: 'Valvular Heart Disease', snomed: '84114007' },
  ],
  respiratory: [
    { code: '195967001', display: 'Asthma', text: 'Asthma', snomed: '195967001' },
    { code: '32398004', display: 'Bronchitis', text: 'Bronchitis', snomed: '32398004' },
    { code: '42399007', display: 'Upper respiratory tract infection', text: 'URI', snomed: '42399007' },
    { code: '44054006', display: 'Chronic sinusitis', text: 'Chronic Sinusitis', snomed: '44054006' },
    { code: '444814009', display: 'Pneumonia', text: 'Pneumonia', snomed: '233604007' },
    { code: '13645005', display: 'Chronic bronchitis', text: 'Chronic Bronchitis', snomed: '13645005' },
    { code: '195967001', display: 'Allergic rhinitis', text: 'Allergic Rhinitis', snomed: '195967001' },
    { code: '233604007', display: 'Sleep apnea', text: 'Sleep Apnea', snomed: '233604007' },
  ],
  surgical: [
    { code: '125605004', display: 'Fracture of bone', text: 'Bone Fracture', snomed: '125605004' },
    { code: '396275006', display: 'Appendicitis', text: 'Appendicitis', snomed: '396275006' },
    { code: '399068003', display: 'Cholecystitis', text: 'Cholecystitis', snomed: '399068003' },
    { code: '429040005', display: 'Hernia', text: 'Hernia', snomed: '429040005' },
    { code: '396275006', display: 'Gallstones', text: 'Gallstones', snomed: '396275006' },
    { code: '399068003', display: 'Intestinal obstruction', text: 'Intestinal Obstruction', snomed: '399068003' },
    { code: '429040005', display: 'Knee injury', text: 'Knee Injury', snomed: '429040005' },
    { code: '125605004', display: 'Hip fracture', text: 'Hip Fracture', snomed: '125605004' },
  ],
  neurological: [
    { code: '37796009', display: 'Migraine', text: 'Migraine', snomed: '37796009' },
    { code: '37796009', display: 'Epilepsy', text: 'Epilepsy', snomed: '84757009' },
    { code: '84757009', display: 'Parkinson disease', text: 'Parkinson Disease', snomed: '49049000' },
    { code: '49049000', display: 'Alzheimer disease', text: 'Alzheimer Disease', snomed: '26929004' },
    { code: '26929004', display: 'Stroke', text: 'Stroke', snomed: '230690007' },
    { code: '230690007', display: 'Multiple sclerosis', text: 'Multiple Sclerosis', snomed: '24700007' },
    { code: '24700007', display: 'Peripheral neuropathy', text: 'Peripheral Neuropathy', snomed: '302870006' },
    { code: '302870006', display: 'Seizure disorder', text: 'Seizure Disorder', snomed: '84757009' },
  ],
  endocrine: [
    { code: '44054006', display: 'Diabetes mellitus type 2', text: 'Type 2 Diabetes', snomed: '44054006' },
    { code: '25064002', display: 'Diabetes mellitus type 1', text: 'Type 1 Diabetes', snomed: '25064002' },
    { code: '363418001', display: 'Hypothyroidism', text: 'Hypothyroidism', snomed: '363418001' },
    { code: '34486009', display: 'Hyperthyroidism', text: 'Hyperthyroidism', snomed: '34486009' },
    { code: '197480006', display: 'Hyperlipidemia', text: 'Hyperlipidemia', snomed: '197480006' },
    { code: '414915002', display: 'Obesity', text: 'Obesity', snomed: '414915002' },
    { code: '363418001', display: 'Metabolic syndrome', text: 'Metabolic Syndrome', snomed: '44054006' },
    { code: '34486009', display: 'Adrenal insufficiency', text: 'Adrenal Insufficiency', snomed: '363418001' },
  ],
  gastrointestinal: [
    { code: '235595009', display: 'Gastritis', text: 'Gastritis', snomed: '235595009' },
    { code: '235595009', display: 'Gastroesophageal reflux disease', text: 'GERD', snomed: '235595009' },
    { code: '235595009', display: 'Peptic ulcer disease', text: 'Peptic Ulcer Disease', snomed: '396275006' },
    { code: '396275006', display: 'Inflammatory bowel disease', text: 'IBD', snomed: '396275006' },
    { code: '399068003', display: 'Irritable bowel syndrome', text: 'IBS', snomed: '399068003' },
    { code: '429040005', display: 'Hepatitis', text: 'Hepatitis', snomed: '429040005' },
    { code: '125605004', display: 'Liver cirrhosis', text: 'Liver Cirrhosis', snomed: '125605004' },
    { code: '396275006', display: 'Pancreatitis', text: 'Pancreatitis', snomed: '396275006' },
  ],
  dermatological: [
    { code: '95324001', display: 'Eczema', text: 'Eczema', snomed: '95324001' },
    { code: '95324001', display: 'Psoriasis', text: 'Psoriasis', snomed: '9014002' },
    { code: '9014002', display: 'Acne', text: 'Acne', snomed: '95324001' },
    { code: '95324001', display: 'Dermatitis', text: 'Dermatitis', snomed: '95324001' },
    { code: '9014002', display: 'Skin infection', text: 'Skin Infection', snomed: '9014002' },
    { code: '95324001', display: 'Melanoma', text: 'Melanoma', snomed: '95324001' },
    { code: '9014002', display: 'Basal cell carcinoma', text: 'Basal Cell Carcinoma', snomed: '9014002' },
    { code: '95324001', display: 'Urticaria', text: 'Urticaria', snomed: '95324001' },
  ],
  orthopedic: [
    { code: '161891005', display: 'Low back pain', text: 'Low Back Pain', snomed: '161891005' },
    { code: '195080001', display: 'Osteoarthritis', text: 'Osteoarthritis', snomed: '195080001' },
    { code: '161891005', display: 'Rheumatoid arthritis', text: 'Rheumatoid Arthritis', snomed: '69896004' },
    { code: '69896004', display: 'Osteoporosis', text: 'Osteoporosis', snomed: '64859009' },
    { code: '64859009', display: 'Carpal tunnel syndrome', text: 'Carpal Tunnel Syndrome', snomed: '161891005' },
    { code: '161891005', display: 'Rotator cuff injury', text: 'Rotator Cuff Injury', snomed: '195080001' },
    { code: '195080001', display: 'Tendinitis', text: 'Tendinitis', snomed: '69896004' },
    { code: '69896004', display: 'Scoliosis', text: 'Scoliosis', snomed: '64859009' },
  ],
};

// Diagnostic tests mapped to disease categories
const DIAGNOSTIC_TESTS_BY_DISEASE = {
  pulmonary: [
    { code: '24356-8', display: 'Complete Blood Count', text: 'CBC', loinc: '24356-8' },
    { code: '71651007', display: 'X-Ray chest', text: 'Chest X-Ray', loinc: '71651007' },
    { code: '201806-8', display: 'Pulmonary function test', text: 'PFT', loinc: '201806-8' },
    { code: '24323-8', display: 'Comprehensive Metabolic Panel', text: 'CMP', loinc: '24323-8' },
    { code: '113091000', display: 'CT scan chest', text: 'CT Chest', loinc: '113091000' },
  ],
  cardiac: [
    { code: '301095005', display: 'Electrocardiogram', text: 'ECG', loinc: '301095005' },
    { code: '241615005', display: 'Echocardiogram', text: 'Echocardiogram', loinc: '241615005' },
    { code: '24357-6', display: 'Lipid Panel', text: 'Lipid Panel', loinc: '24357-6' },
    { code: '24356-8', display: 'Complete Blood Count', text: 'CBC', loinc: '24356-8' },
    { code: '301095005', display: 'Stress test', text: 'Stress Test', loinc: '301095005' },
  ],
  respiratory: [
    { code: '24356-8', display: 'Complete Blood Count', text: 'CBC', loinc: '24356-8' },
    { code: '71651007', display: 'X-Ray chest', text: 'Chest X-Ray', loinc: '71651007' },
    { code: '24323-8', display: 'Comprehensive Metabolic Panel', text: 'CMP', loinc: '24323-8' },
    { code: '201806-8', display: 'Pulmonary function test', text: 'PFT', loinc: '201806-8' },
  ],
  surgical: [
    { code: '24356-8', display: 'Complete Blood Count', text: 'CBC', loinc: '24356-8' },
    { code: '24323-8', display: 'Comprehensive Metabolic Panel', text: 'CMP', loinc: '24323-8' },
    { code: '5902-2', display: 'Prothrombin time (PT)', text: 'PT', loinc: '5902-2' },
    { code: '443253003', display: 'Ultrasound scan', text: 'Ultrasound', loinc: '443253003' },
    { code: '71651007', display: 'X-Ray', text: 'X-Ray', loinc: '71651007' },
  ],
  neurological: [
    { code: '113091000', display: 'MRI brain', text: 'MRI Brain', loinc: '113091000' },
    { code: '113091000', display: 'CT scan brain', text: 'CT Brain', loinc: '113091000' },
    { code: '301095005', display: 'EEG', text: 'EEG', loinc: '301095005' },
    { code: '24356-8', display: 'Complete Blood Count', text: 'CBC', loinc: '24356-8' },
    { code: '24323-8', display: 'Comprehensive Metabolic Panel', text: 'CMP', loinc: '24323-8' },
  ],
  endocrine: [
    { code: '2339-0', display: 'Blood glucose', text: 'Blood Glucose', loinc: '2339-0' },
    { code: '26449-9', display: 'HbA1c', text: 'HbA1c', loinc: '26449-9' },
    { code: '24325-3', display: 'TSH', text: 'TSH', loinc: '24325-3' },
    { code: '24357-6', display: 'Lipid Panel', text: 'Lipid Panel', loinc: '24357-6' },
    { code: '24323-8', display: 'Comprehensive Metabolic Panel', text: 'CMP', loinc: '24323-8' },
  ],
  gastrointestinal: [
    { code: '241615005', display: 'Endoscopy', text: 'Endoscopy', loinc: '241615005' },
    { code: '241615005', display: 'Colonoscopy', text: 'Colonoscopy', loinc: '241615005' },
    { code: '24323-8', display: 'Comprehensive Metabolic Panel', text: 'CMP', loinc: '24323-8' },
    { code: '24359-2', display: 'Liver Function Panel', text: 'LFT', loinc: '24359-2' },
    { code: '443253003', display: 'Ultrasound abdomen', text: 'Abdominal Ultrasound', loinc: '443253003' },
  ],
  dermatological: [
    { code: '24356-8', display: 'Complete Blood Count', text: 'CBC', loinc: '24356-8' },
    { code: '399208008', display: 'Skin biopsy', text: 'Skin Biopsy', loinc: '399208008' },
    { code: '24323-8', display: 'Comprehensive Metabolic Panel', text: 'CMP', loinc: '24323-8' },
  ],
  orthopedic: [
    { code: '71651007', display: 'X-Ray', text: 'X-Ray', loinc: '71651007' },
    { code: '113091000', display: 'MRI', text: 'MRI', loinc: '113091000' },
    { code: '443253003', display: 'Ultrasound', text: 'Ultrasound', loinc: '443253003' },
    { code: '24356-8', display: 'Complete Blood Count', text: 'CBC', loinc: '24356-8' },
  ],
};

// Practitioner specializations
const DOCTOR_SPECIALIZATIONS = [
  { code: 'MD', display: 'Doctor of Medicine', specialty: 'General Practice', prefix: 'Dr.' },
  { code: 'MD', display: 'Doctor of Medicine', specialty: 'Cardiology', prefix: 'Dr.' },
  { code: 'MD', display: 'Doctor of Medicine', specialty: 'Pulmonology', prefix: 'Dr.' },
  { code: 'MD', display: 'Doctor of Medicine', specialty: 'Internal Medicine', prefix: 'Dr.' },
  { code: 'MD', display: 'Doctor of Medicine', specialty: 'Surgery', prefix: 'Dr.' },
  { code: 'MD', display: 'Doctor of Medicine', specialty: 'Orthopedics', prefix: 'Dr.' },
  { code: 'MD', display: 'Doctor of Medicine', specialty: 'Emergency Medicine', prefix: 'Dr.' },
  { code: 'MD', display: 'Doctor of Medicine', specialty: 'Pediatrics', prefix: 'Dr.' },
  { code: 'MD', display: 'Doctor of Medicine', specialty: 'Neurology', prefix: 'Dr.' },
  { code: 'MD', display: 'Doctor of Medicine', specialty: 'Endocrinology', prefix: 'Dr.' },
  { code: 'MD', display: 'Doctor of Medicine', specialty: 'Gastroenterology', prefix: 'Dr.' },
  { code: 'MD', display: 'Doctor of Medicine', specialty: 'Dermatology', prefix: 'Dr.' },
];

const NURSE_SPECIALIZATIONS = [
  { code: 'RN', display: 'Registered Nurse', specialty: 'General Nursing', prefix: 'Nurse' },
  { code: 'RN', display: 'Registered Nurse', specialty: 'Emergency Nursing', prefix: 'Nurse' },
  { code: 'RN', display: 'Registered Nurse', specialty: 'Critical Care Nursing', prefix: 'Nurse' },
  { code: 'RN', display: 'Registered Nurse', specialty: 'Surgical Nursing', prefix: 'Nurse' },
  { code: 'LPN', display: 'Licensed Practical Nurse', specialty: 'General Nursing', prefix: 'Nurse' },
];

const LAB_TECH_SPECIALIZATIONS = [
  { code: 'MLT', display: 'Medical Laboratory Technician', specialty: 'Clinical Laboratory', prefix: 'Lab Tech' },
  { code: 'MLS', display: 'Medical Laboratory Scientist', specialty: 'Clinical Laboratory', prefix: 'Lab Tech' },
  { code: 'MT', display: 'Medical Technologist', specialty: 'Clinical Laboratory', prefix: 'Lab Tech' },
];

// Lab tests with ranges
const LAB_TESTS = [
  {
    code: '718-7',
    display: 'Hemoglobin [Mass/volume] in Blood',
    text: 'Hemoglobin',
    unit: 'g/dL',
    normalRange: [12, 17],
  },
  {
    code: '777-3',
    display: 'Platelets [#/volume] in Blood',
    text: 'Platelet Count',
    unit: '10*3/uL',
    normalRange: [150, 450],
  },
  { code: '6690-2', display: 'White Blood Cell Count', text: 'WBC', unit: '10*3/uL', normalRange: [4, 11] },
  {
    code: '2339-0',
    display: 'Glucose [Mass/volume] in Blood',
    text: 'Blood Glucose',
    unit: 'mg/dL',
    normalRange: [70, 100],
  },
  {
    code: '2160-0',
    display: 'Creatinine [Mass/volume] in Serum or Plasma',
    text: 'Creatinine',
    unit: 'mg/dL',
    normalRange: [0.6, 1.2],
  },
  {
    code: '2093-3',
    display: 'Cholesterol [Mass/volume] in Serum or Plasma',
    text: 'Total Cholesterol',
    unit: 'mg/dL',
    normalRange: [0, 200],
  },
];

// Procedures
const PROCEDURES = [
  { code: '301095005', display: 'Electrocardiogram', text: 'ECG' },
  { code: '71651007', display: 'X-Ray chest', text: 'Chest X-Ray' },
  { code: '410528000', display: 'Nebulization therapy', text: 'Nebulization' },
  { code: '387713003', display: 'Wound dressing', text: 'Wound Dressing' },
  { code: '113091000', display: 'Magnetic resonance imaging of brain', text: 'MRI Brain' },
  { code: '443253003', display: 'Ultrasound scan abdomen', text: 'Abdominal Ultrasound' },
  { code: '241615005', display: 'Echocardiogram', text: 'Echocardiogram' },
  { code: '172960003', display: 'Appendectomy', text: 'Appendectomy' },
  { code: '396550006', display: 'Cholecystectomy', text: 'Cholecystectomy' },
  { code: '17711008', display: 'Fracture reduction', text: 'Fracture Reduction' },
];

// Medications
const MEDICATIONS = [
  { code: '197806', display: 'Lisinopril 10 MG Oral Tablet', text: 'Lisinopril 10mg', rxnorm: '314076' },
  { code: '197884', display: 'Metformin 500 MG Oral Tablet', text: 'Metformin 500mg', rxnorm: '860975' },
  { code: '198440', display: 'Atorvastatin 20 MG Oral Tablet', text: 'Atorvastatin 20mg', rxnorm: '617312' },
  { code: '197808', display: 'Amlodipine 5 MG Oral Tablet', text: 'Amlodipine 5mg', rxnorm: '17767' },
  { code: '197808', display: 'Albuterol 90 MCG/ACTUAT Inhalant Solution', text: 'Albuterol Inhaler', rxnorm: '435' },
  { code: '197808', display: 'Omeprazole 20 MG Oral Capsule', text: 'Omeprazole 20mg', rxnorm: '7646' },
  { code: '197808', display: 'Ibuprofen 200 MG Oral Tablet', text: 'Ibuprofen 200mg', rxnorm: '5640' },
];

// Helper functions
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomItems(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomValueInRange(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function randomIntInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate PDF for diagnostic reports
function generatePDF(title, patientName, testName, results, date) {
  const lines = [
    'DIAGNOSTIC REPORT',
    '='.repeat(60),
    '',
    `Patient: ${patientName}`,
    `Test: ${testName}`,
    `Date: ${date}`,
    '',
    `Summary: ${results}`,
    '',
    'Report generated by CityCare Hospital',
  ];
  const textContent = lines.join('\\n');
  const textLength = textContent.length;
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
>>
endobj
4 0 obj
<<
/Length ${textLength + 150}
>>
stream
BT
/F1 12 Tf
72 720 Td
(${textContent.replace(/[()]/g, '\\$&')}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000300 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
${450 + textLength}
%%EOF`;
  return Buffer.from(pdfContent).toString('base64');
}

// Main generation functions
function generateOrganizations() {
  const mainHospitalId = '34c95d53-17b0-4985-855e-5db90d67c161';
  const organizations = [
    {
      resourceType: 'Organization',
      id: mainHospitalId,
      name: 'CityCare Hospital',
      identifier: [{ system: 'http://hospital-registry.example.com', value: 'HOSP-001' }],
      active: true,
      address: [
        { line: ['123 Medical Center Drive'], city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'IN' },
      ],
      telecom: [
        { system: 'phone', value: '+91-11-2345-6789', use: 'work' },
        { system: 'email', value: 'info@citycarehospital.com', use: 'work' },
      ],
    },
    {
      resourceType: 'Organization',
      id: 'aa7cdd17-6330-48b4-aef2-cc072c3acf3c',
      name: 'CityCare Hospital - North Branch',
      partOf: { reference: `Organization/${mainHospitalId}`, display: 'CityCare Hospital' },
      active: true,
      address: [{ line: ['456 Health Avenue'], city: 'Delhi', state: 'Delhi', postalCode: '110002', country: 'IN' }],
      telecom: [
        { system: 'phone', value: '+91-11-2345-6790', use: 'work' },
        { system: 'email', value: 'north@citycarehospital.com', use: 'work' },
      ],
    },
    {
      resourceType: 'Organization',
      id: 'bd18f867-3120-4a04-96c1-743bf43c7954',
      name: 'CityCare Hospital - South Branch',
      partOf: { reference: `Organization/${mainHospitalId}`, display: 'CityCare Hospital' },
      active: true,
      address: [{ line: ['789 Medical Plaza'], city: 'Delhi', state: 'Delhi', postalCode: '110003', country: 'IN' }],
      telecom: [
        { system: 'phone', value: '+91-11-2345-6791', use: 'work' },
        { system: 'email', value: 'south@citycarehospital.com', use: 'work' },
      ],
    },
    {
      resourceType: 'Organization',
      id: 'f39b4737-77e8-492f-9445-cfb82603d01f',
      name: 'CityCare Diagnostic Laboratory',
      partOf: { reference: `Organization/${mainHospitalId}`, display: 'CityCare Hospital' },
      type: [
        {
          coding: [
            { system: 'http://terminology.hl7.org/CodeSystem/organization-type', code: 'lab', display: 'Laboratory' },
          ],
        },
      ],
      active: true,
      address: [
        { line: ['555 Test Center Drive'], city: 'Delhi', state: 'Delhi', postalCode: '110005', country: 'IN' },
      ],
      telecom: [
        { system: 'phone', value: '+91-11-2345-6793', use: 'work' },
        { system: 'email', value: 'lab@citycarehospital.com', use: 'work' },
      ],
    },
    {
      resourceType: 'Organization',
      id: '060d2e89-6523-40c1-bbe5-7a45a3a3fe86',
      name: 'Metro General Hospital',
      active: true,
      address: [
        {
          line: ['999 Healthcare Boulevard'],
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'IN',
        },
      ],
      telecom: [
        { system: 'phone', value: '+91-22-2345-6789', use: 'work' },
        { system: 'email', value: 'info@metrogeneral.com', use: 'work' },
      ],
    },
  ];
  return organizations;
}

function generateLocations(organizations) {
  const mainOrgId = organizations[0].id;
  return [
    {
      resourceType: 'Location',
      id: '6c8264a2-eccf-45fa-90c2-72f454766c9e',
      name: 'CityCare - Delhi',
      managingOrganization: { reference: `Organization/${mainOrgId}` },
      status: 'active',
      address: { line: ['456 Main Street'], city: 'Delhi', state: 'Delhi', postalCode: '110002', country: 'IN' },
      telecom: [{ system: 'phone', value: '+91-11-2345-6790', use: 'work' }],
    },
    {
      resourceType: 'Location',
      id: '5500dca2-43bc-4672-8f67-53e0ab388ecd',
      name: 'CityCare Central Lab',
      managingOrganization: { reference: `Organization/${mainOrgId}` },
      status: 'active',
      address: { line: ['Lab Building, Floor 2'], city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'IN' },
      telecom: [{ system: 'phone', value: '+91-11-2345-6791', use: 'work' }],
    },
  ];
}

function generatePractitioners() {
  const practitioners = [];
  let index = 0;

  // Generate 15 doctors
  for (let i = 0; i < 15; i++) {
    const spec = getRandomItem(DOCTOR_SPECIALIZATIONS);
    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const firstName = getRandomItem(FIRST_NAMES[gender]);
    const lastName = getRandomItem(LAST_NAMES);
    practitioners.push({
      resourceType: 'Practitioner',
      id: uuidv4(),
      name: [{ use: 'official', family: lastName, given: [firstName], prefix: [spec.prefix] }],
      identifier: [{ system: 'http://medical-council.example.com', value: `MC-${String(++index).padStart(4, '0')}` }],
      active: true,
      gender: gender,
      address: [
        {
          line: [`${randomIntInRange(200, 999)} Medical Plaza`],
          city: 'Delhi',
          state: 'Delhi',
          postalCode: '110001',
          country: 'IN',
        },
      ],
      telecom: [
        {
          system: 'phone',
          value: `+91-${randomIntInRange(70000, 99999)}-${randomIntInRange(10000, 99999)}`,
          use: 'work',
        },
        {
          system: 'email',
          value: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@citycarehospital.com`,
          use: 'work',
        },
      ],
      qualification: [
        {
          code: {
            coding: [
              { system: 'http://terminology.hl7.org/CodeSystem/v2-0360', code: spec.code, display: spec.display },
            ],
          },
          extension: [
            { url: 'http://hl7.org/fhir/StructureDefinition/qualification-specialty', valueString: spec.specialty },
          ],
        },
      ],
      communication: [
        {
          coding: [
            { system: 'urn:ietf:bcp:47', code: 'en', display: 'English' },
            { system: 'urn:ietf:bcp:47', code: 'hi', display: 'Hindi' },
          ],
        },
      ],
    });
  }

  // Generate 10 nurses
  for (let i = 0; i < 10; i++) {
    const spec = getRandomItem(NURSE_SPECIALIZATIONS);
    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const firstName = getRandomItem(FIRST_NAMES[gender]);
    const lastName = getRandomItem(LAST_NAMES);
    practitioners.push({
      resourceType: 'Practitioner',
      id: uuidv4(),
      name: [{ use: 'official', family: lastName, given: [firstName], prefix: [spec.prefix] }],
      identifier: [{ system: 'http://nursing-council.example.com', value: `NC-${String(++index).padStart(4, '0')}` }],
      active: true,
      gender: gender,
      address: [
        {
          line: [`${randomIntInRange(200, 999)} Medical Plaza`],
          city: 'Delhi',
          state: 'Delhi',
          postalCode: '110001',
          country: 'IN',
        },
      ],
      telecom: [
        {
          system: 'phone',
          value: `+91-${randomIntInRange(70000, 99999)}-${randomIntInRange(10000, 99999)}`,
          use: 'work',
        },
        {
          system: 'email',
          value: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@citycarehospital.com`,
          use: 'work',
        },
      ],
      qualification: [
        {
          code: {
            coding: [
              { system: 'http://terminology.hl7.org/CodeSystem/v2-0360', code: spec.code, display: spec.display },
            ],
          },
          extension: [
            { url: 'http://hl7.org/fhir/StructureDefinition/qualification-specialty', valueString: spec.specialty },
          ],
        },
      ],
      communication: [
        {
          coding: [
            { system: 'urn:ietf:bcp:47', code: 'en', display: 'English' },
            { system: 'urn:ietf:bcp:47', code: 'hi', display: 'Hindi' },
          ],
        },
      ],
    });
  }

  // Generate 8 lab technicians
  for (let i = 0; i < 8; i++) {
    const spec = getRandomItem(LAB_TECH_SPECIALIZATIONS);
    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const firstName = getRandomItem(FIRST_NAMES[gender]);
    const lastName = getRandomItem(LAST_NAMES);
    practitioners.push({
      resourceType: 'Practitioner',
      id: uuidv4(),
      name: [{ use: 'official', family: lastName, given: [firstName], prefix: [spec.prefix] }],
      identifier: [{ system: 'http://lab-council.example.com', value: `LC-${String(++index).padStart(4, '0')}` }],
      active: true,
      gender: gender,
      address: [
        {
          line: [`${randomIntInRange(200, 999)} Medical Plaza`],
          city: 'Delhi',
          state: 'Delhi',
          postalCode: '110001',
          country: 'IN',
        },
      ],
      telecom: [
        {
          system: 'phone',
          value: `+91-${randomIntInRange(70000, 99999)}-${randomIntInRange(10000, 99999)}`,
          use: 'work',
        },
        {
          system: 'email',
          value: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@citycarehospital.com`,
          use: 'work',
        },
      ],
      qualification: [
        {
          code: {
            coding: [
              { system: 'http://terminology.hl7.org/CodeSystem/v2-0360', code: spec.code, display: spec.display },
            ],
          },
          extension: [
            { url: 'http://hl7.org/fhir/StructureDefinition/qualification-specialty', valueString: spec.specialty },
          ],
        },
      ],
      communication: [
        {
          coding: [
            { system: 'urn:ietf:bcp:47', code: 'en', display: 'English' },
            { system: 'urn:ietf:bcp:47', code: 'hi', display: 'Hindi' },
          ],
        },
      ],
    });
  }

  // Order practitioners: Doctors first, then Nurses, then Lab Technicians
  // Set _lastUpdated to ensure proper ordering when UI sorts by _lastUpdated (descending)
  const doctors = practitioners.filter((p) => p.name[0].prefix[0].startsWith('Dr.'));
  const nurses = practitioners.filter((p) => p.name[0].prefix[0].startsWith('Nurse'));
  const labTechs = practitioners.filter((p) => p.name[0].prefix[0].startsWith('Lab Tech'));

  // Set _lastUpdated timestamps so doctors appear first when sorted by _lastUpdated (descending)
  // When sorting descending, LATER timestamps appear first
  const baseTime = new Date('2026-01-07T12:00:00Z');
  const ordered = [...doctors, ...nurses, ...labTechs];
  const totalCount = ordered.length;

  ordered.forEach((practitioner, index) => {
    // Doctors (index 0-14) get the LATEST timestamps (appear first when sorted descending)
    // Nurses (index 15-24) get middle timestamps
    // Lab techs (index 25-32) get EARLIEST timestamps (appear last when sorted descending)
    // First item (index 0, doctor) gets latest timestamp (baseTime)
    // Last item (index totalCount-1, lab tech) gets earliest timestamp
    // When sorted by -_lastUpdated (descending), latest timestamps appear first
    const timestamp = new Date(baseTime.getTime() - index * 1000);
    practitioner.meta = {
      ...practitioner.meta,
      lastUpdated: timestamp.toISOString(),
    };
  });

  return ordered;
}

function generatePatients(organizations) {
  const patients = [];
  const hospitalIds = organizations.filter((o) => !o.type || o.type[0]?.coding[0]?.code !== 'lab').map((o) => o.id);
  let patientIndex = 0;

  // Generate patients for each disease category
  // With 9 categories, we'll generate 5-7 cases per category to get 45-63 total patients
  Object.keys(DISEASE_CATEGORIES).forEach((category) => {
    const conditions = DISEASE_CATEGORIES[category];
    // Generate 5-7 cases per category to ensure good distribution across all categories
    const numCases = 5 + Math.floor(Math.random() * 3); // 5, 6, or 7

    for (let i = 0; i < numCases; i++) {
      const condition = getRandomItem(conditions);
      const gender = Math.random() > 0.5 ? 'male' : 'female';
      const firstName = getRandomItem(FIRST_NAMES[gender]);
      const lastName = getRandomItem(LAST_NAMES);
      const birthYear = randomIntInRange(1950, 2000);
      const birthDate = `${birthYear}-${String(randomIntInRange(1, 12)).padStart(2, '0')}-${String(randomIntInRange(1, 28)).padStart(2, '0')}`;
      const orgId = getRandomItem(hospitalIds);

      patients.push({
        resourceType: 'Patient',
        id: uuidv4(),
        name: [{ use: 'official', family: lastName, given: [firstName] }],
        managingOrganization: { reference: `Organization/${orgId}` },
        identifier: [
          { system: 'http://hospital.com/patient-id', value: `PAT-${String(++patientIndex).padStart(6, '0')}` },
        ],
        active: true,
        gender: gender,
        birthDate: birthDate,
        address: [
          {
            line: [`${randomIntInRange(100, 999)} ${getRandomItem(['Street', 'Avenue', 'Road'])}`],
            city: getRandomItem(['Delhi', 'Mumbai', 'Bangalore', 'Chennai']),
            state: getRandomItem(['Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu']),
            postalCode: String(randomIntInRange(110001, 110099)),
            country: 'IN',
          },
        ],
        telecom: [
          {
            system: 'phone',
            value: `+91-${randomIntInRange(70000, 99999)}-${randomIntInRange(10000, 99999)}`,
            use: 'mobile',
          },
        ],
        maritalStatus: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v3-MaritalStatus',
              code: Math.random() > 0.3 ? 'M' : 'S',
              display: Math.random() > 0.3 ? 'Married' : 'Single',
            },
          ],
        },
        _diseaseCategory: category,
        _primaryCondition: condition,
      });
    }
  });

  return patients;
}

function generateConditions(patients) {
  const conditions = [];
  patients.forEach((patient) => {
    if (patient._primaryCondition) {
      const condition = patient._primaryCondition;
      const onsetDate = randomDate(new Date(Date.now() - 730 * 24 * 60 * 60 * 1000), new Date());
      conditions.push({
        resourceType: 'Condition',
        id: uuidv4(),
        clinicalStatus: {
          coding: [
            { system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active', display: 'Active' },
          ],
        },
        verificationStatus: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
              code: 'confirmed',
              display: 'Confirmed',
            },
          ],
        },
        category: [
          { coding: [{ system: 'http://snomed.info/sct', code: 'problem-list-item', display: 'Problem List Item' }] },
        ],
        code: {
          coding: [{ system: 'http://snomed.info/sct', code: condition.snomed, display: condition.display }],
          text: condition.text,
        },
        subject: { reference: `Patient/${patient.id}` },
        onsetDateTime: onsetDate.toISOString(),
      });
    }
  });
  return conditions;
}

function generateEncounters(patients, practitioners, locations) {
  const encounters = [];
  const doctors = practitioners.filter((p) => p.name[0].prefix[0].startsWith('Dr.'));
  const doctorIds = doctors.map((d) => d.id);
  const locationIds = locations.map((l) => l.id);

  patients.forEach((patient) => {
    const numEncounters = randomIntInRange(2, 5);
    const patientDoctors = new Set();

    for (let i = 0; i < numEncounters; i++) {
      const daysAgo = randomIntInRange(0, 730);
      const isFuture = Math.random() < 0.2;
      const encounterDate = isFuture
        ? new Date(Date.now() + randomIntInRange(1, 90) * 24 * 60 * 60 * 1000)
        : new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      const startTime = new Date(encounterDate);
      startTime.setHours(randomIntInRange(8, 17), randomIntInRange(0, 59), 0, 0);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + randomIntInRange(15, 60));

      let practitionerId;
      if (patientDoctors.size > 0 && Math.random() < 0.6) {
        practitionerId = getRandomItem(Array.from(patientDoctors));
      } else {
        practitionerId = getRandomItem(doctorIds);
        patientDoctors.add(practitionerId);
      }

      encounters.push({
        resourceType: 'Encounter',
        id: uuidv4(),
        status: isFuture ? 'planned' : 'finished',
        class: {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
          code: 'AMB',
          display: 'ambulatory',
        },
        type: [
          {
            coding: [
              {
                system: 'http://snomed.info/sct',
                code: '308335008',
                display: 'Patient consultation',
              },
            ],
          },
        ],
        subject: { reference: `Patient/${patient.id}` },
        participant: [{ individual: { reference: `Practitioner/${practitionerId}` } }],
        location: [{ location: { reference: `Location/${getRandomItem(locationIds)}` } }],
        period: {
          start: startTime.toISOString(),
          end: endTime.toISOString(),
        },
        _patient: patient,
        _practitionerId: practitionerId,
      });
    }
  });

  return encounters;
}

function generateAppointments(encounters) {
  const appointments = [];
  // Increase appointment generation to 85% of encounters for better coverage
  encounters.forEach((encounter) => {
    if (Math.random() > 0.15) {
      const startTime = new Date(encounter.period.start);
      const endTime = new Date(encounter.period.end);

      // Determine appointment status based on encounter status and date
      let appointmentStatus;
      if (encounter.status === 'planned') {
        appointmentStatus = 'booked';
      } else if (startTime > new Date()) {
        appointmentStatus = 'booked';
      } else {
        appointmentStatus = Math.random() < 0.9 ? 'fulfilled' : 'noshow';
      }

      appointments.push({
        resourceType: 'Appointment',
        id: uuidv4(),
        status: appointmentStatus,
        serviceType: [
          {
            coding: [{ system: 'http://snomed.info/sct', code: '308335008', display: 'Patient consultation' }],
          },
        ],
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        participant: [
          { actor: encounter.subject, status: 'accepted' },
          { actor: encounter.participant[0].individual, status: 'accepted' },
        ],
        description: getRandomItem([
          'Routine checkup',
          'Follow-up appointment',
          'Initial consultation',
          'Diagnostic test review',
          'Treatment follow-up',
        ]),
      });
    }
  });
  // Sort appointments: booked (future) first, then fulfilled (past)
  // Within each group, sort by date (latest first)
  const sorted = appointments.sort((a, b) => {
    const aDate = new Date(a.start);
    const bDate = new Date(b.start);
    const aIsBooked = a.status === 'booked';
    const bIsBooked = b.status === 'booked';

    // Booked appointments come first
    if (aIsBooked && !bIsBooked) return -1;
    if (!aIsBooked && bIsBooked) return 1;

    // Within same status, sort by date (latest first)
    return bDate - aDate;
  });

  // Set _lastUpdated timestamps so booked appointments appear first when UI sorts by _lastUpdated (descending)
  // When sorting descending, LATER timestamps appear first
  // Booked appointments get FUTURE timestamps (appear first)
  // Fulfilled appointments get PAST timestamps (appear later)
  const now = new Date();
  const futureBaseTime = new Date('2026-01-08T12:00:00Z'); // Future timestamp for booked appointments
  const pastBaseTime = new Date('2026-01-06T12:00:00Z'); // Past timestamp for fulfilled appointments

  sorted.forEach((appointment, index) => {
    const appointmentDate = new Date(appointment.start);
    const isBooked = appointment.status === 'booked';
    const isFuture = appointmentDate > now;

    let timestamp;
    if (isBooked || isFuture) {
      // Booked/future appointments get FUTURE timestamps (latest first when sorted descending)
      // First booked appointment gets the latest future timestamp
      timestamp = new Date(futureBaseTime.getTime() - index * 1000);
    } else {
      // Fulfilled/past appointments get PAST timestamps (earlier when sorted descending)
      // Use a separate counter for fulfilled appointments
      const fulfilledIndex = sorted.filter(
        (a, i) => i < index && a.status !== 'booked' && new Date(a.start) <= now
      ).length;
      timestamp = new Date(pastBaseTime.getTime() - fulfilledIndex * 1000);
    }

    appointment.meta = {
      ...appointment.meta,
      lastUpdated: timestamp.toISOString(),
    };
  });

  return sorted;
}

function generateServiceRequests(encounters, practitioners, patients, coverages) {
  const serviceRequests = [];
  const labTechs = practitioners.filter((p) => p.name[0].prefix[0].startsWith('Lab Tech'));
  const labTechIds = labTechs.map((t) => t.id);
  const patientMap = new Map(patients.map((p) => [p.id, p]));
  const coverageMap = new Map(coverages.map((c) => [c.subscriber.reference.replace('Patient/', ''), c]));

  encounters.forEach((encounter) => {
    const patient = patientMap.get(encounter.subject.reference.replace('Patient/', ''));
    if (!patient || !patient._diseaseCategory) return;

    const tests = DIAGNOSTIC_TESTS_BY_DISEASE[patient._diseaseCategory] || [];
    if (tests.length === 0) return;

    // Get patient's insurance coverage
    const patientCoverage = coverageMap.get(patient.id);

    // Increase probability of generating service requests (80% of encounters)
    if (Math.random() > 0.2) {
      // Generate 1-3 tests per encounter for better coverage
      const numTests = randomIntInRange(1, 3);
      const selectedTests = getRandomItems(tests, Math.min(numTests, tests.length));
      const encounterStart = new Date(encounter.period.start);
      const isPast = encounterStart < new Date();

      selectedTests.forEach((test) => {
        const status = isPast
          ? Math.random() < 0.85
            ? 'completed'
            : 'revoked'
          : Math.random() < 0.7
            ? 'active'
            : 'draft';

        const serviceRequest = {
          resourceType: 'ServiceRequest',
          id: uuidv4(),
          status: status,
          intent: 'order',
          priority: getRandomItem(['routine', 'urgent', 'asap']),
          subject: encounter.subject,
          encounter: { reference: `Encounter/${encounter.id}` },
          code: {
            coding: [{ system: 'http://loinc.org', code: test.loinc, display: test.display }],
            text: test.text,
          },
          authoredOn: encounterStart.toISOString(),
          requester: encounter.participant[0].individual,
          performer: [{ reference: `Practitioner/${getRandomItem(labTechIds)}` }],
          patientInstruction: getRandomItem([
            'Fast for 12 hours before the test. Water is allowed.',
            'No special preparation required. Continue normal diet.',
            'Avoid heavy meals 2 hours before the test.',
            'Bring a list of current medications.',
            'Arrive 15 minutes early for registration.',
          ]),
        };

        // Add insurance information if available
        if (patientCoverage) {
          serviceRequest.insurance = [
            {
              reference: `Coverage/${patientCoverage.id}`,
              display: patientCoverage.payor?.[0]?.display || 'Insurance Coverage',
            },
          ];
        }

        serviceRequests.push(serviceRequest);
      });
    }
  });

  return serviceRequests.sort((a, b) => new Date(b.authoredOn) - new Date(a.authoredOn));
}

function generateDiagnosticReports(serviceRequests, encounters, patients) {
  const diagnosticReports = [];
  const patientMap = new Map(patients.map((p) => [p.id, p]));

  // Generate diagnostic reports for all completed service requests
  serviceRequests
    .filter((sr) => sr.status === 'completed')
    .forEach((serviceRequest) => {
      const encounter = encounters.find((e) => e.id === serviceRequest.encounter.reference.replace('Encounter/', ''));
      if (!encounter) return;

      const patient = patientMap.get(encounter.subject.reference.replace('Patient/', ''));
      if (!patient) return;

      const patientName = `${patient.name[0].given[0]} ${patient.name[0].family}`;
      const testName = serviceRequest.code.text;
      const reportDate = new Date(serviceRequest.authoredOn);
      // Report is typically available 1-5 days after test is ordered
      reportDate.setDate(reportDate.getDate() + randomIntInRange(1, 5));

      // Use appropriate lab test based on the diagnostic test type
      let labTest = getRandomItem(LAB_TESTS);
      // Try to match lab test to diagnostic test when possible
      if (testName.includes('Glucose') || testName.includes('HbA1c')) {
        labTest = LAB_TESTS.find((lt) => lt.text.includes('Glucose')) || labTest;
      } else if (testName.includes('Cholesterol') || testName.includes('Lipid')) {
        labTest = LAB_TESTS.find((lt) => lt.text.includes('Cholesterol')) || labTest;
      } else if (testName.includes('Hemoglobin') || testName.includes('CBC')) {
        labTest = LAB_TESTS.find((lt) => lt.text.includes('Hemoglobin')) || labTest;
      }

      const value = randomValueInRange(labTest.normalRange[0] * 0.8, labTest.normalRange[1] * 1.2);
      const interpretation = value >= labTest.normalRange[0] && value <= labTest.normalRange[1] ? 'Normal' : 'Abnormal';
      const interpretationCode =
        value >= labTest.normalRange[0] && value <= labTest.normalRange[1]
          ? 'N'
          : value > labTest.normalRange[1]
            ? 'H'
            : 'L';

      const obsId = uuidv4();
      const resultsText = `Test completed successfully. ${labTest.text}: ${value} ${labTest.unit} (${interpretation}). Reference range: ${labTest.normalRange[0]}-${labTest.normalRange[1]} ${labTest.unit}`;

      const conclusions = [
        `Results are ${interpretation.toLowerCase()}. Clinical correlation recommended.`,
        `${interpretation} values observed. Follow-up may be required.`,
        `Test results within ${interpretation.toLowerCase()} range. Continue monitoring as indicated.`,
        `${interpretation} findings. Please consult with ordering physician.`,
      ];

      const pdfBase64 = generatePDF(
        'Diagnostic Report',
        patientName,
        testName,
        resultsText,
        reportDate.toISOString().split('T')[0]
      );

      diagnosticReports.push({
        resourceType: 'DiagnosticReport',
        id: uuidv4(),
        status: 'final',
        subject: encounter.subject,
        encounter: { reference: `Encounter/${encounter.id}` },
        basedOn: [{ reference: `ServiceRequest/${serviceRequest.id}` }],
        code: serviceRequest.code,
        performer: serviceRequest.performer,
        effectiveDateTime: reportDate.toISOString(),
        conclusion: getRandomItem(conclusions),
        conclusionCode: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                code: interpretationCode,
                display: interpretation,
              },
            ],
          },
        ],
        result: [{ reference: `Observation/${obsId}` }],
        presentedForm: [
          {
            contentType: 'application/pdf',
            data: pdfBase64,
            title: `${testName}_${patientName.replace(/\s+/g, '_')}_${reportDate.toISOString().split('T')[0]}.pdf`,
            creation: reportDate.toISOString(),
          },
        ],
      });
    });

  return diagnosticReports.sort((a, b) => new Date(b.effectiveDateTime) - new Date(a.effectiveDateTime));
}

function generateObservations(encounters, diagnosticReports) {
  const observations = [];
  const obsMap = new Map();

  diagnosticReports.forEach((report) => {
    if (report.result && report.result.length > 0) {
      report.result.forEach((resultRef) => {
        const obsId = resultRef.reference.replace('Observation/', '');
        if (!obsMap.has(obsId)) {
          const encounter = encounters.find((e) => e.id === report.encounter.reference.replace('Encounter/', ''));
          const labTest = getRandomItem(LAB_TESTS);
          const value = randomValueInRange(labTest.normalRange[0] * 0.8, labTest.normalRange[1] * 1.2);

          observations.push({
            resourceType: 'Observation',
            id: obsId,
            status: 'final',
            category: [
              {
                coding: [
                  {
                    system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                    code: 'laboratory',
                    display: 'Laboratory',
                  },
                ],
              },
            ],
            code: {
              coding: [{ system: 'http://loinc.org', code: labTest.code, display: labTest.display }],
              text: labTest.text,
            },
            subject: report.subject,
            encounter: encounter ? { reference: `Encounter/${encounter.id}` } : undefined,
            effectiveDateTime: report.effectiveDateTime,
            valueQuantity: {
              value: value,
              unit: labTest.unit,
              system: 'http://unitsofmeasure.org',
              code: labTest.unit,
            },
            interpretation: [
              {
                coding: [
                  {
                    system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                    code: value >= labTest.normalRange[0] && value <= labTest.normalRange[1] ? 'N' : 'H',
                    display: value >= labTest.normalRange[0] && value <= labTest.normalRange[1] ? 'Normal' : 'High',
                  },
                ],
              },
            ],
          });
          obsMap.set(obsId, true);
        }
      });
    }
  });

  return observations;
}

function generateProcedures(encounters, patients) {
  const procedures = [];
  const patientMap = new Map(patients.map((p) => [p.id, p]));

  encounters.forEach((encounter) => {
    if (Math.random() > 0.6) {
      // 40% of encounters have procedures
      const patient = patientMap.get(encounter.subject.reference.replace('Patient/', ''));
      if (!patient) return;

      // For surgical patients, more likely to have surgical procedures
      const isSurgical = patient._diseaseCategory === 'surgical';
      const procedure =
        isSurgical && Math.random() > 0.5
          ? getRandomItem(
              PROCEDURES.filter((p) => ['Appendectomy', 'Cholecystectomy', 'Fracture Reduction'].includes(p.text))
            )
          : getRandomItem(PROCEDURES);

      const encounterStart = new Date(encounter.period.start);
      const procedureDate = new Date(encounterStart);
      procedureDate.setMinutes(procedureDate.getMinutes() + randomIntInRange(10, 30));

      procedures.push({
        resourceType: 'Procedure',
        id: uuidv4(),
        status: 'completed',
        code: {
          coding: [{ system: 'http://snomed.info/sct', code: procedure.code, display: procedure.display }],
          text: procedure.text,
        },
        subject: encounter.subject,
        encounter: { reference: `Encounter/${encounter.id}` },
        performedDateTime: procedureDate.toISOString(),
        performer: [{ actor: encounter.participant[0].individual }],
      });
    }
  });

  return procedures;
}

function generateMedicationRequests(encounters) {
  const medicationRequests = [];

  encounters.forEach((encounter) => {
    if (Math.random() > 0.4) {
      // 60% of encounters have medications
      const numMeds = randomIntInRange(1, 2);
      const medications = getRandomItems(MEDICATIONS, numMeds);
      const encounterStart = new Date(encounter.period.start);

      medications.forEach((medication) => {
        medicationRequests.push({
          resourceType: 'MedicationRequest',
          id: uuidv4(),
          status: Math.random() > 0.2 ? 'active' : 'completed',
          intent: 'order',
          subject: encounter.subject,
          encounter: { reference: `Encounter/${encounter.id}` },
          medicationCodeableConcept: {
            coding: [
              {
                system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
                code: medication.rxnorm || medication.code,
                display: medication.display,
              },
            ],
            text: medication.text,
          },
          authoredOn: encounterStart.toISOString(),
          requester: encounter.participant[0].individual,
          dosageInstruction: [
            {
              text: getRandomItem([
                'Take 1 tablet by mouth twice daily',
                'Take 1 tablet by mouth once daily',
                'Take 2 tablets by mouth once daily',
                'Take as directed',
              ]),
              timing: {
                repeat: {
                  frequency: getRandomItem([1, 2, 3]),
                  period: 1,
                  periodUnit: 'd',
                },
              },
              route: {
                coding: [
                  {
                    system: 'http://snomed.info/sct',
                    code: '26643006',
                    display: 'Oral route',
                  },
                ],
              },
            },
          ],
        });
      });
    }
  });

  return medicationRequests;
}

function generateCoverages(patients) {
  const insuranceCompanies = [
    'BlueCross BlueShield',
    'UnitedHealthcare',
    'Aetna',
    'Cigna',
    'Humana',
    'Medicare',
    'Medicaid',
    'Kaiser Permanente',
    'Anthem',
    'Molina Healthcare',
  ];
  return patients.map((patient) => {
    const insuranceName = getRandomItem(insuranceCompanies);
    return {
      resourceType: 'Coverage',
      id: uuidv4(),
      status: 'active',
      type: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
            code: 'EHCPOL',
            display: 'Extended Healthcare',
          },
        ],
      },
      subscriber: { reference: `Patient/${patient.id}` },
      beneficiary: { reference: `Patient/${patient.id}` },
      payor: [{ display: insuranceName }],
    };
  });
}

function generateQuestionnaireResponses(questionnaires, patients, encounters) {
  const questionnaireResponses = [];
  const patientMap = new Map(patients.map((p) => [p.id, p]));
  const encounterMap = new Map(encounters.map((e) => [e.id, e]));

  questionnaires.forEach((questionnaire) => {
    // Generate 2-4 responses per questionnaire
    const numResponses = randomIntInRange(2, 4);
    const selectedPatients = getRandomItems(patients, Math.min(numResponses, patients.length));

    selectedPatients.forEach((patient) => {
      const patientName = `${patient.name[0].given[0]} ${patient.name[0].family}`;
      const responseDate = randomDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), new Date());

      // Find a recent encounter for this patient
      const patientEncounters = encounters.filter((e) => e.subject.reference === `Patient/${patient.id}`);
      const relatedEncounter = patientEncounters.length > 0 ? getRandomItem(patientEncounters) : null;

      const response = {
        resourceType: 'QuestionnaireResponse',
        id: uuidv4(),
        status: 'completed',
        questionnaire: `Questionnaire/${questionnaire.id}`,
        subject: { reference: `Patient/${patient.id}` },
        authored: responseDate.toISOString(),
        item: [],
      };

      if (relatedEncounter) {
        response.encounter = { reference: `Encounter/${relatedEncounter.id}` };
      }

      // Generate answers based on questionnaire type
      if (questionnaire.title === 'Patient Intake Form') {
        response.item = [
          {
            linkId: '1.1',
            text: 'Date of Birth',
            answer: [{ valueDate: patient.birthDate }],
          },
          {
            linkId: '1.2',
            text: 'Gender',
            answer: [{ valueCoding: { code: patient.gender, display: patient.gender === 'male' ? 'Male' : 'Female' } }],
          },
          {
            linkId: '1.3',
            text: 'Emergency Contact Name',
            answer: [{ valueString: `${getRandomItem(FIRST_NAMES.male)} ${getRandomItem(LAST_NAMES)}` }],
          },
          {
            linkId: '1.4',
            text: 'Emergency Contact Phone',
            answer: [{ valueString: `+91-${randomIntInRange(70000, 99999)}-${randomIntInRange(10000, 99999)}` }],
          },
          {
            linkId: '2.1',
            text: 'Do you have any known allergies?',
            answer: [{ valueBoolean: Math.random() > 0.7 }],
          },
          {
            linkId: '2.2',
            text: 'Current Medications',
            answer: [
              {
                valueString: getRandomItem([
                  'None',
                  'Metformin 500mg',
                  'Lisinopril 10mg',
                  'Atorvastatin 20mg',
                  'Multiple medications',
                ]),
              },
            ],
          },
          {
            linkId: '2.3',
            text: 'Past Surgeries',
            answer: [
              {
                valueString: getRandomItem([
                  'None',
                  'Appendectomy (2015)',
                  'Knee surgery (2018)',
                  'Gallbladder removal (2020)',
                ]),
              },
            ],
          },
          {
            linkId: '2.4',
            text: 'Family Medical History',
            answer: [
              {
                valueString: getRandomItem([
                  'None significant',
                  'Diabetes in family',
                  'Heart disease in family',
                  'Hypertension in family',
                ]),
              },
            ],
          },
        ];
      } else if (questionnaire.title === 'Pre-Surgery Assessment') {
        response.item = [
          {
            linkId: '1.1',
            text: 'Type of Surgery',
            answer: [
              { valueString: getRandomItem(['Appendectomy', 'Cholecystectomy', 'Hernia repair', 'Knee surgery']) },
            ],
          },
          {
            linkId: '1.2',
            text: 'Previous Surgeries',
            answer: [{ valueString: getRandomItem(['None', 'Appendectomy (2015)', 'Knee surgery (2018)']) }],
          },
          {
            linkId: '1.3',
            text: 'Current Medications',
            answer: [{ valueString: getRandomItem(['None', 'Metformin', 'Blood thinners', 'Multiple medications']) }],
          },
          {
            linkId: '1.4',
            text: 'Allergies to Medications',
            answer: [{ valueString: getRandomItem(['None', 'Penicillin', 'Sulfa drugs']) }],
          },
          {
            linkId: '2.1',
            text: 'Do you smoke?',
            answer: [{ valueBoolean: Math.random() > 0.8 }],
          },
          {
            linkId: '2.2',
            text: 'Do you consume alcohol?',
            answer: [{ valueBoolean: Math.random() > 0.7 }],
          },
          {
            linkId: '2.3',
            text: 'Any bleeding disorders?',
            answer: [{ valueBoolean: Math.random() > 0.9 }],
          },
        ];
      } else if (questionnaire.title === 'Post-Visit Feedback') {
        const ratings = ['excellent', 'good', 'fair', 'poor'];
        const selectedRating = getRandomItem(ratings);
        response.item = [
          {
            linkId: '1.1',
            text: 'How would you rate your overall experience?',
            answer: [
              {
                valueCoding: {
                  code: selectedRating,
                  display: selectedRating.charAt(0).toUpperCase() + selectedRating.slice(1),
                },
              },
            ],
          },
          {
            linkId: '1.2',
            text: 'Were your questions answered?',
            answer: [{ valueBoolean: Math.random() > 0.2 }],
          },
          {
            linkId: '1.3',
            text: 'Would you recommend this hospital?',
            answer: [{ valueBoolean: Math.random() > 0.15 }],
          },
          {
            linkId: '1.4',
            text: 'Additional Comments',
            answer: [
              {
                valueString: getRandomItem([
                  'Great service, very professional staff.',
                  'Wait time was a bit long but overall good experience.',
                  'Excellent care and attention.',
                  'Staff was very helpful and understanding.',
                  'Could improve on appointment scheduling.',
                ]),
              },
            ],
          },
        ];
      }

      questionnaireResponses.push(response);
    });
  });

  return questionnaireResponses.sort((a, b) => new Date(b.authored) - new Date(a.authored));
}

function generateQuestionnaires() {
  return [
    {
      resourceType: 'Questionnaire',
      id: uuidv4(),
      status: 'active',
      title: 'Patient Intake Form',
      description: 'Comprehensive patient intake questionnaire for new admissions',
      subjectType: ['Patient'],
      item: [
        {
          linkId: '1',
          text: 'Personal Information',
          type: 'group',
          item: [
            { linkId: '1.1', text: 'Date of Birth', type: 'date', required: true },
            {
              linkId: '1.2',
              text: 'Gender',
              type: 'choice',
              required: true,
              answerOption: [
                { valueCoding: { code: 'male', display: 'Male' } },
                { valueCoding: { code: 'female', display: 'Female' } },
              ],
            },
            { linkId: '1.3', text: 'Emergency Contact Name', type: 'string', required: true },
            { linkId: '1.4', text: 'Emergency Contact Phone', type: 'string', required: true },
          ],
        },
        {
          linkId: '2',
          text: 'Medical History',
          type: 'group',
          item: [
            { linkId: '2.1', text: 'Do you have any known allergies?', type: 'boolean', required: false },
            { linkId: '2.2', text: 'Current Medications', type: 'text', required: false },
            { linkId: '2.3', text: 'Past Surgeries', type: 'text', required: false },
            { linkId: '2.4', text: 'Family Medical History', type: 'text', required: false },
          ],
        },
      ],
    },
    {
      resourceType: 'Questionnaire',
      id: uuidv4(),
      status: 'active',
      title: 'Pre-Surgery Assessment',
      description: 'Pre-operative assessment questionnaire',
      subjectType: ['Patient'],
      item: [
        {
          linkId: '1',
          text: 'Surgery Information',
          type: 'group',
          item: [
            { linkId: '1.1', text: 'Type of Surgery', type: 'string', required: true },
            { linkId: '1.2', text: 'Previous Surgeries', type: 'text', required: false },
            { linkId: '1.3', text: 'Current Medications', type: 'text', required: true },
            { linkId: '1.4', text: 'Allergies to Medications', type: 'text', required: false },
          ],
        },
        {
          linkId: '2',
          text: 'Health Status',
          type: 'group',
          item: [
            { linkId: '2.1', text: 'Do you smoke?', type: 'boolean', required: false },
            { linkId: '2.2', text: 'Do you consume alcohol?', type: 'boolean', required: false },
            { linkId: '2.3', text: 'Any bleeding disorders?', type: 'boolean', required: false },
          ],
        },
      ],
    },
    {
      resourceType: 'Questionnaire',
      id: uuidv4(),
      status: 'active',
      title: 'Post-Visit Feedback',
      description: 'Patient feedback questionnaire after hospital visit',
      subjectType: ['Patient'],
      item: [
        {
          linkId: '1',
          text: 'Visit Experience',
          type: 'group',
          item: [
            {
              linkId: '1.1',
              text: 'How would you rate your overall experience?',
              type: 'choice',
              required: true,
              answerOption: [
                { valueCoding: { code: 'excellent', display: 'Excellent' } },
                { valueCoding: { code: 'good', display: 'Good' } },
                { valueCoding: { code: 'fair', display: 'Fair' } },
                { valueCoding: { code: 'poor', display: 'Poor' } },
              ],
            },
            { linkId: '1.2', text: 'Were your questions answered?', type: 'boolean', required: false },
            { linkId: '1.3', text: 'Would you recommend this hospital?', type: 'boolean', required: false },
            { linkId: '1.4', text: 'Additional Comments', type: 'text', required: false },
          ],
        },
      ],
    },
  ];
}

// Main execution
console.log('🏥 Generating comprehensive hospital data...\n');

const organizations = generateOrganizations();
console.log(`✅ Generated ${organizations.length} organizations`);

const locations = generateLocations(organizations);
console.log(`✅ Generated ${locations.length} locations`);

const practitioners = generatePractitioners();
console.log(`✅ Generated ${practitioners.length} practitioners`);
console.log(`   - ${practitioners.filter((p) => p.name[0].prefix[0].startsWith('Dr.')).length} Doctors`);
console.log(`   - ${practitioners.filter((p) => p.name[0].prefix[0].startsWith('Nurse')).length} Nurses`);
console.log(`   - ${practitioners.filter((p) => p.name[0].prefix[0].startsWith('Lab Tech')).length} Lab Technicians`);

const patients = generatePatients(organizations);
console.log(`✅ Generated ${patients.length} patients with disease categories`);
Object.keys(DISEASE_CATEGORIES).forEach((cat) => {
  const count = patients.filter((p) => p._diseaseCategory === cat).length;
  console.log(`   - ${count} ${cat} cases`);
});

const conditions = generateConditions(patients);
console.log(`✅ Generated ${conditions.length} conditions`);

const encounters = generateEncounters(patients, practitioners, locations);
console.log(`✅ Generated ${encounters.length} encounters`);

const appointments = generateAppointments(encounters);
console.log(`✅ Generated ${appointments.length} appointments`);

const coverages = generateCoverages(patients);
console.log(`✅ Generated ${coverages.length} coverages`);

const serviceRequests = generateServiceRequests(encounters, practitioners, patients, coverages);
console.log(`✅ Generated ${serviceRequests.length} service requests (diagnostic requests)`);

const diagnosticReports = generateDiagnosticReports(serviceRequests, encounters, patients);
console.log(`✅ Generated ${diagnosticReports.length} diagnostic reports`);

const observations = generateObservations(encounters, diagnosticReports);
console.log(`✅ Generated ${observations.length} observations`);

const procedures = generateProcedures(encounters, patients);
console.log(`✅ Generated ${procedures.length} procedures`);

const medicationRequests = generateMedicationRequests(encounters);
console.log(`✅ Generated ${medicationRequests.length} medication requests`);

const questionnaires = generateQuestionnaires();
console.log(`✅ Generated ${questionnaires.length} questionnaires`);

const questionnaireResponses = generateQuestionnaireResponses(questionnaires, patients, encounters);
console.log(`✅ Generated ${questionnaireResponses.length} questionnaire responses`);

// Clean up internal properties
patients.forEach((p) => {
  delete p._diseaseCategory;
  delete p._primaryCondition;
});

// Write all files
fs.writeFileSync(path.join(mockJsonDir, 'organizations.json'), JSON.stringify(organizations, null, 2));
fs.writeFileSync(path.join(mockJsonDir, 'locations.json'), JSON.stringify(locations, null, 2));
fs.writeFileSync(path.join(mockJsonDir, 'practitioners.json'), JSON.stringify(practitioners, null, 2));
fs.writeFileSync(path.join(mockJsonDir, 'patients.json'), JSON.stringify(patients, null, 2));
fs.writeFileSync(path.join(mockJsonDir, 'conditions.json'), JSON.stringify(conditions, null, 2));
fs.writeFileSync(path.join(mockJsonDir, 'encounters.json'), JSON.stringify(encounters, null, 2));
fs.writeFileSync(path.join(mockJsonDir, 'appointments.json'), JSON.stringify(appointments, null, 2));
fs.writeFileSync(path.join(mockJsonDir, 'procedures.json'), JSON.stringify(procedures, null, 2));
fs.writeFileSync(path.join(mockJsonDir, 'serviceRequests.json'), JSON.stringify(serviceRequests, null, 2));
fs.writeFileSync(path.join(mockJsonDir, 'diagnosticReports.json'), JSON.stringify(diagnosticReports, null, 2));
fs.writeFileSync(path.join(mockJsonDir, 'observations.json'), JSON.stringify(observations, null, 2));
fs.writeFileSync(path.join(mockJsonDir, 'medicationRequests.json'), JSON.stringify(medicationRequests, null, 2));
fs.writeFileSync(path.join(mockJsonDir, 'coverages.json'), JSON.stringify(coverages, null, 2));
fs.writeFileSync(path.join(mockJsonDir, 'questionnaires.json'), JSON.stringify(questionnaires, null, 2));
fs.writeFileSync(
  path.join(mockJsonDir, 'questionnaireResponses.json'),
  JSON.stringify(questionnaireResponses, null, 2)
);

console.log('\n✅ All files written successfully!');
console.log('\n📊 Summary:');
console.log(`   - ${patients.length} Patients (with disease categories)`);
console.log(`   - ${practitioners.length} Practitioners`);
console.log(`   - ${organizations.length} Organizations`);
console.log(`   - ${locations.length} Locations`);
console.log(`   - ${encounters.length} Encounters`);
console.log(`   - ${appointments.length} Appointments`);
console.log(`   - ${conditions.length} Conditions`);
console.log(`   - ${procedures.length} Procedures`);
console.log(`   - ${serviceRequests.length} Service Requests (Diagnostic Requests)`);
console.log(`   - ${diagnosticReports.length} Diagnostic Reports`);
console.log(`   - ${observations.length} Observations`);
console.log(`   - ${medicationRequests.length} Medication Requests`);
console.log(`   - ${coverages.length} Coverages`);
console.log(`   - ${questionnaires.length} Questionnaires`);
console.log(`   - ${questionnaireResponses.length} Questionnaire Responses`);
console.log('\n✅ All resources are properly linked!');
