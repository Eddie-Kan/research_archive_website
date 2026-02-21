'use client';
import { useI18n } from '@/lib/i18n/provider';
import type { EntityDetail } from '@/domain/types';
import { useMemo } from 'react';

interface Props {
  entity: EntityDetail;
}

interface MetadataEntry {
  key: string;
  value: string | number | boolean;
}

function parseMetadata(raw: string): MetadataEntry[] {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return [];
    return Object.entries(parsed)
      .filter(([, v]) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
      .map(([key, value]) => ({ key, value: value as string | number | boolean }));
  } catch {
    return [];
  }
}

export function EntityContent({ entity }: Props) {
  const { locale, t, localize } = useI18n();

  const summary = localize({ en: entity.summary_en, 'zh-Hans': entity.summary_zh });
  const body = localize({ en: entity.body_en, 'zh-Hans': entity.body_zh });
  const metadata = useMemo(() => parseMetadata(entity.raw_metadata), [entity.raw_metadata]);

  return (
    <div className="space-y-8">
      {/* Summary */}
      {summary.text && (
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
            {t('entity.summary')}
          </h2>
          <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            {summary.text}
            {summary.isFallback && (
              <span className="ml-1 text-xs text-amber-500">
                {t('common.fallbackIndicator')}
              </span>
            )}
          </p>
        </section>
      )}

      {/* Body content */}
      {body.text && (
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
            {t('entity.content')}
          </h2>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {body.text.split('\n').map((paragraph, i) => {
              const trimmed = paragraph.trim();
              if (!trimmed) return null;
              if (trimmed.startsWith('# ')) {
                return <h1 key={i} className="text-xl font-bold mt-6 mb-2">{trimmed.slice(2)}</h1>;
              }
              if (trimmed.startsWith('## ')) {
                return <h2 key={i} className="text-lg font-semibold mt-5 mb-2">{trimmed.slice(3)}</h2>;
              }
              if (trimmed.startsWith('### ')) {
                return <h3 key={i} className="text-base font-medium mt-4 mb-1">{trimmed.slice(4)}</h3>;
              }
              if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                return (
                  <li key={i} className="ml-4 text-sm text-gray-700 dark:text-gray-300">
                    {trimmed.slice(2)}
                  </li>
                );
              }
              return (
                <p key={i} className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 mb-2">
                  {trimmed}
                </p>
              );
            })}
            {body.isFallback && (
              <p className="text-xs text-amber-500 mt-2">
                {t('common.translationMissing')}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Type-specific metadata */}
      {metadata.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
            {t('entity.metadata')}
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {metadata.map(({ key, value }) => (
              <div key={key}>
                <dt className="text-xs text-gray-400 font-mono">{key}</dt>
                <dd className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                  {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Media attachments */}
      {entity.media.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
            {t('entity.media')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {entity.media.map(m => (
              <div
                key={m.id}
                className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {m.media_type.startsWith('image') && m.preview_path ? (
                  <img
                    src={m.preview_path}
                    alt=""
                    className="w-full h-32 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-32 bg-surface-2 flex items-center justify-center text-xs text-gray-400">
                    {m.media_type}
                  </div>
                )}
                <div className="px-2 py-1.5 text-xs text-gray-500 truncate">
                  {m.source_path.split('/').pop()}
                  <span className="ml-1 text-gray-400">
                    ({(m.size_bytes / 1024).toFixed(0)} KB)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
