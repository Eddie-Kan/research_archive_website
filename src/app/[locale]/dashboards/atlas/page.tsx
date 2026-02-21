'use client';

import { useGraphData } from '@/domain/hooks';
import { useI18n } from '@/lib/i18n/provider';
import { ForceGraph } from '@/components/dashboards/force-graph';

export default function AtlasPage() {
  const { t } = useI18n();
  const { data, loading } = useGraphData();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">{t('dashboards.atlas')}</h1>
      {loading ? (
        <div className="animate-pulse h-[600px] bg-surface-2 rounded-lg" />
      ) : data ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden" style={{ height: '600px' }}>
          <ForceGraph data={data} />
        </div>
      ) : (
        <p className="text-gray-500">{t('common.noResults')}</p>
      )}
    </div>
  );
}
