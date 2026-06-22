// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Badge, Card, Divider, Grid, Group, Loader, Stack, Text, Title } from '@mantine/core';
import type { Condition, Encounter, MedicationRequest, Procedure, ServiceRequest } from '@medplum/fhirtypes';
import { useMedplum, useResource } from '@medplum/react';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';

function statusBadge(status: string | undefined, colorMap: Record<string, string>): JSX.Element {
  const color = colorMap[status ?? ''] ?? 'gray';
  return <Badge color={color} size="xs" variant="light">{status ?? '—'}</Badge>;
}

export function EncounterSummaryPage(): JSX.Element {
  const medplum = useMedplum();
  const { id } = useParams() as { id: string };

  const encounter = useResource({ reference: `Encounter/${id}` });

  const [conditions, setConditions] = useState<Condition[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [medications, setMedications] = useState<MedicationRequest[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      return;
    }

    async function load(): Promise<void> {
      setLoading(true);
      try {
        const [condB, srB, medB, procB] = await Promise.all([
          medplum.search('Condition', `encounter=Encounter/${id}&_count=20`),
          medplum.search('ServiceRequest', `encounter=Encounter/${id}&_count=20`),
          medplum.search('MedicationRequest', `encounter=Encounter/${id}&_count=20`),
          medplum.search('Procedure', `encounter=Encounter/${id}&_count=20`),
        ]);
        setConditions((condB.entry ?? []).map((e) => e.resource as Condition));
        setServiceRequests((srB.entry ?? []).map((e) => e.resource as ServiceRequest));
        setMedications((medB.entry ?? []).map((e) => e.resource as MedicationRequest));
        setProcedures((procB.entry ?? []).map((e) => e.resource as Procedure));
      } catch (err) {
        console.error('Encounter summary load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load().catch(console.error);
  }, [medplum, id]);

  if (loading || !encounter) {
    return (
      <Stack align="center" py="xl" gap="sm">
        <Loader />
        <Text c="dimmed" size="sm">Loading visit summary…</Text>
      </Stack>
    );
  }

  const enc = encounter as Encounter;
  const patient = enc.subject;
  const doctor = enc.participant?.[0]?.individual;
  const startDate = enc.period?.start
    ? new Date(enc.period.start).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '—';
  const startTime = enc.period?.start
    ? new Date(enc.period.start).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '';
  const endTime = enc.period?.end
    ? new Date(enc.period.end).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '';
  const encClass = enc.class?.display ?? enc.class?.code ?? '—';
  const encStatus = enc.status;

  return (
    <Stack p="md" gap="md">
      {/* Visit Header */}
      <Card withBorder radius="md">
        <Group justify="space-between" wrap="wrap">
          <Stack gap={2}>
            <Title order={5}>Visit on {startDate}</Title>
            {startTime && (
              <Text size="sm" c="dimmed">
                {startTime}{endTime ? ` – ${endTime}` : ''}
              </Text>
            )}
          </Stack>
          <Group gap="sm">
            <Badge color="teal" variant="light">{encClass}</Badge>
            {statusBadge(encStatus, { finished: 'green', planned: 'blue', 'in-progress': 'orange', cancelled: 'gray' })}
          </Group>
        </Group>
        <Divider my="sm" />
        <Group gap="xl">
          {patient && (
            <Stack gap={0}>
              <Text size="xs" c="dimmed">Patient</Text>
              <Text size="sm" fw={500} component={Link} to={`/Patient/${patient.reference?.split('/')[1]}`} c="blue">
                {patient.display ?? patient.reference}
              </Text>
            </Stack>
          )}
          {doctor && (
            <Stack gap={0}>
              <Text size="xs" c="dimmed">Attending Doctor</Text>
              <Text size="sm" fw={500}>{doctor.display ?? doctor.reference}</Text>
            </Stack>
          )}
        </Group>
      </Card>

      <Grid gutter="md">
        {/* Diagnoses */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder radius="md" h="100%">
            <Title order={5} mb="sm">Diagnoses</Title>
            <Divider mb="sm" />
            {conditions.length === 0 ? (
              <Text size="sm" c="dimmed">No diagnoses recorded for this visit</Text>
            ) : (
              <Stack gap="xs">
                {conditions.map((cond) => {
                  const name = cond.code?.text ?? cond.code?.coding?.[0]?.display ?? 'Unknown';
                  const status = cond.clinicalStatus?.coding?.[0]?.code;
                  return (
                    <Group key={cond.id} justify="space-between">
                      <Text size="sm">{name}</Text>
                      {statusBadge(status, { active: 'green', resolved: 'gray', inactive: 'gray' })}
                    </Group>
                  );
                })}
              </Stack>
            )}
          </Card>
        </Grid.Col>

        {/* Lab Orders */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder radius="md" h="100%">
            <Title order={5} mb="sm">Lab Orders</Title>
            <Divider mb="sm" />
            {serviceRequests.length === 0 ? (
              <Text size="sm" c="dimmed">No lab orders placed in this visit</Text>
            ) : (
              <Stack gap="xs">
                {serviceRequests.map((sr) => {
                  const name = sr.code?.text ?? sr.code?.coding?.[0]?.display ?? 'Unknown Test';
                  return (
                    <Group key={sr.id} justify="space-between">
                      <Text size="sm" component={Link} to={`/ServiceRequest/${sr.id}`} c="blue">
                        {name}
                      </Text>
                      {statusBadge(sr.status, { completed: 'green', active: 'blue', draft: 'gray', revoked: 'red' })}
                    </Group>
                  );
                })}
              </Stack>
            )}
          </Card>
        </Grid.Col>

        {/* Medications */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder radius="md" h="100%">
            <Title order={5} mb="sm">Medications Prescribed</Title>
            <Divider mb="sm" />
            {medications.length === 0 ? (
              <Text size="sm" c="dimmed">No medications prescribed in this visit</Text>
            ) : (
              <Stack gap="xs">
                {medications.map((med) => {
                  const name =
                    med.medicationCodeableConcept?.text ??
                    med.medicationCodeableConcept?.coding?.[0]?.display ??
                    'Unknown';
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

        {/* Procedures */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder radius="md" h="100%">
            <Title order={5} mb="sm">Procedures Performed</Title>
            <Divider mb="sm" />
            {procedures.length === 0 ? (
              <Text size="sm" c="dimmed">No procedures recorded for this visit</Text>
            ) : (
              <Stack gap="xs">
                {procedures.map((proc) => {
                  const name = proc.code?.text ?? proc.code?.coding?.[0]?.display ?? 'Unknown Procedure';
                  return (
                    <Group key={proc.id} justify="space-between">
                      <Text size="sm">{name}</Text>
                      {statusBadge(proc.status, { completed: 'green', 'in-progress': 'orange', 'not-done': 'gray' })}
                    </Group>
                  );
                })}
              </Stack>
            )}
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
