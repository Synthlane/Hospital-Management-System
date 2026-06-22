// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { Box, Group, Stack, Text, Tooltip } from '@mantine/core';
import {
  IconCircleCheck,
  IconCircleDashed,
  IconClipboardList,
  IconDroplet,
  IconFlask,
  IconReportMedical,
  IconStethoscope,
} from '@tabler/icons-react';
import type { JSX } from 'react';
import classes from './LabOrderStepper.module.css';

interface Step {
  label: string;
  icon: JSX.Element;
  statuses: string[];
}

const STEPS: Step[] = [
  { label: 'Ordered', icon: <IconClipboardList size={20} />, statuses: ['draft', 'active'] },
  { label: 'Specimen Collected', icon: <IconDroplet size={20} />, statuses: ['active'] },
  { label: 'Processing', icon: <IconFlask size={20} />, statuses: ['active'] },
  { label: 'Result Ready', icon: <IconReportMedical size={20} />, statuses: ['completed'] },
  { label: 'Reviewed', icon: <IconStethoscope size={20} />, statuses: ['completed'] },
];

function getActiveStep(status: string | undefined): number {
  switch (status) {
    case 'draft':
      return 0;
    case 'active':
      return 1;
    case 'completed':
      return 4;
    case 'revoked':
    case 'cancelled':
      return -1;
    default:
      return 0;
  }
}

interface LabOrderStepperProps {
  status: string | undefined;
}

export function LabOrderStepper({ status }: LabOrderStepperProps): JSX.Element {
  const activeStep = getActiveStep(status);
  const isCancelled = status === 'revoked' || status === 'cancelled';

  return (
    <Box className={classes.container}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        {STEPS.map((step, idx) => {
          const isCompleted = activeStep > idx;
          const isCurrent = activeStep === idx;
          const isPending = activeStep < idx;

          return (
            <Stack key={step.label} className={classes.stepWrapper} align="center" gap={4}>
              {/* Connector line */}
              {idx > 0 && (
                <div
                  className={`${classes.connector} ${isCompleted || isCurrent ? classes.connectorActive : ''}`}
                />
              )}

              {/* Step icon */}
              <Tooltip label={step.label} withArrow>
                <Box
                  className={`${classes.iconBox} ${
                    isCancelled
                      ? classes.iconCancelled
                      : isCompleted
                        ? classes.iconCompleted
                        : isCurrent
                          ? classes.iconCurrent
                          : classes.iconPending
                  }`}
                >
                  {isCompleted ? <IconCircleCheck size={20} /> : isPending || isCancelled ? <IconCircleDashed size={20} /> : step.icon}
                </Box>
              </Tooltip>

              <Text
                size="xs"
                ta="center"
                c={isCancelled ? 'red' : isCompleted ? 'green' : isCurrent ? 'blue' : 'dimmed'}
                fw={isCurrent ? 600 : 400}
                className={classes.label}
              >
                {step.label}
              </Text>
            </Stack>
          );
        })}
      </Group>
    </Box>
  );
}
