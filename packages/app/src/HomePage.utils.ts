// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import type { Filter, MedplumClient, SearchRequest, SortRule } from '@medplum/core';
import { convertToTransactionBundle, DEFAULT_SEARCH_COUNT, formatSearchQuery, Operator } from '@medplum/core';
import type { Bundle, ResourceType, UserConfiguration } from '@medplum/fhirtypes';

/** Custom navigation paths when the user clicks New... */
export const RESOURCE_TYPE_CREATION_PATHS: Partial<Record<ResourceType, string>> = {
  Bot: '/admin/bots/new',
  ClientApplication: '/admin/clients/new',
};

// Keep page size above record count so all records fit one page → lazy Bundle.total is accurate.
const MINIMUM_PAGE_COUNT: Partial<Record<string, number>> = {
  Organization: 200,
  Practitioner: 100,
};

function getDefaultCount(resourceType: string, searchCount: number | undefined): number {
  const minimum = MINIMUM_PAGE_COUNT[resourceType] ?? 0;
  return Math.max(searchCount ?? DEFAULT_SEARCH_COUNT, minimum);
}

// Injects always-on filters that exclude system/admin resources from clinical list views.
function injectPermanentFilters(resourceType: string, filters: Filter[] | undefined): Filter[] | undefined {
  if (resourceType === 'Practitioner') {
    if (!(filters ?? []).some((f) => f.code === 'identifier')) {
      return [...(filters ?? []), { code: 'identifier', operator: Operator.MISSING, value: 'false' }];
    }
  }
  return filters;
}

export function addSearchValues(search: SearchRequest, config: UserConfiguration | undefined): SearchRequest {
  const resourceType = search.resourceType || getDefaultResourceType(config);
  const fields = search.fields ?? getDefaultFields(resourceType);
  const baseFilters = search.filters ?? (!search.resourceType ? getDefaultFilters(resourceType) : undefined);
  const filters = injectPermanentFilters(resourceType, baseFilters);
  const sortRules = search.sortRules ?? getDefaultSortRules(resourceType);
  const offset = search.offset ?? 0;
  const count = getDefaultCount(resourceType, search.count);
  // Force accurate total count for Practitioners so pagination shows the real record count.
  const total = resourceType === 'Practitioner' ? ('accurate' as const) : search.total;

  return {
    ...search,
    resourceType,
    fields,
    filters,
    sortRules,
    offset,
    count,
    total,
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
    // 'subject' is FHIR R5-only on Appointment; R4 uses the 'patient' search parameter.
    // Evict the stale cache entry so the correct default ('patient') loads instead.
    if (resourceType === 'Appointment' && lastSearch.fields.includes('subject')) {
      localStorage.removeItem(`${resourceType}-defaultSearch`);
    } else {
      return lastSearch.fields;
    }
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
      fields.push('patient', 'start', 'end', 'status', 'description', 'practitioner', '_lastUpdated');
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
