'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/provider';
import {
  LayoutDashboard, FileText, GitBranch, Archive, Settings, LogOut,
} from 'lucide-react';

const navItems = [
  { key: 'dashboard', path: '', icon: LayoutDashboard },
  { key: 'entities', path: '/entities', icon: FileText },
  { key: 'edges', path: '/edges', icon: GitBranch },
  { key: 'backup', path: '/backup', icon: Archive },
  { key: 'settings', path: '/settings', icon: Settings },
];

export function AdminNav({ locale }: { locale: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const base = `/${locale}/admin`;

  const isActive = (path: string) => {
    const full = base + path;
    return path === '' ? pathname === base || pathname === base + '/' : pathname.startsWith(full);
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push(`/${locale}/admin/login`);
  };

  return (
    <nav className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-surface-1 overflow-x-auto">
      {navItems.map(item => (
        <Link
          key={item.key}
          href={`${base}${item.path}`}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
            isActive(item.path)
              ? 'bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-medium'
              : 'text-gray-600 dark:text-gray-400 hover:bg-surface-2'
          }`}
        >
          <item.icon size={16} />
          <span>{t(`admin.nav.${item.key}`)}</span>
        </Link>
      ))}
      <div className="flex-1" />
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:bg-surface-2 transition-colors"
      >
        <LogOut size={16} />
        <span>{t('admin.nav.logout')}</span>
      </button>
    </nav>
  );
}
