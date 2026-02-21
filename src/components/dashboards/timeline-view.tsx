'use client';
import Link from 'next/link';
import { useI18n, snakeToCamel } from '@/lib/i18n/provider';
import { TYPE_BG_COLORS, TYPE_RING_COLORS, TYPE_PATH_MAP } from '@/lib/entity-types';
import type { TimelineEvent } from '@/domain/types';

interface Props {
  events: TimelineEvent[];
}

export function TimelineView({ events }: Props) {
  const { locale, t, localize } = useI18n();

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        {t('dashboards.noData')}
      </div>
    );
  }

  // Sort by date descending
  const sorted = [...events].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Group by year-month
  const grouped = sorted.reduce<Record<string, TimelineEvent[]>>((acc, event) => {
    const ym = event.date.slice(0, 7); // YYYY-MM
    if (!acc[ym]) acc[ym] = [];
    acc[ym].push(event);
    return acc;
  }, {});

  const usedTypes = [...new Set(events.map(e => e.type))];

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-2">
        {usedTypes.map(type => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={`w-2.5 h-2.5 rounded-full inline-block ${TYPE_BG_COLORS[type] || 'bg-gray-500'}`} />
            <span>{t(`entity.${snakeToCamel(type)}`)}</span>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />

        {Object.entries(grouped).map(([yearMonth, items]) => {
          const [year, month] = yearMonth.split('-');
          const monthLabel = new Date(Number(year), Number(month) - 1).toLocaleDateString(
            locale === 'zh-Hans' ? 'zh-CN' : 'en-US',
            { year: 'numeric', month: 'long' }
          );

          return (
            <div key={yearMonth} className="mb-6">
              <div className="flex items-center gap-3 mb-3 ml-0">
                <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-xs font-medium text-gray-500 relative z-10">
                  {month}
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {monthLabel}
                </span>
              </div>

              <div className="space-y-2 ml-12">
                {items.map(event => {
                  const title = localize({
                    en: event.title_en,
                    'zh-Hans': event.title_zh,
                  });
                  const typePath = TYPE_PATH_MAP[event.type] || 'projects';
                  const dotColor = TYPE_BG_COLORS[event.type] || 'bg-gray-500';
                  const ringColor = TYPE_RING_COLORS[event.type] || 'ring-gray-200';

                  return (
                    <Link
                      key={event.id}
                      href={`/${locale}/${typePath}/${event.id}`}
                      className="block p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-brand-300 dark:hover:border-brand-700 transition-colors relative"
                    >
                      {/* Dot on the timeline */}
                      <div
                        className={`absolute -left-[2.35rem] top-4 w-3 h-3 rounded-full ${dotColor} ring-2 ${ringColor}`}
                      />

                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-surface-2 text-gray-500 font-mono">
                          {t(`entity.${snakeToCamel(event.type)}`)}
                        </span>
                        <span className="text-xs text-gray-400">{event.date}</span>
                        <span className="text-xs text-gray-400 ml-auto">
                          {t(`status.${event.status}`)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {title.text}
                        {title.isFallback && (
                          <span className="ml-1 text-xs text-amber-500">
                            {t('common.fallbackIndicator')}
                          </span>
                        )}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
