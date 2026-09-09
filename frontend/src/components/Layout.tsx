'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import NotificationsBell from './NotificationsBell';
import { AuthProvider, useAuth } from '@/lib/auth';
import { NAV_ITEMS } from '@/lib/nav';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, hasPermission } = useAuth();

  const navItem = NAV_ITEMS.find(
    (item) => item.href !== '/dashboard' && pathname.startsWith(item.href),
  );
  const denied = !loading && navItem?.permission && !hasPermission(navItem.permission);

  return (
    <div className="min-h-screen" dir="rtl">
      <Sidebar />
      <main className="mr-64 p-6 lg:p-8">
        <div className="flex justify-end mb-4">
          <NotificationsBell />
        </div>
        {denied ? (
          <div className="card text-center py-16">
            <p className="text-xl font-semibold text-red-600">غير مصرح</p>
            <p className="text-slate-500 mt-2">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
          </div>
        ) : children}
      </main>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LayoutContent>{children}</LayoutContent>
    </AuthProvider>
  );
}
