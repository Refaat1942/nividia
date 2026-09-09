'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';

export default function DocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  useEffect(() => { api<any>('/documents').then((d) => setDocs(d.items)).catch(console.error); }, []);

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">المستندات</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="table-head">
            <th className="p-3 text-right">الاسم</th><th className="p-3 text-right">النوع</th>
            <th className="p-3 text-right">التاريخ</th>
          </tr></thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="p-3">{d.name}</td>
                <td className="p-3">{d.document_type}</td>
                <td className="p-3">{d.created_at?.slice(0, 10)}</td>
              </tr>
            ))}
            {docs.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-slate-400">لا توجد مستندات</td></tr>}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
