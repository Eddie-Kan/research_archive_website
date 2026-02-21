import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/auth/session';

export default async function AuthenticatedAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAuthenticated = await getSessionFromCookies();

  if (!isAuthenticated) {
    redirect(`/${locale}/admin/login`);
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {children}
    </div>
  );
}
