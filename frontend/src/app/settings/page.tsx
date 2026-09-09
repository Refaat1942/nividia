'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import LogoImage from '@/components/LogoImage';
import { api, apiUpload } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function SettingsPage() {
  const { loading: authLoading } = useAuth();
  const [logoKey, setLogoKey] = useState(0);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [logoSuccess, setLogoSuccess] = useState('');
  const [hasLogo, setHasLogo] = useState(false);
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
    if (authLoading) return;
    api<Record<string, string>>('/settings').then((d) => {
      setHasLogo(d.has_logo === 'true');
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
  }, [authLoading]);

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
        <div className="mb-4 flex items-center gap-4">
          {hasLogo ? (
            <LogoImage
              refreshKey={logoKey}
              className="h-16 w-auto max-w-[200px] object-contain rounded border border-slate-200 bg-white p-2"
            />
          ) : (
            <div className="h-16 w-32 rounded border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
              لا يوجد شعار
            </div>
          )}
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setLogoError('');
            setLogoSuccess('');
            const input = (e.target as HTMLFormElement).querySelector('input[type=file]') as HTMLInputElement;
            const file = input.files?.[0];
            if (!file) {
              setLogoError('اختر صورة أولاً');
              return;
            }
            setLogoUploading(true);
            try {
              const fd = new FormData();
              fd.append('file', file);
              await apiUpload('/settings/logo', fd);
              setHasLogo(true);
              setLogoKey((k) => k + 1);
              setLogoSuccess('تم رفع الشعار بنجاح');
              window.dispatchEvent(new Event('logo-updated'));
              input.value = '';
            } catch (err) {
              setLogoError(err instanceof Error ? err.message : 'فشل رفع الشعار');
            } finally {
              setLogoUploading(false);
            }
          }}
          className="flex flex-wrap gap-3 items-center"
        >
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="input max-w-md" />
          <button type="submit" disabled={logoUploading} className="btn-primary">
            {logoUploading ? 'جاري الرفع...' : 'رفع الشعار'}
          </button>
        </form>
        {logoSuccess && <p className="text-green-600 text-sm mt-2">{logoSuccess}</p>}
        {logoError && <p className="text-red-600 text-sm mt-2">{logoError}</p>}
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
