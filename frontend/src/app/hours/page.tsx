'use client';

import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import { api } from '@/lib/api';

const TYPE_LABELS: Record<string, string> = {
  package: 'باقة', bonus: 'بونص', usage: 'استخدام', adjustment: 'تعديل', correction: 'تصحيح', refund: 'استرداد',
};

export default function HoursPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ amount: '', reason: '' });
  const [error, setError] = useState('');

  function load() { api<any>('/reports/hours-usage').then((d) => setTransactions(d.items)).catch(console.error); }
  useEffect(() => { load(); }, []);

  async function handleDelete(t: any) {
    if (!confirm('حذف هذه العملية؟ سيتم تعديل رصيد الساعات تلقائياً.')) return;
    await api(`/customers/hours-transactions/${t.id}`, { method: 'DELETE' });
    load();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const amount = parseFloat(form.amount);
    if (Number.isNaN(amount)) { setError('أدخل عدد ساعات صحيح (سالب للخصم)'); return; }
    try {
      await api(`/customers/hours-transactions/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ amount, reason: form.reason }),
      });
      setEditing(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر الحفظ');
    }
  }

  const q = search.trim();
  const shown = useMemo(
    () => (q ? transactions.filter((t) => `${t.customer_name || ''} ${t.reason || ''}`.includes(q)) : transactions),
    [transactions, q],
  );

  return (
    <Layout>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">سجل الساعات</h1>
          <p className="page-subtitle">كل إضافة أو خصم من رصيد ساعات العملاء — عدّل أو احذف أي عملية</p>
        </div>
        <input className="border border-slate-300 rounded-xl px-3 py-2 text-sm w-64 bg-white" placeholder="بحث باسم العميل أو السبب"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="card !p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="table-head">
            <th className="p-3 text-right">العميل</th>
            <th className="p-3 text-right">الساعات</th>
            <th className="p-3 text-right">النوع</th>
            <th className="p-3 text-right">السبب</th>
            <th className="p-3 text-right">التاريخ</th>
            <th className="p-3 text-right">إجراءات</th>
          </tr></thead>
          <tbody>
            {shown.map((t) => (
              <tr key={t.id} className="border-t hover:bg-slate-50/60">
                <td className="p-3 font-medium">{t.customer_name || '—'}</td>
                <td className={`p-3 font-semibold tabular-nums ${Number(t.amount) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {Number(t.amount) >= 0 ? '+' : ''}{t.amount}
                </td>
                <td className="p-3">{TYPE_LABELS[t.transaction_type] || t.transaction_type}</td>
                <td className="p-3">{t.reason || '—'}</td>
                <td className="p-3 tabular-nums">{t.created_at?.slice(0, 16).replace('T', ' ')}</td>
                <td className="p-3 space-x-3 space-x-reverse whitespace-nowrap">
                  <button onClick={() => { setError(''); setEditing(t); setForm({ amount: String(t.amount), reason: t.reason || '' }); }} className="link-action">تعديل</button>
                  <button onClick={() => handleDelete(t)} className="link-danger">حذف</button>
                </td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={6} className="p-6 text-center text-slate-500">لا توجد عمليات</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={!!editing} title="تعديل عملية ساعات" onClose={() => setEditing(null)}>
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block">
            <span className="text-sm text-slate-600">الساعات (موجب للإضافة، سالب للخصم)</span>
            <input className="input" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </label>
          <label className="block">
            <span className="text-sm text-slate-600">السبب</span>
            <input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </label>
          {error && <div className="rounded-xl bg-red-50 text-red-700 text-sm px-4 py-3">{error}</div>}
          <button type="submit" className="btn-primary">حفظ</button>
        </form>
      </Modal>
    </Layout>
  );
}
