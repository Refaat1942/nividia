'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import { api } from '@/lib/api';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ customer_id: '', amount: '', payment_date: '', payment_method: 'cash', status: 'paid', notes: '', reference: '' });

  function load() { api<any>('/payments').then((d) => { setPayments(d.items); setTotal(d.total_amount); }).catch(console.error); }
  useEffect(() => { load(); api<any>('/customers').then((d) => setCustomers(d.items)).catch(console.error); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const body = { ...form, amount: parseFloat(form.amount) };
    if (editing) {
      await api(`/payments/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      setEditing(null);
    } else {
      await api('/payments', { method: 'POST', body: JSON.stringify(body) });
      setShowForm(false);
    }
    load();
  }

  return (
    <Layout>
      <div className="flex justify-between mb-6">
        <div><h1 className="text-2xl font-bold">المدفوعات</h1><p className="text-slate-500">الإجمالي: {total.toLocaleString('ar-EG')} ج.م</p></div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ دفعة جديدة</button>
      </div>
      <Modal open={showForm || !!editing} title={editing ? 'تعديل دفعة' : 'دفعة جديدة'} onClose={() => { setShowForm(false); setEditing(null); }}>
        <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
          {!editing && (
            <select className="input col-span-2" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} required>
              <option value="">العميل</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          )}
          <input className="input" placeholder="المبلغ" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          <input type="date" className="input" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} required />
          <select className="input" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
            <option value="cash">نقدي</option><option value="bank_transfer">تحويل بنكي</option><option value="card">بطاقة</option>
          </select>
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="paid">مدفوع</option><option value="pending">معلق</option><option value="partial">جزئي</option>
          </select>
          <input className="input col-span-2" placeholder="مرجع" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          <input className="input col-span-2" placeholder="ملاحظات" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="col-span-2"><button type="submit" className="btn-primary">حفظ</button></div>
        </form>
      </Modal>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="table-head">
            <th className="p-3 text-right">المبلغ</th><th className="p-3 text-right">التاريخ</th>
            <th className="p-3 text-right">الطريقة</th><th className="p-3 text-right">الحالة</th><th className="p-3 text-right">إجراءات</th>
          </tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-medium">{Number(p.amount).toLocaleString('ar-EG')} ج.م</td>
                <td className="p-3">{p.payment_date}</td>
                <td className="p-3">{p.payment_method}</td>
                <td className="p-3"><span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">{p.status}</span></td>
                <td className="p-3">
                  <button onClick={() => { setEditing(p); setForm({ customer_id: p.customer_id, amount: String(p.amount), payment_date: p.payment_date, payment_method: p.payment_method, status: p.status, notes: p.notes || '', reference: p.reference || '' }); }} className="text-primary hover:underline">تعديل</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
