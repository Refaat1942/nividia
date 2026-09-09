'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import { api } from '@/lib/api';

const emptyForm = { room_number: '', name: '', capacity: '', hourly_price: '', status: 'available' };

export default function RoomsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  function load() { api<any>('/rooms').then((d) => setRooms(d.items)).catch(console.error); }
  useEffect(() => { load(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      room_number: form.room_number, name: form.name,
      capacity: parseInt(form.capacity) || null,
      hourly_price: parseFloat(form.hourly_price) || null,
      status: form.status,
    };
    if (editing) {
      await api(`/rooms/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      setEditing(null);
    } else {
      await api('/rooms', { method: 'POST', body: JSON.stringify(body) });
      setShowForm(false);
    }
    setForm(emptyForm);
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
        <button onClick={() => { setShowForm(true); setForm(emptyForm); }} className="btn-primary">+ غرفة جديدة</button>
      </div>
      <Modal open={showForm || !!editing} title={editing ? 'تعديل غرفة' : 'غرفة جديدة'} onClose={() => { setShowForm(false); setEditing(null); }}>
        <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
          <input className="input" placeholder="رقم الغرفة" value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} required />
          <input className="input" placeholder="اسم الغرفة" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input" placeholder="السعة" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          <input className="input" placeholder="السعر/ساعة" value={form.hourly_price} onChange={(e) => setForm({ ...form, hourly_price: e.target.value })} />
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="available">متاح</option><option value="occupied">مشغول</option>
            <option value="maintenance">صيانة</option><option value="disabled">معطل</option>
          </select>
          <div className="col-span-2"><button type="submit" className="btn-primary">حفظ</button></div>
        </form>
      </Modal>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((r) => (
          <div key={r.id} className="card">
            <div className="flex justify-between">
              <h3 className="font-bold">{r.name}</h3>
              <button onClick={() => { setEditing(r); setForm({ room_number: r.room_number, name: r.name, capacity: String(r.capacity || ''), hourly_price: String(r.hourly_price || ''), status: r.status }); }} className="text-xs text-primary hover:underline">تعديل</button>
            </div>
            <span className={`inline-block px-2 py-1 rounded text-xs mt-2 ${statusColors[r.status] || ''}`}>{r.status}</span>
            <p className="text-sm text-slate-500 mt-1">#{r.room_number} • سعة {r.capacity || '—'}</p>
            <p className="text-sm mt-2">{r.hourly_price ? `${r.hourly_price} ج.م/ساعة` : '—'}</p>
          </div>
        ))}
      </div>
    </Layout>
  );
}
