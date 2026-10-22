'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import { api, apiUpload, downloadFile } from '@/lib/api';

const STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  active: 'نشط',
  expired: 'منتهي',
  cancelled: 'ملغي',
};

export default function ContractsPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [offices, setOffices] = useState<any[]>([]);
  const [showGen, setShowGen] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    customer_id: '', template_id: '', package_id: '', office_id: '', room_id: '', start_date: '', end_date: '',
  });
  const [uploadName, setUploadName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api<any>('/contracts').then((d) => setContracts(d.items)).catch(console.error);
    api<any>('/contracts/templates').then((d) => {
      setTemplates(d.items);
      if (d.items.length === 1) setForm((f) => ({ ...f, template_id: f.template_id || d.items[0].id }));
    }).catch(console.error);
  }

  useEffect(() => {
    load();
    api<any>('/customers').then((d) => setCustomers(d.items)).catch(console.error);
    api<any>('/packages').then((d) => setPackages(d.items)).catch(console.error);
    api<any>('/offices').then((d) => setOffices(d.items)).catch(console.error);
  }, []);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await api<any>('/contracts/generate', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: form.customer_id,
          template_id: form.template_id,
          package_id: form.package_id || null,
          office_id: form.office_id || null,
          room_id: form.room_id || null,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
        }),
      });
      setShowGen(false);
      // Open the editor so remaining blanks can be filled and the contract printed.
      if (result?.id) router.push(`/contracts/${result.id}/document`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل إنشاء العقد');
    } finally {
      setBusy(false);
    }
  }

  async function uploadTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) return;
    setError('');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('name', uploadName || uploadFile.name.replace(/\.docx$/i, ''));
      fd.append('file', uploadFile);
      await apiUpload<any>('/contracts/templates', fd);
      setShowUpload(false);
      setUploadName('');
      setUploadFile(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل رفع القالب');
    } finally {
      setBusy(false);
    }
  }

  async function deleteContract(id: string, number: string) {
    if (!confirm(`حذف العقد ${number}؟`)) return;
    await api(`/contracts/${id}`, { method: 'DELETE' });
    load();
  }

  async function deleteTemplate(id: string, name: string) {
    if (!confirm(`حذف القالب «${name}»؟`)) return;
    await api(`/contracts/templates/${id}`, { method: 'DELETE' });
    load();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    await api(`/contracts/${editing.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: editing.status,
        start_date: editing.start_date || null,
        end_date: editing.end_date || null,
      }),
    });
    setEditing(null);
    load();
  }

  const q = search.trim();
  const shown = q
    ? contracts.filter((c) => `${c.contract_number} ${c.customer_name || ''}`.includes(q))
    : contracts;

  return (
    <Layout>
      <div className="flex flex-wrap justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">العقود</h1>
          <p className="text-slate-500 text-sm">أنشئ عقدًا لعميل، املأ الفراغات، ثم اطبعه أو حمّله Word</p>
        </div>
        <button onClick={() => { setError(''); setShowGen(true); }} className="btn-primary self-start">+ عقد جديد</button>
      </div>

      {error && <div className="card mb-4 bg-red-50 text-red-700 text-sm py-3">{error}</div>}

      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">نماذج العقود</h2>
          <button onClick={() => { setError(''); setShowUpload(true); }} className="text-sm text-primary hover:underline">رفع نموذج جديد</button>
        </div>
        {templates.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {templates.map((t) => (
              <div key={t.id} className="card p-5 flex flex-col gap-3">
                <div>
                  <h3 className="font-bold">{t.name}</h3>
                  <p className="text-sm text-slate-500">{t.blank_count} فراغ للتعبئة</p>
                </div>
                <div className="flex items-center gap-3 mt-auto">
                  <button onClick={() => router.push(`/contracts/templates/${t.id}/document`)} className="btn-secondary text-sm">
                    تعبئة وطباعة بدون حفظ
                  </button>
                  <button onClick={() => deleteTemplate(t.id, t.name)} className="text-red-600 text-sm hover:underline ms-auto">حذف</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-sm text-slate-500">
            لا يوجد نموذج عقد بعد —{' '}
            <button onClick={() => setShowUpload(true)} className="text-primary hover:underline">ارفع ملف العقد (DOCX)</button>
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold text-lg">العقود المحفوظة</h2>
          <input className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-64" placeholder="بحث برقم العقد أو اسم العميل"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="table-head">
              <th className="p-3 text-right">رقم العقد</th>
              <th className="p-3 text-right">العميل</th>
              <th className="p-3 text-right">المدة</th>
              <th className="p-3 text-right">الحالة</th>
              <th className="p-3 text-right">إجراءات</th>
            </tr></thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3 font-medium">{c.contract_number}</td>
                  <td className="p-3">{c.customer_name || '—'}</td>
                  <td className="p-3 text-slate-500">{c.start_date || '—'} ← {c.end_date || '—'}</td>
                  <td className="p-3">{STATUS_LABELS[c.status] || c.status}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-3">
                      <button onClick={() => router.push(`/contracts/${c.id}/document`)} className="text-primary font-semibold hover:underline">فتح وتعبئة وطباعة</button>
                      <button onClick={() => downloadFile(`/contracts/${c.id}/download`, `${c.contract_number}.docx`)} className="text-primary hover:underline">Word</button>
                      <button onClick={() => setEditing(c)} className="text-slate-600 hover:underline">الحالة</button>
                      <button onClick={() => deleteContract(c.id, c.contract_number)} className="text-red-600 hover:underline">حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!shown.length && (
                <tr><td colSpan={5} className="p-6 text-center text-slate-500">
                  {contracts.length ? 'لا توجد نتائج' : 'لا توجد عقود بعد — اضغط «+ عقد جديد»'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={showUpload} title="رفع نموذج عقد" onClose={() => setShowUpload(false)}>
        <form onSubmit={uploadTemplate} className="space-y-4">
          <input type="file" accept=".docx" className="input" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} required />
          <input className="input" placeholder="اسم النموذج (اختياري)" value={uploadName} onChange={(e) => setUploadName(e.target.value)} />
          <p className="text-xs text-slate-500">ملف Word (DOCX). الفراغات (نقاط، شرطات، أقواس فارغة) تُكتشف تلقائيًا وتظهر كخانات للتعبئة.</p>
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">{busy ? 'جاري الرفع...' : 'رفع'}</button>
        </form>
      </Modal>

      <Modal open={showGen} title="عقد جديد" onClose={() => setShowGen(false)}>
        <form onSubmit={generate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-slate-600">العميل *</span>
              <select className="input-select" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} required>
                <option value="">اختر العميل</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-slate-600">نموذج العقد *</span>
              <select className="input-select" value={form.template_id} onChange={(e) => setForm({ ...form, template_id: e.target.value })} required>
                <option value="">اختر النموذج</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-slate-600">المكتب</span>
              <select className="input-select" value={form.office_id} onChange={(e) => setForm({ ...form, office_id: e.target.value })}>
                <option value="">—</option>
                {offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-slate-600">الباقة</span>
              <select className="input-select" value={form.package_id} onChange={(e) => setForm({ ...form, package_id: e.target.value })}>
                <option value="">—</option>
                {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-slate-600">تاريخ البداية</span>
              <input type="date" className="input" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-sm text-slate-600">تاريخ النهاية</span>
              <input type="date" className="input" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </label>
          </div>
          <p className="text-xs text-slate-500">بيانات العميل تُملأ تلقائيًا، وباقي الفراغات تملؤها في الشاشة التالية.</p>
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">{busy ? 'جاري الإنشاء...' : 'إنشاء وفتح العقد'}</button>
        </form>
      </Modal>

      <Modal open={!!editing} title={`حالة العقد ${editing?.contract_number || ''}`} onClose={() => setEditing(null)}>
        {editing && (
          <form onSubmit={saveEdit} className="space-y-4">
            <select className="input-select" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" className="input" value={editing.start_date || ''} onChange={(e) => setEditing({ ...editing, start_date: e.target.value })} />
              <input type="date" className="input" value={editing.end_date || ''} onChange={(e) => setEditing({ ...editing, end_date: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary">حفظ</button>
          </form>
        )}
      </Modal>
    </Layout>
  );
}
