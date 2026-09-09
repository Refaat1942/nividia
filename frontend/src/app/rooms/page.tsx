'use client';

import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import { api } from '@/lib/api';

type SpaceType = 'admin_office' | 'manager_office' | 'meeting_room';
type FilterType = 'all' | SpaceType;

type SpaceItem = {
  id: string;
  kind: 'office' | 'room';
  space_type: SpaceType;
  number: string;
  name: string;
  floor?: string;
  capacity?: number;
  monthly_price?: number;
  annual_price?: number;
  hourly_price?: number;
  status: string;
};

const SPACE_LABELS: Record<SpaceType, string> = {
  admin_office: 'مكتب إداري',
  manager_office: 'مكتب مدير',
  meeting_room: 'قاعة اجتماعات',
};

const FILTER_TABS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'كل المساحات' },
  { key: 'admin_office', label: 'مكاتب إدارية' },
  { key: 'manager_office', label: 'مكاتب مدير' },
  { key: 'meeting_room', label: 'قاعات اجتماعات' },
];

const emptyForm = {
  space_type: 'admin_office' as SpaceType,
  number: '',
  name: '',
  floor: '',
  capacity: '',
  monthly_price: '',
  annual_price: '',
  hourly_price: '',
  status: 'available',
};

export default function SpacesPage() {
  const [spaces, setSpaces] = useState<SpaceItem[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SpaceItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  function load() {
    Promise.all([api<any>('/offices'), api<any>('/rooms')])
      .then(([officesRes, roomsRes]) => {
        const officeItems: SpaceItem[] = (officesRes.items || []).map((o: any) => ({
          id: o.id,
          kind: 'office',
          space_type: (o.amenities?.space_type as SpaceType) || 'admin_office',
          number: o.office_number,
          name: o.name,
          floor: o.floor,
          capacity: o.capacity,
          monthly_price: o.monthly_price,
          annual_price: o.annual_price,
          status: o.status,
        }));
        const roomItems: SpaceItem[] = (roomsRes.items || []).map((r: any) => ({
          id: r.id,
          kind: 'room',
          space_type: 'meeting_room',
          number: r.room_number,
          name: r.name,
          capacity: r.capacity,
          hourly_price: r.hourly_price,
          status: r.status,
        }));
        setSpaces([...officeItems, ...roomItems]);
      })
      .catch(console.error);
  }

  useEffect(() => { load(); }, []);

  const visible = useMemo(
    () => spaces.filter((s) => filter === 'all' || s.space_type === filter),
    [spaces, filter],
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (form.space_type === 'meeting_room') {
      const body = {
        room_number: form.number,
        name: form.name,
        capacity: parseInt(form.capacity) || null,
        hourly_price: parseFloat(form.hourly_price) || null,
        status: form.status,
      };
      if (editing?.kind === 'room') {
        await api(`/rooms/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        await api('/rooms', { method: 'POST', body: JSON.stringify(body) });
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
        amenities: { space_type: form.space_type },
      };
      if (editing?.kind === 'office') {
        await api(`/offices/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        await api('/offices', { method: 'POST', body: JSON.stringify(body) });
      }
    }
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
    load();
  }

  function openEdit(space: SpaceItem) {
    setEditing(space);
    setForm({
      space_type: space.space_type,
      number: space.number,
      name: space.name,
      floor: space.floor || '',
      capacity: String(space.capacity || ''),
      monthly_price: String(space.monthly_price || ''),
      annual_price: String(space.annual_price || ''),
      hourly_price: String(space.hourly_price || ''),
      status: space.status,
    });
  }

  const statusColors: Record<string, string> = {
    available: 'bg-green-100 text-green-700',
    occupied: 'bg-red-100 text-red-700',
    reserved: 'bg-blue-100 text-blue-700',
    maintenance: 'bg-amber-100 text-amber-700',
    disabled: 'bg-slate-100 text-slate-500',
  };

  return (
    <Layout>
      <div className="flex justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">الغرف والمساحات</h1>
          <p className="text-slate-500 text-sm">مكاتب إدارية، مكاتب مدير، وقاعات اجتماعات في مكان واحد</p>
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
              onChange={(e) => setForm({ ...form, space_type: e.target.value as SpaceType })}
              disabled={!!editing}
            >
              <option value="admin_office">مكتب إداري</option>
              <option value="manager_office">مكتب مدير</option>
              <option value="meeting_room">قاعة اجتماعات</option>
            </select>
          </div>
          <input className="input" placeholder={form.space_type === 'meeting_room' ? 'رقم الغرفة' : 'رقم المكتب'} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required />
          <input className="input" placeholder="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          {form.space_type !== 'meeting_room' && (
            <input className="input" placeholder="الطابق" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
          )}
          <input className="input" placeholder="السعة" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          {form.space_type === 'meeting_room' ? (
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
                  {SPACE_LABELS[s.space_type]}
                </span>
                <h3 className="font-bold">{s.name}</h3>
                <p className="text-sm text-slate-500">#{s.number}{s.floor ? ` • طابق ${s.floor}` : ''}</p>
              </div>
              <button onClick={() => openEdit(s)} className="text-xs text-primary hover:underline shrink-0">تعديل</button>
            </div>
            <span className={`inline-block px-2 py-1 rounded text-xs mt-2 ${statusColors[s.status] || ''}`}>{s.status}</span>
            <div className="mt-3 text-sm space-y-1">
              {s.capacity && <p>السعة: {s.capacity}</p>}
              {s.hourly_price != null && <p>{s.hourly_price} ج.م / ساعة</p>}
              {s.monthly_price != null && <p>شهري: {s.monthly_price} ج.م</p>}
              {s.annual_price != null && <p>سنوي: {s.annual_price} ج.م</p>}
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <div className="col-span-full card text-center text-slate-500 py-12">لا توجد مساحات في هذا التصنيف</div>
        )}
      </div>
    </Layout>
  );
}
