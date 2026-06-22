// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Paper, Tabs } from '@mantine/core';
import type { SearchRequest } from '@medplum/core';
import { formatSearchQuery, parseSearchRequest } from '@medplum/core';
import { Loading, SearchControl, useMedplum } from '@medplum/react';
import { IconCalendar, IconList } from '@tabler/icons-react';
import type { JSX } from 'react';
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { addSearchValues, saveLastSearch } from '../HomePage.utils';
import { AppointmentCalendar } from './AppointmentCalendar';

export function AppointmentPage(): JSX.Element {
  const medplum = useMedplum();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') ?? 'calendar';

  const search = useMemo<SearchRequest>(() => {
    // Strip UI-only 'view' param before parsing — it is not a FHIR search param
    const params = new URLSearchParams(searchParams);
    params.delete('view');
    const cleanSearch = params.toString() ? '?' + params.toString() : '';

    const parsedSearch = parseSearchRequest('/Appointment' + cleanSearch);
    const populatedSearch = addSearchValues(parsedSearch, medplum.getUserConfiguration());

    // Remove any stale 'view' filter that may have been cached in localStorage
    const cleanFilters = (populatedSearch.filters ?? []).filter((f) => f.code !== 'view');
    const fhirSearch: SearchRequest = { ...populatedSearch, resourceType: 'Appointment', filters: cleanFilters };

    saveLastSearch(fhirSearch);
    return fhirSearch;
  }, [medplum, searchParams]);

  function switchView(v: string | null): void {
    const next = new URLSearchParams(searchParams);
    if (v && v !== 'calendar') {
      next.set('view', v);
    } else {
      next.delete('view');
    }
    setSearchParams(next);
  }

  function buildViewSuffix(query: string): string {
    if (view === 'calendar') {
      return '';
    }
    return query.includes('?') ? `&view=${view}` : `?view=${view}`;
  }

  const listReady = search.resourceType && search.fields && search.fields.length > 0;

  return (
    <Paper shadow="xs" m="md" p="md">
      <Tabs value={view} onChange={switchView} mb="md">
        <Tabs.List>
          <Tabs.Tab value="calendar" leftSection={<IconCalendar size={14} />}>
            Calendar
          </Tabs.Tab>
          <Tabs.Tab value="list" leftSection={<IconList size={14} />}>
            List
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {view === 'calendar' && <AppointmentCalendar />}

      {view !== 'calendar' && (
        listReady ? (
          <SearchControl
            checkboxesEnabled
            search={search}
            onClick={(e) => navigate(`/Appointment/${e.resource.id}`)?.catch(console.error)}
            onAuxClick={(e) => window.open(`/Appointment/${e.resource.id}`, '_blank')}
            onChange={(e) => {
              const query = formatSearchQuery(e.definition);
              navigate('/Appointment' + query + buildViewSuffix(query))?.catch(console.error);
            }}
            onNew={() => navigate('/Appointment/new')?.catch(console.error)}
          />
        ) : (
          <Loading />
        )
      )}
    </Paper>
  );
}
