'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';

export default function CustomerProfilePage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<any>(null);
  const [tab, setTab] = useState('info');
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusReason, setBonusReason] = useState('');

  useEffect(() => {
    api<any>(`/customers/${id}`).then(setCustomer).catch(console.error);
  }, [id]);

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
        </div>
      </div>
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
    </Layout>
  );
}
