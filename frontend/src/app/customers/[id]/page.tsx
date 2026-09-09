'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import { api } from '@/lib/api';

export default function CustomerProfilePage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<any>(null);
  const [tab, setTab] = useState('info');
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusReason, setBonusReason] = useState('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    api<any>(`/customers/${id}`).then(setCustomer).catch(console.error);
    api<any>(`/sessions?customer_id=${id}`).then((d) => setSessions(d.items)).catch(console.error);
    api<any>(`/contracts?customer_id=${id}`).then((d) => setContracts(d.items)).catch(console.error);
  }, [id]);

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    await api(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(editForm) });
    setShowEdit(false);
    api<any>(`/customers/${id}`).then(setCustomer);
  }

  async function addBonus() {
    await api(`/customers/${id}/hours`, {
      method: 'POST',
      body: JSON.stringify({ amount: parseFloat(bonusAmount), transaction_type: 'bonus', reason: bonusReason }),
    });
    setBonusAmount('');
    setBonusReason('');
    api<any>(`/customers/${id}`).then(setCustomer);
  }

  if (!customer) return <Layout><p>جاري التحميل...</p></Layout>;

  const hours = customer.hours_summary || {};
  const tabs = [
    { key: 'info', label: 'بيانات العميل' },
    { key: 'hours', label: 'الساعات' },
    { key: 'contract', label: 'العقد' },
    { key: 'sessions', label: 'الجلسات' },
  ];

  return (
    <Layout>
      <div className="card mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{customer.full_name}</h1>
            <p className="text-slate-500">{customer.customer_code} • {customer.phone}</p>
            <div className="flex gap-2 mt-2">
              <span className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-700">{customer.status}</span>
              {customer.active_subscription && (
                <span className="px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                  {customer.active_subscription.package_name}
                </span>
              )}
            </div>
          </div>
          <button onClick={() => { setEditForm({ full_name: customer.full_name, phone: customer.phone, email: customer.email || '', address: customer.address || '', company_name: customer.company_name || '', status: customer.status }); setShowEdit(true); }} className="btn-secondary text-sm">تعديل البيانات</button>
        </div>
      </div>
      <Modal open={showEdit} title="تعديل بيانات العميل" onClose={() => setShowEdit(false)}>
        <form onSubmit={saveEdit} className="grid grid-cols-2 gap-4">
          <input className="input" value={editForm.full_name || ''} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
          <input className="input" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
          <input className="input" value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          <input className="input" value={editForm.company_name || ''} onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })} />
          <input className="input col-span-2" value={editForm.address || ''} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
          <button type="submit" className="btn-primary col-span-2">حفظ</button>
        </form>
      </Modal>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card text-center"><p className="text-xs text-slate-500">إجمالي الساعات</p><p className="text-2xl font-bold text-blue-700">{hours.total_available || 0}</p></div>
        <div className="card text-center"><p className="text-xs text-slate-500">ساعات البونص</p><p className="text-2xl font-bold text-purple-700">{hours.bonus_hours || 0}</p></div>
        <div className="card text-center"><p className="text-xs text-slate-500">المستخدمة</p><p className="text-2xl font-bold text-orange-700">{hours.used_hours || 0}</p></div>
        <div className="card text-center"><p className="text-xs text-slate-500">المتبقية</p><p className="text-2xl font-bold text-green-700">{hours.remaining_hours || 0}</p></div>
      </div>
      <div className="flex gap-2 mb-4 border-b">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'info' && (
        <div className="card grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-slate-500">الرقم القومي:</span> {customer.national_id}</div>
          <div><span className="text-slate-500">البريد:</span> {customer.email || '—'}</div>
          <div><span className="text-slate-500">الشركة:</span> {customer.company_name || '—'}</div>
          <div><span className="text-slate-500">العنوان:</span> {customer.address || '—'}</div>
          <div><span className="text-slate-500">العقود:</span> {customer.contracts_count}</div>
          <div><span className="text-slate-500">المستندات:</span> {customer.documents_count}</div>
          <div><span className="text-slate-500">الحجوزات:</span> {customer.bookings_count}</div>
          <div><span className="text-slate-500">المدفوعات:</span> {customer.payments_count}</div>
        </div>
      )}
      {tab === 'hours' && (
        <div className="card">
          <h3 className="font-semibold mb-4">إضافة ساعات بونص</h3>
          <div className="flex gap-2 max-w-lg">
            <input className="input" placeholder="عدد الساعات" value={bonusAmount} onChange={(e) => setBonusAmount(e.target.value)} />
            <input className="input" placeholder="السبب" value={bonusReason} onChange={(e) => setBonusReason(e.target.value)} />
            <button onClick={addBonus} className="btn-primary whitespace-nowrap">إضافة</button>
          </div>
        </div>
      )}
      {tab === 'contract' && (
        <div className="card overflow-x-auto">
          <h3 className="font-semibold mb-4">عقود العميل</h3>
          <table className="w-full text-sm">
            <thead><tr className="table-head">
              <th className="p-3 text-right">رقم العقد</th><th className="p-3 text-right">الحالة</th><th className="p-3 text-right">البداية</th><th className="p-3 text-right">النهاية</th>
            </tr></thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3">{c.contract_number}</td>
                  <td className="p-3">{c.status}</td>
                  <td className="p-3">{c.start_date || '—'}</td>
                  <td className="p-3">{c.end_date || '—'}</td>
                </tr>
              ))}
              {contracts.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-500">لا توجد عقود</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {tab === 'sessions' && (
        <div className="card overflow-x-auto">
          <h3 className="font-semibold mb-4">سجل الحضور والانصراف</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head">
                <th className="p-3 text-right">التاريخ</th>
                <th className="p-3 text-right">الحضور</th>
                <th className="p-3 text-right">الانصراف</th>
                <th className="p-3 text-right">المدة</th>
                <th className="p-3 text-right">الخصم</th>
                <th className="p-3 text-right">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3">{s.check_in_at ? new Date(s.check_in_at).toLocaleDateString('ar-EG') : '—'}</td>
                  <td className="p-3">{s.check_in_at ? new Date(s.check_in_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="p-3">{s.check_out_at ? new Date(s.check_out_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="p-3">{s.duration_minutes != null ? `${s.duration_minutes} د` : '—'}</td>
                  <td className="p-3">{s.hours_deducted != null ? `${s.hours_deducted} س` : '—'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${s.status === 'checked_in' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {s.status === 'checked_in' ? 'حاضر' : 'منصرف'}
                    </span>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-slate-500">لا توجد جلسات</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
