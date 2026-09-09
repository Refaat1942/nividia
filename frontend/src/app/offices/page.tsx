'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';

export default function OfficesPage() {
  const [offices, setOffices] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ office_number: '', name: '', floor: '', capacity: '', monthly_price: '', annual_price: '' });

  function load() { api<any>('/offices').then((d) => setOffices(d.items)).catch(console.error); }
  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await api('/offices', { method: 'POST', body: JSON.stringify({
      office_number: form.office_number, name: form.name, floor: form.floor,
      capacity: parseInt(form.capacity) || null,
      monthly_price: parseFloat(form.monthly_price) || null,
      annual_price: parseFloat(form.annual_price) || null,
      status: 'available',
    })});
    setShowForm(false);
    load();
  }

  return (
    <Layout>
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">المكاتب الإدارية</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ مكتب جديد</button>
      </div>
      {showForm && (
        <div className="card mb-4">
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <input className="input" placeholder="رقم المكتب" value={form.office_number} onChange={(e) => setForm({ ...form, office_number: e.target.value })} required />
            <input className="input" placeholder="اسم المكتب" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className="input" placeholder="الطابق" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
            <input className="input" placeholder="السعة" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            <input className="input" placeholder="السعر الشهري" value={form.monthly_price} onChange={(e) => setForm({ ...form, monthly_price: e.target.value })} />
            <input className="input" placeholder="السعر السنوي" value={form.annual_price} onChange={(e) => setForm({ ...form, annual_price: e.target.value })} />
            <div className="col-span-2"><button type="submit" className="btn-primary">حفظ</button></div>
          </form>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {offices.map((o) => (
          <div key={o.id} className="card">
            <h3 className="font-bold">{o.name}</h3>
            <p className="text-sm text-slate-500">#{o.office_number} • طابق {o.floor || '—'}</p>
            <div className="mt-3 text-sm space-y-1">
              <p>شهري: {o.monthly_price || '—'} ج.م</p>
              <p>سنوي: {o.annual_price || '—'} ج.م</p>
              <span className={`inline-block px-2 py-1 rounded text-xs mt-2 ${o.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-slate-100'}`}>{o.status}</span>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
