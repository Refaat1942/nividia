'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CalendarClock,
  CalendarPlus,
  Clock,
  CreditCard,
  FilePlus2,
  Hourglass,
  LogIn,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const COLORS = ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd'];

const QUICK = [
  { href: '/sessions?focus=checkin', label: 'تسجيل حضور', icon: LogIn, tone: 'from-emerald-500 to-emerald-600' },
  { href: '/bookings?new=1', label: 'حجز غرفة', icon: CalendarPlus, tone: 'from-sky-500 to-blue-600' },
  { href: '/customers?new=1', label: 'عميل جديد', icon: UserPlus, tone: 'from-violet-500 to-purple-600' },
  { href: '/contracts?new=1', label: 'عقد جديد', icon: FilePlus2, tone: 'from-amber-500 to-orange-600' },
  { href: '/payments?new=1', label: 'تسجيل دفعة', icon: CreditCard, tone: 'from-rose-500 to-pink-600' },
];

function greeting(now: Date) {
  const h = now.getHours();
  if (h < 12) return 'صباح الخير';
  if (h < 18) return 'مساء الخير';
  return 'مساء النور';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [charts, setCharts] = useState<any>({});
  const [spaces, setSpaces] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  // Set after mount so server and browser render the same markup.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    api<Record<string, number>>('/dashboard/stats').then(setStats).catch(() => {});
    api<any>('/dashboard/charts').then(setCharts).catch(() => {});
    api<any>('/sessions/spaces').then((d) => setSpaces(d.items || [])).catch(() => {});
    api<any>(`/bookings?booking_date=${today}`).then((d) => setBookings(d.items || [])).catch(() => {});
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const kpis = [
    { label: 'حاضرون الآن', value: stats.active_sessions, icon: UserCheck, tone: 'text-emerald-600 bg-emerald-50', href: '/sessions' },
    { label: 'حجوزات اليوم', value: stats.today_bookings, icon: CalendarClock, tone: 'text-sky-600 bg-sky-50', href: '/bookings' },
    { label: 'العملاء النشطون', value: stats.active_customers, icon: Users, tone: 'text-violet-600 bg-violet-50', href: '/customers' },
    { label: 'جلسات اليوم', value: stats.today_sessions, icon: Clock, tone: 'text-indigo-600 bg-indigo-50', href: '/sessions' },
    { label: 'إيرادات الشهر', value: stats.monthly_revenue != null ? `${Number(stats.monthly_revenue).toLocaleString('ar-EG')} ج.م` : undefined, icon: Wallet, tone: 'text-rose-600 bg-rose-50', href: '/payments' },
    { label: 'الساعات المتبقية للعملاء', value: stats.remaining_hours, icon: Hourglass, tone: 'text-amber-600 bg-amber-50', href: '/hours' },
  ];

  const nowHM = now ? now.toTimeString().slice(0, 5) : '';
  const upcoming = bookings
    .filter((b) => b.booking_status !== 'cancelled')
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <Layout>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-primary via-blue-700 to-sky-600 text-white p-6 lg:p-8 mb-6">
        <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="absolute left-24 -bottom-20 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-blue-100 text-sm">
              {now?.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) || '\u00a0'}
            </p>
            <h1 className="text-2xl lg:text-3xl font-bold mt-1">{now ? greeting(now) : 'أهلًا'}{user ? `، ${user.full_name.split(' ')[0]}` : ''} 👋</h1>
            <p className="text-blue-100 mt-1 text-sm">
              {stats.active_sessions ? `${stats.active_sessions} عميل حاضر الآن` : 'لا يوجد عملاء حاضرون الآن'}
              {' • '}
              {upcoming.length ? `${upcoming.length} حجز اليوم` : 'لا حجوزات اليوم'}
            </p>
          </div>
          <p className="text-4xl lg:text-5xl font-bold tabular-nums tracking-tight">{nowHM}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {QUICK.map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="group card !p-4 flex items-center gap-3 hover:-translate-y-0.5 hover:shadow-md transition"
          >
            <span className={cn('h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br text-white flex items-center justify-center shadow-sm', q.tone)}>
              <q.icon size={20} />
            </span>
            <span className="font-semibold text-slate-700 group-hover:text-primary">{q.label}</span>
          </Link>
        ))}
      </div>

      {stats.expiring_contracts ? (
        <Link href="/contracts" className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-amber-800 hover:bg-amber-100">
          <AlertTriangle size={18} />
          <span className="text-sm font-medium">{stats.expiring_contracts} عقد ينتهي قريبًا — راجعها وجدّدها</span>
        </Link>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <section className="card xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-lg">الغرف الآن</h2>
              <p className="text-xs text-slate-500">مين موجود فين — اضغط على الغرفة لعرض الحاضرين فيها</p>
            </div>
            <Link href="/sessions" className="link-action text-sm">الحضور والانصراف</Link>
          </div>
          {spaces.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {spaces.map((s) => {
                const ratio = s.capacity ? Math.min(s.present_count / s.capacity, 1) : s.present_count ? 1 : 0;
                const full = s.capacity && s.present_count >= s.capacity;
                return (
                  <Link
                    key={`${s.kind}-${s.id}`}
                    href={`/sessions?room=${s.id}`}
                    className={cn(
                      'rounded-2xl border p-4 transition hover:shadow-md',
                      full ? 'border-rose-200 bg-rose-50' : s.present_count ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-800 truncate">{s.name}</p>
                      <span className={cn('h-2.5 w-2.5 rounded-full mt-1.5 shrink-0', full ? 'bg-rose-500' : s.present_count ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300')} />
                    </div>
                    <p className="text-2xl font-bold mt-2 tabular-nums">
                      {s.present_count}
                      {s.capacity ? <span className="text-sm font-normal text-slate-400"> / {s.capacity}</span> : null}
                    </p>
                    <p className="text-xs text-slate-500">{s.present_count ? 'حاضر' : 'فارغة'}</p>
                    <div className="mt-3 h-1.5 rounded-full bg-white/80 overflow-hidden">
                      <div className={cn('h-full rounded-full', full ? 'bg-rose-500' : 'bg-emerald-500')} style={{ width: `${ratio * 100}%` }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-6 text-center">
              لا توجد غرف بعد — <Link href="/rooms?new=1" className="link-action">أضف أول غرفة</Link>
            </p>
          )}
        </section>

        <section className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">حجوزات اليوم</h2>
            <Link href="/bookings?new=1" className="link-action text-sm">+ حجز</Link>
          </div>
          {upcoming.length ? (
            <ol className="relative border-r-2 border-slate-100 pr-4 space-y-4">
              {upcoming.slice(0, 8).map((b) => {
                const live = b.start_time <= nowHM && nowHM < b.end_time;
                const past = b.end_time <= nowHM;
                return (
                  <li key={b.id} className={cn('relative', past && 'opacity-50')}>
                    <span className={cn('absolute -right-[23px] top-1.5 h-3 w-3 rounded-full ring-4 ring-white', live ? 'bg-emerald-500' : 'bg-primary')} />
                    <p className="text-xs text-slate-500 tabular-nums">{b.start_time} – {b.end_time}{live && <span className="text-emerald-600 font-semibold"> • الآن</span>}</p>
                    <p className="font-medium text-sm">{b.customer_name}</p>
                    <p className="text-xs text-slate-500">{b.room_name}</p>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-sm text-slate-500 py-6 text-center">لا توجد حجوزات اليوم</p>
          )}
        </section>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="card !p-4 hover:shadow-md transition">
            <span className={cn('inline-flex h-9 w-9 items-center justify-center rounded-xl', k.tone)}>
              <k.icon size={18} />
            </span>
            <p className="text-2xl font-bold mt-3 tabular-nums">{k.value ?? '—'}</p>
            <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-4">الإيرادات الشهرية</h3>
          <div dir="ltr">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={charts.revenue_by_month || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis width={64} tickFormatter={(v) => Number(v).toLocaleString('en')} />
              <Tooltip />
              <Bar dataKey="revenue" fill="#1e40af" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-4">توزيع الباقات</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={charts.package_distribution || []} dataKey="count" nameKey="type" cx="50%" cy="50%" innerRadius={50} outerRadius={85}>
                {(charts.package_distribution || []).map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Layout>
  );
}
