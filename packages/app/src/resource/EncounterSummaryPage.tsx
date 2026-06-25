// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Badge, Card, Divider, Grid, Group, Loader, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import type { Condition, Encounter, Observation, Procedure, ServiceRequest } from '@medplum/fhirtypes';
import { useMedplum, useResource } from '@medplum/react';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';

function statusBadge(status: string | undefined, colorMap: Record<string, string>): JSX.Element {
  const color = colorMap[status ?? ''] ?? 'gray';
  return <Badge color={color} size="xs" variant="light">{status ?? '—'}</Badge>;
}

function getVitalDisplay(obs: Observation): string {
  // Blood pressure: read from components
  if (obs.component && obs.component.length >= 2) {
    const sys = obs.component.find((c) => c.code?.coding?.[0]?.code === '8480-6');
    const dia = obs.component.find((c) => c.code?.coding?.[0]?.code === '8462-4');
    if (sys?.valueQuantity && dia?.valueQuantity) {
      return `${sys.valueQuantity.value} / ${dia.valueQuantity.value} ${sys.valueQuantity.unit ?? 'mmHg'}`;
    }
  }
  if (obs.valueQuantity) {
    return `${obs.valueQuantity.value} ${obs.valueQuantity.unit ?? ''}`.trim();
  }
  if (obs.valueString) return obs.valueString;
  return '—';
}

type VitalStatus = 'normal' | 'warning' | 'critical';

function getVitalStatus(obs: Observation): VitalStatus {
  const code = obs.code?.coding?.[0]?.code;

  // Blood pressure — ACC/AHA 2017 guidelines
  // Normal: sys < 120 AND dia < 80
  // Elevated / Stage 1–2 HTN (warning): sys 120–179 OR dia 80–119 OR hypotension sys 80–89
  // Hypertensive crisis (critical): sys ≥ 180 OR dia ≥ 120 | Severe hypotension: sys < 80
  if (obs.component) {
    const sys = obs.component.find((c) => c.code?.coding?.[0]?.code === '8480-6')?.valueQuantity?.value;
    const dia = obs.component.find((c) => c.code?.coding?.[0]?.code === '8462-4')?.valueQuantity?.value;
    if (sys !== undefined && dia !== undefined) {
      if (sys >= 180 || dia >= 120 || sys < 80) return 'critical';
      if (sys >= 120 || dia >= 80 || sys < 90) return 'warning';
      return 'normal';
    }
  }

  const val = obs.valueQuantity?.value;
  if (val === undefined) return 'normal';

  switch (code) {
    case '8867-4': // Heart rate (bpm) — Normal 60–100, Tachy >100 warning, >120 critical; Brady <60 warning, <50 critical
      if (val > 120 || val < 50) return 'critical';
      if (val > 100 || val < 60) return 'warning';
      return 'normal';
    case '8310-5': // Temperature (°C) — Normal 36.1–37.5; low-grade fever 37.5–39.0 warning; >39.0 or <35.0 critical
      if (val > 39.0 || val < 35.0) return 'critical';
      if (val > 37.5 || val < 36.1) return 'warning';
      return 'normal';
    case '9279-1': // Respiratory rate (/min) — Normal 12–20; tachypnea >20 warning, >25 critical; bradypnea <12 warning, <10 critical
      if (val > 25 || val < 10) return 'critical';
      if (val > 20 || val < 12) return 'warning';
      return 'normal';
    case '59408-5': // SpO2 (%) — Normal ≥95%; mild hypoxia 90–94% warning; severe <90% critical
      if (val < 90) return 'critical';
      if (val < 95) return 'warning';
      return 'normal';
    default:
      return 'normal';
  }
}

const VITAL_STATUS_COLOR: Record<VitalStatus, string> = {
  normal: 'var(--mantine-color-green-7)',
  warning: 'var(--mantine-color-orange-6)',
  critical: 'var(--mantine-color-red-6)',
};

const VITAL_STATUS_BG: Record<VitalStatus, string> = {
  normal: 'var(--mantine-color-green-0)',
  warning: 'var(--mantine-color-orange-0)',
  critical: 'var(--mantine-color-red-0)',
};

const VITAL_STATUS_BORDER: Record<VitalStatus, string> = {
  normal: 'var(--mantine-color-green-3)',
  warning: 'var(--mantine-color-orange-3)',
  critical: 'var(--mantine-color-red-3)',
};

// Ordered list of vital LOINC codes to display in a consistent order
const VITAL_ORDER: Record<string, number> = {
  '85354-9': 0, // Blood pressure
  '8867-4': 1,  // Heart rate
  '8310-5': 2,  // Temperature
  '9279-1': 3,  // Respiratory rate
  '59408-5': 4, // SpO2
  '29463-7': 5, // Weight
  '8302-2': 6,  // Height
  '39156-5': 7, // BMI
};

export function EncounterSummaryPage(): JSX.Element {
  const medplum = useMedplum();
  const { id } = useParams() as { id: string };

  const encounter = useResource({ reference: `Encounter/${id}` });

  const [conditions, setConditions] = useState<Condition[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [vitals, setVitals] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function load(): Promise<void> {
      setLoading(true);
      try {
        const [condB, srB, procB, vitalB] = await Promise.all([
          medplum.search('Condition', `encounter=Encounter/${id}&_count=20`),
          medplum.search('ServiceRequest', `encounter=Encounter/${id}&_count=20`),
          medplum.search('Procedure', `encounter=Encounter/${id}&_count=20`),
          medplum.search('Observation', `encounter=Encounter/${id}&category=vital-signs&_count=20`),
        ]);
        setConditions((condB.entry ?? []).map((e) => e.resource as Condition));
        setServiceRequests((srB.entry ?? []).map((e) => e.resource as ServiceRequest));
        setProcedures((procB.entry ?? []).map((e) => e.resource as Procedure));
        const rawVitals = (vitalB.entry ?? []).map((e) => e.resource as Observation);
        rawVitals.sort((a, b) => {
          const aCode = a.code?.coding?.[0]?.code ?? '';
          const bCode = b.code?.coding?.[0]?.code ?? '';
          return (VITAL_ORDER[aCode] ?? 99) - (VITAL_ORDER[bCode] ?? 99);
        });
        setVitals(rawVitals);
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

  // Chief complaints from Encounter.reasonCode
  const complaints: string[] = (enc.reasonCode ?? []).map(
    (rc) => rc.text ?? rc.coding?.[0]?.display ?? '—'
  );

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

      {/* Chief Complaints — full width */}
      <Card withBorder radius="md" py="sm" px="md">
        <Text size="sm" fw={600} c="dimmed" mb="xs">Chief Complaints / Symptoms</Text>
        {complaints.length === 0 ? (
          <Text size="sm" c="dimmed">No complaints recorded for this visit</Text>
        ) : (
          <Stack gap={6}>
            {complaints.map((c, i) => (
              <Group key={i} gap="xs" align="center">
                <Text size="sm" c="orange" fw={600}>→</Text>
                <Text size="sm">{c}</Text>
              </Group>
            ))}
          </Stack>
        )}
      </Card>

      {/* Vitals — full width */}
      <Card withBorder radius="md" py="sm" px="md">
        <Text size="sm" fw={600} c="dimmed" mb="xs">Vitals</Text>
        {vitals.length === 0 ? (
          <Text size="sm" c="dimmed">No vitals recorded for this visit</Text>
        ) : (
          <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="sm">
            {vitals.map((obs) => {
              const label = obs.code?.text ?? obs.code?.coding?.[0]?.display ?? '—';
              const value = getVitalDisplay(obs);
              const status = getVitalStatus(obs);
              return (
                <Paper
                  key={obs.id}
                  p="sm"
                  radius="md"
                  withBorder
                  style={{
                    borderColor: VITAL_STATUS_BORDER[status],
                    backgroundColor: VITAL_STATUS_BG[status],
                  }}
                >
                  <Text size="xs" c="dimmed" mb={4}>{label}</Text>
                  <Text size="md" fw={700} lh={1} style={{ color: VITAL_STATUS_COLOR[status] }}>
                    {value}
                  </Text>
                </Paper>
              );
            })}
          </SimpleGrid>
        )}
      </Card>

      {/* Clinical Boxes */}
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
