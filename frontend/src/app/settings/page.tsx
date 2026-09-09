'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api, apiUpload } from '@/lib/api';

export default function SettingsPage() {
  const [form, setForm] = useState({
    business_name: '',
    phone: '',
    email: '',
    currency: 'EGP',
    working_hours: '9:00-18:00',
    address: '',
    maps_url: '',
    facebook_url: '',
    multi_year_discount_percent: '10',
    services_description: '',
  });

  useEffect(() => {
    api<Record<string, string>>('/settings').then((d) => {
      setForm({
        business_name: d.business_name || '',
        phone: d.phone || '',
        email: d.email || '',
        currency: d.currency || 'EGP',
        working_hours: d.working_hours || '9:00-18:00',
        address: d.address || '',
        maps_url: d.maps_url || '',
        facebook_url: d.facebook_url || '',
        multi_year_discount_percent: d.multi_year_discount_percent || '10',
        services_description: d.services_description || '',
      });
    }).catch(console.error);
  }, []);

  async function save(key: string, value: string) {
    await api('/settings', { method: 'POST', body: JSON.stringify({ key, value }) });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    for (const [key, value] of Object.entries(form)) {
      await save(key, value);
    }
    alert('تم الحفظ');
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">إعدادات الشركة</h1>
      <div className="card max-w-3xl mb-6">
        <h2 className="font-semibold mb-3">شعار المكتب</h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const input = (e.target as HTMLFormElement).querySelector('input[type=file]') as HTMLInputElement;
          const file = input.files?.[0];
          if (!file) return alert('اختر صورة');
          const fd = new FormData();
          fd.append('file', file);
          await apiUpload('/settings/logo', fd);
          alert('تم رفع الشعار');
        }} className="flex flex-wrap gap-3 items-center">
          <input type="file" accept="image/*" className="input max-w-md" />
          <button type="submit" className="btn-primary">رفع الشعار</button>
        </form>
      </div>
      <div className="card max-w-3xl">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-sm font-medium">اسم الشركة</label>
            <input className="input mt-1" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">الهاتف</label>
              <input className="input mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">البريد</label>
              <input className="input mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">العنوان</label>
            <input className="input mt-1" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">رابط الخريطة (Google Maps)</label>
            <input className="input mt-1" value={form.maps_url} onChange={(e) => setForm({ ...form, maps_url: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium">رابط فيسبوك</label>
            <input className="input mt-1" value={form.facebook_url} onChange={(e) => setForm({ ...form, facebook_url: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">ساعات العمل</label>
              <input className="input mt-1" value={form.working_hours} onChange={(e) => setForm({ ...form, working_hours: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">خصم السنوات الإضافية (%)</label>
              <input className="input mt-1" value={form.multi_year_discount_percent} onChange={(e) => setForm({ ...form, multi_year_discount_percent: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">وصف الخدمات والباقات</label>
            <textarea className="input mt-1 min-h-[200px]" value={form.services_description} onChange={(e) => setForm({ ...form, services_description: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary">حفظ الإعدادات</button>
        </form>
      </div>
    </Layout>
  );
}
