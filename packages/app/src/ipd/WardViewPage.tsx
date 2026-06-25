// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Badge, Box, Group, Paper, SegmentedControl, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconAlertTriangle, IconBed, IconClock } from '@tabler/icons-react';
import type { JSX } from 'react';
import { useState } from 'react';

const WARD_PATIENTS: Record<string, {
  bed: string; patient: string; age: number; dayOfStay: number;
  doctor: string; diagnosis: string;
  status: 'stable' | 'critical' | 'improving' | 'observation';
  lastVitals: string; alerts: string[];
}[]> = {
  General: [
    { bed: 'GW-101', patient: 'Rajesh Kumar',  age: 62, dayOfStay: 3, doctor: 'Dr. Anil Sharma',  diagnosis: 'Pneumonia',          status: 'stable',      lastVitals: '2h ago',  alerts: [] },
    { bed: 'GW-108', patient: 'Arjun Nair',    age: 29, dayOfStay: 5, doctor: 'Dr. Anil Sharma',  diagnosis: 'Typhoid Fever',      status: 'improving',   lastVitals: '4h ago',  alerts: ['Discharge today'] },
    { bed: 'GW-115', patient: 'Sunita Verma',  age: 58, dayOfStay: 6, doctor: 'Dr. Anil Sharma',  diagnosis: 'COPD Exacerbation',  status: 'stable',      lastVitals: '3h ago',  alerts: [] },
    { bed: 'GW-119', patient: 'Aryan Desai',   age: 41, dayOfStay: 1, doctor: 'Dr. Ravi Mehta',   diagnosis: 'Acute Gastroenteritis', status: 'observation', lastVitals: '1h ago', alerts: ['Vitals overdue'] },
    { bed: 'GW-122', patient: 'Kiran Rao',     age: 34, dayOfStay: 1, doctor: 'Dr. Ravi Mehta',   diagnosis: 'Viral Fever',        status: 'observation', lastVitals: '2h ago',  alerts: [] },
  ],
  ICU: [
    { bed: 'ICU-02', patient: 'Priya Patel',   age: 54, dayOfStay: 1, doctor: 'Dr. Meena Gupta',  diagnosis: 'Cardiac Failure',    status: 'critical',    lastVitals: '30m ago', alerts: ['Continuous monitoring'] },
    { bed: 'ICU-05', patient: 'Lakshmi Iyer',  age: 67, dayOfStay: 2, doctor: 'Dr. Meena Gupta',  diagnosis: 'Ischemic Stroke',    status: 'critical',    lastVitals: '1h ago',  alerts: ['Medication due'] },
    { bed: 'ICU-08', patient: 'Vivek Tiwari',  age: 71, dayOfStay: 4, doctor: 'Dr. Meena Gupta',  diagnosis: 'Sepsis',             status: 'observation', lastVitals: '2h ago',  alerts: [] },
  ],
  Surgical: [
    { bed: 'SW-205', patient: 'Mohan Singh',   age: 48, dayOfStay: 2, doctor: 'Dr. Raj Verma',    diagnosis: 'Post-op: Appendectomy',    status: 'stable',    lastVitals: '3h ago', alerts: [] },
    { bed: 'SW-208', patient: 'Neha Joshi',    age: 38, dayOfStay: 1, doctor: 'Dr. Raj Verma',    diagnosis: 'Post-op: Cholecystectomy', status: 'stable',    lastVitals: '2h ago', alerts: ['Wound check due'] },
    { bed: 'SW-210', patient: 'Ritu Sharma',   age: 45, dayOfStay: 4, doctor: 'Dr. Raj Verma',    diagnosis: 'Post-op: Hernia Repair',   status: 'improving', lastVitals: '4h ago', alerts: ['Discharge today'] },
  ],
  Maternity: [
    { bed: 'MW-303', patient: 'Kavita Shah',   age: 28, dayOfStay: 1, doctor: 'Dr. Sunita Rao',   diagnosis: 'Post-partum Recovery', status: 'stable',    lastVitals: '2h ago', alerts: [] },
    { bed: 'MW-307', patient: 'Anita Pillai',  age: 31, dayOfStay: 2, doctor: 'Dr. Sunita Rao',   diagnosis: 'C-Section Recovery',   status: 'stable',    lastVitals: '3h ago', alerts: [] },
  ],
  Pediatric: [
    { bed: 'PW-402', patient: 'Deepak Mehta',  age: 9,  dayOfStay: 2, doctor: 'Dr. Priya Das',    diagnosis: 'Dengue Fever',         status: 'observation', lastVitals: '2h ago', alerts: [] },
    { bed: 'PW-406', patient: 'Meera Nair',    age: 5,  dayOfStay: 3, doctor: 'Dr. Priya Das',    diagnosis: 'Viral Bronchitis',     status: 'improving',   lastVitals: '3h ago', alerts: [] },
  ],
};

const STATUS_CONFIG = {
  critical:    { color: 'red',    label: 'Critical'    },
  stable:      { color: 'green',  label: 'Stable'      },
  improving:   { color: 'teal',   label: 'Improving'   },
  observation: { color: 'orange', label: 'Observation' },
};

export function WardViewPage(): JSX.Element {
  const [ward, setWard] = useState('General');
  const patients = WARD_PATIENTS[ward] ?? [];
  const critical = patients.filter((p) => p.status === 'critical').length;
  const withAlerts = patients.filter((p) => p.alerts.length > 0).length;

  return (
    <Stack p="md" gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>Ward View</Title>
          <Text size="sm" c="dimmed" mt={2}>Nursing station — real-time patient status per ward</Text>
        </div>
        {critical > 0 && (
          <Badge color="red" size="lg" leftSection={<IconAlertTriangle size={14} />}>
            {critical} Critical
          </Badge>
        )}
      </Group>

      {/* Ward selector */}
      <SegmentedControl
        value={ward}
        onChange={setWard}
        data={Object.keys(WARD_PATIENTS).map((w) => ({
          label: `${w} (${WARD_PATIENTS[w].length})`,
          value: w,
        }))}
      />

      {/* Alert banner */}
      {withAlerts > 0 && (
        <Box p="sm" style={{ background: 'var(--mantine-color-orange-0)', borderRadius: 8, border: '1px solid var(--mantine-color-orange-3)' }}>
          <Group gap="xs">
            <IconAlertTriangle size={16} color="var(--mantine-color-orange-6)" />
            <Text size="sm" c="orange.7" fw={500}>
              {withAlerts} patient{withAlerts > 1 ? 's' : ''} in {ward} Ward have pending tasks or alerts
            </Text>
          </Group>
        </Box>
      )}

      {/* Patient cards */}
      <Stack gap="sm">
        {patients.map((p) => {
          const cfg = STATUS_CONFIG[p.status];
          return (
            <Paper key={p.bed} p="md" radius="md" withBorder
              style={{ borderLeft: `4px solid var(--mantine-color-${cfg.color}-5)` }}>
              <Group justify="space-between" wrap="nowrap">

                <Group gap="md" wrap="nowrap">
                  <ThemeIcon color={cfg.color} variant="light" size="xl" radius="md">
                    <IconBed size={20} />
                  </ThemeIcon>
                  <Stack gap={2}>
                    <Group gap="xs">
                      <Text fw={700} ff="monospace" size="sm">{p.bed}</Text>
                      <Text fw={600}>{p.patient}</Text>
                      <Text size="sm" c="dimmed">{p.age}y</Text>
                    </Group>
                    <Text size="sm" c="dimmed">{p.diagnosis}</Text>
                    <Text size="xs" c="dimmed">{p.doctor} · Day {p.dayOfStay} of stay</Text>
                  </Stack>
                </Group>

                <Group gap="sm" wrap="nowrap">
                  {p.alerts.map((alert) => (
                    <Badge key={alert} color="orange" variant="light" size="sm"
                      leftSection={<IconAlertTriangle size={10} />}>
                      {alert}
                    </Badge>
                  ))}
                  <Group gap={4}>
                    <IconClock size={12} color="var(--mantine-color-gray-5)" />
                    <Text size="xs" c="dimmed">{p.lastVitals}</Text>
                  </Group>
                  <Badge color={cfg.color} variant="light">{cfg.label}</Badge>
                </Group>

              </Group>
            </Paper>
          );
        })}
      </Stack>

      <Box p="sm" style={{ background: 'var(--mantine-color-blue-0)', borderRadius: 8, border: '1px solid var(--mantine-color-blue-2)' }}>
        <Text size="sm" c="blue.7">
          <strong>Coming soon:</strong> Live data from FHIR Encounters, real-time vitals alerts, medication administration reminders, and one-click access to patient inpatient chart.
        </Text>
      </Box>
    </Stack>
  );
}
