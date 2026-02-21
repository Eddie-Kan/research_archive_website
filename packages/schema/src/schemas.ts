import { z } from 'zod';
import type { EntityType } from './types.js';

// ─── Bilingual & Locale ──────────────────────────────────────────────────────

export const bilingualTextSchema = z.object({
  en: z.string(),
  'zh-Hans': z.string(),
});

export const localeSchema = z.enum(['en', 'zh-Hans']);

// ─── Enums ───────────────────────────────────────────────────────────────────

export const entityTypeSchema = z.enum([
  'project',
  'publication',
  'experiment',
  'dataset',
  'model',
  'repo',
  'note',
  'lit_review',
  'meeting',
  'idea',
  'skill',
  'method',
  'material_system',
  'metric',
  'collaborator',
  'institution',
  'media',
]);

export const statusSchema = z.enum(['active', 'paused', 'completed', 'archived']);

export const visibilitySchema = z.enum(['private', 'unlisted', 'public']);

export const edgeTypeSchema = z.enum([
  'project_contains',
  'produced',
  'evaluated_on',
  'cites',
  'derived_from',
  'implements',
  'collaborates_with',
  'related_to',
  'supersedes',
]);

// ─── Helper Schemas ──────────────────────────────────────────────────────────

export const resultBlockSchema = z.object({
  metric: z.string(),
  value: z.union([z.number(), z.string()]),
  unit: z.string().optional(),
  context: bilingualTextSchema.optional(),
});

export const runRecordSchema = z.object({
  run_id: z.string(),
  date: z.string(),
  parameters: z.record(z.unknown()),
  outputs: z.record(z.unknown()),
  notes: bilingualTextSchema.optional(),
});

export const reproducibilityInfoSchema = z.object({
  level: z.enum(['exact', 'statistical', 'qualitative', 'not_tested']),
  environment: z.string().optional(),
  seed: z.number().optional(),
  notes: bilingualTextSchema.optional(),
});

export const evalRecordSchema = z.object({
  dataset_id: z.string(),
  metrics: z.record(z.union([z.number(), z.string()])),
  date: z.string(),
  notes: bilingualTextSchema.optional(),
});

export const actionItemSchema = z.object({
  description: bilingualTextSchema,
  assignee: z.string().optional(),
  due_date: z.string().optional(),
  done: z.boolean(),
});

// ─── Edge Schema ─────────────────────────────────────────────────────────────

export const edgeSchema = z.object({
  id: z.string(),
  from_id: z.string(),
  to_id: z.string(),
  edge_type: edgeTypeSchema,
  created_at: z.string(),
  label: bilingualTextSchema.optional(),
  context_snippet: z.string().optional(),
  weight: z.number().optional(),
});

// ─── Base Entity Schema ──────────────────────────────────────────────────────

const baseEntityFields = {
  id: z.string(),
  type: entityTypeSchema,
  title: bilingualTextSchema,
  summary: bilingualTextSchema,
  created_at: z.string(),
  updated_at: z.string(),
  status: statusSchema,
  visibility: visibilitySchema,
  tags: z.array(z.string()),
  links: z.array(z.string()),
  authorship: z.object({
    owner_role: z.string(),
    contributors: z.array(z.string()),
  }),
  source_of_truth: z.object({
    kind: z.enum(['file', 'db', 'external']),
    pointer: z.string(),
  }),
  slug: z.string().optional(),
  cover_media_id: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  locale_completeness: z
    .object({
      en: z.number(),
      'zh-Hans': z.number(),
    })
    .optional(),
  checksum: z.string().optional(),
  citations: z.array(z.string()).optional(),
  confidentiality_note: bilingualTextSchema.optional(),
  review_notes: bilingualTextSchema.optional(),
};

export const baseEntitySchema = z.object(baseEntityFields);

// ─── Specific Entity Schemas ─────────────────────────────────────────────────

export const researchProjectSchema = z.object({
  ...baseEntityFields,
  type: z.literal('project'),
  project_kind: z.string(),
  research_area: z.string(),
  problem_statement: bilingualTextSchema,
  contributions: bilingualTextSchema,
  methods: z.array(z.string()),
  material_systems: z.array(z.string()),
  key_results: z.array(resultBlockSchema),
  timeline: z.object({
    start_date: z.string(),
    end_date: z.string().optional(),
  }),
  artifacts: z.object({
    repos: z.array(z.string()),
    datasets: z.array(z.string()),
    experiments: z.array(z.string()),
    publications: z.array(z.string()),
    notes: z.array(z.string()),
  }),
  advisor_id: z.string().optional(),
  institution_id: z.string().optional(),
  headline: bilingualTextSchema.optional(),
  impact_story: bilingualTextSchema.optional(),
  highlights: bilingualTextSchema.optional(),
  public_readme_mdx_id: z.string().optional(),
});

export const publicationSchema = z.object({
  ...baseEntityFields,
  type: z.literal('publication'),
  publication_type: z.string(),
  venue: bilingualTextSchema,
  date: z.string(),
  authors: z.array(z.string()),
  abstract: bilingualTextSchema,
  identifiers: z.object({
    doi: z.string().optional(),
    arxiv: z.string().optional(),
    url: z.string().optional(),
  }),
  associated_projects: z.array(z.string()),
  bibtex: z.string().optional(),
  peer_review_status: z.string().optional(),
});

export const experimentSchema = z.object({
  ...baseEntityFields,
  type: z.literal('experiment'),
  experiment_type: z.string(),
  hypothesis: bilingualTextSchema,
  protocol: bilingualTextSchema,
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  run_registry: z.array(runRecordSchema),
  results: z.array(resultBlockSchema),
  reproducibility: reproducibilityInfoSchema,
});

export const datasetSchema = z.object({
  ...baseEntityFields,
  type: z.literal('dataset'),
  dataset_kind: z.string(),
  description: bilingualTextSchema,
  schema_def: z.unknown(),
  license: z.string(),
  provenance: z.object({
    source: z.string(),
    transformations: z.array(z.string()),
  }),
  storage: z.object({
    location: z.string(),
    format: z.string(),
    size_bytes: z.number(),
    checksum: z.string(),
  }),
});

export const mlModelSchema = z.object({
  ...baseEntityFields,
  type: z.literal('model'),
  model_kind: z.string(),
  task: z.string(),
  architecture: bilingualTextSchema,
  training_data: z.array(z.string()),
  evaluation: z.array(evalRecordSchema),
  model_artifacts: z.object({
    weights_location: z.string(),
    checksum: z.string(),
    version: z.string(),
  }),
});

export const codeRepoSchema = z.object({
  ...baseEntityFields,
  type: z.literal('repo'),
  repo_kind: z.string(),
  remote_url: z.string().optional(),
  local_path: z.string(),
  default_branch: z.string(),
  license: z.string(),
  related_entities: z.array(z.string()),
});

export const technicalNoteSchema = z.object({
  ...baseEntityFields,
  type: z.literal('note'),
  note_type: z.string(),
  body_mdx_id: z.string(),
  related_entities: z.array(z.string()),
  canonicality: z.string().optional(),
});

export const litReviewSchema = z.object({
  ...baseEntityFields,
  type: z.literal('lit_review'),
  scope: bilingualTextSchema,
  papers: z.array(z.string()),
  synthesis: bilingualTextSchema,
  takeaways: bilingualTextSchema,
});

export const meetingLogSchema = z.object({
  ...baseEntityFields,
  type: z.literal('meeting'),
  date_time: z.string(),
  attendees: z.array(z.string()),
  agenda: bilingualTextSchema,
  notes_content: bilingualTextSchema,
  action_items: z.array(actionItemSchema),
});

export const ideaEntrySchema = z.object({
  ...baseEntityFields,
  type: z.literal('idea'),
  idea_kind: z.string(),
  problem: bilingualTextSchema,
  proposed_approach: bilingualTextSchema,
  expected_value: z.object({
    impact: z.number(),
    novelty: z.number(),
    feasibility: z.number(),
    learning_value: z.number(),
  }),
  dependencies: z.array(z.string()),
  idea_status: z.string(),
});

export const skillSchema = z.object({
  ...baseEntityFields,
  type: z.literal('skill'),
  name: bilingualTextSchema,
  category: z.string(),
  proficiency: z.string(),
  evidence_links: z.array(z.string()),
});

export const methodSchema = z.object({
  ...baseEntityFields,
  type: z.literal('method'),
  name: bilingualTextSchema,
  domain: z.string(),
  description: bilingualTextSchema,
  canonical_refs: z.array(z.string()),
});

export const materialSystemSchema = z.object({
  ...baseEntityFields,
  type: z.literal('material_system'),
  name: bilingualTextSchema,
  composition: z.string(),
  structure_type: z.string(),
  domain_tags: z.array(z.string()),
});

export const metricSchema = z.object({
  ...baseEntityFields,
  type: z.literal('metric'),
  name: bilingualTextSchema,
  definition: bilingualTextSchema,
  unit: z.string(),
  higher_is_better: z.boolean(),
  references: z.array(z.string()),
});

export const collaboratorSchema = z.object({
  ...baseEntityFields,
  type: z.literal('collaborator'),
  name: z.string(),
  role: z.string(),
  affiliation: z.string(),
  contact_links: z.object({
    website: z.string().optional(),
    orcid: z.string().optional(),
  }).optional(),
});

export const institutionSchema = z.object({
  ...baseEntityFields,
  type: z.literal('institution'),
  name: z.string(),
  location: z.string(),
  department: z.string().optional(),
  website: z.string().optional(),
});

export const mediaItemSchema = z.object({
  ...baseEntityFields,
  type: z.literal('media'),
  media_type: z.string(),
  source_path: z.string(),
  checksum: z.string(),
  size_bytes: z.number(),
  preview_path: z.string().optional(),
  provenance_entity_id: z.string().optional(),
});

// ─── Schema Map ──────────────────────────────────────────────────────────────

export const schemaMap: Record<EntityType, z.ZodType> = {
  project: researchProjectSchema,
  publication: publicationSchema,
  experiment: experimentSchema,
  dataset: datasetSchema,
  model: mlModelSchema,
  repo: codeRepoSchema,
  note: technicalNoteSchema,
  lit_review: litReviewSchema,
  meeting: meetingLogSchema,
  idea: ideaEntrySchema,
  skill: skillSchema,
  method: methodSchema,
  material_system: materialSystemSchema,
  metric: metricSchema,
  collaborator: collaboratorSchema,
  institution: institutionSchema,
  media: mediaItemSchema,
};

// ─── Discriminated Union Schema ──────────────────────────────────────────────

export const entitySchema = z.discriminatedUnion('type', [
  researchProjectSchema,
  publicationSchema,
  experimentSchema,
  datasetSchema,
  mlModelSchema,
  codeRepoSchema,
  technicalNoteSchema,
  litReviewSchema,
  meetingLogSchema,
  ideaEntrySchema,
  skillSchema,
  methodSchema,
  materialSystemSchema,
  metricSchema,
  collaboratorSchema,
  institutionSchema,
  mediaItemSchema,
]);
