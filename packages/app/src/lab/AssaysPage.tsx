// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Group, Paper, ScrollArea, Table, Text, Title } from '@mantine/core';
import { capitalize, formatRange, sortStringArray } from '@medplum/core';
import type { ObservationDefinition, ObservationDefinitionQualifiedInterval } from '@medplum/fhirtypes';
import { CodeableConceptDisplay, Loading, RangeDisplay, useSearchResources } from '@medplum/react';
import type { JSX } from 'react';
import { Fragment } from 'react';

export function AssaysPage(): JSX.Element {
  const [assays] = useSearchResources('ObservationDefinition', '_count=100');

  if (!assays) {
    return <Loading />;
  }

  const seenCodes = new Set<string>();
  const uniqueAssays = assays.filter((assay) => {
    const key = assay.code?.text ?? assay.id;
    if (!key || seenCodes.has(key)) return false;
    seenCodes.add(key);
    return true;
  });

  return (
    <Paper shadow="xs" m="md" p="xs">
      <Group px="md" py="sm">
        <div>
          <Title order={4}>Lab Assays</Title>
          <Text c="dimmed" size="sm">Individual test definitions with reference ranges and measurement units</Text>
        </div>
      </Group>
      <ScrollArea>
        <Table stickyHeader highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Category</Table.Th>
              <Table.Th>Code</Table.Th>
              <Table.Th>Method</Table.Th>
              <Table.Th>Unit</Table.Th>
              <Table.Th>Precision</Table.Th>
              <Table.Th>Ranges</Table.Th>
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
                <Table.Td>
                  <CodeableConceptDisplay value={assay.method} />
                </Table.Td>
                <Table.Td>{assay.quantitativeDetails?.unit?.text}</Table.Td>
                <Table.Td>{assay.quantitativeDetails?.decimalPrecision}</Table.Td>
                <Table.Td>
                  <IntervalsDisplay ranges={assay.qualifiedInterval} />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Paper>
  );
}

interface IntervalsDisplayProps {
  readonly ranges: ObservationDefinitionQualifiedInterval[] | undefined;
}

function IntervalsDisplay(props: IntervalsDisplayProps): JSX.Element | null {
  const { ranges } = props;
  if (!ranges) {
    return null;
  }

  const genders = getUnique(ranges.map((r) => r.gender));
  if (genders.length > 1) {
    sortStringArray(genders);
    return (
      <>
        {genders.map((gender) => (
          <Fragment key={gender}>
            <div>
              <strong>{capitalize(gender)}</strong>
            </div>
            <IntervalsDisplay ranges={props.ranges?.filter((r) => r.gender === gender)} />
          </Fragment>
        ))}
      </>
    );
  }

  const ages = getUnique(ranges.map((r) => r.age && formatRange(r.age)));
  if (ages.length > 1) {
    sortStringArray(ages);
    return (
      <>
        {ages.map((age) => (
          <Fragment key={age}>
            <div>
              <strong>{capitalize(age)}</strong>
            </div>
            <IntervalsDisplay ranges={props.ranges?.filter((r) => formatRange(r.age) === age)} />
          </Fragment>
        ))}
      </>
    );
  }

  return (
    <>
      {ranges.map((range: ObservationDefinitionQualifiedInterval) => (
        <table key={`range-${range.condition}`}>
          <tbody>
            <tr>
              <td>{range.condition}</td>
              <td>
                <RangeDisplay value={range.range} />
              </td>
            </tr>
          </tbody>
        </table>
      ))}
    </>
  );
}

function getUnique(arr: (string | undefined)[]): string[] {
  return [...new Set<string>(arr.filter((e) => !!e) as string[])];
}
