'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import { changePassword } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function AccountPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ current: '', newPw: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (form.newPw.length < 8) {
      setError('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (form.newPw !== form.confirm) {
      setError('كلمة المرور الجديدة غير متطابقة');
      return;
    }
    try {
      await changePassword(form.current, form.newPw);
      setSuccess('تم تغيير كلمة المرور بنجاح');
      setForm({ current: '', newPw: '', confirm: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تغيير كلمة المرور');
    }
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-2">حسابي</h1>
      <p className="text-slate-500 text-sm mb-6">{user?.full_name} ({user?.username})</p>
      <div className="card max-w-md">
        <h2 className="font-semibold mb-4">تغيير كلمة المرور</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" className="input" placeholder="كلمة المرور الحالية" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} required autoComplete="current-password" />
          <input type="password" className="input" placeholder="كلمة المرور الجديدة" value={form.newPw} onChange={(e) => setForm({ ...form, newPw: e.target.value })} required minLength={8} autoComplete="new-password" />
          <input type="password" className="input" placeholder="تأكيد كلمة المرور الجديدة" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required minLength={8} autoComplete="new-password" />
          <button type="submit" className="btn-primary w-full">تحديث كلمة المرور</button>
        </form>
        {success && <p className="text-green-600 text-sm mt-3">{success}</p>}
        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
      </div>
    </Layout>
  );
}
