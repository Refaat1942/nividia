'use client';

import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import { api } from '@/lib/api';
import { BUILTIN_SPACE_TYPES, isBookableSpaceType, slugifySpaceType, spaceTypeLabel } from '@/lib/spaces';

type FilterType = 'all' | string;

type SpaceItem = {
  id: string;
  kind: 'office' | 'room';
  space_type: string;
  space_type_label?: string;
  number: string;
  name: string;
  floor?: string;
  capacity?: number;
  monthly_price?: number;
  annual_price?: number;
  hourly_price?: number;
  status: string;
  bookable: boolean;
};

const FILTER_TABS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'كل المساحات' },
  { key: 'admin_office', label: 'مكاتب إدارية' },
  { key: 'manager_office', label: 'غرف مدير' },
  { key: 'meeting_room', label: 'قاعات اجتماعات' },
  { key: 'custom', label: 'أنواع مخصصة' },
];

const emptyForm = {
  space_type: 'meeting_room',
  custom_type_label: '',
  number: '',
  name: '',
  floor: '',
  capacity: '',
  monthly_price: '',
  annual_price: '',
  hourly_price: '',
  status: 'available',
};

function readRoomType(room: any) {
  const spaceType = room.equipment?.space_type || 'meeting_room';
  const label = room.equipment?.space_type_label || null;
  return { spaceType, label };
}

export default function SpacesPage() {
  const [spaces, setSpaces] = useState<SpaceItem[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SpaceItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  function load() {
    api<any>('/rooms/sync-bookable-offices', { method: 'POST' }).catch(() => {}).finally(() => {
    Promise.all([api<any>('/offices'), api<any>('/rooms?page_size=200')])
      .then(([officesRes, roomsRes]) => {
        const rawRooms = roomsRes.items || [];
        const syncedOfficeIds = new Set(
          rawRooms.map((r: any) => r.equipment?.synced_from_office_id).filter(Boolean),
        );
        const officeItems: SpaceItem[] = (officesRes.items || [])
          .filter((o: any) => !syncedOfficeIds.has(o.id))
          .map((o: any) => {
          const spaceType = o.amenities?.space_type || 'admin_office';
          return {
            id: o.id,
            kind: 'office',
            space_type: spaceType,
            space_type_label: o.amenities?.space_type_label || null,
            number: o.office_number,
            name: o.name,
            floor: o.floor,
            capacity: o.capacity,
            monthly_price: o.monthly_price,
            annual_price: o.annual_price,
            status: o.status,
            bookable: false,
          };
        });
        const roomItems: SpaceItem[] = rawRooms.map((r: any) => {
          const { spaceType, label } = readRoomType(r);
          return {
            id: r.id,
            kind: 'room',
            space_type: spaceType,
            space_type_label: label,
            number: r.room_number,
            name: r.name,
            capacity: r.capacity,
            hourly_price: r.hourly_price,
            status: r.status,
            bookable: true,
          };
        });
        setSpaces([...officeItems, ...roomItems]);
      })
      .catch(console.error);
    });
  }

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => spaces.filter((s) => {
    if (filter === 'all') return true;
    if (filter === 'custom') return !BUILTIN_SPACE_TYPES[s.space_type];
    return s.space_type === filter;
  }), [spaces, filter]);

  function resolvedType() {
    if (form.space_type === 'custom') {
      const label = form.custom_type_label.trim();
      return {
        space_type: slugifySpaceType(label),
        space_type_label: label || 'نوع مخصص',
      };
    }
    return {
      space_type: form.space_type,
      space_type_label: BUILTIN_SPACE_TYPES[form.space_type] || form.space_type,
    };
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const { space_type, space_type_label } = resolvedType();

    if (form.space_type === 'custom' && !form.custom_type_label.trim()) {
      alert('أدخل اسم النوع المخصص');
      return;
    }

    if (isBookableSpaceType(space_type)) {
      const body = {
        room_number: form.number,
        name: form.name,
        capacity: parseInt(form.capacity) || null,
        hourly_price: parseFloat(form.hourly_price) || null,
        status: form.status,
        equipment: { space_type, space_type_label },
      };
      if (editing?.kind === 'room') {
        await api(`/rooms/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        await api('/rooms', { method: 'POST', body: JSON.stringify(body) });
        if (editing?.kind === 'office') {
          await api(`/offices/${editing.id}`, { method: 'DELETE' });
        }
      }
    } else {
      const body = {
        office_number: form.number,
        name: form.name,
        floor: form.floor,
        capacity: parseInt(form.capacity) || null,
        monthly_price: parseFloat(form.monthly_price) || null,
        annual_price: parseFloat(form.annual_price) || null,
        status: form.status,
        amenities: { space_type, space_type_label },
      };
      if (editing?.kind === 'office') {
        await api(`/offices/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        await api('/offices', { method: 'POST', body: JSON.stringify(body) });
        if (editing?.kind === 'room') {
          await api(`/rooms/${editing.id}`, { method: 'DELETE' });
        }
      }
    }
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
    load();
  }

  async function handleDelete(space: SpaceItem) {
    if (!confirm(`حذف «${space.name}»؟`)) return;
    const path = space.kind === 'room' ? `/rooms/${space.id}` : `/offices/${space.id}`;
    await api(path, { method: 'DELETE' });
    load();
  }

  function openEdit(space: SpaceItem) {
    const isCustom = !BUILTIN_SPACE_TYPES[space.space_type];
    setEditing(space);
    setForm({
      space_type: isCustom ? 'custom' : space.space_type,
      custom_type_label: isCustom ? (space.space_type_label || space.space_type) : '',
      number: space.number,
      name: space.name,
      floor: space.floor || '',
      capacity: String(space.capacity || ''),
      monthly_price: String(space.monthly_price || ''),
      annual_price: String(space.annual_price || ''),
      hourly_price: String(space.hourly_price || ''),
      status: space.status,
    });
    setShowForm(true);
  }

  const statusColors: Record<string, string> = {
    available: 'bg-green-100 text-green-700',
    occupied: 'bg-red-100 text-red-700',
    reserved: 'bg-blue-100 text-blue-700',
    maintenance: 'bg-amber-100 text-amber-700',
    disabled: 'bg-slate-100 text-slate-500',
  };

  const bookableForm = form.space_type !== 'admin_office';

  return (
    <Layout>
      <div className="flex justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">الغرف والمساحات</h1>
          <p className="text-slate-500 text-sm">مكاتب إدارية، غرف مدير، وقاعات اجتماعات — الغرف القابلة للحجز تظهر في صفحة الحجوزات</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm(emptyForm); }} className="btn-primary">
          + مساحة جديدة
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTER_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === t.key ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Modal open={showForm || !!editing} title={editing ? 'تعديل مساحة' : 'مساحة جديدة'} onClose={() => { setShowForm(false); setEditing(null); }} wide>
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-sm font-medium">نوع المساحة</label>
            <select
              className="input-select mt-1"
              value={form.space_type}
              onChange={(e) => setForm({ ...form, space_type: e.target.value })}
            >
              <option value="meeting_room">قاعة اجتماعات (حجز بالساعة)</option>
              <option value="manager_office">غرفة مدير (حجز بالساعة)</option>
              <option value="admin_office">مكتب إداري (إيجار شهري/سنوي)</option>
              <option value="custom">نوع مخصص (حجز بالساعة)</option>
            </select>
            {form.space_type === 'custom' && (
              <input
                className="input mt-2"
                placeholder="اسم النوع، مثال: قاعة تدريب"
                value={form.custom_type_label}
                onChange={(e) => setForm({ ...form, custom_type_label: e.target.value })}
                required
              />
            )}
            {bookableForm && (
              <p className="text-xs text-green-700 mt-2">هذا النوع يظهر تلقائياً في صفحة الحجوزات</p>
            )}
            {form.space_type === 'admin_office' && (
              <p className="text-xs text-slate-500 mt-2">المكاتب الإدارية للعقود والإيجار — لا تظهر في الحجوزات بالساعة</p>
            )}
          </div>
          <input className="input" placeholder={bookableForm ? 'رقم الغرفة' : 'رقم المكتب'} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required />
          <input className="input" placeholder="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          {!bookableForm && (
            <input className="input" placeholder="الطابق" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
          )}
          <input className="input" placeholder="السعة" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          {bookableForm ? (
            <input className="input" placeholder="السعر / ساعة" value={form.hourly_price} onChange={(e) => setForm({ ...form, hourly_price: e.target.value })} />
          ) : (
            <>
              <input className="input" placeholder="السعر الشهري" value={form.monthly_price} onChange={(e) => setForm({ ...form, monthly_price: e.target.value })} />
              <input className="input" placeholder="السعر السنوي" value={form.annual_price} onChange={(e) => setForm({ ...form, annual_price: e.target.value })} />
            </>
          )}
          <select className="input-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="available">متاح</option>
            <option value="occupied">مشغول / مؤجر</option>
            <option value="reserved">محجوز</option>
            <option value="maintenance">صيانة</option>
            <option value="disabled">معطل</option>
          </select>
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary">حفظ</button>
          </div>
        </form>
      </Modal>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((s) => (
          <div key={`${s.kind}-${s.id}`} className="card">
            <div className="flex justify-between items-start gap-2">
              <div>
                <span className="inline-block px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600 mb-2">
                  {spaceTypeLabel(s.space_type, s.space_type_label)}
                </span>
                <h3 className="font-bold">{s.name}</h3>
                <p className="text-sm text-slate-500">#{s.number}{s.floor ? ` • طابق ${s.floor}` : ''}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(s)} className="text-xs text-primary hover:underline">تعديل</button>
                <button onClick={() => handleDelete(s)} className="text-xs text-red-600 hover:underline">حذف</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`inline-block px-2 py-1 rounded text-xs ${statusColors[s.status] || ''}`}>{s.status}</span>
              {s.bookable ? (
                <span className="inline-block px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">قابل للحجز</span>
              ) : (
                <span className="inline-block px-2 py-1 rounded text-xs bg-amber-100 text-amber-700">إيجار فقط</span>
              )}
            </div>
            <div className="mt-3 text-sm space-y-1">
              {s.capacity && <p>السعة: {s.capacity}</p>}
              {s.hourly_price != null && <p>{s.hourly_price} ج.م / ساعة</p>}
              {s.monthly_price != null && <p>شهري: {s.monthly_price} ج.م</p>}
              {s.annual_price != null && <p>سنوي: {s.annual_price} ج.م</p>}
            </div>
            {!s.bookable && s.space_type === 'manager_office' && (
              <p className="text-xs text-amber-700 mt-2">لتظهر في الحجوزات: عدّلها واختر «غرفة مدير» ثم احفظ</p>
            )}
          </div>
        ))}
        {visible.length === 0 && (
          <div className="col-span-full card text-center text-slate-500 py-12">لا توجد مساحات في هذا التصنيف</div>
        )}
      </div>
    </Layout>
  );
}
