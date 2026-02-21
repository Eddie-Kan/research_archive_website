'use client';

import { useRouter, useParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n/provider';
import { EntityForm } from '@/components/admin/entity-form';

export default function NewEntityPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const handleSave = async (entity: Record<string, any>) => {
    const res = await fetch('/api/admin/entities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ entity }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.details?.join(', ') || data.error || 'Failed to create entity');
    }
    router.push(`/${locale}/admin/entities/${data.id}`);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('admin.entities.create')}</h1>
      <EntityForm onSave={handleSave} isNew />
    </div>
  );
}
