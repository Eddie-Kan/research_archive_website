'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/provider';
import { Image, Film, Music, FileText, File } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface MediaItem {
  id: string;
  entity_id: string;
  entity_title_en: string;
  entity_title_zh: string;
  entity_type: string;
  media_type: string;
  source_path: string;
  created_at: string;
}

const MEDIA_ICONS: Record<string, LucideIcon> = {
  image: Image, video: Film, audio: Music, document: FileText,
};

export default function MediaPage() {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/entities/media')
      .then(r => r.json())
      .then(data => setItems(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const title = (m: MediaItem) =>
    locale === 'zh-Hans' ? m.entity_title_zh || m.entity_title_en : m.entity_title_en || m.entity_title_zh;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">{t('stats.totalMedia')}</h1>
      <p className="text-sm text-gray-500">{items.length} {t('common.results')}</p>

      {loading ? (
        <div className="animate-pulse h-64 bg-surface-2 rounded-lg" />
      ) : items.length === 0 ? (
        <p className="text-gray-500 py-12 text-center">{t('common.noResults')}</p>
      ) : (
        <div className="space-y-2">
          {items.map(m => {
            const Icon = MEDIA_ICONS[m.media_type] || File;
            return (
              <Link
                key={m.id}
                href={`/${locale}/${m.entity_type}s/${m.entity_id}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-surface-1 border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
              >
                <Icon size={18} className="text-gray-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.source_path}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {title(m)} &middot; {t(`admin.options.mediaType.${m.media_type}`) || m.media_type}
                  </p>
                </div>
                <span className="text-xs text-gray-400">{new Date(m.created_at).toLocaleDateString()}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
