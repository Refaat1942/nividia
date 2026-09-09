'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import NotificationsBell from './NotificationsBell';
import { logout } from '@/lib/api';
import { AuthProvider, useAuth } from '@/lib/auth';
import { NAV_ITEMS } from '@/lib/nav';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, hasPermission } = useAuth();

  const navItem = NAV_ITEMS.find(
    (item) => item.href !== '/dashboard' && pathname.startsWith(item.href),
  );
  const denied = !loading && navItem?.permission && !hasPermission(navItem.permission);

  return (
    <div className="min-h-screen" dir="rtl">
      <Sidebar />
      <main className="mr-64 p-6 lg:p-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          {user && (
            <p className="text-sm text-slate-600 truncate" title={user.full_name}>
              {user.full_name}
            </p>
          )}
          <div className="flex items-center gap-2 ms-auto">
            <NotificationsBell />
            <button
              type="button"
              onClick={logout}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition"
            >
              تسجيل الخروج
            </button>
          </div>
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
