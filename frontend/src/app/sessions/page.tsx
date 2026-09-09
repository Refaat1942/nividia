'use client';

import { useCallback, useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h} س ${m} د`;
  return `${m} دقيقة`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

export default function SessionsPage() {
  const [active, setActive] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(() => {
    api<any>('/sessions/active').then((d) => setActive(d.items)).catch(console.error);
    const today = new Date().toISOString().slice(0, 10);
    api<any>(`/sessions?session_date=${today}`).then((d) => setHistory(d.items)).catch(console.error);
  }, []);

  useEffect(() => {
    load();
    api<any>('/customers?status=active').then((d) => setCustomers(d.items)).catch(console.error);
    const timer = setInterval(() => setNow(Date.now()), 30000);
    const refresh = setInterval(load, 30000);
    return () => { clearInterval(timer); clearInterval(refresh); };
  }, [load]);

  const filtered = customers.filter((c) => {
    const q = search.trim();
    if (!q) return true;
    return c.full_name.includes(q) || c.phone.includes(q) || c.customer_code.includes(q);
  });

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer) return;
    setLoading(true);
    try {
      await api('/sessions/check-in', {
        method: 'POST',
        body: JSON.stringify({ customer_id: selectedCustomer, notes: notes || null }),
      });
      setSelectedCustomer('');
      setNotes('');
      setSearch('');
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'خطأ في تسجيل الحضور');
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckOut(sessionId: string) {
    if (!confirm('تأكيد تسجيل الانصراف وخصم الساعات؟')) return;
    setLoading(true);
    try {
      await api(`/sessions/${sessionId}/check-out`, { method: 'POST', body: JSON.stringify({}) });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'خطأ في تسجيل الانصراف');
    } finally {
      setLoading(false);
    }
  }

  function liveElapsed(checkInAt: string) {
    const start = new Date(checkInAt).getTime();
    const mins = Math.max(0, Math.floor((now - start) / 60000));
    return formatDuration(mins);
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">ساعة الحضور والانصراف</h1>
        <p className="text-slate-500 mt-1">تسجيل حضور وانصراف العملاء وخصم الساعات من رصيد العقد</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card lg:col-span-1">
          <h2 className="font-semibold mb-4 text-green-700">تسجيل حضور</h2>
          <form onSubmit={handleCheckIn} className="space-y-3">
            <input
              className="input"
              placeholder="بحث بالاسم أو الهاتف أو الكود..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="input"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              required
            >
              <option value="">اختر العميل</option>
              {filtered.slice(0, 50).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} — {c.phone} ({c.customer_code})
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder="ملاحظات (اختياري)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'جاري التسجيل...' : 'تسجيل حضور'}
            </button>
          </form>
        </div>

        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-blue-700">العملاء الحاضرون الآن</h2>
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
              {active.length} حاضر
            </span>
          </div>
          {active.length === 0 ? (
            <p className="text-slate-500 text-center py-8">لا يوجد عملاء حاضرون حالياً</p>
          ) : (
            <div className="space-y-3">
              {active.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div>
                    <p className="font-semibold">{s.customer_name}</p>
                    <p className="text-sm text-slate-500">{s.customer_phone} • {s.customer_code}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      حضور: {formatTime(s.check_in_at)} • المدة: {liveElapsed(s.check_in_at)}
                      {s.estimated_hours ? ` • تقدير الخصم: ${s.estimated_hours} س` : ''}
                    </p>
                    <p className="text-xs text-green-700 mt-1">المتبقي: {s.remaining_hours ?? '—'} ساعة</p>
                  </div>
                  <button
                    onClick={() => handleCheckOut(s.id)}
                    className="btn-primary bg-red-600 hover:bg-red-700 whitespace-nowrap"
                    disabled={loading}
                  >
                    تسجيل انصراف
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">سجل اليوم</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head">
                <th className="p-3 text-right">العميل</th>
                <th className="p-3 text-right">الحضور</th>
                <th className="p-3 text-right">الانصراف</th>
                <th className="p-3 text-right">المدة</th>
                <th className="p-3 text-right">الخصم</th>
                <th className="p-3 text-right">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {history.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3">{s.customer_name}</td>
                  <td className="p-3">{s.check_in_at ? formatTime(s.check_in_at) : '—'}</td>
                  <td className="p-3">{s.check_out_at ? formatTime(s.check_out_at) : '—'}</td>
                  <td className="p-3">{s.duration_minutes != null ? formatDuration(s.duration_minutes) : liveElapsed(s.check_in_at)}</td>
                  <td className="p-3">{s.hours_deducted != null ? `${s.hours_deducted} س` : '—'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      s.status === 'checked_in' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {s.status === 'checked_in' ? 'حاضر' : 'منصرف'}
                    </span>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-slate-500">لا توجد جلسات اليوم</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
