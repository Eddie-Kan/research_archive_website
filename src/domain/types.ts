// ─── Re-export core types from schema package ────────────────────────────────

export type {
  BilingualText,
  Locale,
  EntityType,
  Status,
  Visibility,
  BaseEntity,
  ResearchProject,
  Publication,
  Experiment,
  Dataset,
  MLModel,
  CodeRepo,
  TechnicalNote,
  LitReview,
  MeetingLog,
  IdeaEntry,
  Skill,
  Method,
  MaterialSystem,
  Metric,
  Collaborator,
  Institution,
  MediaItem,
  Edge,
  Entity,
} from '@schema/types';

// ─── View Mode (visibility context) ──────────────────────────────────────────

/** Controls which entities are visible in query results. */
export type ViewMode = 'private' | 'public' | 'curated';

// ─── UI-specific types (flat DB row shapes) ──────────────────────────────────

export interface EntityListItem {
  id: string;
  type: string;
  title_en: string;
  title_zh: string;
  summary_en: string;
  summary_zh: string;
  status: string;
  visibility: string;
  created_at: string;
  updated_at: string;
  slug?: string;
  tags: string[];
}

export interface EntityDetail extends EntityListItem {
  raw_metadata: string;
  body_en: string;
  body_zh: string;
  edges_out: EdgeItem[];
  edges_in: EdgeItem[];
  media: MediaListItem[];
}

export interface EdgeItem {
  id: string;
  from_id: string;
  to_id: string;
  edge_type: string;
  label_en?: string;
  label_zh?: string;
  /** Resolved entity info for the other end of the edge. */
  related_entity?: {
    id: string;
    type: string;
    title_en: string;
    title_zh: string;
  };
}

export interface MediaListItem {
  id: string;
  media_type: string;
  source_path: string;
  preview_path?: string;
  size_bytes: number;
}

// ─── Dashboard & Visualization ───────────────────────────────────────────────

export interface DashboardStats {
  total_entities: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  by_visibility: Record<string, number>;
  recent_entities: EntityListItem[];
  total_edges: number;
  total_media: number;
  integrity_issues: number;
}

export interface TimelineEvent {
  id: string;
  type: string;
  title_en: string;
  title_zh: string;
  date: string;
  status: string;
}

export interface GraphNode {
  id: string;
  type: string;
  title_en: string;
  title_zh: string;
  group: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ─── Filtering & Pagination ──────────────────────────────────────────────────

export type SortField = 'created_at' | 'updated_at' | 'title';
export type SortOrder = 'asc' | 'desc';

export interface ListFilters {
  type?: string;
  status?: string;
  visibility?: string;
  tags?: string[];
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: SortField;
  order?: SortOrder;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
