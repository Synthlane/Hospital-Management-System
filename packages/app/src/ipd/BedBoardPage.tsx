// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Badge, Box, Group, Paper, SimpleGrid, Stack, Text, Title, Tooltip } from '@mantine/core';
import type { JSX } from 'react';

type BedStatus = 'occupied' | 'available' | 'maintenance' | 'reserved';

interface Bed {
  id: string;
  status: BedStatus;
  patient?: string;
  since?: string;
}

interface Ward {
  name: string;
  color: string;
  beds: Bed[];
}

const WARDS: Ward[] = [
  {
    name: 'General Ward',
    color: 'blue',
    beds: [
      { id: 'GW-101', status: 'occupied',    patient: 'Rajesh Kumar',  since: '3d' },
      { id: 'GW-102', status: 'available' },
      { id: 'GW-103', status: 'occupied',    patient: 'Sanjay Gupta',  since: '1d' },
      { id: 'GW-104', status: 'available' },
      { id: 'GW-105', status: 'maintenance' },
      { id: 'GW-106', status: 'available' },
      { id: 'GW-107', status: 'occupied',    patient: 'Pooja Mehta',   since: '2d' },
      { id: 'GW-108', status: 'occupied',    patient: 'Arjun Nair',    since: '5d' },
      { id: 'GW-109', status: 'available' },
      { id: 'GW-110', status: 'reserved' },
      { id: 'GW-111', status: 'occupied',    patient: 'Rekha Singh',   since: '4d' },
      { id: 'GW-112', status: 'available' },
      { id: 'GW-113', status: 'occupied',    patient: 'Vikram Das',    since: '2d' },
      { id: 'GW-114', status: 'available' },
      { id: 'GW-115', status: 'occupied',    patient: 'Sunita Verma',  since: '6d' },
      { id: 'GW-116', status: 'available' },
      { id: 'GW-117', status: 'occupied',    patient: 'Amit Patel',    since: '1d' },
      { id: 'GW-118', status: 'available' },
      { id: 'GW-119', status: 'occupied',    patient: 'Aryan Desai',   since: '1d' },
      { id: 'GW-120', status: 'available' },
      { id: 'GW-121', status: 'occupied',    patient: 'Nita Joshi',    since: '3d' },
      { id: 'GW-122', status: 'occupied',    patient: 'Kiran Rao',     since: '1d' },
    ],
  },
  {
    name: 'ICU',
    color: 'red',
    beds: [
      { id: 'ICU-01', status: 'available' },
      { id: 'ICU-02', status: 'occupied',    patient: 'Priya Patel',   since: '1d' },
      { id: 'ICU-03', status: 'available' },
      { id: 'ICU-04', status: 'reserved' },
      { id: 'ICU-05', status: 'occupied',    patient: 'Lakshmi Iyer',  since: '2d' },
      { id: 'ICU-06', status: 'available' },
      { id: 'ICU-07', status: 'maintenance' },
      { id: 'ICU-08', status: 'occupied',    patient: 'Vivek Tiwari',  since: '4d' },
      { id: 'ICU-09', status: 'occupied',    patient: 'Renu Kapoor',   since: '1d' },
      { id: 'ICU-10', status: 'occupied',    patient: 'Harish Nair',   since: '3d' },
    ],
  },
  {
    name: 'Surgical Ward',
    color: 'violet',
    beds: [
      { id: 'SW-201', status: 'available' },
      { id: 'SW-202', status: 'occupied',    patient: 'Deepa Reddy',   since: '3d' },
      { id: 'SW-203', status: 'available' },
      { id: 'SW-204', status: 'occupied',    patient: 'Manoj Kumar',   since: '2d' },
      { id: 'SW-205', status: 'occupied',    patient: 'Mohan Singh',   since: '2d' },
      { id: 'SW-206', status: 'available' },
      { id: 'SW-207', status: 'occupied',    patient: 'Geeta Sharma',  since: '5d' },
      { id: 'SW-208', status: 'occupied',    patient: 'Neha Joshi',    since: '1d' },
      { id: 'SW-209', status: 'available' },
      { id: 'SW-210', status: 'occupied',    patient: 'Ritu Sharma',   since: '4d' },
      { id: 'SW-211', status: 'maintenance' },
      { id: 'SW-212', status: 'available' },
    ],
  },
  {
    name: 'Maternity Ward',
    color: 'pink',
    beds: [
      { id: 'MW-301', status: 'available' },
      { id: 'MW-302', status: 'occupied',    patient: 'Sonal Mehta',   since: '2d' },
      { id: 'MW-303', status: 'occupied',    patient: 'Kavita Shah',   since: '1d' },
      { id: 'MW-304', status: 'available' },
      { id: 'MW-305', status: 'reserved' },
      { id: 'MW-306', status: 'available' },
      { id: 'MW-307', status: 'occupied',    patient: 'Anita Pillai',  since: '2d' },
      { id: 'MW-308', status: 'available' },
    ],
  },
  {
    name: 'Pediatric Ward',
    color: 'teal',
    beds: [
      { id: 'PW-401', status: 'available' },
      { id: 'PW-402', status: 'occupied',    patient: 'Deepak Mehta',  since: '2d' },
      { id: 'PW-403', status: 'available' },
      { id: 'PW-404', status: 'occupied',    patient: 'Riya Iyer',     since: '1d' },
      { id: 'PW-405', status: 'available' },
      { id: 'PW-406', status: 'occupied',    patient: 'Meera Nair',    since: '3d' },
      { id: 'PW-407', status: 'available' },
      { id: 'PW-408', status: 'maintenance' },
    ],
  },
];

const BED_STYLE: Record<BedStatus, { bg: string; border: string; label: string }> = {
  occupied:    { bg: '#fff1f2', border: '#fda4af', label: 'Occupied'    },
  available:   { bg: '#f0fdf4', border: '#86efac', label: 'Available'   },
  maintenance: { bg: '#fafafa', border: '#d1d5db', label: 'Maintenance' },
  reserved:    { bg: '#fefce8', border: '#fde047', label: 'Reserved'    },
};

function BedCell({ bed }: { bed: Bed }): JSX.Element {
  const s = BED_STYLE[bed.status];
  return (
    <Tooltip
      label={
        bed.status === 'occupied' && bed.patient
          ? `${bed.patient} · ${bed.since} stay`
          : s.label
      }
      withArrow
      position="top"
    >
      <Box
        style={{
          background: s.bg,
          border: `1.5px solid ${s.border}`,
          borderRadius: 6,
          padding: '6px 8px',
          cursor: bed.status === 'occupied' ? 'pointer' : 'default',
          minWidth: 70,
        }}
      >
        <Text size="xs" fw={700} ff="monospace">{bed.id}</Text>
        {bed.status === 'occupied' && bed.patient && (
          <Text size="xs" c="dimmed" lineClamp={1} style={{ fontSize: 10 }}>
            {bed.patient.split(' ')[0]}
          </Text>
        )}
        {bed.status !== 'occupied' && (
          <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>{s.label}</Text>
        )}
      </Box>
    </Tooltip>
  );
}

export function BedBoardPage(): JSX.Element {
  const totalBeds      = WARDS.reduce((s, w) => s + w.beds.length, 0);
  const occupied       = WARDS.flatMap((w) => w.beds).filter((b) => b.status === 'occupied').length;
  const available      = WARDS.flatMap((w) => w.beds).filter((b) => b.status === 'available').length;
  const maintenance    = WARDS.flatMap((w) => w.beds).filter((b) => b.status === 'maintenance').length;
  const reserved       = WARDS.flatMap((w) => w.beds).filter((b) => b.status === 'reserved').length;

  return (
    <Stack p="md" gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>Bed Board</Title>
          <Text size="sm" c="dimmed" mt={2}>Live bed availability across all wards</Text>
        </div>
        <Group gap="xs">
          {[
            { label: 'Available',   value: available,   color: 'green' },
            { label: 'Occupied',    value: occupied,    color: 'red'   },
            { label: 'Reserved',    value: reserved,    color: 'yellow'},
            { label: 'Maintenance', value: maintenance, color: 'gray'  },
          ].map((s) => (
            <Badge key={s.label} color={s.color} variant="light" size="lg">
              {s.value} {s.label}
            </Badge>
          ))}
        </Group>
      </Group>

      {/* Summary */}
      <Group gap="md">
        {[
          { label: 'Total Beds',   value: totalBeds,                                    color: 'gray'   },
          { label: 'Occupied',     value: occupied,                                     color: 'blue'   },
          { label: 'Occupancy',    value: `${Math.round((occupied / totalBeds) * 100)}%`, color: 'violet' },
          { label: 'Available',    value: available,                                    color: 'green'  },
        ].map((s) => (
          <Paper key={s.label} p="md" radius="md" withBorder style={{ minWidth: 120 }}>
            <Text size="xs" c="dimmed">{s.label}</Text>
            <Text size="xl" fw={700} c={s.color}>{s.value}</Text>
          </Paper>
        ))}
      </Group>

      {/* Legend */}
      <Group gap="md">
        {Object.entries(BED_STYLE).map(([status, s]) => (
          <Group key={status} gap={6}>
            <Box style={{ width: 14, height: 14, background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 3 }} />
            <Text size="xs" c="dimmed">{s.label}</Text>
          </Group>
        ))}
      </Group>

      {/* Ward grids */}
      <Stack gap="xl">
        {WARDS.map((ward) => {
          const wardOccupied  = ward.beds.filter((b) => b.status === 'occupied').length;
          const wardAvailable = ward.beds.filter((b) => b.status === 'available').length;
          return (
            <Paper key={ward.name} p="md" radius="md" withBorder>
              <Group justify="space-between" mb="md">
                <Group gap="sm">
                  <Text fw={700} size="md">{ward.name}</Text>
                  <Badge color={ward.color} variant="light">{wardOccupied}/{ward.beds.length} occupied</Badge>
                </Group>
                <Text size="sm" c="green" fw={500}>{wardAvailable} available</Text>
              </Group>
              <SimpleGrid cols={{ base: 4, sm: 6, md: 8, lg: 10 }} spacing="xs">
                {ward.beds.map((bed) => (
                  <BedCell key={bed.id} bed={bed} />
                ))}
              </SimpleGrid>
            </Paper>
          );
        })}
      </Stack>

      <Box p="sm" style={{ background: 'var(--mantine-color-blue-0)', borderRadius: 8, border: '1px solid var(--mantine-color-blue-2)' }}>
        <Text size="sm" c="blue.7">
          <strong>Coming soon:</strong> Click a bed to assign or transfer a patient. Beds will update in real time from FHIR Location resources.
        </Text>
      </Box>
    </Stack>
  );
}
