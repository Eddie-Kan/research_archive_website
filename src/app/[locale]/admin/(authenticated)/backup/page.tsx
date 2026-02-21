'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/provider';

interface BackupInfo {
  path: string;
  size: number;
  checksum: string;
  timestamp: string;
  type: string;
}

export default function BackupPage() {
  const { t } = useI18n();
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/backup').then(r => r.json()).then(setBackups).catch(() => {});
  }, []);

  const createBackup = async () => {
    setCreating(true);
    setMessage('');
    try {
      const res = await fetch('/api/backup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`Error: ${data.error || 'Backup failed'}`);
        return;
      }
      setMessage(`Backup created: ${data.path} (${(data.size / 1024 / 1024).toFixed(1)} MB)`);
      const list = await fetch('/api/backup').then(r => r.json());
      setBackups(list);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setMessage(`Error: ${errorMessage}`);
    } finally {
      setCreating(false);
    }
  };

  const restoreBackup = async (backupPath: string) => {
    if (!confirm('Restore from this backup? Current data will be overwritten.')) return;
    setRestoring(backupPath);
    setMessage('');
    try {
      const res = await fetch('/api/backup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupPath }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMessage(`Error: ${data.errors?.join(', ') || data.error || 'Restore failed'}`);
      } else {
        setMessage(`Restored ${data.entitiesRestored} entities successfully.`);
      }
    } catch (err: unknown) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">{t('nav.backup')}</h1>

      <div className="flex gap-4">
        <button
          onClick={createBackup}
          disabled={creating}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 text-sm font-medium"
        >
          {creating ? t('common.loading') : t('backup.create')}
        </button>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-surface-1 text-sm">{message}</div>
      )}

      <div className="space-y-2">
        {backups.map((b, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-surface-1 text-sm">
            <div>
              <span className="font-medium">{b.type}</span>
              <span className="text-gray-500 ml-2">{new Date(b.timestamp).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-500">{(b.size / 1024 / 1024).toFixed(1)} MB</span>
              <button
                onClick={() => restoreBackup(b.path)}
                disabled={restoring === b.path}
                className="px-3 py-1 text-xs border border-amber-400 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950 disabled:opacity-50"
              >
                {restoring === b.path ? t('common.loading') : t('backup.restore') || 'Restore'}
              </button>
            </div>
          </div>
        ))}
        {backups.length === 0 && (
          <p className="text-gray-500 text-sm">{t('common.noResults')}</p>
        )}
      </div>
    </div>
  );
}
