'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Clock, Eye, EyeOff, FileSignature, Loader2, Lock, User } from 'lucide-react';
import { login } from '@/lib/api';
import LogoImage from '@/components/LogoImage';

const FEATURES = [
  { icon: Clock, title: 'حضور وانصراف لحظي', text: 'اعرف مين موجود في أي غرفة، والساعات بتتخصم تلقائيًا' },
  { icon: CalendarClock, title: 'حجوزات بدون تعارض', text: 'جدول الغرف والفترات الفاضية قدامك في شاشة واحدة' },
  { icon: FileSignature, title: 'عقود جاهزة للطباعة', text: 'املأ العقد وعدّله واطبعه أو حمّله Word في دقيقة' },
];

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username.trim(), password);
      window.location.href = '/dashboard';
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg && msg !== 'غير مصرح' ? msg : 'اسم المستخدم أو كلمة المرور غير صحيحة');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1.1fr] bg-white" dir="rtl">
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm mb-6">
              <LogoImage className="h-10 w-auto object-contain" fallback={<span className="block px-2 leading-10 text-xl font-bold text-primary">نفيديا</span>} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">أهلًا بيك من جديد</h1>
            <p className="text-slate-500 mt-2">سجّل دخولك لإدارة المكاتب والغرف والعملاء</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1.5">اسم المستخدم</span>
              <span className="relative block">
                <User size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  className="input !pr-11"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  readOnly={!ready}
                  autoComplete="username"
                  autoFocus
                  required
                />
              </span>
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 mb-1.5">كلمة المرور</span>
              <span className="relative block">
                <Lock size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input !pr-11 !pl-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={(e) => setCapsLock(e.getModifierState?.('CapsLock') ?? false)}
                  readOnly={!ready}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
              {capsLock && <span className="block text-xs text-amber-600 mt-1.5">زر Caps Lock مفعّل</span>}
            </label>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full !py-3.5 text-base">
              {loading ? <><Loader2 size={18} className="animate-spin" /> جاري الدخول…</> : 'تسجيل الدخول'}
            </button>
          </form>

          <p className="mt-10 text-xs text-slate-400 text-center">
            © {new Date().getFullYear()} نفيديا لتأجير الوحدات الإدارية
          </p>
        </div>
      </section>

      <section className="relative hidden lg:flex overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-primary text-white p-12">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '44px 44px' }}
        />
        <div className="relative mt-auto max-w-lg">
          <p className="text-sky-300 text-sm font-semibold mb-3">NVIDIA OFFICE SPACE</p>
          <h2 className="text-4xl font-bold leading-tight">مساحة عملك، منظمة بالكامل في مكان واحد</h2>
          <div className="mt-10 space-y-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-4 rounded-2xl bg-white/5 ring-1 ring-white/10 backdrop-blur p-4">
                <span className="h-11 w-11 shrink-0 rounded-xl bg-white/10 flex items-center justify-center">
                  <f.icon size={20} className="text-sky-300" />
                </span>
                <div>
                  <p className="font-semibold">{f.title}</p>
                  <p className="text-sm text-blue-100/80 mt-0.5">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
