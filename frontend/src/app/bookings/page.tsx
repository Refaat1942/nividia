'use client';

import { useCallback, useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import { api } from '@/lib/api';
import { spaceTypeLabel } from '@/lib/spaces';

function calcHours(start: string, end: string) {
  if (!start || !end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return '';
  return String(Math.round((mins / 60) * 100) / 100);
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [viewDate, setViewDate] = useState(new Date().toISOString().slice(0, 10));
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [slotCheck, setSlotCheck] = useState<{ available: boolean } | null>(null);
  const [form, setForm] = useState({
    customer_id: '', room_id: '', booking_date: '', start_time: '', end_time: '',
    hours: '1', booking_status: 'confirmed', payment_status: 'pending', notes: '',
  });

  const loadBookings = useCallback(() => {
    api<any>(`/bookings?booking_date=${viewDate}`).then((d) => setBookings(d.items)).catch(console.error);
  }, [viewDate]);

  const loadAvailability = useCallback(() => {
    api<any>(`/bookings/availability?booking_date=${viewDate}`)
      .then(setAvailability)
      .catch(console.error);
  }, [viewDate]);

  function loadRooms() {
    api<any>('/rooms/sync-bookable-offices', { method: 'POST' })
      .catch(() => {})
      .finally(() => {
        api<any>('/rooms?page_size=200').then((d) => setRooms(d.items || [])).catch(console.error);
      });
  }

  useEffect(() => {
    loadBookings();
    loadAvailability();
    loadRooms();
    api<any>('/customers').then((d) => setCustomers(d.items)).catch(console.error);
  }, [loadBookings, loadAvailability]);

  useEffect(() => {
    if (!form.room_id || !form.booking_date || !form.start_time || !form.end_time || editing) {
      setSlotCheck(null);
      return;
    }
    const q = new URLSearchParams({
      room_id: form.room_id,
      booking_date: form.booking_date,
      start_time: form.start_time,
      end_time: form.end_time,
    });
    api<any>(`/bookings/check-slot?${q}`)
      .then(setSlotCheck)
      .catch(() => setSlotCheck(null));
  }, [form.room_id, form.booking_date, form.start_time, form.end_time, editing]);

  function openNewBooking(prefill?: { room_id?: string; start_time?: string; end_time?: string }) {
    const start = prefill?.start_time || '';
    const end = prefill?.end_time || '';
    setForm({
      customer_id: '', room_id: prefill?.room_id || '',
      booking_date: viewDate, start_time: start, end_time: end,
      hours: calcHours(start, end) || '1',
      booking_status: 'confirmed', payment_status: 'pending', notes: '',
    });
    setEditing(null);
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing && slotCheck && !slotCheck.available) {
      alert('هذا الوقت محجوز — اختر فترة فارغة من الجدول');
      return;
    }
    const hours = parseFloat(form.hours) || parseFloat(calcHours(form.start_time, form.end_time) || '0');
    if (editing) {
      await api(`/bookings/${editing.id}`, { method: 'PATCH', body: JSON.stringify({ ...form, hours }) });
      setEditing(null);
    } else {
      await api('/bookings', {
        method: 'POST',
        body: JSON.stringify({ ...form, hours, deduct_hours: true }),
      });
      setShowForm(false);
    }
    loadBookings();
    loadAvailability();
  }

  async function cancelBooking(id: string) {
    if (!confirm('حذف الحجز؟')) return;
    await api(`/bookings/${id}`, { method: 'DELETE' });
    loadBookings();
    loadAvailability();
  }

  const selectedRoomAvailability = availability?.rooms?.find((r: any) => r.room_id === form.room_id);

  return (
    <Layout>
      <div className="flex justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">الحجوزات</h1>
          <p className="text-slate-500 text-sm">راجع المواعيد المحجوزة أولاً ثم احجز الفترات الفارغة</p>
        </div>
        <button onClick={() => openNewBooking()} className="btn-primary">+ حجز جديد</button>
      </div>

      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <label className="text-sm font-medium">تاريخ المواعيد:</label>
          <input
            type="date"
            className="input max-w-xs"
            value={viewDate}
            onChange={(e) => setViewDate(e.target.value)}
          />
          {availability?.working_hours && (
            <span className="text-sm text-slate-500">
              ساعات العمل: {availability.working_hours.start} — {availability.working_hours.end}
            </span>
          )}
        </div>

        <h3 className="font-semibold mb-3 text-blue-800">جدول الحجوزات والفترات الفارغة</h3>
        <div className="space-y-4">
          {(availability?.rooms || []).map((room: any) => (
            <div key={room.room_id} className="border rounded-lg p-4 bg-slate-50">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold">{room.room_name}</p>
                  <p className="text-xs text-slate-500">
                    #{room.room_number} • {spaceTypeLabel(room.space_type || 'meeting_room', room.space_type_label)} • سعة {room.capacity || '—'}
                  </p>
                </div>
                {room.free_slots?.length > 0 ? (
                  <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">يوجد فترات فارغة</span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">ممتلئ</span>
                )}
              </div>

              {room.bookings?.length > 0 ? (
                <div className="mb-3">
                  <p className="text-xs font-medium text-slate-600 mb-1">محجوز:</p>
                  <div className="flex flex-wrap gap-2">
                    {room.bookings.map((b: any) => (
                      <span key={b.id} className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                        {b.start_time}–{b.end_time} ({b.customer_name})
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 mb-3">لا توجد حجوزات في هذا اليوم</p>
              )}

              {room.free_slots?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-green-700 mb-1">فارغ — يمكن الحجز:</p>
                  <div className="flex flex-wrap gap-2">
                    {room.free_slots.map((slot: any, i: number) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => openNewBooking({ room_id: room.room_id, start_time: slot.start_time, end_time: slot.end_time })}
                        className="px-3 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition"
                      >
                        {slot.start_time} – {slot.end_time}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {!availability?.rooms?.length && (
            <p className="text-center text-slate-400 py-6">لا توجد غرف متاحة</p>
          )}
        </div>
      </div>

      <Modal open={showForm || !!editing} title={editing ? 'تعديل حجز' : 'حجز جديد'} onClose={() => { setShowForm(false); setEditing(null); }}>
        <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
          {!editing && (
            <>
              <select className="input" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} required>
                <option value="">اختر العميل</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
              <select className="input" value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })} required>
                <option value="">اختر الغرفة</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({spaceTypeLabel(r.equipment?.space_type || 'meeting_room', r.equipment?.space_type_label)})
                  </option>
                ))}
              </select>
            </>
          )}
          <input type="date" className="input" value={form.booking_date} onChange={(e) => setForm({ ...form, booking_date: e.target.value })} required />
          <input type="time" className="input" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value, hours: calcHours(e.target.value, form.end_time) || form.hours })} required />
          <input type="time" className="input" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value, hours: calcHours(form.start_time, e.target.value) || form.hours })} required />
          <input className="input" placeholder="عدد الساعات" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />

          {!editing && selectedRoomAvailability && (
            <div className="col-span-2 bg-slate-50 rounded p-3 text-xs">
              <p className="font-medium mb-1">حجوزات الغرفة في هذا اليوم:</p>
              {selectedRoomAvailability.bookings?.length ? (
                selectedRoomAvailability.bookings.map((b: any) => (
                  <p key={b.id} className="text-red-700">محجوز {b.start_time}–{b.end_time} ({b.customer_name})</p>
                ))
              ) : (
                <p className="text-green-700">لا توجد حجوزات — الغرفة فارغة طوال اليوم</p>
              )}
              {slotCheck && (
                <p className={`mt-2 font-medium ${slotCheck.available ? 'text-green-700' : 'text-red-700'}`}>
                  {slotCheck.available ? '✓ الوقت المختار متاح' : '✗ الوقت المختار محجوز — اختر فترة فارغة'}
                </p>
              )}
            </div>
          )}

          {editing && (
            <>
              <select className="input" value={form.booking_status} onChange={(e) => setForm({ ...form, booking_status: e.target.value })}>
                <option value="confirmed">مؤكد</option><option value="pending">معلق</option>
                <option value="completed">مكتمل</option><option value="cancelled">ملغي</option>
              </select>
              <select className="input" value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value })}>
                <option value="paid">مدفوع</option><option value="pending">معلق</option><option value="partial">جزئي</option>
              </select>
            </>
          )}
          <input className="input col-span-2" placeholder="ملاحظات" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="col-span-2"><button type="submit" className="btn-primary">حفظ الحجز</button></div>
        </form>
      </Modal>

      <div className="card overflow-x-auto">
        <h3 className="font-semibold mb-3">حجوزات يوم {viewDate}</h3>
        <table className="w-full text-sm">
          <thead><tr className="table-head">
            <th className="p-3 text-right">العميل</th>
            <th className="p-3 text-right">الغرفة</th>
            <th className="p-3 text-right">الوقت</th>
            <th className="p-3 text-right">الساعات</th>
            <th className="p-3 text-right">الحالة</th>
            <th className="p-3 text-right">إجراءات</th>
          </tr></thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="p-3">{b.customer_name}</td>
                <td className="p-3">{b.room_name}</td>
                <td className="p-3">{b.start_time} - {b.end_time}</td>
                <td className="p-3">{b.hours}</td>
                <td className="p-3"><span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">{b.booking_status}</span></td>
                <td className="p-3 space-x-3 space-x-reverse">
                  <button onClick={() => { setEditing(b); setForm({ customer_id: b.customer_id, room_id: b.room_id, booking_date: b.booking_date, start_time: b.start_time, end_time: b.end_time, hours: String(b.hours), booking_status: b.booking_status, payment_status: b.payment_status, notes: b.notes || '' }); setShowForm(true); }} className="text-primary hover:underline">تعديل</button>
                  <button onClick={() => cancelBooking(b.id)} className="text-red-600 hover:underline">حذف</button>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-slate-400">لا توجد حجوزات في هذا اليوم</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
