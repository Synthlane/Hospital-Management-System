// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Badge, Button, Card, Divider, Group, Loader, Stack, Text, Title } from '@mantine/core';
import type { Encounter, MedicationRequest } from '@medplum/fhirtypes';
import { useMedplum, useResource } from '@medplum/react';
import { IconCalendarOff, IconDownload, IconPillOff } from '@tabler/icons-react';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';

const PRESCRIPTION_PDF_URL = '/reports/Example-Prescription.pdf';

const STATUS_COLOR: Record<string, string> = {
  active: 'green',
  completed: 'blue',
  stopped: 'orange',
  cancelled: 'red',
  draft: 'gray',
  'on-hold': 'yellow',
  'entered-in-error': 'red',
  unknown: 'gray',
};

export function EncounterMedicationsPage(): JSX.Element {
  const medplum = useMedplum();
  const { id } = useParams() as { id: string };
  const encounter = useResource({ reference: `Encounter/${id}` }) as Encounter | undefined;
  const [medications, setMedications] = useState<MedicationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const bundle = await medplum.search('MedicationRequest', `encounter=Encounter/${id}&_count=50`);
        setMedications((bundle.entry ?? []).map((e) => e.resource as MedicationRequest));
      } catch (err) {
        console.error('Medications load error:', err);
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
        <Text c="dimmed" size="sm">Loading prescriptions…</Text>
      </Stack>
    );
  }

  const encStatus = encounter.status;
  const isPlanned = encStatus === 'planned' || encStatus === 'booked' || encStatus === 'arrived' || encStatus === 'waitlist';
  const visitDate = encounter.period?.start
    ? new Date(encounter.period.start).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  // Consultation not yet completed
  if (isPlanned) {
    return (
      <Stack p="md">
        <Card withBorder radius="md">
          <Stack align="center" py="xl" gap="sm">
            <IconCalendarOff size={40} color="var(--mantine-color-blue-5)" />
            <Text fw={600} size="sm">Consultation not yet completed</Text>
            <Text size="sm" c="dimmed" ta="center" maw={420}>
              This consultation{visitDate ? ` (scheduled for ${visitDate})` : ''} has not taken place yet.
              Prescriptions will be available here once the visit is completed.
            </Text>
            <Badge color="blue" variant="light" size="sm">{encStatus}</Badge>
          </Stack>
        </Card>
      </Stack>
    );
  }

  return (
    <Stack p="md" gap="md">
      {/* Medications list */}
      <Card withBorder radius="md">
        <Group justify="space-between" mb="sm">
          <Title order={5}>Medications Prescribed</Title>
          {medications.length > 0 && (
            <Button
              size="xs"
              variant="light"
              leftSection={<IconDownload size={14} />}
              component="a"
              href={PRESCRIPTION_PDF_URL}
              download="Prescription.pdf"
            >
              Download Prescription
            </Button>
          )}
        </Group>
        <Divider mb="sm" />
        {medications.length === 0 ? (
          <Stack align="center" py="lg" gap="sm">
            <IconPillOff size={32} color="var(--mantine-color-gray-4)" />
            <Text size="sm" c="dimmed" ta="center">
              No medications were prescribed during this visit.
            </Text>
          </Stack>
        ) : (
          <Stack gap="sm">
            {medications.map((med) => {
              const name =
                med.medicationCodeableConcept?.text ??
                med.medicationCodeableConcept?.coding?.[0]?.display ??
                'Unknown medication';
              const dosage = med.dosageInstruction?.[0]?.text ?? '—';
              const route = med.dosageInstruction?.[0]?.route?.coding?.[0]?.display;
              const prescriber = med.requester?.display ?? '—';
              const status = med.status ?? 'unknown';
              return (
                <Group key={med.id} justify="space-between" align="flex-start" wrap="nowrap">
                  <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={600}>{name}</Text>
                    <Text size="xs" c="dimmed">{dosage}{route ? ` · ${route}` : ''}</Text>
                    <Text size="xs" c="dimmed">Prescribed by: {prescriber}</Text>
                  </Stack>
                  <Badge color={STATUS_COLOR[status] ?? 'gray'} size="xs" variant="light" style={{ flexShrink: 0 }}>
                    {status}
                  </Badge>
                </Group>
              );
            })}
          </Stack>
        )}
      </Card>

    </Stack>
  );
}
