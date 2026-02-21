'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  EntityListItem,
  EntityDetail,
  ListFilters,
  PaginatedResult,
  DashboardStats,
  TimelineEvent,
  GraphData,
} from '../types';
// SearchResponse matching the actual /api/search route output
interface SearchResponse {
  items: Array<{
    id: string;
    type: string;
    title_en: string;
    title_zh: string;
    summary_en: string;
    summary_zh: string;
    snippet: string;
    rank: number;
    visibility: string;
    status: string;
    created_at: string;
  }>;
  total: number;
  facets: {
    types: Record<string, number>;
    statuses: Record<string, number>;
    tags: Record<string, number>;
  };
  page: number;
  limit: number;
}

// ─── Fetch helper ────────────────────────────────────────────────────────────

const API_BASE = '/api';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ─── useEntityList ───────────────────────────────────────────────────────────

export function useEntityList(filters: ListFilters) {
  const [data, setData] = useState<PaginatedResult<EntityListItem> | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (filters.type) params.set('type', filters.type);
    if (filters.status) params.set('status', filters.status);
    if (filters.visibility) params.set('visibility', filters.visibility);
    if (filters.search) params.set('search', filters.search);
    if (filters.sort) params.set('sort', filters.sort);
    if (filters.order) params.set('order', filters.order);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.tags?.length) params.set('tags', filters.tags.join(','));

    fetchApi<PaginatedResult<EntityListItem>>(`/entities?${params}`)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // Serialise filters to a stable string so the effect re-runs on
    // any filter change without requiring a stable object reference.
  }, [JSON.stringify(filters)]); // deps serialized to stable string

  return { data, loading, error };
}

// ─── useEntity ───────────────────────────────────────────────────────────────

export function useEntity(id: string) {
  const [data, setData] = useState<EntityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchApi<EntityDetail>(`/entities/${id}`)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { data, loading, error };
}

// ─── useSearch ───────────────────────────────────────────────────────────────

export function useSearch(
  query: string,
  options: Record<string, string> = {}
) {
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setData(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ query: q, ...options });
        const result = await fetchApi<SearchResponse>(`/search?${params}`);
        setData(result);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [JSON.stringify(options)] // deps serialized to stable string
  );

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  return { data, loading, error, search };
}

// ─── useDashboardStats ───────────────────────────────────────────────────────

export function useDashboardStats() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchApi<DashboardStats>('/entities/stats')
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}

// ─── useGraphData ────────────────────────────────────────────────────────────

export function useGraphData() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchApi<GraphData>('/entities/graph')
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}

// ─── useTimeline ─────────────────────────────────────────────────────────────

interface ProjectInfo {
  id: string;
  title_en: string | null;
  title_zh: string | null;
}

export function useTimeline(projectId?: string) {
  const [data, setData] = useState<TimelineEvent[]>([]);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams();
    if (projectId) params.set('projectId', projectId);

    fetchApi<{ events: TimelineEvent[]; projects: ProjectInfo[] }>(
      `/entities/timeline?${params}`
    )
      .then((result) => {
        if (!cancelled) {
          setData(result.events);
          setProjects(result.projects);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return { data, projects, loading, error };
}
