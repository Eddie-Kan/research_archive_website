'use client';

import dynamic from 'next/dynamic';
import * as Tabs from '@radix-ui/react-tabs';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

interface MdxEditorProps {
  bodyEn: string;
  bodyZh: string;
  onChangeEn: (v: string) => void;
  onChangeZh: (v: string) => void;
}

export function MdxEditor({ bodyEn, bodyZh, onChangeEn, onChangeZh }: MdxEditorProps) {
  return (
    <Tabs.Root defaultValue="en">
      <Tabs.List className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-4">
        <Tabs.Trigger
          value="en"
          className="px-4 py-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-brand-600 data-[state=active]:text-brand-700 dark:data-[state=active]:text-brand-300 text-gray-500"
        >
          EN
        </Tabs.Trigger>
        <Tabs.Trigger
          value="zh"
          className="px-4 py-2 text-sm font-medium data-[state=active]:border-b-2 data-[state=active]:border-brand-600 data-[state=active]:text-brand-700 dark:data-[state=active]:text-brand-300 text-gray-500"
        >
          中文
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="en" data-color-mode="light">
        <MDEditor
          value={bodyEn}
          onChange={v => onChangeEn(v || '')}
          height={400}
          preview="edit"
        />
      </Tabs.Content>
      <Tabs.Content value="zh" data-color-mode="light">
        <MDEditor
          value={bodyZh}
          onChange={v => onChangeZh(v || '')}
          height={400}
          preview="edit"
        />
      </Tabs.Content>
    </Tabs.Root>
  );
}
