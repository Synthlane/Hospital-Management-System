// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { ActionIcon, Badge, Box, Drawer, Group, Loader, Paper, Stack, Text, Title, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import type { Appointment } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import classes from './AppointmentCalendar.module.css';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function statusColor(status: string | undefined): string {
  switch (status) {
    case 'booked': return 'blue';
    case 'fulfilled': return 'green';
    case 'noshow': return 'red';
    case 'cancelled': return 'gray';
    default: return 'gray';
  }
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function AppointmentCalendar(): JSX.Element {
  const medplum = useMedplum();
  const navigate = useNavigate();
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);

  useEffect(() => {
    async function load(): Promise<void> {
      setLoading(true);
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59);
      try {
        const bundle = await medplum.search(
          'Appointment',
          `date=ge${start.toISOString()}&date=le${end.toISOString()}&_count=500`
        );
        setAppointments((bundle.entry ?? []).map((e) => e.resource as Appointment));
      } catch (err) {
        console.error('Calendar load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load().catch(console.error);
  }, [medplum, year, month]);

  // Group appointments by day (YYYY-MM-DD)
  const byDay: Record<string, Appointment[]> = {};
  appointments.forEach((appt) => {
    if (!appt.start) {
      return;
    }
    const day = isoDate(new Date(appt.start));
    if (!byDay[day]) {
      byDay[day] = [];
    }
    byDay[day].push(appt);
  });

  // Build the calendar grid
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Total cells: pad to full weeks
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }
  while (cells.length < totalCells) {
    cells.push(null);
  }

  function prevMonth(): void {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth(): void {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  function handleDayClick(day: number): void {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDay(dayStr);
    openDrawer();
  }

  const selectedDayAppts = selectedDay ? (byDay[selectedDay] ?? []) : [];

  const todayStr = isoDate(today);

  return (
    <Box>
      {/* Month Navigation */}
      <Group justify="space-between" mb="md" align="center">
        <ActionIcon variant="subtle" onClick={prevMonth} size="lg">
          <IconChevronLeft />
        </ActionIcon>
        <Title order={4}>
          {MONTH_NAMES[month]} {year}
        </Title>
        <ActionIcon variant="subtle" onClick={nextMonth} size="lg">
          <IconChevronRight />
        </ActionIcon>
      </Group>

      {loading ? (
        <Stack align="center" py="xl">
          <Loader />
          <Text c="dimmed" size="sm">Loading appointments…</Text>
        </Stack>
      ) : (
        <>
          {/* Day-of-week headers */}
          <div className={classes.grid}>
            {DAY_LABELS.map((d) => (
              <div key={d} className={classes.dayHeader}>
                <Text size="xs" fw={600} ta="center" c="dimmed">
                  {d}
                </Text>
              </div>
            ))}

            {/* Day cells */}
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className={classes.emptyCell} />;
              }
              const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayAppts = byDay[dayStr] ?? [];
              const isToday = dayStr === todayStr;
              const preview = dayAppts.slice(0, 3);
              const overflow = dayAppts.length - 3;

              return (
                <div
                  key={dayStr}
                  className={`${classes.dayCell} ${isToday ? classes.today : ''} ${dayAppts.length > 0 ? classes.hasAppts : ''}`}
                  onClick={() => handleDayClick(day)}
                >
                  <Text size="xs" fw={isToday ? 700 : 400} c={isToday ? 'blue' : undefined} mb={4}>
                    {day}
                  </Text>
                  <Stack gap={2}>
                    {preview.map((appt) => {
                      const patient = appt.participant?.find(
                        (p: { actor?: { reference?: string; display?: string } }) =>
                          p.actor?.reference?.startsWith('Patient/')
                      );
                      return (
                        <Tooltip
                          key={appt.id}
                          label={`${patient?.actor?.display ?? 'Patient'} — ${appt.status}`}
                          withArrow
                          position="top"
                        >
                          <Badge
                            color={statusColor(appt.status)}
                            size="xs"
                            variant="light"
                            style={{ cursor: 'pointer', maxWidth: '100%', overflow: 'hidden' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/Appointment/${appt.id}`)?.catch(console.error);
                            }}
                          >
                            {patient?.actor?.display ?? appt.status ?? '—'}
                          </Badge>
                        </Tooltip>
                      );
                    })}
                    {overflow > 0 && (
                      <Text size="xs" c="dimmed">
                        +{overflow} more
                      </Text>
                    )}
                  </Stack>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <Group mt="md" gap="lg" justify="flex-end">
            {[
              { color: 'blue', label: 'Booked' },
              { color: 'green', label: 'Fulfilled' },
              { color: 'red', label: 'No Show' },
              { color: 'gray', label: 'Cancelled' },
            ].map((item) => (
              <Group key={item.label} gap={4}>
                <Badge color={item.color} size="xs" variant="light">
                  {item.label}
                </Badge>
              </Group>
            ))}
          </Group>
        </>
      )}

      {/* Day detail drawer */}
      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        title={
          <Text fw={600}>
            Appointments on {selectedDay ? new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}
          </Text>
        }
        position="right"
        size="md"
      >
        {selectedDayAppts.length === 0 ? (
          <Text c="dimmed" ta="center" mt="xl">
            No appointments on this day
          </Text>
        ) : (
          <Stack gap="sm">
            {selectedDayAppts.map((appt) => {
              const patient = appt.participant?.find(
                (p: { actor?: { reference?: string; display?: string } }) =>
                  p.actor?.reference?.startsWith('Patient/')
              );
              const doctor = appt.participant?.find(
                (p: { actor?: { reference?: string; display?: string } }) =>
                  p.actor?.reference?.startsWith('Practitioner/')
              );
              const timeStr = appt.start
                ? new Date(appt.start).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                : '—';
              const endStr = appt.end
                ? new Date(appt.end).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                : '';
              return (
                <Paper
                  key={appt.id}
                  p="sm"
                  radius="md"
                  withBorder
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    navigate(`/Appointment/${appt.id}`)?.catch(console.error);
                    closeDrawer();
                  }}
                >
                  <Group justify="space-between" mb={4}>
                    <Text fw={600} size="sm">
                      {patient?.actor?.display ?? 'Unknown Patient'}
                    </Text>
                    <Badge color={statusColor(appt.status)} size="sm" variant="light">
                      {appt.status}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {timeStr}{endStr ? ` – ${endStr}` : ''}
                  </Text>
                  {doctor?.actor?.display && (
                    <Text size="xs" c="dimmed">
                      Dr. {doctor.actor.display}
                    </Text>
                  )}
                  {appt.description && (
                    <Text size="xs" mt={4}>
                      {appt.description}
                    </Text>
                  )}
                </Paper>
              );
            })}
          </Stack>
        )}
      </Drawer>
    </Box>
  );
}
