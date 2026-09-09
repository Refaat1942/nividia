'use client';

import Layout from '@/components/Layout';

const reports = [
  { key: 'customers', label: 'تقرير العملاء' },
  { key: 'payments', label: 'تقرير المدفوعات' },
  { key: 'hours', label: 'تقرير الساعات' },
];

export default function ReportsPage() {
  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">التقارير</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => (
          <div key={r.key} className="card flex items-center justify-between">
            <h3 className="font-semibold">{r.label}</h3>
            <a href={`/api/v1/reports/export/${r.key}`} className="btn-primary text-sm">تصدير Excel</a>
          </div>
        ))}
      </div>
    </Layout>
  );
}
