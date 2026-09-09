'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import { downloadFile } from '@/lib/api';

const reports = [
  { key: 'customers', label: 'تقرير العملاء', dated: false },
  { key: 'payments', label: 'تقرير المدفوعات', dated: true },
  { key: 'hours', label: 'تقرير الساعات', dated: true },
  { key: 'bookings', label: 'تقرير الحجوزات', dated: true },
  { key: 'sessions', label: 'تقرير الحضور والانصراف', dated: true },
  { key: 'audit', label: 'سجل العمليات', dated: true },
];

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));

  function exportReport(key: string, dated: boolean) {
    const params = new URLSearchParams();
    if (dated) {
      if (fromDate) params.set('from_date', fromDate);
      if (toDate) params.set('to_date', toDate);
    }
    const qs = params.toString();
    downloadFile(`/reports/export/${key}${qs ? `?${qs}` : ''}`, `${key}.xlsx`);
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-2">التقارير</h1>
      <p className="text-slate-500 text-sm mb-6">تصدير Excel مع فلترة بالتاريخ (من — إلى)</p>

      <div className="card max-w-3xl mb-6">
        <h2 className="font-semibold mb-4">الفترة الزمنية</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-600">من تاريخ</label>
            <input type="date" className="input mt-1" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">إلى تاريخ</label>
            <input type="date" className="input mt-1" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3">يُطبَّق على المدفوعات، الساعات، الحجوزات، الحضور، وسجل العمليات</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => (
          <div key={r.key} className="card flex flex-col gap-3">
            <div>
              <h3 className="font-semibold">{r.label}</h3>
              {r.dated && (
                <p className="text-xs text-slate-500 mt-1">
                  {fromDate} → {toDate}
                </p>
              )}
            </div>
            <button type="button" onClick={() => exportReport(r.key, r.dated)} className="btn-primary text-sm w-full">
              تصدير Excel
            </button>
          </div>
        ))}
      </div>
    </Layout>
  );
}
