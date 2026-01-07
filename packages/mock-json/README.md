# Mock JSON Data for Medplum

This directory contains comprehensive hospital mock data for seeding Medplum projects with properly linked medical records organized by disease categories.

## Overview

The mock data includes:

- **Patients**: 45-55 patients with 9 disease categories, each containing 5-7 cases with multiple different diseases per category
- **Practitioners**: 33+ healthcare professionals (Doctors, Nurses, Lab Technicians)
- **Organizations**: Multiple hospital branches, diagnostic laboratory, and other hospital organizations
- **Encounters**: Patient encounters properly linked to patients and practitioners
- **Appointments**: Appointment history and current bookings linked to encounters
- **Conditions**: Patient diagnoses organized by disease categories
- **Procedures**: Medical procedures linked to encounters
- **Observations**: Vitals and lab results linked to encounters
- **Diagnostic Reports**: Lab/test reports with downloadable PDF attachments
- **Service Requests**: Diagnostic test orders appropriate for patient diseases
- **Medication Requests**: Prescriptions linked to encounters
- **Coverages**: Insurance information for patients
- **Questionnaires**: 3 mock questionnaires for patient intake and feedback

## Generating Data

### Main Script: `generate-comprehensive-data.js`

This is the single comprehensive script that generates all realistic, properly linked hospital data:

```bash
node generate-comprehensive-data.js
```

This script will:

1. Generate organizations (main hospital, branches, diagnostic lab, other hospitals)
2. Generate locations for the organizations
3. Generate 33+ practitioners (15 doctors, 10 nurses, 8 lab technicians)
4. Generate patients with 9 disease categories (5-7 cases each):
   - **Pulmonary diseases**: COPD, Asthma, Viral Pneumonia, Pulmonary Embolism, Pulmonary Fibrosis, Pleural Effusion, Tuberculosis, Lung Cancer
   - **Cardiac diseases**: Hypertension, Heart Failure, Myocardial Infarction, Atrial Fibrillation, Coronary Artery Disease, Angina Pectoris, Cardiac Arrhythmia, Valvular Heart Disease
   - **Respiratory diseases**: Asthma, Bronchitis, URI, Chronic Sinusitis, Pneumonia, Chronic Bronchitis, Allergic Rhinitis, Sleep Apnea
   - **Surgical diseases**: Bone Fracture, Appendicitis, Cholecystitis, Hernia, Gallstones, Intestinal Obstruction, Knee Injury, Hip Fracture
   - **Neurological diseases**: Migraine, Epilepsy, Parkinson Disease, Alzheimer Disease, Stroke, Multiple Sclerosis, Peripheral Neuropathy, Seizure Disorder
   - **Endocrine diseases**: Type 2 Diabetes, Type 1 Diabetes, Hypothyroidism, Hyperthyroidism, Hyperlipidemia, Obesity, Metabolic Syndrome, Adrenal Insufficiency
   - **Gastrointestinal diseases**: Gastritis, GERD, Peptic Ulcer Disease, IBD, IBS, Hepatitis, Liver Cirrhosis, Pancreatitis
   - **Dermatological diseases**: Eczema, Psoriasis, Acne, Dermatitis, Skin Infection, Melanoma, Basal Cell Carcinoma, Urticaria
   - **Orthopedic diseases**: Low Back Pain, Osteoarthritis, Rheumatoid Arthritis, Osteoporosis, Carpal Tunnel Syndrome, Rotator Cuff Injury, Tendinitis, Scoliosis
5. Create conditions (diagnoses) for patients based on their disease category
6. Generate encounters linked to patients and practitioners
7. Generate appointments (history + current bookings) linked to encounters
8. Create procedures linked to encounters (especially for surgical patients)
9. Generate service requests (diagnostic requests) appropriate for each patient's disease category
10. Create diagnostic reports with downloadable PDF attachments
11. Generate observations (lab results) linked to diagnostic reports
12. Create medication requests linked to encounters
13. Generate insurance coverages
14. Create 3 questionnaires (Patient Intake, Pre-Surgery Assessment, Post-Visit Feedback)

All resources are properly linked to create realistic patient and doctor timelines with disease-appropriate diagnostic tests.

## Data Structure

All JSON files follow FHIR R4 resource structure and are generated in the correct dependency order:

- `organizations.json` - Hospital organizations (main hospital, branches, lab, other hospitals)
- `locations.json` - Physical locations
- `practitioners.json` - Doctor, nurse, and lab technician resources
- `patients.json` - Patient resources with disease categories
- `coverages.json` - Insurance information
- `conditions.json` - Diagnoses and problems
- `observations.json` - Vitals and lab results
- `appointments.json` - Scheduled appointments
- `encounters.json` - Patient encounters
- `procedures.json` - Medical procedures
- `serviceRequests.json` - Diagnostic test orders
- `diagnosticReports.json` - Lab/test reports with PDF attachments
- `medicationRequests.json` - Prescriptions
- `questionnaires.json` - Patient intake and feedback forms

## Disease-Specific Diagnostic Tests

The script intelligently assigns diagnostic tests based on patient disease categories:

- **Pulmonary**: CBC, Chest X-Ray, Pulmonary Function Test, CMP, CT Chest
- **Cardiac**: ECG, Echocardiogram, Lipid Panel, CBC, Stress Test
- **Respiratory**: CBC, Chest X-Ray, CMP, Pulmonary Function Test
- **Surgical**: CBC, CMP, PT/INR, Ultrasound, X-Ray
- **Neurological**: MRI Brain, CT Brain, EEG, CBC, CMP
- **Endocrine**: Blood Glucose, HbA1c, TSH, Lipid Panel, CMP
- **Gastrointestinal**: Endoscopy, Colonoscopy, CMP, Liver Function Panel, Abdominal Ultrasound
- **Dermatological**: CBC, Skin Biopsy, CMP
- **Orthopedic**: X-Ray, MRI, Ultrasound, CBC

## Diagnostic Reports with PDFs

Diagnostic reports include PDF attachments in the `presentedForm` field. The PDFs are base64-encoded and can be downloaded and opened. Each PDF contains:

- Patient name
- Test name
- Date
- Results summary

## Seeding Data into Medplum

To seed this data into a Medplum project:

```bash
npm run seed:mock-data
```

This will import all JSON files in the correct dependency order to ensure all references are valid.

## Data Characteristics

### Realistic Features

- **Proper Linking**: All resources are properly linked (patients → encounters → observations, etc.)
- **Disease Categories**: Patients are organized by disease categories with appropriate conditions and tests
- **Timeline Support**: Data spans the past 2 years plus future appointments
- **Human Readable**: All names, addresses, and descriptions are realistic
- **Medical Accuracy**: Uses proper SNOMED, LOINC, and RxNorm codes
- **Downloadable PDFs**: Diagnostic reports include actual PDF files
- **Complete Workflows**: Full patient journey from appointment → encounter → diagnosis → treatment

### Patient Data

- 45-55 patients with realistic Indian names
- Organized by 9 disease categories (Pulmonary, Cardiac, Respiratory, Surgical, Neurological, Endocrine, Gastrointestinal, Dermatological, Orthopedic)
- 5-7 cases per category
- Multiple different diseases/illnesses within each category (8 diseases per category)
- Proper demographics (age, gender, marital status)
- Addresses across major Indian cities
- Phone numbers in Indian format

### Practitioner Data

- 33+ practitioners with various specializations:
  - **15 Doctors**: General Practice, Cardiology, Pulmonology, Internal Medicine, Surgery, Orthopedics, Emergency Medicine, Pediatrics, Neurology, Endocrinology, Gastroenterology, Dermatology
  - **10 Nurses**: General Nursing, Emergency Nursing, Critical Care Nursing, Surgical Nursing
  - **8 Lab Technicians**: Clinical Laboratory specialists

### Organization Data

- Main hospital (CityCare Hospital)
- Multiple hospital branches (North, South)
- Diagnostic laboratory (CityCare Diagnostic Laboratory)
- Other hospital organization (Metro General Hospital)

### Appointment Data

- Mix of historical appointments (past 2 years)
- Current/future appointments (next 90 days)
- Properly linked to encounters and patients
- Realistic appointment spacing

## Updating Data

To regenerate all data with fresh realistic values:

```bash
node generate-comprehensive-data.js
```

This will overwrite all JSON files with new data. Make sure to backup existing data if needed.

## Notes

- All IDs are UUIDs for proper FHIR compliance
- Resources are linked using proper FHIR references
- Dates are realistic and span the past 2 years plus future appointments
- All medical codes use standard terminologies (SNOMED, LOINC, RxNorm)
- PDF attachments are minimal but valid PDFs that can be opened
- Diagnostic tests are intelligently assigned based on patient disease categories
