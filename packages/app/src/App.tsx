// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Space } from '@mantine/core';
import type { WithId } from '@medplum/core';
import { MEDPLUM_VERSION } from '@medplum/core';
import type { UserConfiguration } from '@medplum/fhirtypes';
import type { NavbarMenu } from '@medplum/react';
import { AppShell, Loading, useMedplum } from '@medplum/react';
import {
  IconBrandAsana,
  IconBuilding,
  IconCalendar,
  IconDatabase,
  IconForms,
  IconId,
  IconLock,
  IconLockAccess,
  IconMicroscope,
  IconPackages,
  IconReceipt,
  IconReportMedical,
  IconStar,
  IconWebhook,
} from '@tabler/icons-react';
import type { FunctionComponent, JSX } from 'react';
import { Suspense } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import AppLogo from '../../assets/AppLogo.avif';
import { AppRoutes } from './AppRoutes';

import './App.css';

export function App(): JSX.Element {
  const medplum = useMedplum();
  const config = medplum.getUserConfiguration();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  if (medplum.isLoading()) {
    return <Loading />;
  }

  return (
    <AppShell
      logo={<img src={AppLogo} alt="Logo" style={{ height: 24 }} />}
      pathname={location.pathname}
      searchParams={searchParams}
      version={MEDPLUM_VERSION}
      menus={userConfigToMenu(config as WithId<UserConfiguration> | undefined)}
      displayAddBookmark={!!config?.id}
    >
      <Suspense fallback={<Loading />}>
        <AppRoutes />
      </Suspense>
    </AppShell>
  );
}

function userConfigToMenu(config: UserConfiguration | undefined): NavbarMenu[] {
  const adminMenuTitles = ['Admin', 'Super Admin'];

  const result =
    config?.menu
      ?.filter((menu) => !adminMenuTitles.includes(menu.title || ''))
      .map((menu) => ({
        title: menu.title,
        links:
          menu.link?.map((link) => {
            // Customize label for ServiceRequest to show as "Diagnostic Request"
            let label = link.name;
            const target = link.target as string;
            if (target?.includes('/ServiceRequest')) {
              label = 'Diagnostic Request';
            }
            return {
              label,
              href: target,
              icon: getIcon(target),
            };
          }) || [],
      })) || [];

  result.push({
    title: 'Settings',
    links: [
      {
        label: 'Security',
        href: '/security',
        icon: <IconLock />,
      },
    ],
  });

  return result;
}

const resourceTypeToIcon: Record<string, FunctionComponent> = {
  Patient: IconStar,
  Practitioner: IconId,
  Organization: IconBuilding,
  ServiceRequest: IconReceipt,
  DiagnosticReport: IconReportMedical,
  Questionnaire: IconForms,
  admin: IconBrandAsana,
  AccessPolicy: IconLockAccess,
  Subscription: IconWebhook,
  batch: IconPackages,
  Observation: IconMicroscope,
  Appointment: IconCalendar,
};

function getIcon(to: string): JSX.Element | undefined {
  if (to.includes('admin/super/db')) {
    return <IconDatabase />;
  }
  try {
    const resourceType = new URL(to, 'https://app.medplum.com').pathname.split('/')[1];
    if (resourceType in resourceTypeToIcon) {
      const Icon = resourceTypeToIcon[resourceType];
      return <Icon />;
    }
  } catch (_err) {
    // Ignore
  }
  return <Space w={30} />;
}
