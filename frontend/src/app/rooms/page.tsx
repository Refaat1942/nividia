'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';

export default function RoomsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [form, setForm] = useState({ room_number: '', name: '', capacity: '', hourly_price: '' });
  const [showForm, setShowForm] = useState(false);

  function load() { api<any>('/rooms').then((d) => setRooms(d.items)).catch(console.error); }
  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await api('/rooms', { method: 'POST', body: JSON.stringify({
      room_number: form.room_number, name: form.name,
      capacity: parseInt(form.capacity) || null,
      hourly_price: parseFloat(form.hourly_price) || null,
      status: 'available',
    })});
    setShowForm(false);
    load();
  }

  const statusColors: Record<string, string> = {
    available: 'bg-green-100 text-green-700', occupied: 'bg-red-100 text-red-700',
    maintenance: 'bg-amber-100 text-amber-700', disabled: 'bg-slate-100 text-slate-500',
  };

  return (
    <Layout>
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">غرف الاجتماعات</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ غرفة جديدة</button>
      </div>
      {showForm && (
        <div className="card mb-4">
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <input className="input" placeholder="رقم الغرفة" value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} required />
            <input className="input" placeholder="اسم الغرفة" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className="input" placeholder="السعة" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            <input className="input" placeholder="السعر/ساعة" value={form.hourly_price} onChange={(e) => setForm({ ...form, hourly_price: e.target.value })} />
            <div className="col-span-2"><button type="submit" className="btn-primary">حفظ</button></div>
          </form>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((r) => (
          <div key={r.id} className="card">
            <div className="flex justify-between"><h3 className="font-bold">{r.name}</h3>
              <span className={`px-2 py-1 rounded text-xs ${statusColors[r.status] || ''}`}>{r.status}</span></div>
            <p className="text-sm text-slate-500 mt-1">#{r.room_number} • سعة {r.capacity || '—'}</p>
            <p className="text-sm mt-2">{r.hourly_price ? `${r.hourly_price} ج.م/ساعة` : '—'}</p>
          </div>
        ))}
      </div>
    </Layout>
  );
}
