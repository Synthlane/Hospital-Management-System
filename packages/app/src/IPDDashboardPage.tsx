// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { BarChart } from '@mantine/charts';
import {
  Badge,
  Box,
  Group,
  Paper,
  Progress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import type { JSX } from 'react';

// ── Hardcoded demo data ──────────────────────────────────────────────────────

const WARDS = [
  { name: 'General Ward', code: 'GW', occupied: 32, total: 40, color: 'blue' },
  { name: 'ICU', code: 'ICU', occupied: 8, total: 10, color: 'red' },
  { name: 'Surgical Ward', code: 'SW', occupied: 18, total: 25, color: 'violet' },
  { name: 'Maternity Ward', code: 'MW', occupied: 12, total: 20, color: 'pink' },
  { name: 'Pediatric Ward', code: 'PW', occupied: 14, total: 25, color: 'teal' },
];

const TOTAL_BEDS = WARDS.reduce((s, w) => s + w.total, 0);
const TOTAL_OCCUPIED = WARDS.reduce((s, w) => s + w.occupied, 0);

const ADMITTED_PATIENTS: {
  bed: string;
  patient: string;
  ward: string;
  wardCode: string;
  dayOfStay: number;
  doctor: string;
  diagnosis: string;
  status: 'stable' | 'critical' | 'improving' | 'observation';
}[] = [
  { bed: 'ICU-02', patient: 'Priya Patel', ward: 'ICU', wardCode: 'ICU', dayOfStay: 1, doctor: 'Dr. Meena Gupta', diagnosis: 'Cardiac Failure', status: 'critical' },
  { bed: 'ICU-05', patient: 'Lakshmi Iyer', ward: 'ICU', wardCode: 'ICU', dayOfStay: 2, doctor: 'Dr. Meena Gupta', diagnosis: 'Ischemic Stroke', status: 'critical' },
  { bed: 'GW-101', patient: 'Rajesh Kumar', ward: 'General', wardCode: 'GW', dayOfStay: 3, doctor: 'Dr. Anil Sharma', diagnosis: 'Pneumonia', status: 'stable' },
  { bed: 'GW-108', patient: 'Arjun Nair', ward: 'General', wardCode: 'GW', dayOfStay: 5, doctor: 'Dr. Anil Sharma', diagnosis: 'Typhoid Fever', status: 'improving' },
  { bed: 'GW-115', patient: 'Sunita Verma', ward: 'General', wardCode: 'GW', dayOfStay: 6, doctor: 'Dr. Anil Sharma', diagnosis: 'COPD Exacerbation', status: 'stable' },
  { bed: 'GW-122', patient: 'Kiran Rao', ward: 'General', wardCode: 'GW', dayOfStay: 1, doctor: 'Dr. Ravi Mehta', diagnosis: 'Viral Fever', status: 'observation' },
  { bed: 'SW-205', patient: 'Mohan Singh', ward: 'Surgical', wardCode: 'SW', dayOfStay: 2, doctor: 'Dr. Raj Verma', diagnosis: 'Post-op: Appendectomy', status: 'stable' },
  { bed: 'SW-210', patient: 'Ritu Sharma', ward: 'Surgical', wardCode: 'SW', dayOfStay: 4, doctor: 'Dr. Raj Verma', diagnosis: 'Post-op: Hernia Repair', status: 'improving' },
  { bed: 'MW-303', patient: 'Kavita Shah', ward: 'Maternity', wardCode: 'MW', dayOfStay: 1, doctor: 'Dr. Sunita Rao', diagnosis: 'Post-partum Recovery', status: 'stable' },
  { bed: 'PW-402', patient: 'Deepak Mehta', ward: 'Pediatric', wardCode: 'PW', dayOfStay: 2, doctor: 'Dr. Priya Das', diagnosis: 'Dengue Fever', status: 'observation' },
];

const UPCOMING_DISCHARGES = [
  { patient: 'Arjun Nair', bed: 'GW-108', time: 'Today, 2:00 PM', doctor: 'Dr. Anil Sharma', ward: 'General', daysStayed: 5 },
  { patient: 'Ritu Sharma', bed: 'SW-210', time: 'Today, 4:30 PM', doctor: 'Dr. Raj Verma', ward: 'Surgical', daysStayed: 4 },
  { patient: 'Deepak Mehta', bed: 'PW-402', time: 'Tomorrow, 10:00 AM', doctor: 'Dr. Priya Das', ward: 'Pediatric', daysStayed: 2 },
  { patient: 'Kavita Shah', bed: 'MW-303', time: 'Tomorrow, 11:00 AM', doctor: 'Dr. Sunita Rao', ward: 'Maternity', daysStayed: 1 },
];

const DOCTOR_LOAD = [
  { name: 'Dr. Raj Verma', specialty: 'Surgery', patients: 22 },
  { name: 'Dr. Anil Sharma', specialty: 'General Medicine', patients: 18 },
  { name: 'Dr. Priya Das', specialty: 'Pediatrics', patients: 14 },
  { name: 'Dr. Meena Gupta', specialty: 'Cardiology / ICU', patients: 12 },
  { name: 'Dr. Sunita Rao', specialty: 'Gynecology', patients: 10 },
  { name: 'Dr. Ravi Mehta', specialty: 'General Medicine', patients: 8 },
];

const LOS_DATA = [
  { ward: 'Surgical', 'Avg. Days': 5.1 },
  { ward: 'General', 'Avg. Days': 4.2 },
  { ward: 'Pediatric', 'Avg. Days': 3.7 },
  { ward: 'ICU', 'Avg. Days': 2.8 },
  { ward: 'Maternity', 'Avg. Days': 2.3 },
];

const RECENT_ADMISSIONS = [
  { patient: 'Kiran Rao', time: 'Today, 9:15 AM', ward: 'General', doctor: 'Dr. Ravi Mehta', type: 'Direct' },
  { patient: 'Priya Patel', time: 'Today, 7:40 AM', ward: 'ICU', doctor: 'Dr. Meena Gupta', type: 'Emergency' },
  { patient: 'Kavita Shah', time: 'Today, 6:00 AM', ward: 'Maternity', doctor: 'Dr. Sunita Rao', type: 'Elective' },
  { patient: 'Aryan Desai', time: 'Yesterday, 11:30 PM', ward: 'General', doctor: 'Dr. Anil Sharma', type: 'Emergency' },
  { patient: 'Neha Joshi', time: 'Yesterday, 8:00 PM', ward: 'Surgical', doctor: 'Dr. Raj Verma', type: 'Elective' },
];

// ── Helper components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }): JSX.Element {
  const map: Record<string, { color: string; label: string }> = {
    critical:    { color: 'red',    label: 'Critical' },
    stable:      { color: 'green',  label: 'Stable' },
    improving:   { color: 'teal',   label: 'Improving' },
    observation: { color: 'orange', label: 'Observation' },
  };
  const { color, label } = map[status] ?? { color: 'gray', label: status };
  return <Badge color={color} size="sm" variant="light">{label}</Badge>;
}

function AdmissionTypeBadge({ type }: { type: string }): JSX.Element {
  const color = type === 'Emergency' ? 'red' : type === 'Elective' ? 'blue' : 'gray';
  return <Badge color={color} size="xs" variant="outline">{type}</Badge>;
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }): JSX.Element {
  return (
    <Paper p="md" radius="md" withBorder>
      <Text size="xs" c="dimmed" mb={4}>{label}</Text>
      <Text size="xl" fw={700} c={color}>{value}</Text>
      {sub && <Text size="xs" c="dimmed" mt={2}>{sub}</Text>}
    </Paper>
  );
}

// ── Content component (used inside DashboardPage toggle) ─────────────────────

export function IPDDashboardContent(): JSX.Element {
  const stablePts    = ADMITTED_PATIENTS.filter((p) => p.status === 'stable').length;
  const criticalPts  = ADMITTED_PATIENTS.filter((p) => p.status === 'critical').length;
  const improvingPts = ADMITTED_PATIENTS.filter((p) => p.status === 'improving').length;
  const obsPts       = ADMITTED_PATIENTS.filter((p) => p.status === 'observation').length;

  return (
    <>

      {/* ── KPI strip ── */}
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="md">
        <KpiCard label="Total Beds"         value={TOTAL_BEDS}                         sub="across all wards"           color="gray"   />
        <KpiCard label="Occupied Beds"      value={TOTAL_OCCUPIED}                     sub={`${TOTAL_BEDS - TOTAL_OCCUPIED} available`} color="blue"   />
        <KpiCard label="Occupancy Rate"     value={`${Math.round((TOTAL_OCCUPIED / TOTAL_BEDS) * 100)}%`} sub="target ≤ 85%"      color="violet" />
        <KpiCard label="Today's Admissions" value={8}                                  sub="3 emergency, 5 elective"    color="teal"   />
        <KpiCard label="Today's Discharges" value={5}                                  sub="2 more pending"             color="green"  />
        <KpiCard label="Critical Patients"  value={criticalPts}                        sub="in ICU"                     color="red"    />
      </SimpleGrid>

      {/* ── Ward occupancy + Patient acuity ── */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">

        {/* Ward occupancy */}
        <Paper p="md" radius="md" withBorder>
          <Text fw={600} mb="md">Bed Occupancy by Ward</Text>
          <Stack gap="md">
            {WARDS.map((ward) => {
              const pct = Math.round((ward.occupied / ward.total) * 100);
              const isHigh = pct >= 90;
              return (
                <Box key={ward.code}>
                  <Group justify="space-between" mb={4}>
                    <Group gap={6}>
                      <Text size="sm" fw={500}>{ward.name}</Text>
                      {isHigh && <Badge color="red" size="xs" variant="light">Full</Badge>}
                    </Group>
                    <Text size="sm" c="dimmed">
                      <Text span fw={600} c={ward.color}>{ward.occupied}</Text>
                      {` / ${ward.total} beds`}
                    </Text>
                  </Group>
                  <Tooltip label={`${pct}% occupied`} position="top" withArrow>
                    <Progress
                      value={pct}
                      color={isHigh ? 'red' : ward.color}
                      size="lg"
                      radius="xl"
                    />
                  </Tooltip>
                </Box>
              );
            })}
          </Stack>
        </Paper>

        {/* Patient acuity + avg LOS */}
        <Stack gap="md">
          {/* Acuity breakdown */}
          <Paper p="md" radius="md" withBorder>
            <Text fw={600} mb="md">Patient Acuity — Current</Text>
            <SimpleGrid cols={2} spacing="sm">
              {[
                { label: 'Critical',    value: criticalPts,  color: 'red',    bg: '#fff5f5' },
                { label: 'Observation', value: obsPts,       color: 'orange', bg: '#fff9f0' },
                { label: 'Stable',      value: stablePts,    color: 'green',  bg: '#f0fff4' },
                { label: 'Improving',   value: improvingPts, color: 'teal',   bg: '#f0fdfd' },
              ].map((item) => (
                <Box
                  key={item.label}
                  p="md"
                  style={{ background: item.bg, borderRadius: 8, textAlign: 'center', border: `1px solid ${item.bg}` }}
                >
                  <Text size="xl" fw={800} c={item.color}>{item.value}</Text>
                  <Text size="xs" c="dimmed" fw={500}>{item.label}</Text>
                </Box>
              ))}
            </SimpleGrid>
          </Paper>

          {/* Avg LOS */}
          <Paper p="md" radius="md" withBorder style={{ flex: 1 }}>
            <Text fw={600} mb="xs">Avg. Length of Stay (days)</Text>
            <BarChart
              h={140}
              data={LOS_DATA}
              dataKey="ward"
              series={[{ name: 'Avg. Days', color: 'violet.5' }]}
              tickLine="y"
              withLegend={false}
            />
          </Paper>
        </Stack>
      </SimpleGrid>

      {/* ── Active patients table ── */}
      <Paper p="md" radius="md" withBorder>
        <Group justify="space-between" mb="sm">
          <Text fw={600}>Currently Admitted Patients</Text>
          <Badge color="blue" variant="light">{ADMITTED_PATIENTS.length} shown · {TOTAL_OCCUPIED} total</Badge>
        </Group>
        <ScrollArea>
          <Table striped highlightOnHover withTableBorder={false} style={{ minWidth: 720 }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Bed</Table.Th>
                <Table.Th>Patient</Table.Th>
                <Table.Th>Ward</Table.Th>
                <Table.Th>Day of Stay</Table.Th>
                <Table.Th>Admitting Doctor</Table.Th>
                <Table.Th>Primary Diagnosis</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {ADMITTED_PATIENTS.map((p) => (
                <Table.Tr key={p.bed}>
                  <Table.Td>
                    <Text size="sm" fw={600} ff="monospace">{p.bed}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>{p.patient}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">{p.ward}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ta="center">Day {p.dayOfStay}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{p.doctor}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{p.diagnosis}</Text>
                  </Table.Td>
                  <Table.Td>
                    <StatusBadge status={p.status} />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>

      {/* ── Discharges + Doctor load + Recent admissions ── */}
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">

        {/* Upcoming discharges */}
        <Paper p="md" radius="md" withBorder>
          <Group justify="space-between" mb="sm">
            <Text fw={600}>Upcoming Discharges</Text>
            <Badge color="teal" variant="light" size="sm">{UPCOMING_DISCHARGES.length}</Badge>
          </Group>
          <Stack gap="xs">
            {UPCOMING_DISCHARGES.map((d) => (
              <Box key={d.bed} p="xs" style={{ background: 'var(--mantine-color-gray-0)', borderRadius: 6 }}>
                <Group justify="space-between">
                  <Text size="sm" fw={500}>{d.patient}</Text>
                  <Text size="xs" ff="monospace" c="dimmed">{d.bed}</Text>
                </Group>
                <Text size="xs" c="dimmed">{d.ward} · {d.doctor}</Text>
                <Group justify="space-between" mt={4}>
                  <Text size="xs" c="teal" fw={500}>{d.time}</Text>
                  <Text size="xs" c="dimmed">{d.daysStayed}d stay</Text>
                </Group>
              </Box>
            ))}
          </Stack>
        </Paper>

        {/* Doctor load */}
        <Paper p="md" radius="md" withBorder>
          <Text fw={600} mb="sm">Doctor-wise Patient Load</Text>
          <Stack gap="sm">
            {DOCTOR_LOAD.map((doc) => {
              const maxPts = DOCTOR_LOAD[0].patients;
              const pct = Math.round((doc.patients / maxPts) * 100);
              return (
                <Box key={doc.name}>
                  <Group justify="space-between" mb={3}>
                    <Stack gap={0}>
                      <Text size="sm" fw={500}>{doc.name}</Text>
                      <Text size="xs" c="dimmed">{doc.specialty}</Text>
                    </Stack>
                    <Text size="sm" fw={700} c="blue">{doc.patients}</Text>
                  </Group>
                  <Progress value={pct} color="blue" size="sm" radius="xl" />
                </Box>
              );
            })}
          </Stack>
        </Paper>

        {/* Recent admissions */}
        <Paper p="md" radius="md" withBorder>
          <Text fw={600} mb="sm">Recent Admissions</Text>
          <Stack gap="xs">
            {RECENT_ADMISSIONS.map((a, i) => (
              <Box key={i} p="xs" style={{ background: 'var(--mantine-color-gray-0)', borderRadius: 6 }}>
                <Group justify="space-between">
                  <Text size="sm" fw={500}>{a.patient}</Text>
                  <AdmissionTypeBadge type={a.type} />
                </Group>
                <Text size="xs" c="dimmed">{a.ward} · {a.doctor}</Text>
                <Text size="xs" c="dimmed" mt={2}>{a.time}</Text>
              </Box>
            ))}
          </Stack>
        </Paper>

      </SimpleGrid>

    </>
  );
}

// Standalone route page (kept for potential direct navigation)
export function IPDDashboardPage(): JSX.Element {
  return (
    <Stack p="md" gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>IPD Dashboard</Title>
          <Text size="sm" c="dimmed" mt={2}>In-Patient Department · Live Census</Text>
        </div>
        <Badge color="orange" variant="light" size="sm">Demo Data</Badge>
      </Group>
      <IPDDashboardContent />
    </Stack>
  );
}
