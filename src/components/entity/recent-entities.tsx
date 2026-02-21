'use client';
import Link from 'next/link';
import { useI18n, snakeToCamel } from '@/lib/i18n/provider';
import type { EntityListItem } from '@/domain/types';
import { Clock } from 'lucide-react';

interface Props {
  entities: EntityListItem[];
  limit?: number;
}

const TYPE_PATH_MAP: Record<string, string> = {
  project: 'projects',
  publication: 'publications',
  experiment: 'experiments',
  dataset: 'datasets',
  model: 'models',
  note: 'notes',
  idea: 'ideas',
};

export function RecentEntities({ entities, limit = 10 }: Props) {
  const { locale, t, localize } = useI18n();

  const items = entities.slice(0, limit);

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4">{t('common.noResults')}</p>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
        <Clock size={14} />
        {t('home.recentEntities')}
      </h2>
      <ul className="space-y-1">
        {items.map(item => {
          const title = localize({ en: item.title_en, 'zh-Hans': item.title_zh });
          const typePath = TYPE_PATH_MAP[item.type] || 'projects';

          return (
            <li key={item.id}>
              <Link
                href={`/${locale}/${typePath}/${item.id}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-1 transition-colors group"
              >
                <span className="text-xs px-1.5 py-0.5 rounded bg-surface-2 text-gray-500 font-mono flex-shrink-0">
                  {t(`entity.${snakeToCamel(item.type)}`)}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-brand-600 dark:group-hover:text-brand-400 truncate flex-1">
                  {title.text}
                  {title.isFallback && (
                    <span className="ml-1 text-xs text-amber-500">
                      {t('common.fallbackIndicator')}
                    </span>
                  )}
                </span>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {item.updated_at?.split('T')[0]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
