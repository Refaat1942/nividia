'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { phoneRegex, nationalIdRegex } from '@/lib/utils';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: '', national_id: '', phone: '', email: '', company_name: '' });
  const [error, setError] = useState('');

  function load() {
    api<any>(`/customers?search=${search}`).then((d) => setCustomers(d.items)).catch(console.error);
  }

  useEffect(() => { load(); }, [search]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!phoneRegex.test(form.phone)) { setError('رقم الهاتف غير صالح'); return; }
    if (!nationalIdRegex.test(form.national_id)) { setError('الرقم القومي غير صالح'); return; }
    try {
      await api('/customers', { method: 'POST', body: JSON.stringify(form) });
      setShowForm(false);
      setForm({ full_name: '', national_id: '', phone: '', email: '', company_name: '' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ');
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">العملاء</h1>
          <p className="text-slate-500 text-sm">إدارة بيانات العملاء</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ عميل جديد</button>
      </div>
      <div className="card mb-4">
        <input className="input max-w-md" placeholder="بحث بالاسم، الهاتف، الرقم القومي..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {showForm && (
        <div className="card mb-4">
          <h3 className="font-semibold mb-4">إضافة عميل</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="input" placeholder="الاسم الكامل" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            <input className="input" placeholder="الرقم القومي (14 رقم)" value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} required />
            <input className="input" placeholder="الهاتف (010xxxxxxxx)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            <input className="input" placeholder="البريد الإلكتروني" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="input" placeholder="اسم الشركة" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            {error && <p className="text-red-600 text-sm col-span-2">{error}</p>}
            <div className="col-span-2 flex gap-2">
              <button type="submit" className="btn-primary">حفظ</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">إلغاء</button>
            </div>
          </form>
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="table-head">
            <th className="p-3 text-right">الكود</th><th className="p-3 text-right">الاسم</th><th className="p-3 text-right">الهاتف</th>
            <th className="p-3 text-right">الرقم القومي</th><th className="p-3 text-right">الحالة</th><th className="p-3 text-right">إجراءات</th>
          </tr></thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t hover:bg-slate-50">
                <td className="p-3">{c.customer_code}</td>
                <td className="p-3 font-medium">{c.full_name}</td>
                <td className="p-3">{c.phone}</td>
                <td className="p-3">{c.national_id}</td>
                <td className="p-3"><span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">{c.status}</span></td>
                <td className="p-3"><Link href={`/customers/${c.id}`} className="text-primary hover:underline">عرض</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
