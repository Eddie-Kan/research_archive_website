'use client';

import { useState } from 'react';
import { useTimeline } from '@/domain/hooks';
import { useI18n } from '@/lib/i18n/provider';
import { TimelineView } from '@/components/dashboards/timeline-view';

export default function TimelinePage() {
  const { t, locale } = useI18n();
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const { data, projects, loading } = useTimeline(projectId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold">{t('dashboards.timeline')}</h1>
        {projects.length > 0 && (
          <select
            value={projectId || ''}
            onChange={e => setProjectId(e.target.value || undefined)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
          >
            <option value="">{t('dashboard.timeline.allEntities')}</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {(locale === 'zh-Hans' ? p.title_zh || p.title_en : p.title_en || p.title_zh) || p.id}
              </option>
            ))}
          </select>
        )}
      </div>
      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-surface-2 rounded-lg" />)}
        </div>
      ) : (
        <TimelineView events={data} />
      )}
    </div>
  );
}
