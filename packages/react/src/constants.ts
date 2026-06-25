// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
export const DEFAULT_IGNORED_PROPERTIES = ['meta', 'implicitRules', 'contained', 'extension', 'modifierExtension'];

// Ignored only when they are top-level properties (path depth === 2, e.g. Patient.id)
// e.g. Patient.language is ignored, but Patient.communication.language is not ignored
export const DEFAULT_IGNORED_NON_NESTED_PROPERTIES = ['language', 'text', 'id'];

export const RESOURCE_IGNORED_PROPERTIES: Record<string, string[]> = {
  ServiceRequest: [
    'instantiatesCanonical', // URL pointer to a FHIR protocol/guideline — backend config only
    'instantiatesUri',       // URL pointer to an external protocol — backend config only
  ],
  MedicationRequest: [
    'instantiatesCanonical', // URL pointer to a FHIR protocol/guideline — backend config only
    'instantiatesUri',       // URL pointer to an external protocol — backend config only
  ],
  Organization: [
    'endpoint', // API/service endpoint URLs — developer infrastructure only
  ],
};
