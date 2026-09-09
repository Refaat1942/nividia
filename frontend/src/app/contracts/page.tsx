'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';

export default function ContractsPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [variables, setVariables] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [showGen, setShowGen] = useState(false);
  const [form, setForm] = useState({ customer_id: '', template_id: '', package_id: '', start_date: '', end_date: '' });

  useEffect(() => {
    api<any>('/contracts').then((d) => setContracts(d.items)).catch(console.error);
    api<any>('/contracts/templates').then((d) => setTemplates(d.items)).catch(console.error);
    api<any>('/contracts/variables').then((d) => setVariables(d.items)).catch(console.error);
    api<any>('/customers').then((d) => setCustomers(d.items)).catch(console.error);
    api<any>('/packages').then((d) => setPackages(d.items)).catch(console.error);
  }, []);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    await api('/contracts/generate', { method: 'POST', body: JSON.stringify(form) });
    setShowGen(false);
    api<any>('/contracts').then((d) => setContracts(d.items));
  }

  return (
    <Layout>
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">العقود</h1>
        <button onClick={() => setShowGen(true)} className="btn-primary">إنشاء عقد</button>
      </div>
      <div className="card mb-4">
        <h3 className="font-semibold mb-2">المتغيرات المتاحة في القوالب</h3>
        <div className="flex flex-wrap gap-2">
          {variables.map((v) => (
            <code key={v.key} className="px-2 py-1 bg-slate-100 rounded text-xs">{`{{${v.key}}}`}</code>
          ))}
        </div>
      </div>
      {showGen && (
        <div className="card mb-4">
          <form onSubmit={generate} className="grid grid-cols-2 gap-4">
            <select className="input" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} required>
              <option value="">العميل</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
            <select className="input" value={form.template_id} onChange={(e) => setForm({ ...form, template_id: e.target.value })} required>
              <option value="">القالب</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select className="input" value={form.package_id} onChange={(e) => setForm({ ...form, package_id: e.target.value })}>
              <option value="">الباقة</option>{packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="date" className="input" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <input type="date" className="input" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            <div className="col-span-2"><button type="submit" className="btn-primary">توليد العقد</button></div>
          </form>
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="table-head">
            <th className="p-3 text-right">رقم العقد</th><th className="p-3 text-right">الحالة</th>
            <th className="p-3 text-right">التاريخ</th><th className="p-3 text-right">تحميل</th>
          </tr></thead>
          <tbody>
            {contracts.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-medium">{c.contract_number}</td>
                <td className="p-3">{c.status}</td>
                <td className="p-3">{c.created_at?.slice(0, 10)}</td>
                <td className="p-3"><a href={`/api/v1/contracts/${c.id}/download`} className="text-primary hover:underline">تحميل</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
