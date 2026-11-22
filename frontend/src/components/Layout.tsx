'use client';

import { useEffect, useState } from 'react';
import { Menu, Search, Zap } from 'lucide-react';
import Sidebar from './Sidebar';
import NotificationsBell from './NotificationsBell';
import CommandPalette from './CommandPalette';
import { cn } from '@/lib/utils';

const COLLAPSE_KEY = 'sidebar-collapsed';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    const open = () => setPaletteOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('open-command-palette', open);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('open-command-palette', open);
    };
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        /* storage unavailable */
      }
      return !c;
    });
  }

  return (
    <div className="min-h-screen" dir="rtl">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className={cn('transition-all duration-200 print:!m-0', collapsed ? 'lg:mr-[76px]' : 'lg:mr-64')}>
        <header className="print:hidden sticky top-0 z-30 bg-slate-50/85 backdrop-blur border-b border-slate-200/70">
          <div className="flex items-center gap-3 px-4 lg:px-8 h-16">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -mr-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="فتح القائمة"
            >
              <Menu size={22} />
            </button>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex-1 max-w-xl flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-400 hover:border-primary/40 hover:shadow-sm transition"
            >
              <Search size={17} />
              <span className="truncate">ابحث عن عميل، أو نفّذ إجراء سريع…</span>
              <kbd className="hidden sm:inline ms-auto rounded-md border bg-slate-50 px-1.5 py-0.5 text-[11px] font-sans text-slate-500">Ctrl K</kbd>
            </button>
            <div className="flex items-center gap-1 ms-auto">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="hidden md:flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-medium text-white shadow-sm shadow-primary/30 hover:bg-blue-800"
              >
                <Zap size={16} />
                إجراء سريع
              </button>
              <NotificationsBell />
            </div>
          </div>
        </header>
        <main className="p-4 lg:p-8 print:p-0">{children}</main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
