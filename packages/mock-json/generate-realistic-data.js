#!/usr/bin/env node
/* eslint-disable */
/* eslint-env node */
/**
 * Comprehensive script to generate realistic hospital data
 * - Realistic patients with proper demographics
 * - Realistic practitioners with proper specializations
 * - Properly linked encounters, appointments, conditions
 * - Diagnostic reports with downloadable PDF attachments
 * - Properly linked observations, procedures, medications
 * - Complete patient and doctor timelines
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

// Realistic conditions with proper SNOMED codes
const CONDITIONS = [
  { code: '38341003', display: 'Hypertensive disorder', text: 'Hypertension', category: 'problem-list-item' },
  { code: '44054006', display: 'Diabetes mellitus type 2', text: 'Type 2 Diabetes', category: 'problem-list-item' },
  { code: '195967001', display: 'Asthma', text: 'Asthma', category: 'problem-list-item' },
  { code: '235595009', display: 'Gastritis', text: 'Gastritis', category: 'problem-list-item' },
  { code: '161891005', display: 'Low back pain', text: 'Low back pain', category: 'problem-list-item' },
  { code: '13645005', display: 'Chronic obstructive lung disease', text: 'COPD', category: 'problem-list-item' },
  { code: '195080001', display: 'Osteoarthritis', text: 'Osteoarthritis', category: 'problem-list-item' },
  { code: '16114001', display: 'Depressive disorder', text: 'Depression', category: 'problem-list-item' },
  { code: '35489007', display: 'Anxiety disorder', text: 'Anxiety', category: 'problem-list-item' },
  { code: '197480006', display: 'Hyperlipidemia', text: 'Hyperlipidemia', category: 'problem-list-item' },
  { code: '414915002', display: 'Obesity', text: 'Obesity', category: 'problem-list-item' },
  { code: '72892002', display: 'Anemia', text: 'Anemia', category: 'problem-list-item' },
  { code: '363418001', display: 'Hypothyroidism', text: 'Hypothyroidism', category: 'problem-list-item' },
  { code: '42399007', display: 'Upper respiratory tract infection', text: 'URI', category: 'encounter-diagnosis' },
  { code: '25064002', display: 'Type 1 diabetes mellitus', text: 'Type 1 Diabetes', category: 'problem-list-item' },
  { code: '195967001', display: 'Bronchitis', text: 'Bronchitis', category: 'encounter-diagnosis' },
  { code: '37796009', display: 'Migraine', text: 'Migraine', category: 'problem-list-item' },
  { code: '444814009', display: 'Viral pneumonia', text: 'Viral Pneumonia', category: 'encounter-diagnosis' },
];

// Realistic procedures
const PROCEDURES = [
  { code: '301095005', display: 'Electrocardiogram', text: 'ECG' },
  { code: '71651007', display: 'X-Ray chest', text: 'Chest X-Ray' },
  { code: '410528000', display: 'Nebulization therapy', text: 'Nebulization' },
  { code: '387713003', display: 'Wound dressing', text: 'Wound Dressing' },
  { code: '113091000', display: 'Magnetic resonance imaging of brain', text: 'MRI Brain' },
  { code: '241615005', display: 'Blood pressure measurement', text: 'Blood Pressure Check' },
  { code: '399208008', display: 'Urinalysis', text: 'Urine Test' },
  { code: '168499009', display: 'Physical examination', text: 'Physical Exam' },
  { code: '443253003', display: 'Ultrasound scan abdomen', text: 'Abdominal Ultrasound' },
  { code: '241615005', display: 'Echocardiogram', text: 'Echocardiogram' },
  { code: '241615005', display: 'Colonoscopy', text: 'Colonoscopy' },
  { code: '241615005', display: 'Endoscopy', text: 'Endoscopy' },
];

// Practitioner specializations for doctors
const DOCTOR_SPECIALIZATIONS = [
  { code: 'MD', display: 'Doctor of Medicine', specialty: 'General Practice', prefix: 'Dr.' },
  { code: 'MD', display: 'Doctor of Medicine', specialty: 'Cardiology', prefix: 'Dr.' },
  { code: 'MD', display: 'Doctor of Medicine', specialty: 'Internal Medicine', prefix: 'Dr.' },
  { code: 'MD', display: 'Doctor of Medicine', specialty: 'Pediatrics', prefix: 'Dr.' },
  { code: 'MD', display: 'Doctor of Medicine', specialty: 'Orthopedics', prefix: 'Dr.' },
  { code: 'MD', display: 'Doctor of Medicine', specialty: 'Dermatology', prefix: 'Dr.' },
  { code: 'MD', display: 'Doctor of Medicine', specialty: 'Neurology', prefix: 'Dr.' },
  { code: 'MD', display: 'Doctor of Medicine', specialty: 'Oncology', prefix: 'Dr.' },
  { code: 'MD', display: 'Doctor of Medicine', specialty: 'Psychiatry', prefix: 'Dr.' },
  { code: 'MD', display: 'Doctor of Medicine', specialty: 'Endocrinology', prefix: 'Dr.' },
  { code: 'MD', display: 'Doctor of Medicine', specialty: 'Gastroenterology', prefix: 'Dr.' },
  { code: 'MD', display: 'Doctor of Medicine', specialty: 'Pulmonology', prefix: 'Dr.' },
];

// Nurse and lab technician specializations
const NURSE_SPECIALIZATIONS = [
  { code: 'RN', display: 'Registered Nurse', specialty: 'General Nursing', prefix: 'Nurse' },
  { code: 'RN', display: 'Registered Nurse', specialty: 'Emergency Nursing', prefix: 'Nurse' },
  { code: 'RN', display: 'Registered Nurse', specialty: 'Critical Care Nursing', prefix: 'Nurse' },
  { code: 'RN', display: 'Registered Nurse', specialty: 'Pediatric Nursing', prefix: 'Nurse' },
  { code: 'LPN', display: 'Licensed Practical Nurse', specialty: 'General Nursing', prefix: 'Nurse' },
];

const LAB_TECH_SPECIALIZATIONS = [
  { code: 'MLT', display: 'Medical Laboratory Technician', specialty: 'Clinical Laboratory', prefix: 'Lab Tech' },
  { code: 'MLS', display: 'Medical Laboratory Scientist', specialty: 'Clinical Laboratory', prefix: 'Lab Tech' },
  { code: 'MT', display: 'Medical Technologist', specialty: 'Clinical Laboratory', prefix: 'Lab Tech' },
];

// Insurance companies
const INSURANCE_COMPANIES = [
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
  'Centene Corporation',
  'WellCare',
];

// Patient instructions templates
const PATIENT_INSTRUCTIONS = [
  'Fast for 12 hours before the test. Water is allowed.',
  'No special preparation required. Continue normal diet.',
  'Avoid heavy meals 2 hours before the test.',
  'Bring a list of current medications.',
  'Arrive 15 minutes early for registration.',
  'Wear comfortable clothing. Avoid jewelry.',
  'Inform the technician if you are pregnant.',
  'Continue taking prescribed medications unless instructed otherwise.',
];

// Vitals with realistic ranges
const VITALS = [
  {
    code: '85354-9',
    display: 'Blood pressure panel',
    text: 'Blood Pressure',
    components: [
      { code: '8480-6', display: 'Systolic blood pressure', unit: 'mm[Hg]', normalRange: [90, 140] },
      { code: '8462-4', display: 'Diastolic blood pressure', unit: 'mm[Hg]', normalRange: [60, 90] },
    ],
  },
  { code: '8867-4', display: 'Heart rate', text: 'Heart Rate', unit: '/min', normalRange: [60, 100] },
  { code: '9279-1', display: 'Respiratory rate', text: 'Respiratory Rate', unit: '/min', normalRange: [12, 20] },
  { code: '8310-5', display: 'Body temperature', text: 'Temperature', unit: 'Cel', normalRange: [36.1, 37.2] },
  { code: '8302-2', display: 'Body height', text: 'Height', unit: 'cm', normalRange: [150, 200] },
  { code: '29463-7', display: 'Body weight', text: 'Weight', unit: 'kg', normalRange: [50, 120] },
  { code: '39156-5', display: 'Body mass index', text: 'BMI', unit: 'kg/m2', normalRange: [18.5, 25] },
  {
    code: '2708-6',
    display: 'Oxygen saturation in Arterial blood',
    text: 'O2 Saturation',
    unit: '%',
    normalRange: [95, 100],
  },
];

// Lab tests with realistic ranges
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
    code: '26449-9',
    display: 'Hemoglobin A1c/Hemoglobin.total in Blood',
    text: 'HbA1c',
    unit: '%',
    normalRange: [4, 6],
  },
  {
    code: '2093-3',
    display: 'Cholesterol [Mass/volume] in Serum or Plasma',
    text: 'Total Cholesterol',
    unit: 'mg/dL',
    normalRange: [0, 200],
  },
  {
    code: '2085-9',
    display: 'Cholesterol in HDL [Mass/volume] in Serum or Plasma',
    text: 'HDL Cholesterol',
    unit: 'mg/dL',
    normalRange: [40, 60],
  },
  {
    code: '2089-1',
    display: 'Cholesterol in LDL [Mass/volume] in Serum or Plasma',
    text: 'LDL Cholesterol',
    unit: 'mg/dL',
    normalRange: [0, 100],
  },
  {
    code: '2571-8',
    display: 'Triglyceride [Mass/volume] in Serum or Plasma',
    text: 'Triglycerides',
    unit: 'mg/dL',
    normalRange: [0, 150],
  },
  {
    code: '33914-3',
    display: 'Glomerular filtration rate/1.73 sq M.predicted',
    text: 'eGFR',
    unit: 'mL/min/1.73m2',
    normalRange: [90, 120],
  },
  {
    code: '1920-8',
    display: 'AST [Enzymatic activity/volume] in Serum or Plasma',
    text: 'AST',
    unit: 'U/L',
    normalRange: [10, 40],
  },
  {
    code: '2324-2',
    display: 'ALT [Enzymatic activity/volume] in Serum or Plasma',
    text: 'ALT',
    unit: 'U/L',
    normalRange: [10, 40],
  },
  {
    code: '1975-2',
    display: 'Bilirubin.total [Mass/volume] in Serum or Plasma',
    text: 'Total Bilirubin',
    unit: 'mg/dL',
    normalRange: [0.2, 1.2],
  },
];

// Medications with proper RxNorm codes
const MEDICATIONS = [
  { code: '197806', display: 'Lisinopril 10 MG Oral Tablet', text: 'Lisinopril 10mg', rxnorm: '314076' },
  { code: '197884', display: 'Metformin 500 MG Oral Tablet', text: 'Metformin 500mg', rxnorm: '860975' },
  { code: '198440', display: 'Atorvastatin 20 MG Oral Tablet', text: 'Atorvastatin 20mg', rxnorm: '617312' },
  { code: '197808', display: 'Amlodipine 5 MG Oral Tablet', text: 'Amlodipine 5mg', rxnorm: '17767' },
  { code: '197808', display: 'Albuterol 90 MCG/ACTUAT Inhalant Solution', text: 'Albuterol Inhaler', rxnorm: '435' },
  { code: '197808', display: 'Omeprazole 20 MG Oral Capsule', text: 'Omeprazole 20mg', rxnorm: '7646' },
  { code: '197808', display: 'Ibuprofen 200 MG Oral Tablet', text: 'Ibuprofen 200mg', rxnorm: '5640' },
  { code: '197808', display: 'Levothyroxine 50 MCG Oral Tablet', text: 'Levothyroxine 50mcg', rxnorm: '9668' },
  {
    code: '197808',
    display: 'Amlodipine-Benazepril 5-10 MG Oral Capsule',
    text: 'Amlodipine-Benazepril',
    rxnorm: '197808',
  },
  { code: '197808', display: 'Losartan 50 MG Oral Tablet', text: 'Losartan 50mg', rxnorm: '314076' },
];

// Diagnostic test types
const DIAGNOSTIC_TESTS = [
  { code: '24356-8', display: 'Complete Blood Count', text: 'CBC' },
  { code: '24323-8', display: 'Comprehensive Metabolic Panel', text: 'CMP' },
  { code: '24320-4', display: 'Basic Metabolic Panel', text: 'BMP' },
  { code: '24357-6', display: 'Lipid Panel', text: 'Lipid Panel' },
  { code: '24359-2', display: 'Liver Function Panel', text: 'LFT' },
  { code: '24325-3', display: 'Thyroid Stimulating Hormone', text: 'TSH' },
  { code: '5902-2', display: 'Prothrombin time (PT)', text: 'PT' },
  { code: '5900-6', display: 'INR in Platelet poor plasma by Coagulation assay', text: 'INR' },
  { code: '71651007', display: 'X-Ray chest', text: 'Chest X-Ray' },
  { code: '113091000', display: 'Magnetic resonance imaging of brain', text: 'MRI Brain' },
  { code: '443253003', display: 'Ultrasound scan abdomen', text: 'Abdominal Ultrasound' },
];

// Generate a professional PDF (improved minimal PDF that's properly formatted)
function generatePDF(title, patientName, testName, results, date, observations = []) {
  // Build observation details for the PDF
  let observationDetails = '';
  if (observations.length > 0) {
    observationDetails =
      '\n\nTest Results:\n' +
      observations.map((obs) => `  - ${obs.name}: ${obs.value} (${obs.status})`).join('\n') +
      '\n';
  }

  // Create a well-formatted PDF content
  const lines = [
    'DIAGNOSTIC REPORT',
    '='.repeat(60),
    '',
    `Patient: ${patientName}`,
    `Test: ${testName}`,
    `Date: ${date}`,
    observationDetails,
    `Summary: ${results}`,
    '',
    'Report generated by CityCare Hospital',
    'This is a sample diagnostic report.',
  ];

  const textContent = lines.join('\\n');
  const textLength = textContent.length;

  // Improved minimal valid PDF structure with proper formatting
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

// Generate realistic patients
function generatePatients(count = 50, hospitalBranchIds = []) {
  const patients = [];
  // Use hospital branches, fallback to main org if no branches provided
  const defaultOrgId = '34c95d53-17b0-4985-855e-5db90d67c161';
  const orgIds = hospitalBranchIds.length > 0 ? hospitalBranchIds : [defaultOrgId];

  for (let i = 0; i < count; i++) {
    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const firstName = getRandomItem(FIRST_NAMES[gender]);
    const lastName = getRandomItem(LAST_NAMES);
    const birthYear = randomIntInRange(1950, 2010);
    const birthMonth = randomIntInRange(1, 12);
    const birthDay = randomIntInRange(1, 28);
    const birthDate = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;

    const age = new Date().getFullYear() - birthYear;
    const phone = `+91-${randomIntInRange(70000, 99999)}-${randomIntInRange(10000, 99999)}`;
    // Assign patient to a random hospital branch
    const assignedOrgId = getRandomItem(orgIds);

    patients.push({
      resourceType: 'Patient',
      id: uuidv4(),
      name: [
        {
          use: 'official',
          family: lastName,
          given: [firstName],
        },
      ],
      managingOrganization: {
        reference: `Organization/${assignedOrgId}`,
      },
      identifier: [
        {
          system: 'http://hospital.example.com/patient-id',
          value: `PAT-${String(i + 1).padStart(6, '0')}`,
        },
      ],
      active: true,
      gender: gender,
      birthDate: birthDate,
      address: [
        {
          line: [`${randomIntInRange(100, 999)} ${getRandomItem(['Street', 'Avenue', 'Road', 'Lane'])}`],
          city: getRandomItem(['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune']),
          state: getRandomItem([
            'Delhi',
            'Maharashtra',
            'Karnataka',
            'Tamil Nadu',
            'West Bengal',
            'Telangana',
            'Gujarat',
          ]),
          postalCode: String(randomIntInRange(110001, 110099)),
          country: 'IN',
        },
      ],
      telecom: [
        {
          system: 'phone',
          value: phone,
          use: 'mobile',
        },
      ],
      maritalStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v3-MaritalStatus',
            code: age > 25 ? (Math.random() > 0.3 ? 'M' : 'S') : 'S',
            display: age > 25 ? (Math.random() > 0.3 ? 'Married' : 'Single') : 'Single',
          },
        ],
      },
    });
  }

  return patients;
}

// Generate realistic practitioners (doctors, nurses, lab techs)
function generatePractitioners(doctorCount = 20, nurseCount = 15, labTechCount = 10) {
  const practitioners = [];
  let practitionerIndex = 0;

  // Generate doctors
  for (let i = 0; i < doctorCount; i++) {
    const specialization = getRandomItem(DOCTOR_SPECIALIZATIONS);
    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const firstName = getRandomItem(FIRST_NAMES[gender]);
    const lastName = getRandomItem(LAST_NAMES);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@citycarehospital.com`;
    const phone = `+91-${randomIntInRange(70000, 99999)}-${randomIntInRange(10000, 99999)}`;

    practitioners.push({
      resourceType: 'Practitioner',
      id: uuidv4(),
      name: [
        {
          use: 'official',
          family: lastName,
          given: [firstName],
          prefix: [specialization.prefix],
        },
      ],
      identifier: [
        {
          system: 'http://medical-council.example.com',
          value: `MC-${String(++practitionerIndex).padStart(4, '0')}`,
        },
      ],
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
          value: phone,
          use: 'work',
        },
        {
          system: 'email',
          value: email,
          use: 'work',
        },
      ],
      qualification: [
        {
          code: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v2-0360',
                code: specialization.code,
                display: specialization.display,
              },
            ],
          },
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/qualification-specialty',
              valueString: specialization.specialty,
            },
          ],
        },
      ],
      communication: [
        {
          coding: [
            {
              system: 'urn:ietf:bcp:47',
              code: 'en',
              display: 'English',
            },
            {
              system: 'urn:ietf:bcp:47',
              code: 'hi',
              display: 'Hindi',
            },
          ],
        },
      ],
    });
  }

  // Generate nurses
  for (let i = 0; i < nurseCount; i++) {
    const specialization = getRandomItem(NURSE_SPECIALIZATIONS);
    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const firstName = getRandomItem(FIRST_NAMES[gender]);
    const lastName = getRandomItem(LAST_NAMES);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@citycarehospital.com`;
    const phone = `+91-${randomIntInRange(70000, 99999)}-${randomIntInRange(10000, 99999)}`;

    practitioners.push({
      resourceType: 'Practitioner',
      id: uuidv4(),
      name: [
        {
          use: 'official',
          family: lastName,
          given: [firstName],
          prefix: [specialization.prefix],
        },
      ],
      identifier: [
        {
          system: 'http://nursing-council.example.com',
          value: `NC-${String(++practitionerIndex).padStart(4, '0')}`,
        },
      ],
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
          value: phone,
          use: 'work',
        },
        {
          system: 'email',
          value: email,
          use: 'work',
        },
      ],
      qualification: [
        {
          code: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v2-0360',
                code: specialization.code,
                display: specialization.display,
              },
            ],
          },
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/qualification-specialty',
              valueString: specialization.specialty,
            },
          ],
        },
      ],
      communication: [
        {
          coding: [
            {
              system: 'urn:ietf:bcp:47',
              code: 'en',
              display: 'English',
            },
            {
              system: 'urn:ietf:bcp:47',
              code: 'hi',
              display: 'Hindi',
            },
          ],
        },
      ],
    });
  }

  // Generate lab technicians
  for (let i = 0; i < labTechCount; i++) {
    const specialization = getRandomItem(LAB_TECH_SPECIALIZATIONS);
    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const firstName = getRandomItem(FIRST_NAMES[gender]);
    const lastName = getRandomItem(LAST_NAMES);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@citycarehospital.com`;
    const phone = `+91-${randomIntInRange(70000, 99999)}-${randomIntInRange(10000, 99999)}`;

    practitioners.push({
      resourceType: 'Practitioner',
      id: uuidv4(),
      name: [
        {
          use: 'official',
          family: lastName,
          given: [firstName],
          prefix: [specialization.prefix],
        },
      ],
      identifier: [
        {
          system: 'http://lab-council.example.com',
          value: `LC-${String(++practitionerIndex).padStart(4, '0')}`,
        },
      ],
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
          value: phone,
          use: 'work',
        },
        {
          system: 'email',
          value: email,
          use: 'work',
        },
      ],
      qualification: [
        {
          code: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v2-0360',
                code: specialization.code,
                display: specialization.display,
              },
            ],
          },
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/qualification-specialty',
              valueString: specialization.specialty,
            },
          ],
        },
      ],
      communication: [
        {
          coding: [
            {
              system: 'urn:ietf:bcp:47',
              code: 'en',
              display: 'English',
            },
            {
              system: 'urn:ietf:bcp:47',
              code: 'hi',
              display: 'Hindi',
            },
          ],
        },
      ],
    });
  }

  return practitioners;
}

// Main execution
console.log('🏥 Generating realistic hospital data...\n');

// Read existing organizations to get hospital branch IDs (exclude labs and pharmacies)
const organizations = JSON.parse(fs.readFileSync(path.join(mockJsonDir, 'organizations.json'), 'utf8'));
const hospitalBranchIds = organizations
  .filter((org) => {
    // Include main hospital and branches, exclude labs and pharmacies
    const orgType = org.type?.[0]?.coding?.[0]?.code;
    return !orgType || (orgType !== 'lab' && orgType !== 'pharm');
  })
  .map((org) => org.id);

console.log(`✅ Found ${hospitalBranchIds.length} hospital branches`);

// Generate patients assigned to different hospital branches
const patients = generatePatients(50, hospitalBranchIds);
console.log(`✅ Generated ${patients.length} realistic patients`);

// Generate practitioners (doctors, nurses, lab techs)
const practitioners = generatePractitioners(20, 15, 10);
console.log(`✅ Generated ${practitioners.length} realistic practitioners`);

// Separate practitioners by type
const doctors = practitioners.filter((p) => p.name[0].prefix[0].startsWith('Dr.'));
const nurses = practitioners.filter((p) => p.name[0].prefix[0].startsWith('Nurse'));
const labTechs = practitioners.filter((p) => p.name[0].prefix[0].startsWith('Lab Tech'));

// Reorder practitioners: doctors first, then nurses, then lab techs
practitioners.length = 0;
practitioners.push(...doctors, ...nurses, ...labTechs);

console.log(`   - ${doctors.length} Doctors`);
console.log(`   - ${nurses.length} Nurses`);
console.log(`   - ${labTechs.length} Lab Technicians`);

// Get IDs
const patientIds = patients.map((p) => p.id);
const practitionerIds = practitioners.map((p) => p.id);
const doctorIds = doctors.map((p) => p.id);
const nurseIds = nurses.map((p) => p.id);
const labTechIds = labTechs.map((p) => p.id);
const orgId = '34c95d53-17b0-4985-855e-5db90d67c161';

// Read existing locations
const locations = JSON.parse(fs.readFileSync(path.join(mockJsonDir, 'locations.json'), 'utf8'));
const locationIds = locations.map((l) => l.id);

// Generate encounters with proper linking
const encounters = [];
const patientEncountersMap = new Map();

// Track patient appointment dates to avoid clustering
const patientAppointmentDates = new Map();

patients.forEach((patient) => {
  const numEncounters = randomIntInRange(2, 4); // Reduced to 2-4 encounters for more realism
  const patientDates = [];
  // Track which doctors this patient has seen to avoid too many different doctors
  const patientDoctors = new Set();

  for (let i = 0; i < numEncounters; i++) {
    // Spread encounters across the past 2 years, ensuring minimum gap between appointments
    let encounterDate;
    let attempts = 0;
    do {
      // Create more realistic spacing - at least 30 days between encounters for same patient
      const minDaysBetween = 30; // Increased to 30 days minimum
      const daysSinceFirst = i * minDaysBetween * randomIntInRange(4, 10); // 4-10x the minimum spacing
      // Mix past and future appointments - 30% future, 70% past
      const isFuture = Math.random() < 0.3;
      if (isFuture) {
        encounterDate = new Date(Date.now() + randomIntInRange(1, 90) * 24 * 60 * 60 * 1000);
      } else {
        encounterDate = new Date(Date.now() - (730 - daysSinceFirst) * 24 * 60 * 60 * 1000);
        // Add some randomness but keep it within bounds
        encounterDate = new Date(encounterDate.getTime() + randomIntInRange(-7, 7) * 24 * 60 * 60 * 1000);
        if (encounterDate > new Date())
          encounterDate = new Date(Date.now() - randomIntInRange(1, 30) * 24 * 60 * 60 * 1000);
      }

      attempts++;
      // Ensure at least 30 days gap between appointments for the same patient
      const hasConflict = patientDates.some(
        (date) => Math.abs(date - encounterDate) < minDaysBetween * 24 * 60 * 60 * 1000
      );
      if (!hasConflict || attempts > 50) break;
    } while (attempts < 50);

    patientDates.push(encounterDate);
    patientDates.sort((a, b) => a - b); // Keep sorted

    const startTime = new Date(encounterDate);
    startTime.setHours(randomIntInRange(8, 17), randomIntInRange(0, 59), 0, 0);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + randomIntInRange(15, 60));

    // Assign a doctor to the encounter - prefer doctors patient has seen before (70% chance)
    let practitionerId;
    if (patientDoctors.size > 0 && Math.random() < 0.7) {
      // Reuse a doctor the patient has seen before
      const seenDoctorIds = Array.from(patientDoctors);
      practitionerId = getRandomItem(seenDoctorIds);
    } else {
      // Assign a new doctor
      practitionerId = getRandomItem(doctorIds);
      patientDoctors.add(practitionerId);
    }
    const locationId = getRandomItem(locationIds);
    const encounterClass = getRandomItem(['AMB', 'IMP', 'EMER', 'AMB']);
    const encounterType = getRandomItem([
      { code: '390906007', display: 'Follow-up encounter' },
      { code: '308335008', display: 'Patient consultation' },
      { code: '185349003', display: 'Consultation' },
      { code: '308335008', display: 'Office visit' },
    ]);

    const encounter = {
      resourceType: 'Encounter',
      id: uuidv4(),
      status: getRandomItem(['finished', 'in-progress', 'planned']),
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: encounterClass,
        display: encounterClass === 'AMB' ? 'ambulatory' : encounterClass === 'IMP' ? 'inpatient' : 'emergency',
      },
      type: [
        {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: encounterType.code,
              display: encounterType.display,
            },
          ],
        },
      ],
      subject: {
        reference: `Patient/${patient.id}`,
      },
      participant: [
        {
          individual: {
            reference: `Practitioner/${practitionerId}`,
          },
        },
      ],
      location: [
        {
          location: {
            reference: `Location/${locationId}`,
          },
        },
      ],
      period: {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
      },
      reasonCode: [
        {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: '185349003',
              display: 'Consultation',
            },
          ],
        },
      ],
    };

    encounters.push(encounter);

    if (!patientEncountersMap.has(patient.id)) {
      patientEncountersMap.set(patient.id, []);
    }
    patientEncountersMap.get(patient.id).push(encounter);
  }
});

console.log(`✅ Generated ${encounters.length} encounters`);

// Generate appointments linked to encounters with proper spacing
const appointments = [];
const appointmentEncounterMap = new Map();
// Track appointments per patient to ensure proper spacing
const patientAppointments = new Map();

encounters.forEach((encounter) => {
  if (Math.random() > 0.3) {
    // 70% of encounters have appointments
    const patientRef = encounter.subject.reference;
    const patientId = patientRef.replace('Patient/', '');
    const practitionerRef = encounter.participant[0].individual.reference;
    const locationRef = encounter.location[0].location.reference;

    // Get existing appointments for this patient
    const existingAppointments = patientAppointments.get(patientId) || [];
    const encounterStart = new Date(encounter.period.start);

    // Ensure appointments are spread out (at least 30 days apart for same patient)
    const hasConflict = existingAppointments.some(
      (aptDate) => Math.abs(aptDate - encounterStart) < 30 * 24 * 60 * 60 * 1000
    );

    if (hasConflict) {
      // Skip this appointment if it conflicts
      return;
    }

    existingAppointments.push(encounterStart);
    patientAppointments.set(patientId, existingAppointments);

    // Determine appointment status based on date with more variety
    let appointmentStatus;
    const now = new Date();
    const daysDiff = (encounterStart - now) / (1000 * 60 * 60 * 24);

    if (daysDiff > 7) {
      // Future appointment (> 7 days)
      const rand = Math.random();
      appointmentStatus = rand < 0.85 ? 'booked' : rand < 0.95 ? 'pending' : 'cancelled';
    } else if (daysDiff > 0) {
      // Near future (0-7 days)
      const rand = Math.random();
      appointmentStatus = rand < 0.75 ? 'booked' : rand < 0.9 ? 'pending' : 'cancelled';
    } else if (daysDiff > -1) {
      // Today
      const rand = Math.random();
      appointmentStatus = rand < 0.6 ? 'arrived' : rand < 0.8 ? 'checked-in' : rand < 0.9 ? 'fulfilled' : 'noshow';
    } else {
      // Past appointment
      const rand = Math.random();
      appointmentStatus =
        rand < 0.7 ? 'fulfilled' : rand < 0.85 ? 'noshow' : rand < 0.95 ? 'cancelled' : 'entered-in-error';
    }

    const appointment = {
      resourceType: 'Appointment',
      id: uuidv4(),
      meta: {
        lastUpdated: encounter.period.start, // Set lastUpdated to match start date for proper sorting
      },
      status: appointmentStatus,
      participant: [
        {
          actor: {
            reference: patientRef,
          },
          status: appointmentStatus === 'cancelled' ? 'declined' : 'accepted',
        },
        {
          actor: {
            reference: practitionerRef,
          },
          status: appointmentStatus === 'cancelled' ? 'declined' : 'accepted',
        },
        {
          actor: {
            reference: locationRef,
          },
          status: 'accepted',
        },
      ],
      start: encounter.period.start,
      end: encounter.period.end,
      description: getRandomItem([
        'Regular consultation appointment',
        'Follow-up visit',
        'Annual checkup',
        'Symptom evaluation',
        'Preventive care visit',
      ]),
      appointmentType: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v2-0276',
            code: 'ROUTINE',
            display: 'Routine',
          },
        ],
      },
      serviceType: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/service-type',
              code: 'GP',
              display: 'General Practice',
            },
          ],
        },
      ],
    };

    appointments.push(appointment);
    appointmentEncounterMap.set(appointment.id, encounter.id);
    encounter.appointment = [{ reference: `Appointment/${appointment.id}` }];
  }
});

console.log(`✅ Generated ${appointments.length} appointments`);

// Generate conditions for patients
const conditions = [];

patients.forEach((patient) => {
  const numConditions = randomIntInRange(1, 4);
  const patientConditions = getRandomItems(CONDITIONS, numConditions);

  patientConditions.forEach((conditionData) => {
    const onsetDate = randomDate(new Date(Date.now() - 730 * 24 * 60 * 60 * 1000), new Date());
    const status = Math.random() > 0.3 ? 'active' : 'resolved';

    conditions.push({
      resourceType: 'Condition',
      id: uuidv4(),
      clinicalStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: status,
            display: status === 'active' ? 'Active' : 'Resolved',
          },
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
        {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: conditionData.category === 'problem-list-item' ? '55607006' : '404684003',
              display: conditionData.category === 'problem-list-item' ? 'Problem' : 'Clinical finding',
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: conditionData.code,
            display: conditionData.display,
          },
        ],
        text: conditionData.text,
      },
      subject: {
        reference: `Patient/${patient.id}`,
      },
      onsetDateTime: onsetDate.toISOString(),
      recordedDate: onsetDate.toISOString(),
      recorder: {
        reference: `Practitioner/${getRandomItem(practitionerIds)}`,
      },
    });
  });
});

console.log(`✅ Generated ${conditions.length} conditions`);

// Generate procedures linked to encounters
const procedures = [];

encounters.forEach((encounter) => {
  if (Math.random() > 0.6) {
    // 40% of encounters have procedures
    const procedureData = getRandomItem(PROCEDURES);
    const encounterStart = new Date(encounter.period.start);
    const procedureDate = randomDate(encounterStart, new Date(encounterStart.getTime() + 2 * 60 * 60 * 1000));

    procedures.push({
      resourceType: 'Procedure',
      id: uuidv4(),
      status: 'completed',
      code: {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: procedureData.code,
            display: procedureData.display,
          },
        ],
        text: procedureData.text,
      },
      subject: encounter.subject,
      encounter: {
        reference: `Encounter/${encounter.id}`,
      },
      performedDateTime: procedureDate.toISOString(),
      performer: [
        {
          actor: {
            reference: encounter.participant[0].individual.reference,
          },
        },
      ],
      location: encounter.location[0].location,
    });
  }
});

console.log(`✅ Generated ${procedures.length} procedures`);

// Generate observations (vitals and labs) linked to encounters
const observations = [];

encounters.forEach((encounter) => {
  // Generate vitals for each encounter
  const numVitals = randomIntInRange(3, 6);
  const selectedVitals = getRandomItems(VITALS, numVitals);
  const encounterStart = new Date(encounter.period.start);

  selectedVitals.forEach((vital) => {
    if (vital.components) {
      // Blood pressure has components
      vital.components.forEach((component) => {
        const value = randomValueInRange(component.normalRange[0] * 0.85, component.normalRange[1] * 1.15);
        observations.push({
          resourceType: 'Observation',
          id: uuidv4(),
          status: 'final',
          category: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'vital-signs',
                  display: 'Vital Signs',
                },
              ],
            },
          ],
          code: {
            coding: [
              {
                system: 'http://loinc.org',
                code: component.code,
                display: component.display,
              },
            ],
            text: component.display,
          },
          subject: encounter.subject,
          encounter: {
            reference: `Encounter/${encounter.id}`,
          },
          effectiveDateTime: randomDate(
            encounterStart,
            new Date(encounterStart.getTime() + 60 * 60 * 1000)
          ).toISOString(),
          valueQuantity: {
            value: value,
            unit: component.unit,
            system: 'http://unitsofmeasure.org',
            code: component.unit,
          },
          interpretation: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                  code:
                    value >= component.normalRange[0] && value <= component.normalRange[1]
                      ? 'N'
                      : value > component.normalRange[1]
                        ? 'H'
                        : 'L',
                  display:
                    value >= component.normalRange[0] && value <= component.normalRange[1]
                      ? 'Normal'
                      : value > component.normalRange[1]
                        ? 'High'
                        : 'Low',
                },
              ],
            },
          ],
        });
      });
    } else {
      // Single value vital
      const value = randomValueInRange(vital.normalRange[0] * 0.9, vital.normalRange[1] * 1.1);
      observations.push({
        resourceType: 'Observation',
        id: uuidv4(),
        status: 'final',
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'vital-signs',
                display: 'Vital Signs',
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: vital.code,
              display: vital.display,
            },
          ],
          text: vital.text,
        },
        subject: encounter.subject,
        encounter: {
          reference: `Encounter/${encounter.id}`,
        },
        effectiveDateTime: randomDate(
          encounterStart,
          new Date(encounterStart.getTime() + 60 * 60 * 1000)
        ).toISOString(),
        valueQuantity: {
          value: value,
          unit: vital.unit,
          system: 'http://unitsofmeasure.org',
          code: vital.unit,
        },
        interpretation: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                code:
                  value >= vital.normalRange[0] && value <= vital.normalRange[1]
                    ? 'N'
                    : value > vital.normalRange[1]
                      ? 'H'
                      : 'L',
                display:
                  value >= vital.normalRange[0] && value <= vital.normalRange[1]
                    ? 'Normal'
                    : value > vital.normalRange[1]
                      ? 'High'
                      : 'Low',
              },
            ],
          },
        ],
      });
    }
  });

  // Generate lab tests for some encounters
  if (Math.random() > 0.5) {
    const numLabs = randomIntInRange(1, 4);
    const selectedLabs = getRandomItems(LAB_TESTS, numLabs);

    selectedLabs.forEach((lab) => {
      const value = randomValueInRange(lab.normalRange[0] * 0.8, lab.normalRange[1] * 1.2);
      const observationId = uuidv4();

      observations.push({
        resourceType: 'Observation',
        id: observationId,
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
          coding: [
            {
              system: 'http://loinc.org',
              code: lab.code,
              display: lab.display,
            },
          ],
          text: lab.text,
        },
        subject: encounter.subject,
        encounter: {
          reference: `Encounter/${encounter.id}`,
        },
        effectiveDateTime: randomDate(
          encounterStart,
          new Date(encounterStart.getTime() + 24 * 60 * 60 * 1000)
        ).toISOString(),
        valueQuantity: {
          value: value,
          unit: lab.unit,
          system: 'http://unitsofmeasure.org',
          code: lab.unit,
        },
        interpretation: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                code:
                  value >= lab.normalRange[0] && value <= lab.normalRange[1]
                    ? 'N'
                    : value > lab.normalRange[1]
                      ? 'H'
                      : 'L',
                display:
                  value >= lab.normalRange[0] && value <= lab.normalRange[1]
                    ? 'Normal'
                    : value > lab.normalRange[1]
                      ? 'High'
                      : 'Low',
              },
            ],
          },
        ],
      });
    });
  }
});

console.log(`✅ Generated ${observations.length} observations`);

// Generate coverages for patients (before service requests so they can reference them)
let coverages = [];
patients.forEach((patient) => {
  if (Math.random() > 0.2) {
    // 80% have insurance
    const payer = getRandomItem(INSURANCE_COMPANIES);

    coverages.push({
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
      subscriber: {
        reference: `Patient/${patient.id}`,
      },
      beneficiary: {
        reference: `Patient/${patient.id}`,
      },
      payor: [
        {
          display: payer,
        },
      ],
      period: {
        start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    });
  }
});

console.log(`✅ Generated ${coverages.length} coverages`);

// Generate diagnostic reports with PDF attachments
const diagnosticReports = [];
const serviceRequests = [];

encounters.forEach((encounter) => {
  if (Math.random() > 0.4) {
    // 60% of encounters have diagnostic reports
    const test = getRandomItem(DIAGNOSTIC_TESTS);
    const encounterStart = new Date(encounter.period.start);
    const reportDate = randomDate(encounterStart, new Date(encounterStart.getTime() + 7 * 24 * 60 * 60 * 1000));

    const patientName = patients.find((p) => p.id === encounter.subject.reference.replace('Patient/', '')).name[0];
    const patientFullName = `${patientName.given[0]} ${patientName.family}`;

    // Get patient's coverage for insurance
    const patientId = encounter.subject.reference.replace('Patient/', '');
    const patientCoverage = coverages.find((c) => c.subscriber?.reference === `Patient/${patientId}`);

    // Create service request with insurance and patient instructions
    const insuranceRef = patientCoverage
      ? [
          {
            reference: `Coverage/${patientCoverage.id}`,
            display: patientCoverage.payor?.[0]?.display || 'Insurance', // Add human-readable display name
          },
        ]
      : [];

    // Determine service request status based on encounter date
    const now = new Date();
    const encounterDate = new Date(encounter.period.start);
    const daysDiff = (encounterDate - now) / (1000 * 60 * 60 * 24);
    let serviceRequestStatus;
    if (daysDiff > 7) {
      // Future request
      serviceRequestStatus = Math.random() < 0.7 ? 'draft' : 'active';
    } else if (daysDiff > 0) {
      // Near future
      serviceRequestStatus = Math.random() < 0.5 ? 'active' : Math.random() < 0.8 ? 'on-hold' : 'draft';
    } else {
      // Past request
      const rand = Math.random();
      serviceRequestStatus = rand < 0.7 ? 'completed' : rand < 0.85 ? 'revoked' : 'entered-in-error';
    }

    const serviceRequest = {
      resourceType: 'ServiceRequest',
      id: uuidv4(),
      meta: {
        lastUpdated: encounterStart.toISOString(), // Set lastUpdated to match authoredOn for proper sorting
      },
      status: serviceRequestStatus,
      intent: 'order',
      priority: getRandomItem(['routine', 'urgent', 'asap']),
      subject: encounter.subject,
      encounter: {
        reference: `Encounter/${encounter.id}`,
      },
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: test.code,
            display: test.display,
          },
        ],
        text: test.text,
      },
      authoredOn: encounterStart.toISOString(),
      requester: encounter.participant[0].individual, // Doctor who ordered the test
      performer: [
        {
          reference: `Practitioner/${getRandomItem(labTechIds)}`, // Lab technician performs the test
        },
      ],
      insurance: insuranceRef,
      patientInstruction: getRandomItem(PATIENT_INSTRUCTIONS),
    };

    serviceRequests.push(serviceRequest);

    // Create related observations for the report
    const reportObservations = [];
    const observationData = []; // For PDF table
    if (test.code === '24356-8' || test.code === '24323-8' || test.code === '24320-4') {
      // For panels, create multiple observations
      const panelLabs = getRandomItems(LAB_TESTS, randomIntInRange(3, 8));
      panelLabs.forEach((lab) => {
        const value = randomValueInRange(lab.normalRange[0] * 0.8, lab.normalRange[1] * 1.2);
        const obsId = uuidv4();
        reportObservations.push(obsId);
        const interpretation =
          value >= lab.normalRange[0] && value <= lab.normalRange[1]
            ? 'Normal'
            : value > lab.normalRange[1]
              ? 'High'
              : 'Low';

        observationData.push({
          name: lab.text,
          value: `${value} ${lab.unit}`,
          status: interpretation,
        });

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
            coding: [
              {
                system: 'http://loinc.org',
                code: lab.code,
                display: lab.display,
              },
            ],
            text: lab.text,
          },
          subject: encounter.subject,
          encounter: {
            reference: `Encounter/${encounter.id}`,
          },
          effectiveDateTime: reportDate.toISOString(),
          valueQuantity: {
            value: value,
            unit: lab.unit,
            system: 'http://unitsofmeasure.org',
            code: lab.unit,
          },
          interpretation: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                  code:
                    value >= lab.normalRange[0] && value <= lab.normalRange[1]
                      ? 'N'
                      : value > lab.normalRange[1]
                        ? 'H'
                        : 'L',
                  display: interpretation,
                },
              ],
            },
          ],
        });
      });
    } else {
      // Single test observation
      const lab = LAB_TESTS.find((l) => l.code === test.code) || getRandomItem(LAB_TESTS);
      const value = randomValueInRange(lab.normalRange[0] * 0.8, lab.normalRange[1] * 1.2);
      const obsId = uuidv4();
      reportObservations.push(obsId);
      const interpretation =
        value >= lab.normalRange[0] && value <= lab.normalRange[1]
          ? 'Normal'
          : value > lab.normalRange[1]
            ? 'High'
            : 'Low';

      observationData.push({
        name: lab.text,
        value: `${value} ${lab.unit}`,
        status: interpretation,
      });

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
          coding: [
            {
              system: 'http://loinc.org',
              code: lab.code,
              display: lab.display,
            },
          ],
          text: lab.text,
        },
        subject: encounter.subject,
        encounter: {
          reference: `Encounter/${encounter.id}`,
        },
        effectiveDateTime: reportDate.toISOString(),
        valueQuantity: {
          value: value,
          unit: lab.unit,
          system: 'http://unitsofmeasure.org',
          code: lab.unit,
        },
        interpretation: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                code:
                  value >= lab.normalRange[0] && value <= lab.normalRange[1]
                    ? 'N'
                    : value > lab.normalRange[1]
                      ? 'H'
                      : 'L',
                display: interpretation,
              },
            ],
          },
        ],
      });
    }

    // Generate PDF content
    const resultsText =
      reportObservations.length > 0
        ? `Results: ${reportObservations.length} test(s) performed. All values within normal limits.`
        : 'Test completed successfully.';
    const pdfBase64 = generatePDF(
      'Diagnostic Report',
      patientFullName,
      test.text,
      resultsText,
      reportDate.toISOString().split('T')[0],
      observationData
    );

    const conclusions = [
      'Results are within normal limits.',
      'Mild elevation noted, recommend follow-up.',
      'All parameters within expected range.',
      'Slight deviation from normal, clinical correlation recommended.',
      'Significant findings, immediate clinical attention advised.',
    ];

    const diagnosticReport = {
      resourceType: 'DiagnosticReport',
      id: uuidv4(),
      meta: {
        lastUpdated: reportDate.toISOString(), // Set lastUpdated to match effectiveDateTime for proper sorting
      },
      status: 'final',
      subject: encounter.subject,
      encounter: {
        reference: `Encounter/${encounter.id}`,
      },
      basedOn: [
        {
          reference: `ServiceRequest/${serviceRequest.id}`,
        },
      ],
      code: {
        coding: [
          {
            system: 'http://loinc.org',
            code: test.code,
            display: test.display,
          },
        ],
        text: `${test.text} Report`,
      },
      performer: [
        {
          reference: `Practitioner/${getRandomItem(labTechIds)}`, // Lab technician performs the test
        },
      ],
      effectiveDateTime: reportDate.toISOString(),
      conclusion: getRandomItem(conclusions),
      conclusionCode: [
        {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: '260385009',
              display: 'Normal',
            },
          ],
        },
      ],
      result: reportObservations
        .map((obsId) => {
          // Get the observation to use its actual display name
          const obs = observations.find((o) => o.id === obsId);
          return obs
            ? {
                reference: `Observation/${obsId}`,
                display: obs.code?.text || obs.code?.coding?.[0]?.display || `${test.text} Result`,
              }
            : null;
        })
        .filter((r) => r !== null), // Remove any null entries
      presentedForm: [
        {
          contentType: 'application/pdf',
          data: pdfBase64,
          title: `${test.text}_${patientFullName.replace(/\s+/g, '_')}_${reportDate.toISOString().split('T')[0]}.pdf`,
          creation: reportDate.toISOString(),
        },
      ],
    };

    diagnosticReports.push(diagnosticReport);
  }
});

console.log(`✅ Generated ${diagnosticReports.length} diagnostic reports with PDF attachments`);
console.log(`✅ Generated ${serviceRequests.length} service requests`);

// Generate medication requests
const medicationRequests = [];

encounters.forEach((encounter) => {
  if (Math.random() > 0.4) {
    // 60% of encounters have medications
    const numMeds = randomIntInRange(1, 3);
    const medications = getRandomItems(MEDICATIONS, numMeds);
    const encounterStart = new Date(encounter.period.start);

    medications.forEach((medication) => {
      medicationRequests.push({
        resourceType: 'MedicationRequest',
        id: uuidv4(),
        status: Math.random() > 0.2 ? 'active' : 'completed',
        intent: 'order',
        subject: encounter.subject,
        encounter: {
          reference: `Encounter/${encounter.id}`,
        },
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
              'Take 1 tablet by mouth three times daily',
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

console.log(`✅ Generated ${medicationRequests.length} medication requests`);

// Link conditions to encounters as diagnosis
encounters.forEach((encounter) => {
  const patientId = encounter.subject.reference.replace('Patient/', '');
  const patientConditions = conditions.filter((c) => c.subject.reference === `Patient/${patientId}`);

  if (patientConditions.length > 0 && Math.random() > 0.3) {
    const encounterConditions = getRandomItems(patientConditions, Math.min(2, patientConditions.length));
    encounter.diagnosis = encounterConditions.map((condition) => ({
      condition: {
        reference: `Condition/${condition.id}`,
      },
      use: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/diagnosis-role',
            code: 'AD',
            display: 'Admission diagnosis',
          },
        ],
      },
    }));
  }
});

// Write all files - ensure practitioners are in correct order (doctors, nurses, lab techs)
// Re-verify order before writing
const orderedPractitioners = [
  ...practitioners.filter((p) => p.name[0].prefix[0].startsWith('Dr.')),
  ...practitioners.filter((p) => p.name[0].prefix[0].startsWith('Nurse')),
  ...practitioners.filter((p) => p.name[0].prefix[0].startsWith('Lab Tech')),
];

// Sort appointments by start date (descending - newest/most recent first)
// JavaScript sort: negative = a before b, positive = b before a
// To get newest first: if dateB > dateA, we want B before A, so return positive
const sortedAppointments = [...appointments].sort((a, b) => {
  const dateA = a.start ? new Date(a.start).getTime() : 0;
  const dateB = b.start ? new Date(b.start).getTime() : 0;
  return dateB - dateA; // If B is newer (larger), return positive = B comes before A
});

// Sort service requests by authoredOn date (descending - newest/most recent first)
const sortedServiceRequests = [...serviceRequests].sort((a, b) => {
  const dateA = a.authoredOn ? new Date(a.authoredOn).getTime() : 0;
  const dateB = b.authoredOn ? new Date(b.authoredOn).getTime() : 0;
  return dateB - dateA; // If B is newer (larger), return positive = B comes before A
});

// Sort diagnostic reports by effectiveDateTime date (descending - newest/most recent first)
const sortedDiagnosticReports = [...diagnosticReports].sort((a, b) => {
  const dateA = a.effectiveDateTime ? new Date(a.effectiveDateTime).getTime() : 0;
  const dateB = b.effectiveDateTime ? new Date(b.effectiveDateTime).getTime() : 0;
  return dateB - dateA; // If B is newer (larger), return positive = B comes before A
});

fs.writeFileSync(path.join(mockJsonDir, 'patients.json'), JSON.stringify(patients, null, 2));
fs.writeFileSync(path.join(mockJsonDir, 'practitioners.json'), JSON.stringify(orderedPractitioners, null, 2));
fs.writeFileSync(path.join(mockJsonDir, 'encounters.json'), JSON.stringify(encounters, null, 2));
fs.writeFileSync(path.join(mockJsonDir, 'appointments.json'), JSON.stringify(sortedAppointments, null, 2));
fs.writeFileSync(path.join(mockJsonDir, 'conditions.json'), JSON.stringify(conditions, null, 2));
fs.writeFileSync(path.join(mockJsonDir, 'procedures.json'), JSON.stringify(procedures, null, 2));
fs.writeFileSync(path.join(mockJsonDir, 'observations.json'), JSON.stringify(observations, null, 2));
fs.writeFileSync(path.join(mockJsonDir, 'diagnosticReports.json'), JSON.stringify(sortedDiagnosticReports, null, 2));
fs.writeFileSync(path.join(mockJsonDir, 'serviceRequests.json'), JSON.stringify(sortedServiceRequests, null, 2));
fs.writeFileSync(path.join(mockJsonDir, 'medicationRequests.json'), JSON.stringify(medicationRequests, null, 2));
fs.writeFileSync(path.join(mockJsonDir, 'coverages.json'), JSON.stringify(coverages, null, 2));

console.log('\n✅ All files written successfully!');
console.log('\n📊 Summary:');
console.log(`   - ${patients.length} Patients`);
console.log(`   - ${practitioners.length} Practitioners`);
console.log(`   - ${encounters.length} Encounters`);
console.log(`   - ${appointments.length} Appointments`);
console.log(`   - ${conditions.length} Conditions`);
console.log(`   - ${procedures.length} Procedures`);
console.log(`   - ${observations.length} Observations`);
console.log(`   - ${diagnosticReports.length} Diagnostic Reports (with PDFs)`);
console.log(`   - ${serviceRequests.length} Service Requests`);
console.log(`   - ${medicationRequests.length} Medication Requests`);
console.log(`   - ${coverages.length} Coverages`);
console.log('\n✅ All resources are properly linked for patient and doctor timelines!');
