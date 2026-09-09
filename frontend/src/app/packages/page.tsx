'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import { api } from '@/lib/api';

const emptyForm = {
  name: '', package_type: 'annual', monthly_price: '', annual_price: '',
  included_hours: '', bonus_hours: '0', is_active: true,
};

export default function PackagesPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [company, setCompany] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [pkgData, settingsData] = await Promise.all([
        api<any>('/packages'),
        api<Record<string, string>>('/settings'),
      ]);
      setPackages(pkgData.items || []);
      setCompany(settingsData || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحميل الباقات');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const annualPackages = packages
    .filter((p) => p.package_type === 'annual' && p.is_active)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      name: form.name,
      package_type: form.package_type,
      monthly_price: parseFloat(form.monthly_price) || null,
      annual_price: parseFloat(form.annual_price) || null,
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

  async function handleDelete(p: any) {
    if (!confirm(`حذف باقة «${p.name}»؟`)) return;
    await api(`/packages/${p.id}`, { method: 'DELETE' });
    load();
  }

  function startEdit(p: any) {
    setEditing(p);
    setForm({
      name: p.name,
      package_type: p.package_type,
      monthly_price: String(p.monthly_price || ''),
      annual_price: String(p.annual_price || ''),
      included_hours: String(p.included_hours || ''),
      bonus_hours: String(p.bonus_hours || '0'),
      is_active: p.is_active,
    });
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">باقات نفيديا السنوية</h1>
          <p className="text-slate-500 text-sm">أسعار الخدمات والباقات — دفعة واحدة سنوياً</p>
        </div>
        <button onClick={() => { setShowForm(true); setForm(emptyForm); }} className="btn-primary">+ باقة جديدة</button>
      </div>

      {error && <div className="card mb-4 bg-red-50 text-red-700 text-sm">{error}</div>}

      <div className="card mb-6 bg-gradient-to-l from-blue-50 to-white border-blue-100">
        <h2 className="font-bold text-blue-900 mb-2">ما الذي تشمله الباقة؟</h2>
        <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
          {loading ? 'جاري التحميل...' : (company.services_description || 'لم يتم تحميل وصف الخدمات بعد. أعد تشغيل الـ backend أو نفّذ تهيئة البيانات.')}
        </div>
        {company.multi_year_discount_percent && (
          <p className="mt-3 text-sm font-medium text-amber-700">
            عرض السنتين أو أكثر: خصم {company.multi_year_discount_percent}% عن كل سنة إضافية
          </p>
        )}
        {company.address && (
          <div className="mt-4 pt-4 border-t text-sm text-slate-600">
            <p className="font-medium">العنوان: {company.address}</p>
            <div className="flex flex-wrap gap-4 mt-2">
              {company.maps_url && (
                <a href={company.maps_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  موقع على الخريطة
                </a>
              )}
              {company.facebook_url && (
                <a href={company.facebook_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  صفحة فيسبوك
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal open={showForm || !!editing} title={editing ? 'تعديل باقة' : 'باقة جديدة'} onClose={() => { setShowForm(false); setEditing(null); }}>
        <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
          <input className="input" placeholder="اسم الباقة" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <select className="input" value={form.package_type} onChange={(e) => setForm({ ...form, package_type: e.target.value })}>
            <option value="annual">سنوي</option>
            <option value="monthly">شهري</option>
            <option value="hourly">بالساعة</option>
            <option value="custom">مخصص</option>
          </select>
          <input className="input" placeholder="السعر السنوي (ج.م)" value={form.annual_price} onChange={(e) => setForm({ ...form, annual_price: e.target.value })} />
          <input className="input" placeholder="السعر الشهري (ج.م)" value={form.monthly_price} onChange={(e) => setForm({ ...form, monthly_price: e.target.value })} />
          <input className="input" placeholder="الساعات المشمولة" value={form.included_hours} onChange={(e) => setForm({ ...form, included_hours: e.target.value })} />
          <input className="input" placeholder="ساعات البونص" value={form.bonus_hours} onChange={(e) => setForm({ ...form, bonus_hours: e.target.value })} />
          {editing && (
            <select className="input" value={form.is_active ? 'true' : 'false'} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}>
              <option value="true">نشط</option>
              <option value="false">معطل</option>
            </select>
          )}
          <div className="col-span-2"><button type="submit" className="btn-primary">حفظ</button></div>
        </form>
      </Modal>

      {!loading && annualPackages.length === 0 && !error && (
        <div className="card mb-4 text-center py-10 text-slate-500">
          لا توجد باقات مسجلة. شغّل على السيرفر:
          <code className="block mt-2 text-xs bg-slate-100 p-2 rounded">docker compose exec backend python -c &quot;from app.scripts.seed import run_seed; run_seed()&quot;</code>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {annualPackages.map((p) => (
          <div key={p.id} className="card border-t-4 border-t-primary hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">{p.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 mt-1 inline-block">سنوي — دفعة واحدة</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(p)} className="text-xs text-primary hover:underline">تعديل</button>
                <button onClick={() => handleDelete(p)} className="text-xs text-red-600 hover:underline">حذف</button>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-primary">
                {Number(p.annual_price).toLocaleString('ar-EG')}
                <span className="text-sm font-normal text-slate-500"> ج.م / سنة</span>
              </p>
              <p className="text-lg font-semibold text-slate-700 mt-2">
                {p.included_hours} ساعة
              </p>
              {p.annual_price && p.included_hours > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  ≈ {Math.round(Number(p.annual_price) / Number(p.included_hours))} ج.م / ساعة
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {packages.filter((p) => p.package_type !== 'annual' && p.is_active).length > 0 && (
        <div className="mt-8">
          <h2 className="font-semibold mb-4 text-slate-600">باقات أخرى</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.filter((p) => p.package_type !== 'annual' && p.is_active).map((p) => (
              <div key={p.id} className="card">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold">{p.name}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(p)} className="text-xs text-primary hover:underline">تعديل</button>
                    <button onClick={() => handleDelete(p)} className="text-xs text-red-600 hover:underline">حذف</button>
                  </div>
                </div>
                <p className="text-sm mt-2">السعر: {p.monthly_price || p.annual_price || '—'} ج.م</p>
                <p className="text-sm">الساعات: {p.included_hours}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
