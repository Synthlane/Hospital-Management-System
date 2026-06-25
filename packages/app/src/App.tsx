// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Space } from '@mantine/core';
import type { WithId } from '@medplum/core';
import { MEDPLUM_VERSION } from '@medplum/core';
import type { UserConfiguration } from '@medplum/fhirtypes';
import type { NavbarMenu } from '@medplum/react';
import { AppShell, Loading, useMedplum } from '@medplum/react';
import {
  IconBed,
  IconBrandAsana,
  IconBuilding,
  IconCalendar,
  IconClipboardList,
  IconDatabase,
  IconFlask,
  IconForms,
  IconId,
  IconLayoutDashboard,
  IconLock,
  IconLockAccess,
  IconMicroscope,
  IconPackages,
  IconPill,
  IconReceipt,
  IconReportMedical,
  IconStar,
  IconStethoscope,
  IconTestPipe,
  IconVirus,
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

const LABEL_MAP: Record<string, string> = {
  Patient: 'Patients',
  Practitioner: 'Practitioners',
  Organization: 'Organizations',
  Appointment: 'Appointments',
  Encounter: 'Consultations',
  Condition: 'Diagnoses',
  MedicationRequest: 'Prescriptions',
  Questionnaire: 'Questionnaires',
  ServiceRequest: 'Lab Orders',
  DiagnosticReport: 'Lab Results',
  LabPanels: 'Lab Panels',
  LabAssays: 'Lab Assays',
  Observation: 'Observations',
};

function userConfigToMenu(config: UserConfiguration | undefined): NavbarMenu[] {
  const adminMenuTitles = ['Admin', 'Super Admin'];

  const dashboardMenu: NavbarMenu = {
    title: '',
    links: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: <IconLayoutDashboard />,
      },
    ],
  };

  const sectionMenus =
    config?.menu
      ?.filter((menu) => !adminMenuTitles.includes(menu.title || ''))
      .map((menu) => ({
        title: menu.title,
        links:
          menu.link
            ?.filter((link) => (link.name as string) !== 'MedicationRequest')
            .map((link) => {
              const name = link.name as string;
              const target = link.target as string;
              const label = LABEL_MAP[name] ?? name;
              return {
                label,
                href: target,
                icon: getIcon(target, name),
              };
            }) || [],
      })) || [];

  const ipdMenu: NavbarMenu = {
    title: 'IPD',
    links: [
      { label: 'Admissions',  href: '/ipd/admit', icon: <IconClipboardList /> },
      { label: 'Ward View',   href: '/ipd/ward',  icon: <IconStethoscope />   },
      { label: 'Bed Board',   href: '/ipd/beds',  icon: <IconBed />           },
    ],
  };

  const settingsMenu: NavbarMenu = {
    title: 'Settings',
    links: [
      {
        label: 'Security',
        href: '/security',
        icon: <IconLock />,
      },
    ],
  };

  return [dashboardMenu, ...sectionMenus, ipdMenu, settingsMenu];
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
  Encounter: IconStethoscope,
  Condition: IconVirus,
  MedicationRequest: IconPill,
  LabPanels: IconFlask,
  LabAssays: IconTestPipe,
};

function getIcon(to: string, name?: string): JSX.Element | undefined {
  if (to.includes('admin/super/db')) {
    return <IconDatabase />;
  }
  // Match by explicit name first (for non-resource-type routes like LabPanels, LabAssays)
  if (name && name in resourceTypeToIcon) {
    const Icon = resourceTypeToIcon[name];
    return <Icon />;
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
