'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd'];

export default function DashboardPage() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [charts, setCharts] = useState<any>({});

  useEffect(() => {
    api<Record<string, number>>('/dashboard/stats').then(setStats).catch(console.error);
    api<any>('/dashboard/charts').then(setCharts).catch(console.error);
  }, []);

  const cards = [
    { label: 'إجمالي العملاء', value: stats.total_customers, icon: '👥', color: 'bg-blue-50 text-blue-700' },
    { label: 'العملاء النشطين', value: stats.active_customers, icon: '✅', color: 'bg-green-50 text-green-700' },
    { label: 'العقود النشطة', value: stats.active_contracts, icon: '📄', color: 'bg-purple-50 text-purple-700' },
    { label: 'عقود تنتهي قريبًا', value: stats.expiring_contracts, icon: '⚠️', color: 'bg-amber-50 text-amber-700' },
    { label: 'مكاتب متاحة', value: stats.available_offices, icon: '🏢', color: 'bg-teal-50 text-teal-700' },
    { label: 'مكاتب مؤجرة', value: stats.occupied_offices, icon: '🔒', color: 'bg-slate-50 text-slate-700' },
    { label: 'غرف متاحة', value: stats.available_rooms, icon: '🚪', color: 'bg-indigo-50 text-indigo-700' },
    { label: 'حجوزات اليوم', value: stats.today_bookings, icon: '📅', color: 'bg-rose-50 text-rose-700' },
    { label: 'حاضرون الآن', value: stats.active_sessions, icon: '🟢', color: 'bg-lime-50 text-lime-700' },
    { label: 'جلسات اليوم', value: stats.today_sessions, icon: '🕐', color: 'bg-violet-50 text-violet-700' },
    { label: 'إيرادات الشهر', value: `${stats.monthly_revenue?.toLocaleString('ar-EG') || 0} ج.م`, icon: '💰', color: 'bg-emerald-50 text-emerald-700' },
    { label: 'الساعات المستخدمة', value: stats.used_hours, icon: '⏱️', color: 'bg-orange-50 text-orange-700' },
    { label: 'الساعات المتبقية', value: stats.remaining_hours, icon: '⏳', color: 'bg-cyan-50 text-cyan-700' },
    { label: 'ساعات البونص', value: stats.bonus_hours, icon: '🎁', color: 'bg-pink-50 text-pink-700' },
  ];

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">لوحة التحكم</h1>
        <p className="text-slate-500 mt-1">نظرة عامة على أداء النظام</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className={`card ${c.color} !p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium opacity-70">{c.label}</p>
                <p className="text-2xl font-bold mt-1">{c.value ?? '—'}</p>
              </div>
              <span className="text-2xl">{c.icon}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-4">الإيرادات الشهرية</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={charts.revenue_by_month || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="#1e40af" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-4">توزيع الباقات</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={charts.package_distribution || []} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80} label>
                {(charts.package_distribution || []).map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Layout>
  );
}
