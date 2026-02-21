'use client';
import { useI18n } from '@/lib/i18n/provider';
import type { EntityDetail } from '@/domain/types';
import { StatusBadge, VisibilityBadge } from './entity-list-view';
import { FileDown, Share2, Calendar } from 'lucide-react';

interface Props {
  entity: EntityDetail;
}

export function EntityHeader({ entity }: Props) {
  const { locale, t, localize } = useI18n();

  const title = localize({ en: entity.title_en, 'zh-Hans': entity.title_zh });

  const handleExportPdf = () => {
    const url = `/api/export/pdf?entityId=${encodeURIComponent(entity.id)}&locale=${locale}`;
    const win = window.open(url, '_blank');
    if (win) {
      win.addEventListener('load', () => win.print());
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/${locale}/${entity.type}s/${entity.id}`;
    if (navigator.share) {
      await navigator.share({ title: title.text, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <header className="space-y-4 pb-6 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">
            {title.text}
            {title.isFallback && (
              <span className="ml-2 text-sm font-normal text-amber-500">
                {t('common.fallbackIndicator')}
              </span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-surface-1 transition-colors"
            aria-label={t('actions.exportPdf')}
          >
            <FileDown size={14} />
            <span className="hidden sm:inline">{t('actions.exportPdf')}</span>
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-surface-1 transition-colors"
            aria-label={t('actions.share')}
          >
            <Share2 size={14} />
            <span className="hidden sm:inline">{t('actions.share')}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={entity.status} />
        <VisibilityBadge visibility={entity.visibility} />

        <span className="text-xs text-gray-400">|</span>

        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Calendar size={12} />
          {t('common.created')} {entity.created_at?.split('T')[0]}
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Calendar size={12} />
          {t('common.updated')} {entity.updated_at?.split('T')[0]}
        </span>
      </div>

      {entity.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entity.tags.map(tag => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-surface-2 text-gray-600 dark:text-gray-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}
