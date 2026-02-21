'use client';

import { useI18n } from '@/lib/i18n/provider';

interface BilingualInputProps {
  label: string;
  valueEn: string;
  valueZh: string;
  onChangeEn: (v: string) => void;
  onChangeZh: (v: string) => void;
  multiline?: boolean;
  required?: boolean;
}

export function BilingualInput({
  label,
  valueEn,
  valueZh,
  onChangeEn,
  onChangeZh,
  multiline = false,
  required = false,
}: BilingualInputProps) {
  const { t } = useI18n();
  const InputComponent = multiline ? 'textarea' : 'input';
  const inputClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm';

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <span className="text-xs text-gray-500 mb-1 block">EN</span>
          <InputComponent
            value={valueEn}
            onChange={e => onChangeEn(e.target.value)}
            className={`${inputClass} ${multiline ? 'min-h-[80px] resize-y' : ''}`}
            required={required}
            placeholder="English"
          />
        </div>
        <div>
          <span className="text-xs text-gray-500 mb-1 block">中文</span>
          <InputComponent
            value={valueZh}
            onChange={e => onChangeZh(e.target.value)}
            className={`${inputClass} ${multiline ? 'min-h-[80px] resize-y' : ''}`}
            placeholder="中文"
          />
        </div>
      </div>
    </div>
  );
}
