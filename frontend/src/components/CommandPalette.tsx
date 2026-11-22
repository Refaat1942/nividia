'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarPlus,
  CreditCard,
  DoorOpen,
  FilePlus2,
  LogIn,
  Search,
  User,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { NAV_ITEMS } from '@/lib/nav';
import { cn } from '@/lib/utils';

type Command = {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  href: string;
  group: string;
};

const QUICK_ACTIONS: (Omit<Command, 'group'> & { permission?: string | string[] })[] = [
  { id: 'checkin', label: 'تسجيل حضور عميل', icon: LogIn, href: '/sessions?focus=checkin', permission: 'sessions.view' },
  { id: 'booking', label: 'حجز غرفة', icon: CalendarPlus, href: '/bookings?new=1', permission: ['bookings.view', 'rooms.book'] },
  { id: 'customer', label: 'إضافة عميل جديد', icon: UserPlus, href: '/customers?new=1', permission: 'customers.view' },
  { id: 'contract', label: 'إنشاء عقد', icon: FilePlus2, href: '/contracts?new=1', permission: 'contracts.view' },
  { id: 'payment', label: 'تسجيل دفعة', icon: CreditCard, href: '/payments?new=1', permission: 'payments.view' },
  { id: 'space', label: 'إضافة غرفة أو مكتب', icon: DoorOpen, href: '/rooms?new=1', permission: ['offices.view', 'rooms.view'] },
];

/** Ctrl+K: jump anywhere, start any common task, or act on a customer by name. */
export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCustomers([]);
    setRooms([]);
    setActive(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) {
      setCustomers([]);
      setRooms([]);
      return;
    }
    const t = setTimeout(() => {
      api<any>(`/search?q=${encodeURIComponent(q)}`)
        .then((d) => { setCustomers(d.customers || []); setRooms(d.rooms || []); })
        .catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [query, open]);

  const commands = useMemo(() => {
    const q = query.trim();
    const match = (text: string) => !q || text.includes(q);
    const list: Command[] = [];
    customers.slice(0, 5).forEach((c) => {
      list.push({ id: `c-${c.id}`, group: 'العملاء', icon: User, label: c.name, hint: c.phone, href: `/customers/${c.id}` });
      list.push({ id: `ci-${c.id}`, group: 'العملاء', icon: LogIn, label: `تسجيل حضور: ${c.name}`, href: `/sessions?checkin=${c.id}` });
      list.push({ id: `cb-${c.id}`, group: 'العملاء', icon: CalendarPlus, label: `حجز غرفة لـ ${c.name}`, href: `/bookings?new=1&customer=${c.id}` });
      list.push({ id: `cc-${c.id}`, group: 'العملاء', icon: FilePlus2, label: `عقد جديد لـ ${c.name}`, href: `/contracts?new=1&customer=${c.id}` });
    });
    rooms.slice(0, 4).forEach((r) => {
      list.push({ id: `r-${r.id}`, group: 'الغرف', icon: CalendarPlus, label: `حجز ${r.name}`, href: `/bookings?new=1&room=${r.id}` });
    });
    QUICK_ACTIONS.filter((a) => (!a.permission || hasPermission(a.permission)) && match(a.label))
      .forEach((a) => list.push({ ...a, group: 'إجراءات سريعة' }));
    NAV_ITEMS.filter((n) => (!n.permission || hasPermission(n.permission)) && match(n.label))
      .forEach((n) => list.push({ id: `n-${n.href}`, group: 'انتقال إلى', icon: n.icon, label: n.label, href: n.href }));
    return list;
  }, [query, customers, rooms, hasPermission]);

  useEffect(() => { setActive(0); }, [commands.length]);

  function run(cmd: Command | undefined) {
    if (!cmd) return;
    onClose();
    router.push(cmd.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, commands.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(commands[active]); }
  }

  if (!open) return null;

  let lastGroup = '';
  return (
    <div className="print:hidden fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 pt-[12vh]" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden" onClick={(e) => e.stopPropagation()} onKeyDown={onKeyDown}>
        <div className="flex items-center gap-3 border-b px-4">
          <Search size={18} className="text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="اكتب اسم عميل أو رقم تليفون أو إجراء…"
            className="flex-1 py-4 text-base outline-none bg-transparent"
          />
          <kbd className="rounded-md border bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-500">Esc</kbd>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {commands.map((cmd, i) => {
            const header = cmd.group !== lastGroup ? cmd.group : null;
            lastGroup = cmd.group;
            const Icon = cmd.icon;
            return (
              <div key={cmd.id}>
                {header && <p className="px-3 pt-3 pb-1 text-[11px] font-semibold text-slate-400">{header}</p>}
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(cmd)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-right',
                    i === active ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-50',
                  )}
                >
                  <Icon size={17} className={i === active ? 'text-white' : 'text-slate-400'} />
                  <span className="flex-1 truncate">{cmd.label}</span>
                  {cmd.hint && <span className={cn('text-xs', i === active ? 'text-blue-100' : 'text-slate-400')}>{cmd.hint}</span>}
                </button>
              </div>
            );
          })}
          {!commands.length && <p className="p-6 text-center text-sm text-slate-500">لا توجد نتائج</p>}
        </div>
        <div className="border-t bg-slate-50 px-4 py-2 text-[11px] text-slate-500 flex gap-4">
          <span>↑↓ للتنقل</span>
          <span>Enter للتنفيذ</span>
          <span className="ms-auto">ابحث باسم العميل لتسجيل حضوره أو حجز غرفة له مباشرة</span>
        </div>
      </div>
    </div>
  );
}
