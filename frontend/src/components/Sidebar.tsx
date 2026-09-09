'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { logout } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { NAV_ITEMS } from '@/lib/nav';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  return (
    <aside className="w-64 min-h-screen bg-sidebar text-white flex flex-col fixed right-0 top-0 z-40">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-lg font-bold">نفيديا</h1>
        <p className="text-xs text-slate-400 mt-1">إدارة المكاتب والباقات</p>
        {user && (
          <p className="text-xs text-slate-300 mt-2 truncate" title={user.full_name}>
            {user.full_name}
          </p>
        )}
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition',
              pathname.startsWith(item.href)
                ? 'bg-primary text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            )}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-700">
        <button onClick={logout} className="w-full text-sm text-slate-400 hover:text-white transition">
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
