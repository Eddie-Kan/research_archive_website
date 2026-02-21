// ─── Bilingual & Locale ──────────────────────────────────────────────────────

export type BilingualText = {
  en: string;
  'zh-Hans': string;
};

export type Locale = 'en' | 'zh-Hans';

// ─── Enums ───────────────────────────────────────────────────────────────────

export type EntityType =
  | 'project'
  | 'publication'
  | 'experiment'
  | 'dataset'
  | 'model'
  | 'repo'
  | 'note'
  | 'lit_review'
  | 'meeting'
  | 'idea'
  | 'skill'
  | 'method'
  | 'material_system'
  | 'metric'
  | 'collaborator'
  | 'institution'
  | 'media';

export const ENTITY_TYPES: EntityType[] = [
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
];

export type Status = 'active' | 'paused' | 'completed' | 'archived';

export type Visibility = 'private' | 'unlisted' | 'public';

// ─── Helper Types ────────────────────────────────────────────────────────────

export interface ResultBlock {
  metric: string;
  value: number | string;
  unit?: string;
  context?: BilingualText;
}

export interface RunRecord {
  run_id: string;
  date: string;
  parameters: Record<string, unknown>;
  outputs: Record<string, unknown>;
  notes?: BilingualText;
}

export interface ReproducibilityInfo {
  level: 'exact' | 'statistical' | 'qualitative' | 'not_tested';
  environment?: string;
  seed?: number;
  notes?: BilingualText;
}

export interface EvalRecord {
  dataset_id: string;
  metrics: Record<string, number | string>;
  date: string;
  notes?: BilingualText;
}

export interface ActionItem {
  description: BilingualText;
  assignee?: string;
  due_date?: string;
  done: boolean;
}

// ─── Edge Types ──────────────────────────────────────────────────────────────

export type EdgeType =
  | 'project_contains'
  | 'produced'
  | 'evaluated_on'
  | 'cites'
  | 'derived_from'
  | 'implements'
  | 'collaborates_with'
  | 'related_to'
  | 'supersedes';

export const EDGE_TYPES: EdgeType[] = [
  'project_contains',
  'produced',
  'evaluated_on',
  'cites',
  'derived_from',
  'implements',
  'collaborates_with',
  'related_to',
  'supersedes',
];

export interface Edge {
  id: string;
  from_id: string;
  to_id: string;
  edge_type: EdgeType;
  created_at: string;
  label?: BilingualText;
  context_snippet?: string;
  weight?: number;
}

// ─── Base Entity ─────────────────────────────────────────────────────────────

export interface BaseEntity {
  id: string;
  type: EntityType;
  title: BilingualText;
  summary: BilingualText;
  created_at: string;
  updated_at: string;
  status: Status;
  visibility: Visibility;
  tags: string[];
  links: string[];
  authorship: {
    owner_role: string;
    contributors: string[];
  };
  source_of_truth: {
    kind: 'file' | 'db' | 'external';
    pointer: string;
  };
  slug?: string;
  cover_media_id?: string;
  attachments?: string[];
  locale_completeness?: {
    en: number;
    'zh-Hans': number;
  };
  checksum?: string;
  citations?: string[];
  confidentiality_note?: BilingualText;
  review_notes?: BilingualText;
}

// ─── Specific Entity Types ───────────────────────────────────────────────────

export interface ResearchProject extends BaseEntity {
  type: 'project';
  project_kind: string;
  research_area: string;
  problem_statement: BilingualText;
  contributions: BilingualText;
  methods: string[];
  material_systems: string[];
  key_results: ResultBlock[];
  timeline: {
    start_date: string;
    end_date?: string;
  };
  artifacts: {
    repos: string[];
    datasets: string[];
    experiments: string[];
    publications: string[];
    notes: string[];
  };
  advisor_id?: string;
  institution_id?: string;
  headline?: BilingualText;
  impact_story?: BilingualText;
  highlights?: BilingualText;
  public_readme_mdx_id?: string;
}

export interface Publication extends BaseEntity {
  type: 'publication';
  publication_type: string;
  venue: BilingualText;
  date: string;
  authors: string[];
  abstract: BilingualText;
  identifiers: {
    doi?: string;
    arxiv?: string;
    url?: string;
  };
  associated_projects: string[];
  bibtex?: string;
  peer_review_status?: string;
}

export interface Experiment extends BaseEntity {
  type: 'experiment';
  experiment_type: string;
  hypothesis: BilingualText;
  protocol: BilingualText;
  inputs: string[];
  outputs: string[];
  run_registry: RunRecord[];
  results: ResultBlock[];
  reproducibility: ReproducibilityInfo;
}

export interface Dataset extends BaseEntity {
  type: 'dataset';
  dataset_kind: string;
  description: BilingualText;
  schema_def: unknown;
  license: string;
  provenance: {
    source: string;
    transformations: string[];
  };
  storage: {
    location: string;
    format: string;
    size_bytes: number;
    checksum: string;
  };
}

export interface MLModel extends BaseEntity {
  type: 'model';
  model_kind: string;
  task: string;
  architecture: BilingualText;
  training_data: string[];
  evaluation: EvalRecord[];
  model_artifacts: {
    weights_location: string;
    checksum: string;
    version: string;
  };
}

export interface CodeRepo extends BaseEntity {
  type: 'repo';
  repo_kind: string;
  remote_url?: string;
  local_path: string;
  default_branch: string;
  license: string;
  related_entities: string[];
}

export interface TechnicalNote extends BaseEntity {
  type: 'note';
  note_type: string;
  body_mdx_id: string;
  related_entities: string[];
  canonicality?: string;
}

export interface LitReview extends BaseEntity {
  type: 'lit_review';
  scope: BilingualText;
  papers: string[];
  synthesis: BilingualText;
  takeaways: BilingualText;
}

export interface MeetingLog extends BaseEntity {
  type: 'meeting';
  date_time: string;
  attendees: string[];
  agenda: BilingualText;
  notes_content: BilingualText;
  action_items: ActionItem[];
}

export interface IdeaEntry extends BaseEntity {
  type: 'idea';
  idea_kind: string;
  problem: BilingualText;
  proposed_approach: BilingualText;
  expected_value: {
    impact: number;
    novelty: number;
    feasibility: number;
    learning_value: number;
  };
  dependencies: string[];
  idea_status: string;
}

export interface Skill extends BaseEntity {
  type: 'skill';
  name: BilingualText;
  category: string;
  proficiency: string;
  evidence_links: string[];
}

export interface Method extends BaseEntity {
  type: 'method';
  name: BilingualText;
  domain: string;
  description: BilingualText;
  canonical_refs: string[];
}

export interface MaterialSystem extends BaseEntity {
  type: 'material_system';
  name: BilingualText;
  composition: string;
  structure_type: string;
  domain_tags: string[];
}

export interface Metric extends BaseEntity {
  type: 'metric';
  name: BilingualText;
  definition: BilingualText;
  unit: string;
  higher_is_better: boolean;
  references: string[];
}

export interface Collaborator extends Omit<BaseEntity, 'links'> {
  type: 'collaborator';
  name: string;
  role: string;
  affiliation: string;
  links: {
    website?: string;
    orcid?: string;
  };
}

export interface Institution extends BaseEntity {
  type: 'institution';
  name: string;
  location: string;
  department?: string;
  website?: string;
}

export interface MediaItem extends BaseEntity {
  type: 'media';
  media_type: string;
  source_path: string;
  checksum: string;
  size_bytes: number;
  preview_path?: string;
  provenance_entity_id?: string;
}

// ─── Union Type ──────────────────────────────────────────────────────────────

export type Entity =
  | ResearchProject
  | Publication
  | Experiment
  | Dataset
  | MLModel
  | CodeRepo
  | TechnicalNote
  | LitReview
  | MeetingLog
  | IdeaEntry
  | Skill
  | Method
  | MaterialSystem
  | Metric
  | Collaborator
  | Institution
  | MediaItem;
