// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import '@mantine/charts/styles.css';
import { BarChart, DonutChart } from '@mantine/charts';
import { Badge, Group, Loader, Paper, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import type { Appointment, DiagnosticReport } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

interface KpiStats {
  totalPatients: number;
  totalPractitioners: number;
  upcomingAppointments: number;
  pendingLabOrders: number;
  completedReports: number;
}

interface WeekData {
  week: string;
  Fulfilled: number;
  Booked: number;
  'No Show': number;
}

function buildWeeklyData(appointments: Appointment[]): WeekData[] {
  const now = new Date();
  const weeks: WeekData[] = [];

  for (let i = 3; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    weeks.push({
      week: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      Fulfilled: 0,
      Booked: 0,
      'No Show': 0,
    });
  }

  appointments.forEach((appt) => {
    if (!appt.start) {
      return;
    }
    const apptDate = new Date(appt.start);
    const daysAgo = Math.floor((now.getTime() - apptDate.getTime()) / 86400000);
    if (daysAgo < 0 || daysAgo > 28) {
      return;
    }
    const idx = 3 - Math.floor(daysAgo / 7);
    if (idx < 0 || idx > 3) {
      return;
    }
    if (appt.status === 'fulfilled') {
      weeks[idx].Fulfilled++;
    } else if (appt.status === 'booked') {
      weeks[idx].Booked++;
    } else if (appt.status === 'noshow') {
      weeks[idx]['No Show']++;
    }
  });

  return weeks;
}

export function DashboardPage(): JSX.Element {
  const medplum = useMedplum();
  const [kpi, setKpi] = useState<KpiStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeekData[]>([]);
  const [statusData, setStatusData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [recentReports, setRecentReports] = useState<DiagnosticReport[]>([]);
  const [upcomingAppts, setUpcomingAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        // Use searchResources (returns array directly) to avoid Bundle.total reliability issues
        const [patients, practitioners, bookedAppts, activeReqs, finalRpts, allAppts, recentRpts, upcomingAppts] =
          await Promise.all([
            medplum.searchResources('Patient', '_count=500'),
            medplum.searchResources('Practitioner', '_count=500'),
            medplum.searchResources('Appointment', 'status=booked&_count=500'),
            medplum.searchResources('ServiceRequest', 'status=active&_count=500'),
            medplum.searchResources('DiagnosticReport', 'status=final&_count=500'),
            medplum.searchResources('Appointment', '_count=300&_sort=-date'),
            medplum.searchResources('DiagnosticReport', '_count=5&_sort=-date'),
            medplum.searchResources('Appointment', 'status=booked&_count=5&_sort=date'),
          ]);

        setKpi({
          totalPatients: patients.length,
          totalPractitioners: practitioners.length,
          upcomingAppointments: bookedAppts.length,
          pendingLabOrders: activeReqs.length,
          completedReports: finalRpts.length,
        });

        const typedAppts = allAppts as Appointment[];
        setWeeklyData(buildWeeklyData(typedAppts));

        const fulfilled = typedAppts.filter((a) => a.status === 'fulfilled').length;
        const booked = typedAppts.filter((a) => a.status === 'booked').length;
        const noshow = typedAppts.filter((a) => a.status === 'noshow').length;
        const cancelled = typedAppts.filter((a) => a.status === 'cancelled').length;
        setStatusData(
          [
            { name: 'Fulfilled', value: fulfilled, color: 'green.6' },
            { name: 'Booked', value: booked, color: 'blue.6' },
            { name: 'No Show', value: noshow, color: 'red.5' },
            { name: 'Cancelled', value: cancelled, color: 'gray.5' },
          ].filter((d) => d.value > 0)
        );

        setRecentReports(recentRpts as DiagnosticReport[]);
        setUpcomingAppts(upcomingAppts as Appointment[]);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load().catch(console.error);
  }, [medplum]);

  if (loading) {
    return (
      <Stack align="center" mt="xl" gap="sm">
        <Loader size="lg" />
        <Text c="dimmed">Loading dashboard…</Text>
      </Stack>
    );
  }

  const kpiCards = [
    { label: 'Total Patients', value: kpi?.totalPatients ?? 0, color: 'blue' },
    { label: 'Practitioners', value: kpi?.totalPractitioners ?? 0, color: 'teal' },
    { label: 'Upcoming Appointments', value: kpi?.upcomingAppointments ?? 0, color: 'violet' },
    { label: 'Pending Lab Orders', value: kpi?.pendingLabOrders ?? 0, color: 'orange' },
    { label: 'Completed Reports', value: kpi?.completedReports ?? 0, color: 'green' },
  ];

  return (
    <Stack p="md" gap="lg">
      <Title order={2}>Dashboard</Title>

      {/* KPI cards */}
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }} spacing="md">
        {kpiCards.map((card) => (
          <Paper key={card.label} p="md" radius="md" withBorder>
            <Text size="sm" c="dimmed" mb={4}>
              {card.label}
            </Text>
            <Text size="xl" fw={700} c={card.color}>
              {card.value.toLocaleString()}
            </Text>
          </Paper>
        ))}
      </SimpleGrid>

      {/* Charts */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Paper p="md" radius="md" withBorder>
          <Text fw={600} mb="sm">
            Appointments — Last 4 Weeks
          </Text>
          <BarChart
            h={240}
            data={weeklyData}
            dataKey="week"
            series={[
              { name: 'Fulfilled', color: 'green.6' },
              { name: 'Booked', color: 'blue.6' },
              { name: 'No Show', color: 'red.5' },
            ]}
            tickLine="y"
          />
        </Paper>

        <Paper p="md" radius="md" withBorder>
          <Text fw={600} mb="sm">
            Appointment Status Distribution
          </Text>
          <Group justify="center">
            <DonutChart data={statusData} size={200} thickness={30} withTooltip tooltipDataSource="segment" />
          </Group>
          <Group justify="center" mt="sm" gap="lg" wrap="wrap">
            {statusData.map((d) => (
              <Group key={d.name} gap={6}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: `var(--mantine-color-${d.color.replace('.', '-')})`,
                  }}
                />
                <Text size="xs">
                  {d.name}: {d.value}
                </Text>
              </Group>
            ))}
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Data tables */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {/* Upcoming appointments */}
        <Paper p="md" radius="md" withBorder>
          <Group justify="space-between" mb="sm">
            <Text fw={600}>Upcoming Appointments</Text>
            <Text size="xs" c="dimmed" component={Link} to="/Appointment">
              View all →
            </Text>
          </Group>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Patient</Table.Th>
                <Table.Th>Date & Time</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {upcomingAppts.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={3}>
                    <Text c="dimmed" size="sm" ta="center">
                      No upcoming appointments
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                upcomingAppts.map((appt) => {
                  const patientParticipant = appt.participant?.find(
                    (p: { actor?: { reference?: string; display?: string }; status?: string }) =>
                      p.actor?.reference?.startsWith('Patient/')
                  );
                  const patientName = patientParticipant?.actor?.display ?? 'Unknown Patient';
                  const dateStr = appt.start
                    ? new Date(appt.start).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—';
                  return (
                    <Table.Tr key={appt.id}>
                      <Table.Td>
                        <Text size="sm" component={Link} to={`/Appointment/${appt.id}`} c="blue">
                          {patientName}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{dateStr}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color="blue" size="sm" variant="light">
                          {appt.status}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  );
                })
              )}
            </Table.Tbody>
          </Table>
        </Paper>

        {/* Recent lab results */}
        <Paper p="md" radius="md" withBorder>
          <Group justify="space-between" mb="sm">
            <Text fw={600}>Recent Lab Results</Text>
            <Text size="xs" c="dimmed" component={Link} to="/DiagnosticReport">
              View all →
            </Text>
          </Group>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Test</Table.Th>
                <Table.Th>Patient</Table.Th>
                <Table.Th>Result</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recentReports.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={3}>
                    <Text c="dimmed" size="sm" ta="center">
                      No reports yet
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                recentReports.map((rpt) => {
                  const testName = rpt.code?.text ?? rpt.code?.coding?.[0]?.display ?? '—';
                  const patientName = rpt.subject?.display ?? '—';
                  const code = rpt.conclusionCode?.[0]?.coding?.[0]?.code ?? '';
                  const badgeColor = code === 'N' ? 'green' : code === 'H' ? 'red' : code === 'L' ? 'orange' : 'gray';
                  const badgeLabel = code === 'N' ? 'Normal' : code === 'H' ? 'High' : code === 'L' ? 'Low' : 'Final';
                  return (
                    <Table.Tr key={rpt.id}>
                      <Table.Td>
                        <Text size="sm" component={Link} to={`/DiagnosticReport/${rpt.id}`} c="blue">
                          {testName}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{patientName}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={badgeColor} size="sm" variant="light">
                          {badgeLabel}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  );
                })
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      </SimpleGrid>
    </Stack>
  );
}
