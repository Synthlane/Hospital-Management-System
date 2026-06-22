// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import type { Filter, MedplumClient, SearchRequest, SortRule } from '@medplum/core';
import { convertToTransactionBundle, DEFAULT_SEARCH_COUNT, formatSearchQuery } from '@medplum/core';
import type { Bundle, ResourceType, UserConfiguration } from '@medplum/fhirtypes';

/** Custom navigation paths when the user clicks New... */
export const RESOURCE_TYPE_CREATION_PATHS: Partial<Record<ResourceType, string>> = {
  Bot: '/admin/bots/new',
  ClientApplication: '/admin/clients/new',
};

export function addSearchValues(search: SearchRequest, config: UserConfiguration | undefined): SearchRequest {
  const resourceType = search.resourceType || getDefaultResourceType(config);
  const fields = search.fields ?? getDefaultFields(resourceType);
  const filters = search.filters ?? (!search.resourceType ? getDefaultFilters(resourceType) : undefined);
  const sortRules = search.sortRules ?? getDefaultSortRules(resourceType);
  const offset = search.offset ?? 0;
  const count = search.count ?? DEFAULT_SEARCH_COUNT;

  return {
    ...search,
    resourceType,
    fields,
    filters,
    sortRules,
    offset,
    count,
  };
}

function getDefaultResourceType(config: UserConfiguration | undefined): string {
  return (
    localStorage.getItem('defaultResourceType') ??
    config?.option?.find((o) => o.id === 'defaultResourceType')?.valueString ??
    'Patient'
  );
}

export function getDefaultFields(resourceType: string): string[] {
  const lastSearch = getLastSearch(resourceType);
  if (lastSearch?.fields) {
    return lastSearch.fields;
  }
  const fields = [];
  switch (resourceType) {
    case 'Patient':
      fields.push('name', 'birthDate', 'gender', 'telecom', 'address', 'active', 'managingOrganization');
      break;
    case 'AsyncJob':
      fields.push('id', '_lastUpdated', 'status', 'dataVersion');
      break;
    case 'AccessPolicy':
      fields.push('id', '_lastUpdated');
      break;
    case 'Appointment':
      fields.push('subject', 'start', 'end', 'status', 'description', '_lastUpdated');
      break;
    case 'Bot':
      fields.push('id', '_lastUpdated');
      break;
    case 'ClientApplication':
      fields.push('id', '_lastUpdated');
      break;
    case 'Practitioner':
      fields.push('name', 'gender', 'qualification-code', 'address', 'telecom', 'active');
      break;
    case 'Project':
      fields.push('id', '_lastUpdated');
      break;
    case 'Organization':
      fields.push('name', 'partOf', 'address', 'telecom', 'active', '_lastUpdated');
      break;
    case 'Questionnaire':
      fields.push('title', 'description', 'subjectType', 'status', '_lastUpdated');
      break;
    case 'UserConfiguration':
      fields.push('id', '_lastUpdated', 'name');
      break;
    case 'CodeSystem':
      fields.push('id', '_lastUpdated');
      break;
    case 'ValueSet':
      fields.push('id', '_lastUpdated', 'name', 'title', 'status');
      break;
    case 'Condition':
      fields.push('subject', 'code', 'category', 'clinicalStatus', 'onsetDateTime');
      break;
    case 'Device':
      fields.push('id', '_lastUpdated', 'manufacturer', 'deviceName', 'patient');
      break;
    case 'DeviceDefinition':
      fields.push('id', '_lastUpdated', 'manufacturer[x]', 'deviceName');
      break;
    case 'DeviceRequest':
      fields.push('id', '_lastUpdated', 'code[x]', 'subject');
      break;
    case 'DiagnosticReport':
      fields.push('subject', 'code', 'effectiveDateTime', 'status', 'performer', 'conclusion', '_lastUpdated');
      break;
    case 'Observation':
      fields.push('id', '_lastUpdated', 'subject', 'code', 'status');
      break;
    case 'Encounter':
      fields.push('subject', 'participant', 'status', 'period', '_lastUpdated');
      break;
    case 'MedicationRequest':
      fields.push('subject', 'medication', 'status', 'authoredOn', 'requester');
      break;
    case 'Coverage':
      fields.push('subscriber', 'payor', 'type', 'status', 'period');
      break;
    case 'Procedure':
      fields.push('subject', 'code', 'status', 'performedDateTime', 'performer');
      break;
    case 'ServiceRequest':
      fields.push('subject', 'code', 'status', 'priority', 'authoredOn', 'requester', 'insurance');
      break;
    case 'Subscription':
      fields.push('id', '_lastUpdated', 'criteria');
      break;
    case 'User':
      fields.push('id', '_lastUpdated', 'email');
      break;
  }
  return fields.length > 0 ? fields : ['id', '_lastUpdated'];
}

function getDefaultFilters(resourceType: string): Filter[] | undefined {
  const lastSearchFilters = getLastSearch(resourceType)?.filters;
  return lastSearchFilters;
}

function getDefaultSortRules(resourceType: string): SortRule[] {
  const lastSearch = getLastSearch(resourceType);
  if (lastSearch?.sortRules) {
    return lastSearch.sortRules;
  }
  return [{ code: '_lastUpdated', descending: true }];
}

function getLastSearch(resourceType: string): SearchRequest | undefined {
  const value = localStorage.getItem(resourceType + '-defaultSearch');
  return value ? (JSON.parse(value) as SearchRequest) : undefined;
}

export function saveLastSearch(search: SearchRequest): void {
  localStorage.setItem('defaultResourceType', search.resourceType);
  localStorage.setItem(search.resourceType + '-defaultSearch', JSON.stringify(search));
}

export async function getTransactionBundle(search: SearchRequest, medplum: MedplumClient): Promise<Bundle> {
  const transactionBundleSearch: SearchRequest = {
    ...search,
    count: 1000,
    offset: 0,
  };
  const userConfig = medplum.getUserConfiguration();
  const transactionBundleSearchValues = addSearchValues(
    transactionBundleSearch,
    userConfig as unknown as UserConfiguration | undefined
  );
  const bundle = await medplum.search(
    transactionBundleSearchValues.resourceType as ResourceType,
    formatSearchQuery({ ...transactionBundleSearchValues, total: 'accurate', fields: undefined })
  );
  return convertToTransactionBundle(bundle) as unknown as Bundle;
}
