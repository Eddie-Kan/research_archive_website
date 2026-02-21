import {
  searchEntities as dbSearch,
  type Entity as DbEntity,
} from '@/lib/db/queries';
import type { ViewMode } from '../types';

// ─── Search result shape exposed by this service ─────────────────────────────

export interface SearchResult {
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
}

export interface SearchResponse {
  items: SearchResult[];
  total: number;
  query: string;
}

export interface SearchOptions {
  type?: string;
  visibility?: string;
  limit?: number;
  offset?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toSearchResult(row: DbEntity): SearchResult {
  return {
    id: row.id,
    type: row.type,
    title_en: row.title_en ?? '',
    title_zh: row.title_zh ?? '',
    summary_en: row.summary_en ?? '',
    summary_zh: row.summary_zh ?? '',
    status: row.status,
    visibility: row.visibility,
    created_at: row.created_at,
    updated_at: row.updated_at,
    slug: row.slug ?? undefined,
  };
}

// ─── SearchService ───────────────────────────────────────────────────────────

export class SearchService {
  /**
   * Full-text search across all entities.
   * In public mode the visibility filter is forced to 'public'.
   */
  search(
    query: string,
    options: SearchOptions = {},
    mode: ViewMode = 'private'
  ): SearchResponse {
    const visibility =
      mode === 'public' ? 'public' : options.visibility;

    const { items: data, total } = dbSearch(query, {
      type: options.type,
      visibility,
      limit: options.limit,
      offset: options.offset,
    });

    return {
      items: data.map(toSearchResult),
      total,
      query,
    };
  }

  /**
   * Quick search for command-palette / autocomplete.
   * Returns at most 10 results sorted by relevance.
   */
  quickSearch(
    query: string,
    mode: ViewMode = 'private'
  ): SearchResponse {
    return this.search(query, { limit: 10 }, mode);
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let _service: SearchService | null = null;

export function getSearchService(): SearchService {
  if (!_service) _service = new SearchService();
  return _service;
}
