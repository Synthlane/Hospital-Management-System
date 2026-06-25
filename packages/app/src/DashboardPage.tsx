// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import '@mantine/charts/styles.css';
import { BarChart, DonutChart } from '@mantine/charts';
import { Badge, Group, Loader, Paper, SegmentedControl, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { IPDDashboardContent } from './IPDDashboardPage';
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

interface ChartData {
  label: string;
  Booked: number;
  Attended: number;
  Upcoming: number;
  'No Show': number;
  Cancelled: number;
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildDailyData(appointments: Appointment[]): ChartData[] {
  const today = new Date();
  return [-2, -1, 0, 1].map((offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const dateStr = localDateStr(d);
    const label =
      offset === 0 ? 'Today' :
      offset === -1 ? 'Yesterday' :
      offset === 1 ? 'Tomorrow' :
      d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    const dayAppts = appointments.filter((a) => a.start && localDateStr(new Date(a.start)) === dateStr);
    return {
      label,
      Booked: dayAppts.length,
      Attended: dayAppts.filter((a) => a.status === 'fulfilled').length,
      Upcoming: dayAppts.filter((a) => a.status === 'booked').length,
      'No Show': dayAppts.filter((a) => a.status === 'noshow').length,
      Cancelled: dayAppts.filter((a) => a.status === 'cancelled').length,
    };
  });
}

function buildWeeklyData(appointments: Appointment[]): ChartData[] {
  const now = new Date();
  const weeks: ChartData[] = [];

  for (let i = 3; i >= 0; i--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    weeks.push({
      label: weekStart.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      Booked: 0,
      Attended: 0,
      Upcoming: 0,
      'No Show': 0,
      Cancelled: 0,
    });
  }

  appointments.forEach((appt) => {
    if (!appt.start) return;
    const apptDate = new Date(appt.start);
    const daysAgo = Math.floor((now.getTime() - apptDate.getTime()) / 86400000);
    if (daysAgo < -7 || daysAgo > 28) return;
    const idx = daysAgo < 0 ? 3 : 3 - Math.floor(daysAgo / 7);
    if (idx < 0 || idx > 3) return;
    weeks[idx].Booked++;
    if (appt.status === 'fulfilled') weeks[idx].Attended++;
    else if (appt.status === 'booked') weeks[idx].Upcoming++;
    else if (appt.status === 'noshow') weeks[idx]['No Show']++;
    else if (appt.status === 'cancelled') weeks[idx].Cancelled++;
  });

  return weeks;
}

export function DashboardPage(): JSX.Element {
  const medplum = useMedplum();
  const [dashView, setDashView] = useState<'opd' | 'ipd'>('opd');
  const [kpi, setKpi] = useState<KpiStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<ChartData[]>([]);
  const [dailyData, setDailyData] = useState<ChartData[]>([]);
  const [chartView, setChartView] = useState<'days' | 'weeks'>('days');
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
            medplum.searchResources('Practitioner', 'identifier:missing=false&_count=500'),
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
        setDailyData(buildDailyData(typedAppts));

        const attended = typedAppts.filter((a) => a.status === 'fulfilled').length;
        const upcoming = typedAppts.filter((a) => a.status === 'booked').length;
        const noshow = typedAppts.filter((a) => a.status === 'noshow').length;
        const cancelled = typedAppts.filter((a) => a.status === 'cancelled').length;
        setStatusData(
          [
            { name: 'Attended', value: attended, color: 'green.6' },
            { name: 'Upcoming', value: upcoming, color: 'blue.6' },
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

  const kpiCards = [
    { label: 'Total Patients', value: kpi?.totalPatients ?? 0, color: 'blue' },
    { label: 'Practitioners', value: kpi?.totalPractitioners ?? 0, color: 'teal' },
    { label: 'Upcoming Appointments', value: kpi?.upcomingAppointments ?? 0, color: 'violet' },
    { label: 'Pending Lab Orders', value: kpi?.pendingLabOrders ?? 0, color: 'orange' },
    { label: 'Completed Reports', value: kpi?.completedReports ?? 0, color: 'green' },
  ];

  return (
    <Stack p="md" gap="lg">
      <Group justify="space-between" align="center">
        <Title order={2}>{dashView === 'opd' ? 'Dashboard' : 'IPD Dashboard'}</Title>
        <SegmentedControl
          value={dashView}
          onChange={(v) => setDashView(v as 'opd' | 'ipd')}
          data={[
            { label: 'OPD', value: 'opd' },
            { label: 'IPD', value: 'ipd' },
          ]}
        />
      </Group>

      {dashView === 'ipd' && <IPDDashboardContent />}

      {dashView === 'opd' && loading && (
        <Stack align="center" mt="xl" gap="sm">
          <Loader size="lg" />
          <Text c="dimmed">Loading dashboard…</Text>
        </Stack>
      )}
      {dashView === 'opd' && !loading && (<>

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
          <Group justify="space-between" mb="sm">
            <Text fw={600}>
              {chartView === 'days' ? 'Daily Appointments' : 'Appointments — Last 4 Weeks'}
            </Text>
            <SegmentedControl
              size="xs"
              value={chartView}
              onChange={(v) => setChartView(v as 'days' | 'weeks')}
              data={[
                { label: '4 Days', value: 'days' },
                { label: '4 Weeks', value: 'weeks' },
              ]}
            />
          </Group>
          <BarChart
            h={240}
            data={chartView === 'days' ? dailyData : weeklyData}
            dataKey="label"
            series={[
              { name: 'Booked', color: 'violet.3' },
              { name: 'Attended', color: 'green.6' },
              { name: 'Upcoming', color: 'blue.5' },
              { name: 'No Show', color: 'red.5' },
              { name: 'Cancelled', color: 'gray.4' },
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
    </>)}

    </Stack>
  );
}
