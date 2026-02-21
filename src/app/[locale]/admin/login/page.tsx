'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n/provider';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const params = useParams();
  const locale = params.locale as string;
  const { t } = useI18n();

  useEffect(() => {
    // Check setup status and auth state via GET
    fetch('/api/admin/auth', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.authenticated) {
          // Already logged in — go to admin
          window.location.href = `/${locale}/admin`;
          return;
        }
        if (data.setupRequired) {
          setSetupMode(true);
        }
        setCheckingSetup(false);
      })
      .catch(() => setCheckingSetup(false));
  }, [locale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (setupMode) {
        const res = await fetch('/api/admin/auth/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || t('admin.login.error'));
          setLoading(false);
          return;
        }
        setSetupMode(false);
      }

      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t('admin.login.error'));
        setLoading(false);
        return;
      }

      // Verify the session cookie was actually stored by the browser
      const check = await fetch('/api/admin/auth', { credentials: 'include' });
      const checkData = await check.json();

      if (!checkData.authenticated) {
        setError(t('admin.login.cookieError') || 'Cookie not stored. Check browser settings or try HTTPS.');
        setLoading(false);
        return;
      }

      // Cookie confirmed — redirect
      window.location.href = `/${locale}/admin`;
    } catch {
      setError(t('admin.login.error'));
      setLoading(false);
    }
  };

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-1">
      <div className="w-full max-w-sm p-6 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
        <h1 className="text-xl font-semibold mb-1 text-center">
          {setupMode ? t('admin.login.setup') : t('admin.login.title')}
        </h1>
        {setupMode && (
          <p className="text-sm text-gray-500 mb-4 text-center">
            {t('admin.login.setupHint')}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              {t('admin.login.password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoFocus
              required
              minLength={setupMode ? 6 : 1}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? t('common.loading') : t('admin.login.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
