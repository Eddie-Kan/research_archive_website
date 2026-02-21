'use client';

import { useDashboardStats } from '@/domain/hooks';
import { useI18n } from '@/lib/i18n/provider';
import { StatsGrid } from '@/components/dashboards/stats-grid';
import { RecentEntities } from '@/components/entity/recent-entities';

export default function HomePage() {
  const { t } = useI18n();
  const { data: stats, loading } = useDashboardStats();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <section>
        <h1 className="text-2xl font-semibold mb-1">{t('nav.home')}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {t('common.researchArchive')}
        </p>
      </section>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-surface-2 rounded-lg" />
          <div className="h-64 bg-surface-2 rounded-lg" />
        </div>
      ) : stats ? (
        <>
          <StatsGrid stats={stats} />
          <section>
            <h2 className="text-lg font-medium mb-4">{t('common.recentlyUpdated')}</h2>
            <RecentEntities entities={stats.recent_entities} />
          </section>
        </>
      ) : null}
    </div>
  );
}
