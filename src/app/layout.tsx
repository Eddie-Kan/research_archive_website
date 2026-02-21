import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Research Archive',
  description: 'Local-first bilingual research archive and portfolio',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
