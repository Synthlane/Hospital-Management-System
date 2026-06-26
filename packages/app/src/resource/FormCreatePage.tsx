// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Stack, Text } from '@mantine/core';
import { addProfileToResource } from '@medplum/core';
import type { OperationOutcome, Resource } from '@medplum/fhirtypes';
import type { SupportedProfileStructureDefinition } from '@medplum/react';
import { Document, ResourceForm } from '@medplum/react';
import type { JSX } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router';
import { ProfileTabs } from './ProfileTabs';
import { useCreateResource } from './useCreateResource';
import { cleanResource } from './utils';

// Resource types that receive a system-assigned identifier on creation.
const AUTO_ID_CONFIG: Record<string, { system: string; prefix: string }> = {
  Patient:      { system: 'http://hospital.com/patient-id',      prefix: 'PAT' },
  Organization: { system: 'http://hospital.com/organization-id', prefix: 'ORG' },
  Appointment:  { system: 'http://hospital.com/appointment-id',  prefix: 'APT' },
  Encounter:    { system: 'http://hospital.com/encounter-id',    prefix: 'CON' },
  Condition:        { system: 'http://hospital.com/condition-id',          prefix: 'DGN' },
  DiagnosticReport: { system: 'http://hospital.com/diagnostic-report-id',  prefix: 'RPT' },
};

// Last 6 digits of the ms timestamp — unique enough for realistic volumes, no DB round-trip.
function generateId(prefix: string): string {
  return `${prefix}-${String(Date.now()).slice(-6)}`;
}

export function FormCreatePage(): JSX.Element {
  const { resourceType } = useParams();
  const location = useLocation();
  const [outcome, setOutcome] = useState<OperationOutcome | undefined>();
  const { defaultValue, handleSubmit } = useCreateResource(resourceType, setOutcome);
  const [currentProfile, setCurrentProfile] = useState<SupportedProfileStructureDefinition | undefined>();

  const isProfilesPage = location.pathname.toLowerCase().endsWith('profiles');
  const autoId = AUTO_ID_CONFIG[resourceType ?? ''];

  // Generate once per form session so the same ID is shown and submitted.
  const seededDefaultValue = useMemo<Resource>(() => {
    if (!autoId) return defaultValue;
    return { ...defaultValue, identifier: [{ system: autoId.system, value: generateId(autoId.prefix) }] } as Resource;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceType]); // intentionally omit defaultValue — one stable ID per form open

  const onProfileSubmit = useCallback(
    (resource: Resource): void => {
      const cleanedResource = cleanResource(resource);
      if (currentProfile) {
        addProfileToResource(cleanedResource, currentProfile.url);
      }
      handleSubmit(cleanedResource);
    },
    [currentProfile, handleSubmit]
  );

  if (!isProfilesPage) {
    return (
      <Document>
        <ResourceForm
          defaultValue={seededDefaultValue}
          onSubmit={handleSubmit}
          outcome={outcome}
          readonlyFields={autoId ? ['identifier'] : undefined}
        />
      </Document>
    );
  }

  return (
    <Document>
      <Stack>
        <ProfileTabs resource={defaultValue} currentProfile={currentProfile} onChange={setCurrentProfile} />
        {currentProfile ? (
          <ResourceForm
            key={currentProfile.url}
            defaultValue={defaultValue}
            onSubmit={onProfileSubmit}
            outcome={outcome}
            profileUrl={currentProfile.url}
          />
        ) : (
          <Text my="lg" fz="lg" fs="italic" ta="center">
            Select a profile above
          </Text>
        )}
      </Stack>
    </Document>
  );
}
