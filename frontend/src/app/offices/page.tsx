'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import { api } from '@/lib/api';

const emptyForm = { office_number: '', name: '', floor: '', capacity: '', monthly_price: '', annual_price: '', status: 'available' };

export default function OfficesPage() {
  const [offices, setOffices] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  function load() { api<any>('/offices').then((d) => setOffices(d.items)).catch(console.error); }
  useEffect(() => { load(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      office_number: form.office_number, name: form.name, floor: form.floor,
      capacity: parseInt(form.capacity) || null,
      monthly_price: parseFloat(form.monthly_price) || null,
      annual_price: parseFloat(form.annual_price) || null,
      status: form.status,
    };
    if (editing) {
      await api(`/offices/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      setEditing(null);
    } else {
      await api('/offices', { method: 'POST', body: JSON.stringify(body) });
      setShowForm(false);
    }
    setForm(emptyForm);
    load();
  }

  return (
    <Layout>
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">المكاتب الإدارية</h1>
        <button onClick={() => { setShowForm(true); setForm(emptyForm); }} className="btn-primary">+ مكتب جديد</button>
      </div>
      <Modal open={showForm || !!editing} title={editing ? 'تعديل مكتب' : 'مكتب جديد'} onClose={() => { setShowForm(false); setEditing(null); }}>
        <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
          <input className="input" placeholder="رقم المكتب" value={form.office_number} onChange={(e) => setForm({ ...form, office_number: e.target.value })} required />
          <input className="input" placeholder="اسم المكتب" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input" placeholder="الطابق" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
          <input className="input" placeholder="السعة" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          <input className="input" placeholder="السعر الشهري" value={form.monthly_price} onChange={(e) => setForm({ ...form, monthly_price: e.target.value })} />
          <input className="input" placeholder="السعر السنوي" value={form.annual_price} onChange={(e) => setForm({ ...form, annual_price: e.target.value })} />
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="available">متاح</option><option value="occupied">مؤجر</option>
            <option value="reserved">محجوز</option><option value="maintenance">صيانة</option>
          </select>
          <div className="col-span-2"><button type="submit" className="btn-primary">حفظ</button></div>
        </form>
      </Modal>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {offices.map((o) => (
          <div key={o.id} className="card">
            <div className="flex justify-between">
              <h3 className="font-bold">{o.name}</h3>
              <button onClick={() => { setEditing(o); setForm({ office_number: o.office_number, name: o.name, floor: o.floor || '', capacity: String(o.capacity || ''), monthly_price: String(o.monthly_price || ''), annual_price: String(o.annual_price || ''), status: o.status }); }} className="text-xs text-primary hover:underline">تعديل</button>
            </div>
            <p className="text-sm text-slate-500">#{o.office_number} • طابق {o.floor || '—'}</p>
            <div className="mt-3 text-sm space-y-1">
              <p>شهري: {o.monthly_price || '—'} ج.م</p>
              <p>سنوي: {o.annual_price || '—'} ج.م</p>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
