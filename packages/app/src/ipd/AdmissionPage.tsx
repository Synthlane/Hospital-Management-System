// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Badge, Box, Button, Group, Paper, ScrollArea, Stack, Table, Text, Title } from '@mantine/core';
import { IconClipboardPlus } from '@tabler/icons-react';
import type { JSX } from 'react';

const ADMISSIONS = [
  { id: 'IPD-2024-001', patient: 'Priya Patel',    age: 54, ward: 'ICU',      bed: 'ICU-02', doctor: 'Dr. Meena Gupta',  reason: 'Cardiac Failure',       type: 'Emergency', date: 'Today, 7:40 AM',        status: 'admitted' },
  { id: 'IPD-2024-002', patient: 'Kiran Rao',      age: 34, ward: 'General',  bed: 'GW-122', doctor: 'Dr. Ravi Mehta',   reason: 'Viral Fever',           type: 'Direct',    date: 'Today, 9:15 AM',        status: 'admitted' },
  { id: 'IPD-2024-003', patient: 'Kavita Shah',    age: 28, ward: 'Maternity',bed: 'MW-303', doctor: 'Dr. Sunita Rao',   reason: 'Post-partum Recovery',  type: 'Elective',  date: 'Today, 6:00 AM',        status: 'admitted' },
  { id: 'IPD-2024-004', patient: 'Aryan Desai',    age: 41, ward: 'General',  bed: 'GW-119', doctor: 'Dr. Anil Sharma',  reason: 'Acute Gastroenteritis', type: 'Emergency', date: 'Yesterday, 11:30 PM',   status: 'admitted' },
  { id: 'IPD-2024-005', patient: 'Neha Joshi',     age: 38, ward: 'Surgical', bed: 'SW-208', doctor: 'Dr. Raj Verma',    reason: 'Elective Cholecystectomy', type: 'Elective', date: 'Yesterday, 8:00 PM',  status: 'admitted' },
  { id: 'IPD-2023-098', patient: 'Rajesh Kumar',   age: 62, ward: 'General',  bed: 'GW-101', doctor: 'Dr. Anil Sharma',  reason: 'Pneumonia',             type: 'OPD Referral', date: '3 days ago',         status: 'admitted' },
  { id: 'IPD-2023-097', patient: 'Lakshmi Iyer',   age: 67, ward: 'ICU',      bed: 'ICU-05', doctor: 'Dr. Meena Gupta',  reason: 'Ischemic Stroke',       type: 'Emergency', date: '2 days ago',            status: 'admitted' },
  { id: 'IPD-2023-091', patient: 'Sunita Verma',   age: 58, ward: 'General',  bed: 'GW-115', doctor: 'Dr. Anil Sharma',  reason: 'COPD Exacerbation',     type: 'Emergency', date: '6 days ago',            status: 'admitted' },
  { id: 'IPD-2023-088', patient: 'Arjun Nair',     age: 29, ward: 'General',  bed: 'GW-108', doctor: 'Dr. Anil Sharma',  reason: 'Typhoid Fever',         type: 'OPD Referral', date: '5 days ago',         status: 'discharge-pending' },
  { id: 'IPD-2023-085', patient: 'Ritu Sharma',    age: 45, ward: 'Surgical', bed: 'SW-210', doctor: 'Dr. Raj Verma',    reason: 'Post-op: Hernia Repair',type: 'Elective',  date: '4 days ago',            status: 'discharge-pending' },
];

const TYPE_COLORS: Record<string, string> = {
  Emergency: 'red', Elective: 'blue', Direct: 'gray', 'OPD Referral': 'violet',
};

export function AdmissionPage(): JSX.Element {
  return (
    <Stack p="md" gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>IPD Admissions</Title>
          <Text size="sm" c="dimmed" mt={2}>Manage patient admissions and track current inpatients</Text>
        </div>
        <Button leftSection={<IconClipboardPlus size={16} />} color="blue">
          Admit Patient
        </Button>
      </Group>

      {/* Summary strip */}
      <Group gap="md">
        {[
          { label: 'Currently Admitted', value: 8,  color: 'blue'  },
          { label: 'Pending Discharge',  value: 2,  color: 'teal'  },
          { label: "Today's Admissions", value: 3,  color: 'violet'},
          { label: 'Emergency Today',    value: 1,  color: 'red'   },
        ].map((s) => (
          <Paper key={s.label} p="md" radius="md" withBorder style={{ minWidth: 140 }}>
            <Text size="xs" c="dimmed">{s.label}</Text>
            <Text size="xl" fw={700} c={s.color}>{s.value}</Text>
          </Paper>
        ))}
      </Group>

      {/* Admissions table */}
      <Paper p="md" radius="md" withBorder>
        <Text fw={600} mb="sm">All Current Admissions</Text>
        <ScrollArea>
          <Table striped highlightOnHover style={{ minWidth: 860 }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>IPD No.</Table.Th>
                <Table.Th>Patient</Table.Th>
                <Table.Th>Age</Table.Th>
                <Table.Th>Ward / Bed</Table.Th>
                <Table.Th>Admitting Doctor</Table.Th>
                <Table.Th>Reason</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Admitted On</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {ADMISSIONS.map((a) => (
                <Table.Tr key={a.id}>
                  <Table.Td><Text size="sm" fw={600} ff="monospace" c="blue">{a.id}</Text></Table.Td>
                  <Table.Td><Text size="sm" fw={500}>{a.patient}</Text></Table.Td>
                  <Table.Td><Text size="sm">{a.age}y</Text></Table.Td>
                  <Table.Td>
                    <Stack gap={0}>
                      <Text size="sm">{a.ward}</Text>
                      <Text size="xs" c="dimmed" ff="monospace">{a.bed}</Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td><Text size="sm">{a.doctor}</Text></Table.Td>
                  <Table.Td><Text size="sm">{a.reason}</Text></Table.Td>
                  <Table.Td>
                    <Badge color={TYPE_COLORS[a.type] ?? 'gray'} size="sm" variant="light">{a.type}</Badge>
                  </Table.Td>
                  <Table.Td><Text size="sm" c="dimmed">{a.date}</Text></Table.Td>
                  <Table.Td>
                    {a.status === 'discharge-pending'
                      ? <Badge color="teal" size="sm" variant="light">Discharge Pending</Badge>
                      : <Badge color="green" size="sm" variant="dot">Admitted</Badge>}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>

      <Box p="sm" style={{ background: 'var(--mantine-color-blue-0)', borderRadius: 8, border: '1px solid var(--mantine-color-blue-2)' }}>
        <Text size="sm" c="blue.7">
          <strong>Coming soon:</strong> Admit Patient form — search patients, assign bed, set admission type, link OPD encounter, generate IPD number.
        </Text>
      </Box>
    </Stack>
  );
}
