import {
  entitySchema,
  edgeSchema,
  schemaMap,
  baseEntitySchema,
} from '@schema/schemas';
import type { Entity, Edge, EntityType } from '@schema/types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EntityValidationResult {
  success: boolean;
  entity: Entity | null;
  errors: string[];
}

export interface EdgeValidationResult {
  success: boolean;
  edge: Edge | null;
  errors: string[];
}

// ─── Entity Validation ──────────────────────────────────────────────────────

/**
 * Validates raw entity data against the appropriate Zod schema based on the
 * `type` field. Uses the discriminated union schema from the schema package
 * to select the correct type-specific schema automatically.
 *
 * Returns a normalized result with the parsed entity on success, or a list
 * of human-readable error strings on failure.
 */
export function validateEntityData(data: unknown): EntityValidationResult {
  // First check that we have an object with a type field
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      entity: null,
      errors: ['Entity data must be a non-null object'],
    };
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.type !== 'string') {
    return {
      success: false,
      entity: null,
      errors: ['Entity must have a "type" field of type string'],
    };
  }

  // Check if the type is recognized before attempting full validation
  const entityType = obj.type as string;
  if (!(entityType in schemaMap)) {
    return {
      success: false,
      entity: null,
      errors: [`Unknown entity type: "${entityType}". Valid types: ${Object.keys(schemaMap).join(', ')}`],
    };
  }

  // Validate against the type-specific schema for better error messages
  const typeSchema = schemaMap[entityType as EntityType];
  const result = typeSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      entity: result.data as Entity,
      errors: [],
    };
  }

  // Format Zod errors into readable strings
  const errors = result.error.issues.map((issue) => {
    const fieldPath = issue.path.length > 0 ? issue.path.join('.') : '(root)';
    return `[${fieldPath}] ${issue.message}`;
  });

  return {
    success: false,
    entity: null,
    errors,
  };
}

/**
 * Performs a lightweight validation of only the base entity fields, ignoring
 * type-specific extensions. Useful for quick pre-checks or when processing
 * entities with unknown type extensions.
 */
export function validateBaseEntityData(data: unknown): EntityValidationResult {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      entity: null,
      errors: ['Entity data must be a non-null object'],
    };
  }

  const result = baseEntitySchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      entity: result.data as unknown as Entity,
      errors: [],
    };
  }

  const errors = result.error.issues.map((issue) => {
    const fieldPath = issue.path.length > 0 ? issue.path.join('.') : '(root)';
    return `[${fieldPath}] ${issue.message}`;
  });

  return {
    success: false,
    entity: null,
    errors,
  };
}

// ─── Edge Validation ────────────────────────────────────────────────────────

/**
 * Validates raw edge data against the edge Zod schema.
 * Checks that from_id, to_id, edge_type, and other required fields are present
 * and correctly typed.
 */
export function validateEdgeData(data: unknown): EdgeValidationResult {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      edge: null,
      errors: ['Edge data must be a non-null object'],
    };
  }

  const result = edgeSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      edge: result.data as Edge,
      errors: [],
    };
  }

  const errors = result.error.issues.map((issue) => {
    const fieldPath = issue.path.length > 0 ? issue.path.join('.') : '(root)';
    return `[${fieldPath}] ${issue.message}`;
  });

  return {
    success: false,
    edge: null,
    errors,
  };
}

// ─── Batch Validation ───────────────────────────────────────────────────────

export interface BatchValidationReport {
  total: number;
  valid: number;
  invalid: number;
  entityErrors: Array<{ id: string; errors: string[] }>;
  edgeErrors: Array<{ id: string; errors: string[] }>;
}

/**
 * Validates an array of entity data objects and an array of edge data objects
 * in a single pass. Returns a consolidated report.
 */
export function validateBatch(
  entities: unknown[],
  edges: unknown[]
): BatchValidationReport {
  const report: BatchValidationReport = {
    total: entities.length + edges.length,
    valid: 0,
    invalid: 0,
    entityErrors: [],
    edgeErrors: [],
  };

  for (const entityData of entities) {
    const result = validateEntityData(entityData);
    if (result.success) {
      report.valid++;
    } else {
      report.invalid++;
      const id =
        typeof entityData === 'object' && entityData !== null
          ? ((entityData as Record<string, unknown>).id as string) || 'unknown'
          : 'unknown';
      report.entityErrors.push({ id, errors: result.errors });
    }
  }

  for (const edgeData of edges) {
    const result = validateEdgeData(edgeData);
    if (result.success) {
      report.valid++;
    } else {
      report.invalid++;
      const id =
        typeof edgeData === 'object' && edgeData !== null
          ? ((edgeData as Record<string, unknown>).id as string) || 'unknown'
          : 'unknown';
      report.edgeErrors.push({ id, errors: result.errors });
    }
  }

  return report;
}

// ─── Referential Integrity Checks ───────────────────────────────────────────

/**
 * Checks that all entity IDs referenced in edges actually exist in the
 * provided entity set. Returns a list of broken references.
 */
export function checkEdgeIntegrity(
  entityIds: Set<string>,
  edges: Edge[]
): string[] {
  const issues: string[] = [];

  for (const edge of edges) {
    if (!entityIds.has(edge.from_id)) {
      issues.push(
        `Edge "${edge.id}": from_id "${edge.from_id}" references non-existent entity`
      );
    }
    if (!entityIds.has(edge.to_id)) {
      issues.push(
        `Edge "${edge.id}": to_id "${edge.to_id}" references non-existent entity`
      );
    }
  }

  return issues;
}

/**
 * Checks that all entity cross-references (links, tags, artifact IDs, etc.)
 * point to entities that exist in the provided set. Returns a list of issues.
 */
export function checkEntityCrossReferences(
  entityIds: Set<string>,
  entity: Entity
): string[] {
  const issues: string[] = [];

  // Check links array
  if ('links' in entity && Array.isArray(entity.links)) {
    for (const linkId of entity.links) {
      if (typeof linkId === 'string' && linkId.length > 0 && !entityIds.has(linkId)) {
        issues.push(
          `Entity "${entity.id}": link "${linkId}" references non-existent entity`
        );
      }
    }
  }

  // Check type-specific references
  if (entity.type === 'project') {
    if (entity.advisor_id && !entityIds.has(entity.advisor_id)) {
      issues.push(
        `Project "${entity.id}": advisor_id "${entity.advisor_id}" references non-existent entity`
      );
    }
    if (entity.institution_id && !entityIds.has(entity.institution_id)) {
      issues.push(
        `Project "${entity.id}": institution_id "${entity.institution_id}" references non-existent entity`
      );
    }
    const artifacts = entity.artifacts;
    for (const category of ['repos', 'datasets', 'experiments', 'publications', 'notes'] as const) {
      for (const refId of artifacts[category]) {
        if (!entityIds.has(refId)) {
          issues.push(
            `Project "${entity.id}": artifacts.${category} references non-existent entity "${refId}"`
          );
        }
      }
    }
  }

  if (entity.type === 'publication') {
    for (const projId of entity.associated_projects) {
      if (!entityIds.has(projId)) {
        issues.push(
          `Publication "${entity.id}": associated_projects references non-existent entity "${projId}"`
        );
      }
    }
  }

  return issues;
}
