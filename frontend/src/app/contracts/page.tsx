'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import { api, apiUpload, downloadFile, openPrintPage } from '@/lib/api';

export default function ContractsPage() {
  const [tab, setTab] = useState<'contracts' | 'templates'>('contracts');
  const [contracts, setContracts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [variables, setVariables] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [offices, setOffices] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [showGen, setShowGen] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [form, setForm] = useState({
    customer_id: '', template_id: '', package_id: '', office_id: '', room_id: '', start_date: '', end_date: '',
  });
  const [uploadForm, setUploadForm] = useState({ name: '', description: '' });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [lastUpload, setLastUpload] = useState<any>(null);
  const [error, setError] = useState('');

  function contractPayload() {
    return {
      customer_id: form.customer_id,
      template_id: form.template_id,
      package_id: form.package_id || null,
      office_id: form.office_id || null,
      room_id: form.room_id || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };
  }

  function load() {
    api<any>('/contracts').then((d) => setContracts(d.items)).catch(console.error);
    api<any>('/contracts/templates').then((d) => setTemplates(d.items)).catch(console.error);
    api<any>('/contracts/variables').then((d) => setVariables(d.items)).catch(console.error);
  }

  useEffect(() => {
    load();
    api<any>('/customers').then((d) => setCustomers(d.items)).catch(console.error);
    api<any>('/packages').then((d) => setPackages(d.items)).catch(console.error);
    api<any>('/offices').then((d) => setOffices(d.items)).catch(console.error);
    api<any>('/rooms').then((d) => setRooms(d.items)).catch(console.error);
  }, []);

  async function loadPreview() {
    if (!form.customer_id || !form.template_id) return;
    const q = new URLSearchParams({
      customer_id: form.customer_id,
      template_id: form.template_id,
      ...(form.package_id && { package_id: form.package_id }),
      ...(form.office_id && { office_id: form.office_id }),
      ...(form.room_id && { room_id: form.room_id }),
      ...(form.start_date && { start_date: form.start_date }),
      ...(form.end_date && { end_date: form.end_date }),
    });
    const data = await api<any>(`/contracts/preview-context?${q}`);
    setPreview(data);
  }

  useEffect(() => {
    if (showGen && form.customer_id && form.template_id) loadPreview().catch(() => setPreview(null));
  }, [showGen, form]);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const result = await api<any>('/contracts/generate', { method: 'POST', body: JSON.stringify(contractPayload()) });
      setShowGen(false);
      setPreview(null);
      load();
      if (result?.id) {
        openPrintPage(`/contracts/${result.id}/print`);
        downloadFile(`/contracts/${result.id}/download`, `${result.contract_number || 'contract'}.docx`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل توليد العقد');
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm('حذف هذا القالب؟')) return;
    await api(`/contracts/templates/${id}`, { method: 'DELETE' });
    load();
  }

  async function uploadTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) return alert('اختر ملف DOCX');
    const fd = new FormData();
    fd.append('name', uploadForm.name);
    fd.append('description', uploadForm.description);
    fd.append('file', uploadFile);
    const result = await apiUpload<any>('/contracts/templates', fd);
    setLastUpload(result);
    setShowUpload(false);
    setUploadForm({ name: '', description: '' });
    setUploadFile(null);
    load();
  }

  async function viewContract(id: string) {
    const data = await api<any>(`/contracts/${id}`);
    setViewing(data);
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

  return (
    <Layout>
      <div className="flex justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">العقود</h1>
          <p className="text-slate-500 text-sm">رفع قالب DOCX، تعبئة تلقائية، وطباعة</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowUpload(true)} className="btn-secondary">رفع قالب</button>
          <button onClick={() => setShowGen(true)} className="btn-primary">إنشاء عقد</button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 border-b">
        {[{ k: 'contracts', l: 'العقود' }, { k: 'templates', l: 'القوالب والحقول' }].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === t.k ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {error && <div className="card mb-4 bg-red-50 text-red-700 text-sm">{error}</div>}

      {tab === 'templates' && (
        <>
          <div className="card mb-4">
            <h3 className="font-semibold mb-2">الحقول المتاحة للقوالب</h3>
            <p className="text-sm text-slate-600 mb-2">يدعم {`{{اسم_الحقل}}`} في Word أو الفراغات العربية (نقاط/شرطات) في قالب نفيديا</p>
            <div className="flex flex-wrap gap-2">
              {variables.map((v) => (
                <code key={v.key} className="px-2 py-1 bg-slate-100 rounded text-xs" title={v.label_ar}>{`{{${v.key}}}`}</code>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">يدعم أيضًا الأسماء العربية مثل {`{{اسم_العميل}}`} و {`{{الرقم_القومي}}`}</p>
          </div>
          {lastUpload && (
            <div className="card mb-4 border-green-200 bg-green-50">
              <h3 className="font-semibold text-green-800 mb-2">تم رفع القالب: {lastUpload.name}</h3>
              <p className="text-sm text-green-700">تم اكتشاف {lastUpload.detected_fields?.length || 0} حقل</p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="table-head">
                    <th className="p-2 text-right">الحقل في القالب</th>
                    <th className="p-2 text-right">التسمية</th>
                    <th className="p-2 text-right">ربط تلقائي</th>
                  </tr></thead>
                  <tbody>
                    {(lastUpload.detected_fields || []).map((f: any) => (
                      <tr key={f.raw} className="border-t">
                        <td className="p-2"><code>{`{{${f.raw}}}`}</code></td>
                        <td className="p-2">{f.label_ar}</td>
                        <td className="p-2">{f.auto_mapped ? '✅' : '⚠️ يدوي'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((t) => (
              <div key={t.id} className="card">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-bold">{t.name}</h3>
                    <p className="text-sm text-slate-500">{t.description || '—'}</p>
                    <p className="text-xs mt-2 text-slate-400">
                      {t.variables_json?.field_count || 0} حقول • {t.variables_json?.auto_mapped_count || 0} مربوطة تلقائيًا
                    </p>
                  </div>
                  <button onClick={() => deleteTemplate(t.id)} className="text-red-600 text-sm hover:underline">حذف</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'contracts' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="table-head">
              <th className="p-3 text-right">رقم العقد</th>
              <th className="p-3 text-right">العميل</th>
              <th className="p-3 text-right">القالب</th>
              <th className="p-3 text-right">الحالة</th>
              <th className="p-3 text-right">التاريخ</th>
              <th className="p-3 text-right">إجراءات</th>
            </tr></thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3 font-medium">{c.contract_number}</td>
                  <td className="p-3">{c.customer_name || '—'}</td>
                  <td className="p-3 text-slate-500">{c.template_name || '—'}</td>
                  <td className="p-3">{c.status}</td>
                  <td className="p-3">{c.created_at?.slice(0, 10)}</td>
                  <td className="p-3 space-x-2 space-x-reverse">
                    <button onClick={() => viewContract(c.id)} className="text-primary hover:underline">عرض البيانات</button>
                    <button onClick={() => setEditing(c)} className="text-primary hover:underline">تعديل</button>
                    <button onClick={() => downloadFile(`/contracts/${c.id}/download`, `${c.contract_number}.docx`)} className="text-primary hover:underline">تحميل</button>
                    <button onClick={() => openPrintPage(`/contracts/${c.id}/print`)} className="text-primary hover:underline">طباعة</button>
                    <button onClick={() => api(`/contracts/${c.id}/regenerate`, { method: 'POST' }).then(load)} className="text-slate-500 hover:underline">إعادة توليد</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showUpload} title="رفع قالب عقد (DOCX)" onClose={() => setShowUpload(false)}>
        <form onSubmit={uploadTemplate} className="space-y-4">
          <input className="input" placeholder="اسم القالب" value={uploadForm.name} onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })} required />
          <input className="input" placeholder="وصف (اختياري)" value={uploadForm.description} onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })} />
          <input type="file" accept=".docx" className="input" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} required />
          <p className="text-xs text-slate-500 mb-2">
            ارفع ملف <strong>عقد نفيديا المحدث 2026.docx</strong> — النظام يكتشف الحقول تلقائياً.
          </p>
          <p className="text-xs text-slate-500">
            في Word استخدم حقول مثل: {`{{customer_name}}`} {`{{national_id}}`} {`{{phone}}`} {`{{package_name}}`} {`{{package_price}}`} {`{{included_hours}}`} {`{{contract_start}}`} {`{{company_address}}`}
            أو العربية: {`{{اسم_العميل}}`} {`{{الرقم_القومي}}`} {`{{اسم_الباقة}}`}
          </p>
          <button type="submit" className="btn-primary">رفع وتحليل الحقول</button>
        </form>
      </Modal>

      <Modal open={showGen} title="إنشاء عقد جديد" onClose={() => { setShowGen(false); setPreview(null); }} wide>
        <form onSubmit={generate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select className="input-select" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} required>
              <option value="">العميل</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
            <select className="input-select" value={form.template_id} onChange={(e) => setForm({ ...form, template_id: e.target.value })} required>
              <option value="">القالب</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select className="input-select" value={form.package_id} onChange={(e) => setForm({ ...form, package_id: e.target.value })}>
              <option value="">الباقة</option>
              {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="input-select" value={form.office_id} onChange={(e) => setForm({ ...form, office_id: e.target.value, room_id: '' })}>
              <option value="">المكتب / مساحة إدارية</option>
              {offices.map((o) => <option key={o.id} value={o.id}>{o.name} {o.amenities?.space_type === 'manager_office' ? '(مدير)' : ''}</option>)}
            </select>
            <select className="input-select" value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value, office_id: '' })}>
              <option value="">قاعة اجتماعات</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <input type="date" className="input" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <input type="date" className="input" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
          {preview?.fields?.length ? (
            <div className="bg-slate-50 rounded-lg p-4 max-h-72 overflow-y-auto">
              <h4 className="font-semibold text-sm mb-2">معاينة البيانات التلقائية</h4>
              <table className="w-full text-sm">
                <tbody>
                  {preview.fields.map((f: any) => (
                    <tr key={f.field} className="border-t">
                      <td className="py-2 pr-2 text-slate-500 w-1/3">{f.label_ar}</td>
                      <td className="py-2 font-medium break-words">{f.value || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : form.customer_id && form.template_id ? (
            <p className="text-sm text-slate-500">جاري تحميل المعاينة...</p>
          ) : null}
          <button type="submit" className="btn-primary w-full md:w-auto">توليد وطباعة العقد</button>
        </form>
      </Modal>

      <Modal open={!!viewing} title={`بيانات العقد ${viewing?.contract_number || ''}`} onClose={() => setViewing(null)} wide>
        {viewing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <p><span className="text-slate-500">العميل:</span> {viewing.customer_name}</p>
              <p><span className="text-slate-500">القالب:</span> {viewing.template_name || '—'}</p>
              <p><span className="text-slate-500">الحالة:</span> {viewing.status}</p>
              <p><span className="text-slate-500">من:</span> {viewing.start_date || '—'} <span className="text-slate-500">إلى:</span> {viewing.end_date || '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <h4 className="font-semibold text-sm mb-3">حقول العقد المسجّلة</h4>
              {viewing.fields?.length ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="table-head">
                      <th className="p-2 text-right">الحقل</th>
                      <th className="p-2 text-right">القيمة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewing.fields.map((f: any) => (
                      <tr key={f.field} className="border-t">
                        <td className="p-2 text-slate-600">{f.label_ar}</td>
                        <td className="p-2 font-medium break-words">{f.value || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-slate-500 text-sm">لا توجد بيانات محفوظة — اضغط «إعادة توليد» لتحديث العقد</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => downloadFile(`/contracts/${viewing.id}/download`, `${viewing.contract_number}.docx`)} className="btn-secondary">تحميل DOCX</button>
              <button onClick={() => openPrintPage(`/contracts/${viewing.id}/print`)} className="btn-secondary">طباعة</button>
              <button onClick={() => api(`/contracts/${viewing.id}/regenerate`, { method: 'POST' }).then(() => viewContract(viewing.id))} className="btn-primary">إعادة توليد</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!editing} title="تعديل العقد" onClose={() => setEditing(null)}>
        {editing && (
          <form onSubmit={saveEdit} className="space-y-4">
            <p className="text-sm text-slate-500">رقم العقد: {editing.contract_number}</p>
            <select className="input" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
              <option value="draft">مسودة</option>
              <option value="active">نشط</option>
              <option value="expired">منتهي</option>
              <option value="cancelled">ملغي</option>
            </select>
            <input type="date" className="input" value={editing.start_date || ''} onChange={(e) => setEditing({ ...editing, start_date: e.target.value })} />
            <input type="date" className="input" value={editing.end_date || ''} onChange={(e) => setEditing({ ...editing, end_date: e.target.value })} />
            <button type="submit" className="btn-primary">حفظ</button>
          </form>
        )}
      </Modal>
    </Layout>
  );
}
