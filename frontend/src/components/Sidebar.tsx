'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { logout } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { NAV_ITEMS } from '@/lib/nav';
import LogoImage from '@/components/LogoImage';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();
  const [logoKey, setLogoKey] = useState(0);

  useEffect(() => {
    const refresh = () => setLogoKey((k) => k + 1);
    window.addEventListener('logo-updated', refresh);
    return () => window.removeEventListener('logo-updated', refresh);
  }, []);

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  return (
    <aside className="w-64 h-screen bg-sidebar text-white flex flex-col fixed right-0 top-0 z-40">
      <div className="p-4 border-b border-slate-700 shrink-0">
        <LogoImage
          refreshKey={logoKey}
          className="h-8 w-auto max-w-full object-contain mb-2"
        />
        <h1 className="text-base font-bold">نفيديا</h1>
        <p className="text-xs text-slate-400">إدارة المكاتب والباقات</p>
        {user && (
          <p className="text-xs text-slate-300 mt-1 truncate" title={user.full_name}>
            {user.full_name}
          </p>
        )}
      </div>
      <nav className="sidebar-nav flex-1 min-h-0 overflow-y-auto p-3 space-y-0.5">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition',
              pathname.startsWith(item.href)
                ? 'bg-primary text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            )}
          >
            <span className="text-base shrink-0">{item.icon}</span>
            <span className="leading-snug">{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-700 shrink-0">
        <button
          type="button"
          onClick={logout}
          className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-slate-800 text-slate-200 hover:bg-red-600 hover:text-white transition"
        >
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
