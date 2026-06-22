// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Group, Paper, ScrollArea, Table, Text, Title } from '@mantine/core';
import type { ObservationDefinition } from '@medplum/fhirtypes';
import { CodeableConceptDisplay, Loading, useSearchResources } from '@medplum/react';
import type { JSX } from 'react';

export function PanelsPage(): JSX.Element {
  const [panels] = useSearchResources('ActivityDefinition', '_count=100');
  const [assays] = useSearchResources('ObservationDefinition', '_count=100');

  if (!panels || !assays) {
    return <Loading />;
  }

  const seenAssayCodes = new Set<string>();
  const uniqueAssays = assays.filter((assay) => {
    const key = assay.code?.text ?? assay.id;
    if (!key || seenAssayCodes.has(key)) return false;
    seenAssayCodes.add(key);
    return true;
  });

  const seenNames = new Set<string>();
  const activePanels = panels.filter((panel) => {
    if (!panel.name || seenNames.has(panel.name)) return false;
    const hasValidRef = panel.observationResultRequirement?.some((r) =>
      assays.some((a) => r.reference?.includes(a.id as string))
    );
    if (hasValidRef) {
      seenNames.add(panel.name);
      return true;
    }
    return false;
  });

  return (
    <Paper shadow="xs" m="md" p="xs">
      <Group px="md" py="sm">
        <div>
          <Title order={4}>Lab Panels</Title>
          <Text c="dimmed" size="sm">Panel definitions showing which assays are included in each panel</Text>
        </div>
      </Group>
      <ScrollArea>
        <Table stickyHeader highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Category</Table.Th>
              <Table.Th>Assay</Table.Th>
              {activePanels.map((panel) => (
                <Table.Th key={panel.id}>{panel.name}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {uniqueAssays.map((assay: ObservationDefinition) => (
              <Table.Tr key={assay.id}>
                <Table.Td>
                  <CodeableConceptDisplay value={assay.category?.[0]} />
                </Table.Td>
                <Table.Td>
                  <CodeableConceptDisplay value={assay.code} />
                </Table.Td>
                {activePanels.map((panel) => (
                  <Table.Td key={panel.id} ta="center">
                    {panel.observationResultRequirement?.find((r) => r.reference?.includes(assay.id as string))
                      ? '✅'
                      : ''}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Paper>
  );
}
