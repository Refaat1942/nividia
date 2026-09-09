'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ business_name: '', phone: '', email: '', currency: 'EGP' });

  useEffect(() => {
    api<Record<string, string>>('/settings').then((d) => {
      setSettings(d);
      setForm({ business_name: d.business_name || '', phone: d.phone || '', email: d.email || '', currency: d.currency || 'EGP' });
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
      <h1 className="text-2xl font-bold mb-6">الإعدادات</h1>
      <div className="card max-w-2xl">
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="text-sm font-medium">اسم الشركة</label>
            <input className="input mt-1" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} /></div>
          <div><label className="text-sm font-medium">الهاتف</label>
            <input className="input mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label className="text-sm font-medium">البريد</label>
            <input className="input mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="text-sm font-medium">العملة</label>
            <input className="input mt-1" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
          <button type="submit" className="btn-primary">حفظ الإعدادات</button>
        </form>
      </div>
    </Layout>
  );
}
