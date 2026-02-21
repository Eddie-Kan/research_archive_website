'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/provider';
import { entityTypeLabel } from '@/lib/admin/label-helpers';
import { BarChart3, FileText, GitBranch } from 'lucide-react';

/** Shape returned by GET /api/entities/stats (entity.service.ts) */
interface ApiStats {
  total_entities: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  by_visibility: Record<string, number>;
  recent_entities: Array<{
    id: string; type: string;
    title_en: string; title_zh: string;
    updated_at: string;
  }>;
  total_edges: number;
  total_media: number;
  integrity_issues: number;
}

export default function AdminDashboardPage() {
  const { t, locale } = useI18n();
  const [stats, setStats] = useState<ApiStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/entities/stats')
      .then(r => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .then(setStats)
      .catch(() => setError(true));
  }, []);

  const byTypeEntries = stats?.by_type
    ? Object.entries(stats.by_type).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('admin.nav.dashboard')}</h1>

      {error ? (
        <p className="text-red-500">{t('common.error')}</p>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href={`/${locale}/admin/entities`} className="block cursor-pointer p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-brand-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.total_entities}</p>
                  <p className="text-sm text-gray-500">{t('stats.totalEntities')}</p>
                </div>
              </div>
            </Link>
            <Link href={`/${locale}/admin/edges`} className="block cursor-pointer p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
              <div className="flex items-center gap-3">
                <GitBranch size={20} className="text-brand-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.total_edges}</p>
                  <p className="text-sm text-gray-500">{t('stats.totalEdges')}</p>
                </div>
              </div>
            </Link>
            <Link href={`/${locale}/admin/entities`} className="block cursor-pointer p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
              <div className="flex items-center gap-3">
                <BarChart3 size={20} className="text-brand-600" />
                <div>
                  <p className="text-2xl font-bold">{byTypeEntries.length}</p>
                  <p className="text-sm text-gray-500">{t('stats.byType')}</p>
                </div>
              </div>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
              <h2 className="text-sm font-medium text-gray-500 mb-3">{t('stats.byType')}</h2>
              <div className="space-y-1">
                {byTypeEntries.map(([type, count]) => (
                  <Link key={type} href={`/${locale}/admin/entities?type=${type}`} className="flex justify-between text-sm py-1.5 px-2 -mx-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                    <span>{entityTypeLabel(type, t)}</span>
                    <span className="text-gray-500">{count}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
              <h2 className="text-sm font-medium text-gray-500 mb-3">{t('common.recentlyUpdated')}</h2>
              <div className="space-y-1">
                {stats.recent_entities?.slice(0, 8).map(item => (
                  <Link key={item.id} href={`/${locale}/admin/entities/${item.id}`} className="flex justify-between text-sm py-1.5 px-2 -mx-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                    <span className="truncate">
                      {locale === 'zh-Hans' ? item.title_zh || item.title_en : item.title_en || item.title_zh || item.id}
                    </span>
                    <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">{entityTypeLabel(item.type, t)}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="text-gray-500">{t('common.loading')}</p>
      )}
    </div>
  );
}
