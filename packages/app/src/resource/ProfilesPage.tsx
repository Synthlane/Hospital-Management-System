// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Button, Group, Stack, Switch, Text, Title } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import {
  addProfileToResource,
  deepClone,
  normalizeErrorString,
  normalizeOperationOutcome,
  removeProfileFromResource,
} from '@medplum/core';
import type { OperationOutcome, Resource, ResourceType } from '@medplum/fhirtypes';
import type { SupportedProfileStructureDefinition } from '@medplum/react';
import { Document, ResourceForm, useMedplum } from '@medplum/react';
import type { FC, JSX } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { getResourceTypeDisplayName } from '../utils';
import { ProfileTabs } from './ProfileTabs';
import { cleanResource } from './utils';

export function ProfilesPage(): JSX.Element | null {
  const medplum = useMedplum();
  const { resourceType, id } = useParams() as { resourceType: ResourceType; id: string };
  const [resource, setResource] = useState<Resource | undefined>();
  const [currentProfile, setCurrentProfile] = useState<SupportedProfileStructureDefinition>();

  useEffect(() => {
    medplum
      .readResource(resourceType, id)
      .then((resource) => setResource(deepClone(resource) as Resource))
      .catch((err) => {
        showNotification({ color: 'red', message: normalizeErrorString(err) });
      });
  }, [medplum, resourceType, id]);

  if (!resource) {
    return null;
  }

  return (
    <Document>
      <Title order={2}>Available {getResourceTypeDisplayName(resourceType)} profiles</Title>
      <Stack>
        <>
          <ProfileTabs resource={resource} currentProfile={currentProfile} onChange={setCurrentProfile} />
          {currentProfile ? (
            <ProfileDetail
              key={currentProfile.url}
              profile={currentProfile}
              resource={resource}
              onResourceUpdated={(newResource) => setResource(newResource)}
            />
          ) : (
            <Text my="lg" fz="lg" fs="italic" ta="center">
              Select a profile above
            </Text>
          )}
        </>
      </Stack>
    </Document>
  );
}

type ProfileDetailProps = {
  readonly profile: SupportedProfileStructureDefinition;
  readonly resource: Resource;
  readonly onResourceUpdated: (newResource: Resource) => void;
};

const ProfileDetail: FC<ProfileDetailProps> = ({ profile, resource, onResourceUpdated }) => {
  const medplum = useMedplum();
  const [outcome, setOutcome] = useState<OperationOutcome | undefined>();
  const [active, setActive] = useState(() => resource.meta?.profile?.includes(profile.url));

  const handleSubmit = useCallback(
    (newResource: Resource): void => {
      setOutcome(undefined);
      const cleanedResource = cleanResource(newResource) as Resource;
      if (active) {
        addProfileToResource(cleanedResource as any, profile.url);
      } else {
        removeProfileFromResource(cleanedResource as any, profile.url);
      }

      medplum
        .updateResource(cleanedResource as any)
        .then((resp) => {
          onResourceUpdated(resp as Resource);
          showNotification({ color: 'green', message: 'Success' });
        })
        .catch((err) => {
          setOutcome(normalizeOperationOutcome(err) as OperationOutcome);
          showNotification({ color: 'red', message: normalizeErrorString(err), autoClose: false });
        });
    },
    [medplum, profile.url, onResourceUpdated, active]
  );

  return (
    <Stack>
      <Switch
        size="md"
        checked={active}
        label={`Conform resource to ${profile.title}`}
        onChange={(e) => setActive(e.currentTarget.checked)}
        data-testid="profile-toggle"
      />
      {active ? (
        <ResourceForm
          profileUrl={profile.url}
          defaultValue={resource as any}
          onSubmit={handleSubmit as any}
          outcome={outcome as any}
        />
      ) : (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(resource);
          }}
        >
          <Group justify="flex-end" mt="xl">
            <Button type="submit">OK</Button>
          </Group>
        </form>
      )}
    </Stack>
  );
};
