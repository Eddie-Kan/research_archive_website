'use client';
import Link from 'next/link';
import { useI18n, snakeToCamel } from '@/lib/i18n/provider';
import type { DashboardStats } from '@/domain/types';
import {
  FolderKanban, BookOpen, FlaskConical, Database, Cpu,
  FileText, Lightbulb, Link2, Image, AlertTriangle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  stats: DashboardStats;
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  project: FolderKanban,
  publication: BookOpen,
  experiment: FlaskConical,
  dataset: Database,
  model: Cpu,
  note: FileText,
  idea: Lightbulb,
};

const STATUS_COLORS: Record<string, string> = {
  active: 'text-green-600 dark:text-green-400',
  paused: 'text-yellow-600 dark:text-yellow-400',
  completed: 'text-blue-600 dark:text-blue-400',
  archived: 'text-gray-500',
};

const TYPE_ROUTES: Record<string, string> = {
  project: 'projects', publication: 'publications', experiment: 'experiments',
  dataset: 'datasets', model: 'models', note: 'notes', idea: 'ideas',
};

export function StatsGrid({ stats }: Props) {
  const { t, locale } = useI18n();
  const buildRegistryHref = (params: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) query.set(key, value);
    }
    const qs = query.toString();
    return `/${locale}/dashboards/registry${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="space-y-6">
      {/* Top-level summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label={t('stats.totalEntities')}
          value={stats.total_entities}
          accent="text-brand-600 dark:text-brand-400"
          href={buildRegistryHref({ entry: 'home-total' })}
        />
        <StatCard
          label={t('stats.totalEdges')}
          value={stats.total_edges}
          icon={Link2}
          accent="text-purple-600 dark:text-purple-400"
          href={`/${locale}/dashboards/atlas`}
        />
        <StatCard
          label={t('stats.totalMedia')}
          value={stats.total_media}
          icon={Image}
          accent="text-teal-600 dark:text-teal-400"
          href={`/${locale}/dashboards/media`}
        />
        <StatCard
          label={t('stats.integrityIssues')}
          value={stats.integrity_issues}
          icon={AlertTriangle}
          accent={stats.integrity_issues > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}
          href={`/${locale}/dashboards/integrity`}
        />
      </div>

      {/* By type */}
      <section>
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
          {t('stats.byType')}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(stats.by_type).map(([type, count]) => {
            const Icon = TYPE_ICONS[type] || FileText;
            const route = TYPE_ROUTES[type];
            const href = route
              ? `/${locale}/${route}`
              : buildRegistryHref({ type, entry: 'home-type' });
            return (
              <Link
                key={type}
                href={href}
                className="flex items-center gap-3 p-3 rounded-lg bg-surface-1 border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
              >
                <Icon size={18} className="text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-lg font-semibold leading-tight">{count}</p>
                  <p className="text-xs text-gray-500 truncate">{t(`entity.${snakeToCamel(type)}`)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* By status */}
      <section>
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
          {t('stats.byStatus')}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(stats.by_status).map(([status, count]) => (
            <Link
              key={status}
              href={buildRegistryHref({ status, entry: 'home-status' })}
              className="flex items-center justify-between p-3 rounded-lg bg-surface-1 border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
            >
              <span className="text-sm text-gray-600 dark:text-gray-400">{t(`status.${status}`)}</span>
              <span className={`text-lg font-semibold ${STATUS_COLORS[status] || ''}`}>
                {count}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* By visibility */}
      <section>
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
          {t('stats.byVisibility')}
        </h3>
        <div className="flex gap-3">
          {Object.entries(stats.by_visibility).map(([vis, count]) => (
            <Link
              key={vis}
              href={buildRegistryHref({ visibility: vis, entry: 'home-visibility' })}
              className="flex-1 flex items-center justify-between p-3 rounded-lg bg-surface-1 border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
            >
              <span className="text-sm text-gray-600 dark:text-gray-400">{t(`visibility.${vis}`)}</span>
              <span className="text-lg font-semibold">{count}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent = '',
  href,
}: {
  label: string;
  value: number;
  icon?: LucideIcon;
  accent?: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">{label}</span>
        {Icon && <Icon size={14} className="text-gray-400" />}
      </div>
      <p className={`text-2xl font-bold ${accent}`}>{value.toLocaleString()}</p>
    </>
  );
  const cls = "block p-4 rounded-lg bg-surface-1 border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-brand-300 dark:hover:border-brand-700 transition-colors";
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  return <div className={cls}>{inner}</div>;
}
