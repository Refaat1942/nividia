'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronsLeft, ChevronsRight, LogOut, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, logout } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { NAV_GROUPS } from '@/lib/nav';
import LogoImage from '@/components/LogoImage';

interface Props {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }: Props) {
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();
  const [logoKey, setLogoKey] = useState(0);
  const [present, setPresent] = useState<number | null>(null);

  useEffect(() => {
    const refresh = () => setLogoKey((k) => k + 1);
    window.addEventListener('logo-updated', refresh);
    return () => window.removeEventListener('logo-updated', refresh);
  }, []);

  useEffect(() => {
    if (!hasPermission('sessions.view')) return;
    const load = () => api<any>('/sessions/active').then((d) => setPresent(d.count ?? d.items?.length ?? 0)).catch(() => {});
    load();
    const timer = setInterval(load, 60000);
    window.addEventListener('sessions-changed', load);
    return () => { clearInterval(timer); window.removeEventListener('sessions-changed', load); };
  }, [hasPermission]);

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => !item.permission || hasPermission(item.permission)),
  })).filter((g) => g.items.length);

  const narrow = collapsed && !mobileOpen;

  return (
    <>
      {mobileOpen && (
        <div className="print:hidden fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={cn(
          'print:hidden fixed top-0 right-0 z-50 h-screen bg-sidebar text-white flex flex-col transition-all duration-200',
          narrow ? 'w-[76px]' : 'w-64',
          mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
        )}
      >
        <div className={cn('flex items-center gap-3 border-b border-white/10 shrink-0', narrow ? 'p-3 justify-center' : 'p-4')}>
          <div className="bg-white rounded-lg p-1.5 shrink-0">
            <LogoImage
              refreshKey={logoKey}
              className={cn('w-auto object-contain', narrow ? 'h-7' : 'h-8 max-w-[110px]')}
              fallback={<span className="block h-7 w-7 leading-7 text-center font-bold text-primary">ن</span>}
            />
          </div>
          {!narrow && (
            <div className="min-w-0">
              <p className="font-bold leading-tight">نفيديا</p>
              <p className="text-[11px] text-slate-400">إدارة المكاتب والمساحات</p>
            </div>
          )}
          <button type="button" onClick={onCloseMobile} className="lg:hidden ms-auto p-1 text-slate-400 hover:text-white" aria-label="إغلاق القائمة">
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-4">
          {groups.map((group) => (
            <div key={group.title}>
              {!narrow && (
                <p className="px-3 mb-1 text-[11px] font-semibold tracking-wide text-slate-500">{group.title}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  const badge = item.badge === 'present' && present ? present : null;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onCloseMobile}
                      title={narrow ? item.label : undefined}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-xl text-sm transition',
                        narrow ? 'justify-center p-2.5' : 'px-3 py-2.5',
                        active
                          ? 'bg-primary text-white shadow-lg shadow-primary/30'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white',
                      )}
                    >
                      {active && !narrow && <span className="absolute right-0 top-2 bottom-2 w-1 rounded-l bg-sky-300" />}
                      <Icon size={19} className="shrink-0" strokeWidth={active ? 2.4 : 2} />
                      {!narrow && <span className="truncate">{item.label}</span>}
                      {badge !== null && (
                        <span
                          className={cn(
                            'rounded-full bg-emerald-500 text-white text-[11px] font-bold leading-none',
                            narrow ? 'absolute -top-0.5 -left-0.5 px-1.5 py-0.5' : 'ms-auto px-2 py-1',
                          )}
                          title={`${badge} حاضر الآن`}
                        >
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3 shrink-0 space-y-2">
          {user && !narrow && (
            <Link href="/account" onClick={onCloseMobile} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5">
              <span className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-sky-400 to-primary flex items-center justify-center font-bold">
                {user.full_name?.trim()?.[0] || '؟'}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium truncate">{user.full_name}</span>
                <span className="block text-[11px] text-slate-400 truncate">{user.username}</span>
              </span>
            </Link>
          )}
          <div className={cn('flex gap-2', narrow && 'flex-col')}>
            <button
              type="button"
              onClick={logout}
              title="تسجيل الخروج"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-300 bg-white/5 hover:bg-red-600 hover:text-white transition"
            >
              <LogOut size={16} />
              {!narrow && 'تسجيل الخروج'}
            </button>
            <button
              type="button"
              onClick={onToggleCollapsed}
              title={collapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
              className="hidden lg:flex items-center justify-center rounded-xl px-2.5 py-2 text-slate-400 bg-white/5 hover:text-white"
            >
              {collapsed ? <ChevronsLeft size={16} /> : <ChevronsRight size={16} />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
