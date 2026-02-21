'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/provider';
import { AlertTriangle } from 'lucide-react';

interface Issue {
  id: string;
  entity_id: string;
  entity_title_en: string;
  entity_title_zh: string;
  issue_type: string;
  description: string;
  created_at: string;
}

export default function IntegrityPage() {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/entities/integrity')
      .then(r => r.json())
      .then(data => setItems(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const title = (i: Issue) =>
    locale === 'zh-Hans' ? i.entity_title_zh || i.entity_title_en : i.entity_title_en || i.entity_title_zh;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">{t('stats.integrityIssues')}</h1>
      <p className="text-sm text-gray-500">{items.length} {t('common.results')}</p>

      {loading ? (
        <div className="animate-pulse h-64 bg-surface-2 rounded-lg" />
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <AlertTriangle size={32} className="mx-auto text-green-500 mb-3" />
          <p className="text-gray-500">{t('common.noResults')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(i => (
            <Link
              key={i.id}
              href={`/${locale}/admin/entities/${i.entity_id}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-surface-1 border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-red-300 dark:hover:border-red-700 transition-colors"
            >
              <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{i.issue_type}</p>
                <p className="text-xs text-gray-500 truncate">
                  {title(i) || i.entity_id} &middot; {i.description}
                </p>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(i.created_at).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
