// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { getDisplayString, getReferenceString } from '@medplum/core';
import type { CodeableConcept, Identifier, Reference, Resource } from '@medplum/fhirtypes';
import { InfoBar, MedplumLink, useResource } from '@medplum/react';
import type { JSX, ReactNode } from 'react';
import { getResourceTypeDisplayName } from '../utils';

const IDENTIFIER_SYSTEM_LABELS: Record<string, string> = {
  'http://hospital.com/organization-id':       'Organization ID',
  'http://hospital.com/patient-id':            'Patient ID',
  'http://hospital.example.com/patient-id':    'Patient ID',
  'http://hospital.com/appointment-id':        'Appointment ID',
  'http://hospital.com/encounter-id':          'Consultation ID',
  'http://hospital.com/condition-id':          'Diagnosis ID',
  'http://hospital.com/diagnostic-report-id': 'Report ID',
  'http://medical-council.example.com':        'Doctor ID',
  'http://nursing-council.example.com':        'Nurse ID',
  'http://lab-council.example.com':            'Practitioner ID',
};

const HIDE_TYPE_IN_HEADER = new Set(['Condition']);

function identifierLabel(system: string | undefined): string {
  if (!system) return 'ID';
  return IDENTIFIER_SYSTEM_LABELS[system] ?? system;
}

export interface ResourceHeaderProps {
  readonly resource: Resource | Reference;
}

export function ResourceHeader(props: ResourceHeaderProps): JSX.Element | null {
  const resource = useResource(props.resource as Reference | Partial<Resource> | undefined);
  if (!resource) {
    return null;
  }

  const entries: { key: string; value: string | ReactNode | undefined }[] = [];
  if (!HIDE_TYPE_IN_HEADER.has(resource.resourceType)) {
    entries.push({
      key: 'Type',
      value: (
        <MedplumLink to={`/${resource.resourceType}`}>{getResourceTypeDisplayName(resource.resourceType)}</MedplumLink>
      ),
    });
  }

  function addEntry(key: string | undefined, value: string | undefined): void {
    if (key && value) {
      entries.push({ key, value });
    }
  }

  function addIdentifier(identifier: Identifier | undefined): void {
    if (identifier?.value) {
      addEntry(identifierLabel(identifier.system), identifier.value);
    }
  }

  function addConcept(key: string, concept: CodeableConcept[] | CodeableConcept | string[] | string | undefined): void {
    if (Array.isArray(concept)) {
      concept.forEach((c) => addConcept(key, c));
    } else if (typeof concept === 'string') {
      addEntry(key, concept);
    } else if (concept) {
      if (Array.isArray(concept.coding)) {
        addEntry(key, concept.coding.map((c) => c.display || c.code).join(', '));
      } else {
        addEntry(key, concept.text);
      }
    }
  }

  if ('name' in resource) {
    const name = getDisplayString(resource);
    if (name !== getReferenceString(resource)) {
      addEntry('Name', name);
    }
  }

  if ('category' in resource && resource.category) {
    addConcept('Category', resource.category as CodeableConcept[] | CodeableConcept | string[] | string | undefined);
  }

  if (resource.resourceType !== 'Bot' && 'code' in resource && resource.code) {
    addConcept('Code', resource.code as CodeableConcept[] | CodeableConcept | string[] | string | undefined);
  }

  if ('identifier' in resource && resource.identifier) {
    if (Array.isArray(resource.identifier)) {
      resource.identifier.forEach((id) => addIdentifier(id as Identifier | undefined));
    } else {
      addIdentifier(resource.identifier as Identifier | undefined);
    }
  }

  if (entries.length === 1) {
    // If no other names or identifiers were found,
    // then at least show the resource ID
    entries.push({ key: 'ID', value: resource.id });
  }

  return (
    <InfoBar>
      {entries.map((entry, index) => (
        <InfoBar.Entry key={`${entry.key}-${index}`}>
          <InfoBar.Key>{entry.key}</InfoBar.Key>
          <InfoBar.Value>{entry.value}</InfoBar.Value>
        </InfoBar.Entry>
      ))}
    </InfoBar>
  );
}
