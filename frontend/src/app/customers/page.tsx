'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import { api, apiUpload, downloadFile } from '@/lib/api';
import { phoneRegex, nationalIdRegex } from '@/lib/utils';

const emptyForm = { full_name: '', national_id: '', phone: '', email: '', company_name: '', address: '', status: 'active' };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  function load() {
    api<any>(`/customers?search=${search}`).then((d) => setCustomers(d.items)).catch(console.error);
  }

  useEffect(() => { load(); }, [search]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!phoneRegex.test(form.phone)) { setError('رقم الهاتف غير صالح'); return; }
    if (!editing && !nationalIdRegex.test(form.national_id)) { setError('الرقم القومي غير صالح'); return; }
    try {
      if (editing) {
        const body = {
          full_name: form.full_name,
          phone: form.phone,
          email: form.email || null,
          company_name: form.company_name || null,
          address: form.address || null,
          status: form.status,
        };
        await api(`/customers/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) });
        setEditing(null);
      } else {
        await api('/customers', { method: 'POST', body: JSON.stringify(form) });
        setShowForm(false);
      }
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ');
    }
  }

  async function handleDelete(c: any) {
    if (!confirm(`حذف العميل «${c.full_name}»؟`)) return;
    await api(`/customers/${c.id}`, { method: 'DELETE' });
    load();
  }

  function startEdit(c: any) {
    setEditing(c);
    setForm({
      full_name: c.full_name, national_id: c.national_id, phone: c.phone,
      email: c.email || '', company_name: c.company_name || '', address: c.address || '', status: c.status,
    });
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">العملاء</h1><p className="text-slate-500 text-sm">إدارة بيانات العملاء</p></div>
        <div className="flex gap-2">
          <button type="button" onClick={() => downloadFile('/customers/import-template', 'customers_template.xlsx')} className="btn-secondary">تحميل نموذج Excel</button>
          <label className="btn-secondary cursor-pointer">
            رفع عملاء
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const fd = new FormData();
              fd.append('file', f);
              const r = await apiUpload<any>('/customers/import', fd);
              alert(`تم إضافة ${r.created} عميل${r.errors?.length ? `\nأخطاء: ${r.errors.length}` : ''}`);
              load();
            }} />
          </label>
          <button onClick={() => { setShowForm(true); setForm(emptyForm); }} className="btn-primary">+ عميل جديد</button>
        </div>
      </div>
      <div className="card mb-4">
        <input className="input max-w-md" placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Modal open={showForm || !!editing} title={editing ? 'تعديل عميل' : 'إضافة عميل'} onClose={() => { setShowForm(false); setEditing(null); }}>
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="input" placeholder="الاسم الكامل" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          <input className="input" placeholder="الرقم القومي" value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} required disabled={!!editing} />
          <input className="input" placeholder="الهاتف" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          <input className="input" placeholder="البريد" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input" placeholder="اسم الشركة" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
          <input className="input" placeholder="العنوان" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          {editing && (
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">نشط</option><option value="inactive">غير نشط</option>
              <option value="suspended">موقوف</option><option value="pending">معلق</option>
            </select>
          )}
          {error && <p className="text-red-600 text-sm col-span-2">{error}</p>}
          <div className="col-span-2"><button type="submit" className="btn-primary">حفظ</button></div>
        </form>
      </Modal>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="table-head">
            <th className="p-3 text-right">الكود</th><th className="p-3 text-right">الاسم</th><th className="p-3 text-right">الهاتف</th>
            <th className="p-3 text-right">الحالة</th><th className="p-3 text-right">إجراءات</th>
          </tr></thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t hover:bg-slate-50">
                <td className="p-3">{c.customer_code}</td>
                <td className="p-3 font-medium">{c.full_name}</td>
                <td className="p-3">{c.phone}</td>
                <td className="p-3"><span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">{c.status}</span></td>
                <td className="p-3 space-x-3 space-x-reverse">
                  <button onClick={() => startEdit(c)} className="text-primary hover:underline">تعديل</button>
                  <Link href={`/customers/${c.id}`} className="text-slate-500 hover:underline">عرض</Link>
                  <button onClick={() => handleDelete(c)} className="text-red-600 hover:underline">حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
