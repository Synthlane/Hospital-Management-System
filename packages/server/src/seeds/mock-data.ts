// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { getDisplayString, isReference, isUUID } from '@medplum/core';
import type { Project, Resource } from '@medplum/fhirtypes';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { v4 } from 'uuid';
import type { Repository } from '../fhir/repo';
import { globalLogger } from '../logger'; 

/**
 * Cache for resolved reference displays to avoid redundant database reads.
 */
const referenceDisplayCache = new Map<string, string>();

/**
 * Recursively populates display properties on all references in a resource.
 * @param resource - The resource to process.
 * @param systemRepo - The repository to use for reading referenced resources.
 */
async function populateReferenceDisplays(resource: Resource, systemRepo: Repository): Promise<void> {
  const processValue = async (value: any): Promise<void> => {
    if (!value) {
      return;
    }

    if (isReference(value)) {
      // If reference doesn't have display, try to read the referenced resource and populate it
      if (value.reference && !value.display) {
        // Check cache first
        const cachedDisplay = referenceDisplayCache.get(value.reference);
        if (cachedDisplay) {
          value.display = cachedDisplay;
          return;
        }

        try {
          const [resourceType, id] = value.reference.split('/');
          if (resourceType && id) {
            const referencedResource = await systemRepo.readResource(resourceType as any, id);
            const display = getDisplayString(referencedResource);
            if (display && display !== value.reference) {
              value.display = display;
              // Cache the display for future use
              referenceDisplayCache.set(value.reference, display);
            }
          }
        } catch (err) {
          // Reference might not exist yet, which is fine - we'll skip it
          globalLogger.debug(`Could not resolve reference ${value.reference} for display: ${(err as Error).message}`);
        }
      }
    } else if (Array.isArray(value)) {
      for (const item of value) {
        await processValue(item);
      }
    } else if (typeof value === 'object') {
      for (const key in value) {
        if (Object.hasOwn(value, key)) {
          await processValue(value[key]);
        }
      }
    }
  };

  await processValue(resource);
}

/**
 * Seeds the database with mock data from the mock-json package.
 * Resources are imported in dependency order to ensure references are valid.
 * @param systemRepo - The system repository to use for creating resources.
 */
export async function seedMockData(systemRepo: Repository): Promise<void> {
  // Resolve path relative to the server package root
  // When running from src/, __dirname is packages/server/src/seeds
  // When running from dist/, __dirname is packages/server/dist/seeds
  const serverRoot = resolve(__dirname, '../..');
  const mockJsonPath = resolve(serverRoot, '../mock-json');

  if (!existsSync(mockJsonPath)) {
    throw new Error(`Mock JSON directory not found at: ${mockJsonPath}`);
  }

  // Get the first non-super-admin, non-R4 project
  // R4 project is a system project for FHIR definitions, not for user data
  let targetProjectId: string | undefined;
  try {
    const bundle = await systemRepo.search<Project>({
      resourceType: 'Project',
      count: 100,
    });

    const projects = (bundle.entry || [])
      .map((entry) => entry.resource)
      .filter((p): p is Project & { id: string } => !!p && !!p.id);

    // Find the first non-super-admin, non-R4 project (user's actual project)
    // Skip R4 project (ID: 161452d9-43b7-5c29-aa7b-c85680fa45c6) as it's for system resources
    const r4ProjectId = '161452d9-43b7-5c29-aa7b-c85680fa45c6';
    const userProject = projects.find((p) => p && !p.superAdmin && p.id !== r4ProjectId);

    if (userProject) {
      targetProjectId = userProject.id;
      globalLogger.info(`Using existing project for mock data: ${userProject.name} (${targetProjectId})`);
    } else {
      // If no user project found, try to find any non-R4 project
      const anyProject = projects.find((p) => p && p.id !== r4ProjectId);
      if (anyProject) {
        targetProjectId = anyProject.id;
        globalLogger.info(`Using project for mock data: ${anyProject.name} (${targetProjectId})`);
      } else {
        globalLogger.warn('No user projects found. Resources will be created without project association.');
        globalLogger.warn('Please create a project first, or the resources may not be visible in your app.');
      }
    }
  } catch (error: any) {
    globalLogger.warn('Could not find existing project, resources will be created without project association', {
      error: error.message,
    });
  }

  globalLogger.info('Starting to seed mock data...', { mockJsonPath, targetProjectId });

  // Define the order of import based on dependencies
  // Organizations must come first, then Locations, Practitioners, Patients, etc.
  const importOrder = [
    'organizations.json',
    'locations.json',
    'practitioners.json',
    'patients.json',
    'coverages.json',
    'conditions.json',
    'observations.json',
    'appointments.json',
    'encounters.json',
    'procedures.json',
    'serviceRequests.json',
    'diagnosticReports.json',
    'medicationRequests.json',
    'questionnaires.json',
    'questionnaireResponses.json',
    'observationDefinitions.json',
    'activityDefinitions.json',
  ];

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  for (const fileName of importOrder) {
    const filePath = join(mockJsonPath, fileName);
    try {
      if (!existsSync(filePath)) {
        globalLogger.warn(`File ${fileName} not found at ${filePath}, skipping...`);
        continue;
      }

      const fileContent = readFileSync(filePath, 'utf-8');
      const resources: Resource[] = JSON.parse(fileContent);

      if (!Array.isArray(resources)) {
        globalLogger.warn(`File ${fileName} does not contain an array, skipping...`);
        continue;
      }

      globalLogger.info(`Importing ${resources.length} resources from ${fileName}...`);

      for (const resource of resources) {
        try {
          // Validate and fix resource ID if needed
          let resourceId = resource.id;
          if (resourceId && !isUUID(resourceId)) {
            globalLogger.warn(
              `Resource ${resource.resourceType} has invalid ID format "${resourceId}", generating new UUID...`
            );
            resourceId = v4();
            resource.id = resourceId;
          } else if (!resourceId) {
            // Generate UUID if ID is missing
            resourceId = v4();
            resource.id = resourceId;
          }

          // Associate resource with project if we have a target project
          if (targetProjectId && resource.resourceType !== 'Project') {
            resource.meta = {
              ...resource.meta,
              project: targetProjectId,
            };
          }

          // Populate reference display properties
          await populateReferenceDisplays(resource, systemRepo);

          // Check if resource already exists
          let existing: Resource | undefined;
          let needsRecreate = false;
          if (resourceId) {
            try {
              existing = await systemRepo.readResource(resource.resourceType, resourceId);
              // If we have a target project and the existing resource is in a different project,
              // we need to delete and recreate it because updating won't move it to a different project
              if (existing && targetProjectId && existing.meta?.project !== targetProjectId) {
                globalLogger.info(
                  `Resource ${resource.resourceType}/${resourceId} is in project ${existing.meta?.project}, needs to be in ${targetProjectId}. Deleting and recreating...`
                );
                try {
                  await systemRepo.deleteResource(resource.resourceType, resourceId);
                  existing = undefined; // Treat as new resource
                  needsRecreate = true;
                } catch (deleteErr: any) {
                  globalLogger.warn(
                    `Could not delete existing resource ${resource.resourceType}/${resourceId}, will try to update instead: ${deleteErr.message}`
                  );
                }
              } else if (existing && targetProjectId && existing.meta?.project === targetProjectId) {
                // Resource is already in the correct project, we can just update it
                globalLogger.debug(`Resource ${resource.resourceType}/${resourceId} is already in correct project`);
              }
            } catch (_err) {
              // Resource doesn't exist, which is fine
              existing = undefined;
            }
          }

          if (existing && !needsRecreate) {
            // Update existing resource (ensuring project is set)
            await systemRepo.updateResource({
              ...resource,
              id: resourceId,
            });
            totalUpdated++;
            globalLogger.debug(`Updated ${resource.resourceType}/${resourceId}`);
          } else {
            // Create new resource with assigned ID (or recreate if deleted)
            await systemRepo.createResource(resource, {
              assignedId: true,
            });
            totalCreated++;
            if (totalCreated % 10 === 0) {
              globalLogger.info(`Created ${totalCreated} resources so far...`);
            }
          }
        } catch (error: any) {
          totalErrors++;
          globalLogger.error(`Error creating/updating resource from ${fileName}:`, {
            error: error.message,
            resourceType: resource.resourceType,
            resourceId: resource.id,
          });
        }
      }

      globalLogger.info(`Finished importing ${fileName}: ${resources.length} resources processed`);
    } catch (error: any) {
      globalLogger.error(`Error reading or parsing ${fileName}:`, error.message);
      totalErrors++;
    }
  }

  globalLogger.info(
    `Mock data seeding completed. Created: ${totalCreated}, Updated: ${totalUpdated}, Errors: ${totalErrors}`
  );

  if (targetProjectId) {
    globalLogger.info(
      `All resources have been associated with project: ${targetProjectId}. Please refresh your browser to see the data.`
    );
  } else {
    globalLogger.warn('Resources were created without a project association. They may not be visible in your app.');
  }
}
