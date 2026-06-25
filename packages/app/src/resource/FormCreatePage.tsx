// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Stack, Text } from '@mantine/core';
import { addProfileToResource } from '@medplum/core';
import type { OperationOutcome, Patient, Resource } from '@medplum/fhirtypes';
import type { SupportedProfileStructureDefinition } from '@medplum/react';
import { Document, ResourceForm } from '@medplum/react';
import type { JSX } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router';
import { ProfileTabs } from './ProfileTabs';
import { useCreateResource } from './useCreateResource';
import { cleanResource } from './utils';

const PATIENT_ID_SYSTEM = 'http://hospital.com/patient-id';

// Uses the last 6 digits of the millisecond timestamp — unique enough for any
// realistic patient volume and requires zero database round-trips.
function generatePatientId(): string {
  return `PAT-${String(Date.now()).slice(-6)}`;
}

export function FormCreatePage(): JSX.Element {
  const { resourceType } = useParams();
  const location = useLocation();
  const [outcome, setOutcome] = useState<OperationOutcome | undefined>();
  const { defaultValue, handleSubmit } = useCreateResource(resourceType, setOutcome);
  const [currentProfile, setCurrentProfile] = useState<SupportedProfileStructureDefinition | undefined>();

  const isProfilesPage = location.pathname.toLowerCase().endsWith('profiles');
  const isPatient = resourceType === 'Patient';

  // Generate once per form session so the same ID is shown and submitted.
  const patientDefaultValue = useMemo<Resource>(() => {
    if (!isPatient) return defaultValue;
    return {
      ...defaultValue,
      identifier: [{ system: PATIENT_ID_SYSTEM, value: generatePatientId() }],
    } as Patient;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPatient]); // intentionally omit defaultValue — we only want one stable ID per form open

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
          defaultValue={isPatient ? patientDefaultValue : defaultValue}
          onSubmit={handleSubmit}
          outcome={outcome}
          readonlyFields={isPatient ? ['identifier'] : undefined}
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
