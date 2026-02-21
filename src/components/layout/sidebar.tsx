'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n/provider';
import {
  Home, FolderKanban, BookOpen, FlaskConical, Database, Cpu,
  FileText, Lightbulb, Network, Clock,
  Search, ChevronLeft, ChevronRight, Shield,
  LayoutDashboard, GitBranch, Archive, Settings, LogOut, LogIn
} from 'lucide-react';

const navItems = [
  { key: 'home', path: '', icon: Home },
  { key: 'projects', path: '/projects', icon: FolderKanban },
  { key: 'publications', path: '/publications', icon: BookOpen },
  { key: 'experiments', path: '/experiments', icon: FlaskConical },
  { key: 'datasets', path: '/datasets', icon: Database },
  { key: 'models', path: '/models', icon: Cpu },
  { key: 'notes', path: '/notes', icon: FileText },
  { key: 'ideas', path: '/ideas', icon: Lightbulb },
];

const dashboardItems = [
  { key: 'atlas', path: '/dashboards/atlas', icon: Network },
  { key: 'timeline', path: '/dashboards/timeline', icon: Clock },
];

const adminItems = [
  { key: 'dashboard', path: '/admin', icon: LayoutDashboard },
  { key: 'entities', path: '/admin/entities', icon: FileText },
  { key: 'edges', path: '/admin/edges', icon: GitBranch },
  { key: 'backup', path: '/admin/backup', icon: Archive },
  { key: 'settings', path: '/admin/settings', icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const pathname = usePathname();
  const { t, locale } = useI18n();
  const base = `/${locale}`;

  // Check auth status on mount and when pathname changes (login/logout navigations)
  const checkAuth = useCallback(() => {
    fetch('/api/admin/auth')
      .then(r => r.json())
      .then(data => setAuthenticated(data.authenticated === true))
      .catch(() => setAuthenticated(false));
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth, pathname]);

  const isActive = (path: string) => {
    const full = base + path;
    if (path === '') return pathname === base || pathname === base + '/';
    if (path === '/admin') return pathname === `${base}/admin` || pathname === `${base}/admin/`;
    return pathname.startsWith(full);
  };

  const linkClass = (path: string) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
      isActive(path)
        ? 'bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-medium'
        : 'text-gray-600 dark:text-gray-400 hover:bg-surface-2'
    }`;

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    setAuthenticated(false);
    window.location.href = `/${locale}`;
  };

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-56'} hidden md:flex flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-surface-1 flex-col transition-all duration-200 no-print`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="p-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
        {!collapsed && <span className="font-semibold text-sm">Archive</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-surface-2"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <Link key={item.key} href={`${base}${item.path}`} className={linkClass(item.path)}>
            <item.icon size={18} />
            {!collapsed && <span>{t(`nav.${item.key}`)}</span>}
          </Link>
        ))}

        {!collapsed && (
          <div className="pt-2 pb-1 px-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
            {t('nav.dashboards')}
          </div>
        )}
        {dashboardItems.map(item => (
          <Link key={item.key} href={`${base}${item.path}`} className={linkClass(item.path)}>
            <item.icon size={18} />
            {!collapsed && <span>{t(`dashboards.${item.key}`)}</span>}
          </Link>
        ))}

        <div className="pt-4" />
        <Link href={`${base}/search`} className={linkClass('/search')}>
          <Search size={18} />
          {!collapsed && <span>{t('nav.search')}</span>}
        </Link>

        {/* Admin section — only visible when authenticated */}
        {authenticated === true && (
          <>
            {!collapsed && (
              <div className="pt-2 pb-1 px-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                {t('nav.admin')}
              </div>
            )}
            {collapsed && <div className="pt-2" />}
            {adminItems.map(item => (
              <Link key={item.key} href={`${base}${item.path}`} className={linkClass(item.path)}>
                <item.icon size={18} />
                {!collapsed && <span>{t(`admin.nav.${item.key}`)}</span>}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-gray-600 dark:text-gray-400 hover:bg-surface-2 w-full text-left"
            >
              <LogOut size={18} />
              {!collapsed && <span>{t('admin.nav.logout')}</span>}
            </button>
          </>
        )}

        {/* Log in link — only visible when NOT authenticated */}
        {authenticated === false && (
          <Link
            href={`${base}/admin/login`}
            className={linkClass('/admin/login')}
          >
            <LogIn size={18} />
            {!collapsed && <span>{t('admin.nav.login')}</span>}
          </Link>
        )}
      </nav>
    </aside>
  );
}
