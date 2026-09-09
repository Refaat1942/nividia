'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { logout } from '@/lib/api';

const navItems = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: '📊' },
  { href: '/customers', label: 'العملاء', icon: '👥' },
  { href: '/packages', label: 'الباقات', icon: '📦' },
  { href: '/offices', label: 'المكاتب', icon: '🏢' },
  { href: '/rooms', label: 'غرف الاجتماعات', icon: '🚪' },
  { href: '/bookings', label: 'الحجوزات', icon: '📅' },
  { href: '/contracts', label: 'العقود', icon: '📄' },
  { href: '/documents', label: 'المستندات', icon: '📁' },
  { href: '/payments', label: 'المدفوعات', icon: '💰' },
  { href: '/hours', label: 'الساعات', icon: '⏱️' },
  { href: '/reports', label: 'التقارير', icon: '📈' },
  { href: '/users', label: 'المستخدمون والصلاحيات', icon: '🔐' },
  { href: '/audit', label: 'سجل العمليات', icon: '📋' },
  { href: '/settings', label: 'الإعدادات', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-sidebar text-white flex flex-col fixed right-0 top-0 z-40">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-lg font-bold">فراتيلانزا</h1>
        <p className="text-xs text-slate-400 mt-1">نظام إدارة المكاتب</p>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
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
