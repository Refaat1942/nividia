'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import { api, apiUpload, downloadFile } from '@/lib/api';

export default function DocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ customer_id: '', name: '', document_type: 'other', notes: '', expiration_date: '' });
  const [file, setFile] = useState<File | null>(null);

  function load() { api<any>('/documents').then((d) => setDocs(d.items)).catch(console.error); }
  useEffect(() => {
    load();
    api<any>('/customers').then((d) => setCustomers(d.items)).catch(console.error);
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return alert('اختر ملف');
    const fd = new FormData();
    fd.append('customer_id', form.customer_id);
    fd.append('name', form.name);
    fd.append('document_type', form.document_type);
    if (form.notes) fd.append('notes', form.notes);
    if (form.expiration_date) fd.append('expiration_date', form.expiration_date);
    fd.append('file', file);
    await apiUpload('/documents', fd);
    setShowUpload(false);
    load();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    await api(`/documents/${editing.id}`, { method: 'PATCH', body: JSON.stringify({
      name: form.name, document_type: form.document_type, notes: form.notes, expiration_date: form.expiration_date || null,
    })});
    setEditing(null);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('حذف المستند؟')) return;
    await api(`/documents/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <Layout>
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">المستندات</h1>
        <button onClick={() => setShowUpload(true)} className="btn-primary">+ رفع مستند</button>
      </div>
      <Modal open={showUpload} title="رفع مستند" onClose={() => setShowUpload(false)}>
        <form onSubmit={handleUpload} className="space-y-4">
          <select className="input" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} required>
            <option value="">العميل</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
          <input className="input" placeholder="اسم المستند" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <select className="input" value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}>
            <option value="id">هوية</option><option value="contract">عقد</option><option value="invoice">فاتورة</option><option value="other">أخرى</option>
          </select>
          <input type="file" className="input" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
          <input type="date" className="input" placeholder="تاريخ الانتهاء" value={form.expiration_date} onChange={(e) => setForm({ ...form, expiration_date: e.target.value })} />
          <button type="submit" className="btn-primary">رفع</button>
        </form>
      </Modal>
      <Modal open={!!editing} title="تعديل مستند" onClose={() => setEditing(null)}>
        <form onSubmit={handleEdit} className="space-y-4">
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <select className="input" value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}>
            <option value="id">هوية</option><option value="contract">عقد</option><option value="invoice">فاتورة</option><option value="other">أخرى</option>
          </select>
          <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات" />
          <input type="date" className="input" value={form.expiration_date} onChange={(e) => setForm({ ...form, expiration_date: e.target.value })} />
          <button type="submit" className="btn-primary">حفظ</button>
        </form>
      </Modal>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="table-head">
            <th className="p-3 text-right">الاسم</th><th className="p-3 text-right">النوع</th>
            <th className="p-3 text-right">التاريخ</th><th className="p-3 text-right">إجراءات</th>
          </tr></thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="p-3">{d.name}</td>
                <td className="p-3">{d.document_type}</td>
                <td className="p-3">{d.created_at?.slice(0, 10)}</td>
                <td className="p-3 space-x-3 space-x-reverse">
                  <button onClick={() => { setEditing(d); setForm({ customer_id: d.customer_id, name: d.name, document_type: d.document_type, notes: d.notes || '', expiration_date: d.expiration_date || '' }); }} className="text-primary hover:underline">تعديل</button>
                  <button onClick={() => downloadFile(`/documents/${d.id}/download`, d.name)} className="text-primary hover:underline">تحميل</button>
                  <button onClick={() => handleDelete(d.id)} className="text-red-600 hover:underline">حذف</button>
                </td>
              </tr>
            ))}
            {docs.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-400">لا توجد مستندات</td></tr>}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
