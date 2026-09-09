'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';

export default function HoursPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  function load() { api<any>('/reports/hours-usage').then((d) => setTransactions(d.items)).catch(console.error); }
  useEffect(() => { load(); }, []);

  async function handleDelete(t: any) {
    if (!confirm('حذف هذه العملية؟ سيتم تعديل رصيد الساعات تلقائياً.')) return;
    await api(`/customers/hours-transactions/${t.id}`, { method: 'DELETE' });
    load();
  }

  const typeLabels: Record<string, string> = {
    package: 'باقة', bonus: 'بونص', usage: 'استخدام', adjustment: 'تعديل', correction: 'تصحيح', refund: 'استرداد',
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">سجل الساعات</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="table-head">
            <th className="p-3 text-right">المبلغ</th><th className="p-3 text-right">النوع</th>
            <th className="p-3 text-right">السبب</th>            <th className="p-3 text-right">التاريخ</th>
            <th className="p-3 text-right">إجراءات</th>
          </tr></thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-t">
                <td className={`p-3 font-medium ${Number(t.amount) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {Number(t.amount) >= 0 ? '+' : ''}{t.amount}
                </td>
                <td className="p-3">{typeLabels[t.transaction_type] || t.transaction_type}</td>
                <td className="p-3">{t.reason || '—'}</td>
                <td className="p-3">{t.created_at?.slice(0, 16).replace('T', ' ')}</td>
                <td className="p-3">
                  <button onClick={() => handleDelete(t)} className="text-red-600 hover:underline">حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
