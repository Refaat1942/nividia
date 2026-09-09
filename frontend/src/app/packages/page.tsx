'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import { api } from '@/lib/api';

const emptyForm = { name: '', package_type: 'monthly', monthly_price: '', included_hours: '', bonus_hours: '0', is_active: true };

export default function PackagesPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  function load() { api<any>('/packages').then((d) => setPackages(d.items)).catch(console.error); }
  useEffect(() => { load(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      name: form.name, package_type: form.package_type,
      monthly_price: parseFloat(form.monthly_price) || null,
      included_hours: parseFloat(form.included_hours) || 0,
      bonus_hours: parseFloat(form.bonus_hours) || 0,
      is_active: form.is_active,
    };
    if (editing) {
      await api(`/packages/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      setEditing(null);
    } else {
      await api('/packages', { method: 'POST', body: JSON.stringify(body) });
      setShowForm(false);
    }
    setForm(emptyForm);
    load();
  }

  function startEdit(p: any) {
    setEditing(p);
    setForm({
      name: p.name, package_type: p.package_type,
      monthly_price: String(p.monthly_price || ''), included_hours: String(p.included_hours || ''),
      bonus_hours: String(p.bonus_hours || '0'), is_active: p.is_active,
    });
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">الباقات</h1>
        <button onClick={() => { setShowForm(true); setForm(emptyForm); }} className="btn-primary">+ باقة جديدة</button>
      </div>
      <Modal open={showForm || !!editing} title={editing ? 'تعديل باقة' : 'باقة جديدة'} onClose={() => { setShowForm(false); setEditing(null); }}>
        <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
          <input className="input" placeholder="اسم الباقة" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <select className="input" value={form.package_type} onChange={(e) => setForm({ ...form, package_type: e.target.value })}>
            <option value="monthly">شهري</option><option value="annual">سنوي</option><option value="hourly">بالساعة</option><option value="custom">مخصص</option>
          </select>
          <input className="input" placeholder="السعر الشهري" value={form.monthly_price} onChange={(e) => setForm({ ...form, monthly_price: e.target.value })} />
          <input className="input" placeholder="الساعات المشمولة" value={form.included_hours} onChange={(e) => setForm({ ...form, included_hours: e.target.value })} />
          <input className="input" placeholder="ساعات البونص" value={form.bonus_hours} onChange={(e) => setForm({ ...form, bonus_hours: e.target.value })} />
          {editing && (
            <select className="input" value={form.is_active ? 'true' : 'false'} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}>
              <option value="true">نشط</option><option value="false">معطل</option>
            </select>
          )}
          <div className="col-span-2"><button type="submit" className="btn-primary">حفظ</button></div>
        </form>
      </Modal>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map((p) => (
          <div key={p.id} className="card">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-lg">{p.name}</h3>
              <button onClick={() => startEdit(p)} className="text-xs text-primary hover:underline">تعديل</button>
            </div>
            <p className="text-sm text-slate-500 mt-1">{p.package_type}</p>
            <div className="mt-4 space-y-1 text-sm">
              <p>السعر: {p.monthly_price || p.annual_price || '—'} ج.م</p>
              <p>الساعات: {p.included_hours}</p>
              <p>بونص: {p.bonus_hours}</p>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
