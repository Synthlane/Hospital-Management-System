// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Badge, Card, Divider, Grid, Group, Loader, Stack, Text, Title } from '@mantine/core';
import type { Appointment, Condition, Coverage, Encounter, MedicationRequest } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';

interface SummaryData {
  conditions: Condition[];
  medications: MedicationRequest[];
  encounters: Encounter[];
  upcomingAppointment: Appointment | null;
  coverage: Coverage | null;
}

function ConditionBadge({ status }: { status: string | undefined }): JSX.Element {
  const color = status === 'active' ? 'green' : status === 'resolved' ? 'gray' : 'blue';
  return <Badge color={color} size="xs" variant="light">{status ?? 'unknown'}</Badge>;
}

export function PatientSummaryPage(): JSX.Element {
  const medplum = useMedplum();
  const { id } = useParams() as { id: string };
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      return;
    }

    async function load(): Promise<void> {
      setLoading(true);
      try {
        const [condBundle, medBundle, encBundle, apptBundle, covBundle] = await Promise.all([
          medplum.search('Condition', `patient=Patient/${id}&clinical-status=active&_count=10`),
          medplum.search('MedicationRequest', `subject=Patient/${id}&status=active&_count=10`),
          medplum.search('Encounter', `subject=Patient/${id}&_count=5&_sort=-date`),
          medplum.search('Appointment', `patient=Patient/${id}&status=booked&_count=1&_sort=date`),
          medplum.search('Coverage', `subscriber=Patient/${id}&_count=1`),
        ]);

        const appts = (apptBundle.entry ?? []).map((e) => e.resource as Appointment);
        const covs = (covBundle.entry ?? []).map((e) => e.resource as Coverage);

        setData({
          conditions: (condBundle.entry ?? []).map((e) => e.resource as Condition),
          medications: (medBundle.entry ?? []).map((e) => e.resource as MedicationRequest),
          encounters: (encBundle.entry ?? []).map((e) => e.resource as Encounter),
          upcomingAppointment: appts[0] ?? null,
          coverage: covs[0] ?? null,
        });
      } catch (err) {
        console.error('Patient summary load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load().catch(console.error);
  }, [medplum, id]);

  if (loading) {
    return (
      <Stack align="center" py="xl" gap="sm">
        <Loader />
        <Text c="dimmed" size="sm">Loading patient summary…</Text>
      </Stack>
    );
  }

  if (!data) {
    return <Text c="red" p="md">Failed to load patient summary.</Text>;
  }

  return (
    <Stack p="md" gap="md">
      <Grid gutter="md">

        {/* Active Conditions */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder radius="md" h="100%">
            <Group justify="space-between" mb="sm">
              <Title order={5}>Active Diagnoses</Title>
              <Text size="xs" c="blue" component={Link} to={`/Condition?patient=Patient/${id}`}>
                View all →
              </Text>
            </Group>
            <Divider mb="sm" />
            {data.conditions.length === 0 ? (
              <Text size="sm" c="dimmed">No active diagnoses recorded</Text>
            ) : (
              <Stack gap="xs">
                {data.conditions.map((cond) => {
                  const name = cond.code?.text ?? cond.code?.coding?.[0]?.display ?? 'Unknown Condition';
                  const status = cond.clinicalStatus?.coding?.[0]?.code;
                  const onset = cond.onsetDateTime
                    ? new Date(cond.onsetDateTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : null;
                  return (
                    <Group key={cond.id} justify="space-between">
                      <Stack gap={0}>
                        <Text size="sm" fw={500}>{name}</Text>
                        {onset && <Text size="xs" c="dimmed">Since {onset}</Text>}
                      </Stack>
                      <ConditionBadge status={status} />
                    </Group>
                  );
                })}
              </Stack>
            )}
          </Card>
        </Grid.Col>

        {/* Active Medications */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder radius="md" h="100%">
            <Group justify="space-between" mb="sm">
              <Title order={5}>Current Medications</Title>
              <Text size="xs" c="blue" component={Link} to={`/MedicationRequest?subject=Patient/${id}`}>
                View all →
              </Text>
            </Group>
            <Divider mb="sm" />
            {data.medications.length === 0 ? (
              <Text size="sm" c="dimmed">No active medications</Text>
            ) : (
              <Stack gap="xs">
                {data.medications.map((med) => {
                  const name =
                    med.medicationCodeableConcept?.text ??
                    med.medicationCodeableConcept?.coding?.[0]?.display ??
                    'Unknown Medication';
                  const dosage = med.dosageInstruction?.[0]?.text;
                  return (
                    <Stack key={med.id} gap={0}>
                      <Text size="sm" fw={500}>{name}</Text>
                      {dosage && <Text size="xs" c="dimmed">{dosage}</Text>}
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </Card>
        </Grid.Col>

        {/* Recent Encounters */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder radius="md" h="100%">
            <Group justify="space-between" mb="sm">
              <Title order={5}>Recent Consultations</Title>
              <Text size="xs" c="blue" component={Link} to={`/Encounter?subject=Patient/${id}`}>
                View all →
              </Text>
            </Group>
            <Divider mb="sm" />
            {data.encounters.length === 0 ? (
              <Text size="sm" c="dimmed">No consultations on record</Text>
            ) : (
              <Stack gap="xs">
                {data.encounters.map((enc) => {
                  const dateStr = enc.period?.start
                    ? new Date(enc.period.start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—';
                  const doctor = enc.participant?.[0]?.individual?.display;
                  const encType = enc.class?.display ?? enc.class?.code ?? '—';
                  return (
                    <Group key={enc.id} justify="space-between">
                      <Stack gap={0}>
                        <Text size="sm" fw={500} component={Link} to={`/Encounter/${enc.id}`} c="blue">
                          {dateStr}
                        </Text>
                        {doctor && <Text size="xs" c="dimmed">{doctor}</Text>}
                      </Stack>
                      <Badge size="xs" variant="outline" color="teal">{encType}</Badge>
                    </Group>
                  );
                })}
              </Stack>
            )}
          </Card>
        </Grid.Col>

        {/* Upcoming Appointment + Insurance */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Stack gap="md" h="100%">
            {/* Upcoming appointment */}
            <Card withBorder radius="md">
              <Title order={5} mb="sm">Next Appointment</Title>
              <Divider mb="sm" />
              {!data.upcomingAppointment ? (
                <Text size="sm" c="dimmed">No upcoming appointments scheduled</Text>
              ) : (
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" fw={500}>
                      {data.upcomingAppointment.start
                        ? new Date(data.upcomingAppointment.start).toLocaleDateString('en-IN', {
                            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                          })
                        : '—'}
                    </Text>
                    <Badge color="blue" size="sm" variant="light">Booked</Badge>
                  </Group>
                  {data.upcomingAppointment.start && (
                    <Text size="xs" c="dimmed">
                      {new Date(data.upcomingAppointment.start).toLocaleTimeString('en-IN', {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </Text>
                  )}
                  {data.upcomingAppointment.description && (
                    <Text size="xs">{data.upcomingAppointment.description}</Text>
                  )}
                </Stack>
              )}
            </Card>

            {/* Insurance */}
            <Card withBorder radius="md">
              <Title order={5} mb="sm">Insurance / Coverage</Title>
              <Divider mb="sm" />
              {!data.coverage ? (
                <Text size="sm" c="dimmed">No insurance coverage on file</Text>
              ) : (
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" fw={500}>{data.coverage.payor?.[0]?.display ?? 'Unknown Insurer'}</Text>
                    <Badge
                      color={data.coverage.status === 'active' ? 'green' : 'gray'}
                      size="sm"
                      variant="light"
                    >
                      {data.coverage.status}
                    </Badge>
                  </Group>
                  {data.coverage.type?.coding?.[0]?.display && (
                    <Text size="xs" c="dimmed">{data.coverage.type.coding[0].display}</Text>
                  )}
                </Stack>
              )}
            </Card>
          </Stack>
        </Grid.Col>

      </Grid>
    </Stack>
  );
}
