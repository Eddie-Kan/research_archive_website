'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { Image, Quote, FlaskConical, Table, Database, BarChart3 } from 'lucide-react';

// ─── FigureCard ─────────────────────────────────────────────────────────────

interface FigureCardProps {
  src: string;
  alt?: string;
  caption_en?: string;
  caption_zh?: string;
  width?: number;
  height?: number;
}

export function FigureCard({
  src,
  alt = '',
  caption_en = '',
  caption_zh = '',
  width,
  height,
}: FigureCardProps) {
  const { localize } = useI18n();
  const caption = localize({ en: caption_en, 'zh-Hans': caption_zh });

  return (
    <figure className="my-6 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="bg-surface-1 flex items-center justify-center">
        <img
          src={src}
          alt={alt || caption.text}
          width={width}
          height={height}
          className="max-w-full h-auto"
          loading="lazy"
        />
      </div>
      {caption.text && (
        <figcaption className="px-4 py-2.5 text-xs text-gray-500 bg-surface-0 border-t border-gray-100 dark:border-gray-800">
          <Image size={12} className="inline mr-1.5 -mt-0.5" />
          {caption.text}
          {caption.isFallback && (
            <span className="ml-1 text-amber-500">[fallback]</span>
          )}
        </figcaption>
      )}
    </figure>
  );
}

// ─── CitationBlock ──────────────────────────────────────────────────────────

interface CitationBlockProps {
  authors: string;
  title: string;
  venue?: string;
  year?: number | string;
  doi?: string;
  url?: string;
  children?: React.ReactNode;
}

export function CitationBlock({
  authors,
  title,
  venue,
  year,
  doi,
  url,
  children,
}: CitationBlockProps) {
  const resolvedUrl = doi ? `https://doi.org/${doi}` : url;

  return (
    <blockquote className="my-4 pl-4 border-l-2 border-brand-300 dark:border-brand-700 bg-surface-1 rounded-r-lg p-4">
      <div className="flex items-start gap-2">
        <Quote size={14} className="text-brand-400 mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          {children && (
            <p className="text-sm italic text-gray-600 dark:text-gray-400 mb-2">
              {children}
            </p>
          )}
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {resolvedUrl ? (
              <a
                href={resolvedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 dark:text-brand-400 hover:underline"
              >
                {title}
              </a>
            ) : (
              title
            )}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {authors}
            {venue && <span> &mdash; {venue}</span>}
            {year && <span> ({year})</span>}
          </p>
          {doi && (
            <p className="text-xs text-gray-400 mt-0.5 font-mono">
              DOI: {doi}
            </p>
          )}
        </div>
      </div>
    </blockquote>
  );
}

// ─── Equation (KaTeX wrapper) ───────────────────────────────────────────────

interface EquationProps {
  /** LaTeX math string */
  math: string;
  /** Display mode (block) vs inline */
  display?: boolean;
  label?: string;
}

export function Equation({ math, display = true, label }: EquationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const katex = await import('katex');
        if (cancelled || !containerRef.current) return;
        katex.default.render(math, containerRef.current, {
          displayMode: display,
          throwOnError: false,
          output: 'html',
        });
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render equation');
        }
      }
    }

    render();
    return () => { cancelled = true; };
  }, [math, display]);

  if (error) {
    return (
      <div className="my-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
        <p className="font-mono text-xs">LaTeX error: {error}</p>
        <pre className="mt-1 text-xs text-red-500 overflow-x-auto">{math}</pre>
      </div>
    );
  }

  return (
    <div className={`${display ? 'my-4 text-center' : 'inline'} overflow-x-auto`}>
      <div ref={containerRef} className="inline-block" />
      {label && display && (
        <span className="ml-4 text-xs text-gray-400">({label})</span>
      )}
    </div>
  );
}

// ─── InteractivePlot (Vega-Lite wrapper) ────────────────────────────────────

interface InteractivePlotProps {
  /** Vega-Lite specification object or JSON string */
  spec: Record<string, unknown> | string;
  width?: number;
  height?: number;
}

export function InteractivePlot({
  spec,
  width = 600,
  height = 400,
}: InteractivePlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const vegaLite = await import('vega-lite');
        const vega = await import('vega');
        const vegaEmbed = (await import('vega-embed')).default;

        if (cancelled || !containerRef.current) return;

        const parsedSpec = typeof spec === 'string' ? JSON.parse(spec) : spec;
        const fullSpec = {
          ...parsedSpec,
          width: parsedSpec.width || width,
          height: parsedSpec.height || height,
          autosize: { type: 'fit', contains: 'padding' },
        };

        await vegaEmbed(containerRef.current, fullSpec, {
          actions: { export: true, source: false, compiled: false, editor: false },
          theme: document.documentElement.classList.contains('dark') ? 'dark' : undefined,
        });

        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render plot');
        }
      }
    }

    render();
    return () => { cancelled = true; };
  }, [spec, width, height]);

  if (error) {
    return (
      <div className="my-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-sm">
        <BarChart3 size={14} className="inline mr-1.5 text-red-400" />
        <span className="text-red-600 dark:text-red-400">Plot error: {error}</span>
      </div>
    );
  }

  return (
    <div className="my-6 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden p-4 bg-surface-0">
      <div ref={containerRef} />
    </div>
  );
}

// ─── ExperimentRunTable ─────────────────────────────────────────────────────

interface RunRow {
  run_id: string;
  params: Record<string, string | number>;
  metrics: Record<string, number>;
  status?: string;
  date?: string;
}

interface ExperimentRunTableProps {
  runs: RunRow[];
  title?: string;
}

export function ExperimentRunTable({ runs, title }: ExperimentRunTableProps) {
  const { t } = useI18n();

  if (runs.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4">{t('common.noResults')}</p>
    );
  }

  // Collect all param and metric keys
  const paramKeys = [...new Set(runs.flatMap(r => Object.keys(r.params)))];
  const metricKeys = [...new Set(runs.flatMap(r => Object.keys(r.metrics)))];

  return (
    <div className="my-6 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {title && (
        <div className="px-4 py-2.5 bg-surface-1 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <FlaskConical size={14} className="text-gray-400" />
          <span className="text-sm font-medium">{title}</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-surface-1">
              <th className="text-left p-2 font-medium">Run</th>
              {runs[0].date !== undefined && (
                <th className="text-left p-2 font-medium">Date</th>
              )}
              {runs[0].status !== undefined && (
                <th className="text-left p-2 font-medium">Status</th>
              )}
              {paramKeys.map(k => (
                <th key={`p-${k}`} className="text-left p-2 font-medium text-blue-600 dark:text-blue-400">
                  {k}
                </th>
              ))}
              {metricKeys.map(k => (
                <th key={`m-${k}`} className="text-left p-2 font-medium text-green-600 dark:text-green-400">
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {runs.map(run => (
              <tr
                key={run.run_id}
                className="border-t border-gray-100 dark:border-gray-800 hover:bg-surface-1"
              >
                <td className="p-2 font-mono">{run.run_id}</td>
                {run.date !== undefined && (
                  <td className="p-2 text-gray-500">{run.date}</td>
                )}
                {run.status !== undefined && (
                  <td className="p-2">
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-xs ${
                        run.status === 'completed'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : run.status === 'failed'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {run.status}
                    </span>
                  </td>
                )}
                {paramKeys.map(k => (
                  <td key={`p-${k}`} className="p-2 font-mono">
                    {run.params[k] !== undefined ? String(run.params[k]) : '-'}
                  </td>
                ))}
                {metricKeys.map(k => (
                  <td key={`m-${k}`} className="p-2 font-mono">
                    {run.metrics[k] !== undefined ? run.metrics[k].toFixed(4) : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── DatasetSchemaViewer ────────────────────────────────────────────────────

interface SchemaField {
  name: string;
  type: string;
  description?: string;
  nullable?: boolean;
  example?: string | number;
}

interface DatasetSchemaViewerProps {
  fields: SchemaField[];
  title?: string;
  format?: string;
}

export function DatasetSchemaViewer({
  fields,
  title,
  format,
}: DatasetSchemaViewerProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleField = (name: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  if (fields.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4">{t('common.noResults')}</p>
    );
  }

  return (
    <div className="my-6 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-2.5 bg-surface-1 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <Database size={14} className="text-gray-400" />
        <span className="text-sm font-medium">{title || 'Schema'}</span>
        {format && (
          <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-surface-2 text-gray-500 font-mono">
            {format}
          </span>
        )}
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {fields.map(field => {
          const isExpanded = expanded.has(field.name);
          const hasDetails = field.description || field.example !== undefined;

          return (
            <div key={field.name}>
              <button
                onClick={() => hasDetails && toggleField(field.name)}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm ${
                  hasDetails ? 'hover:bg-surface-1 cursor-pointer' : 'cursor-default'
                }`}
                disabled={!hasDetails}
                type="button"
              >
                <span className="font-mono font-medium text-gray-800 dark:text-gray-200">
                  {field.name}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-mono">
                  {field.type}
                </span>
                {field.nullable && (
                  <span className="text-xs text-gray-400">nullable</span>
                )}
                {hasDetails && (
                  <span className="ml-auto text-xs text-gray-400">
                    {isExpanded ? '−' : '+'}
                  </span>
                )}
              </button>
              {isExpanded && hasDetails && (
                <div className="px-4 pb-3 pl-8 space-y-1">
                  {field.description && (
                    <p className="text-xs text-gray-500">{field.description}</p>
                  )}
                  {field.example !== undefined && (
                    <p className="text-xs text-gray-400">
                      Example:{' '}
                      <code className="bg-surface-2 px-1 py-0.5 rounded font-mono">
                        {String(field.example)}
                      </code>
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MDX Component Map ──────────────────────────────────────────────────────

/**
 * Registry of all custom MDX components.
 * Pass this to your MDX renderer's `components` prop.
 *
 * Usage:
 *   import { mdxComponents } from '@/components/mdx';
 *   <MDXRemote source={content} components={mdxComponents} />
 */
export const mdxComponents = {
  FigureCard,
  CitationBlock,
  Equation,
  InteractivePlot,
  ExperimentRunTable,
  DatasetSchemaViewer,
};
