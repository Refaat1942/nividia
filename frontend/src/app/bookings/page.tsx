'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer_id: '', room_id: '', booking_date: '', start_time: '', end_time: '', hours: '1' });

  function load() { api<any>('/bookings').then((d) => setBookings(d.items)).catch(console.error); }
  useEffect(() => {
    load();
    api<any>('/rooms').then((d) => setRooms(d.items)).catch(console.error);
    api<any>('/customers').then((d) => setCustomers(d.items)).catch(console.error);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/bookings', { method: 'POST', body: JSON.stringify({ ...form, hours: parseFloat(form.hours), deduct_hours: true }) });
      setShowForm(false);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'خطأ');
    }
  }

  return (
    <Layout>
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">الحجوزات</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ حجز جديد</button>
      </div>
      {showForm && (
        <div className="card mb-4">
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <select className="input" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} required>
              <option value="">اختر العميل</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
            <select className="input" value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })} required>
              <option value="">اختر الغرفة</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <input type="date" className="input" value={form.booking_date} onChange={(e) => setForm({ ...form, booking_date: e.target.value })} required />
            <input type="time" className="input" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
            <input type="time" className="input" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
            <input className="input" placeholder="عدد الساعات" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
            <div className="col-span-2"><button type="submit" className="btn-primary">حجز</button></div>
          </form>
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="table-head">
            <th className="p-3 text-right">التاريخ</th><th className="p-3 text-right">الوقت</th>
            <th className="p-3 text-right">الساعات</th><th className="p-3 text-right">الحالة</th>
          </tr></thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="p-3">{b.booking_date}</td>
                <td className="p-3">{b.start_time} - {b.end_time}</td>
                <td className="p-3">{b.hours}</td>
                <td className="p-3"><span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">{b.booking_status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
