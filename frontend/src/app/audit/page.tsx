'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function AuditPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  function load() { api<any>('/audit?limit=100').then((d) => setLogs(d.items)).catch(console.error); }
  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    if (!confirm('حذف هذا السجل؟')) return;
    await api(`/audit/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">سجل العمليات</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="table-head">
            <th className="p-3 text-right">الإجراء</th><th className="p-3 text-right">الوحدة</th>
            <th className="p-3 text-right">المعرف</th>            <th className="p-3 text-right">التاريخ</th>
            {user?.is_superuser && <th className="p-3 text-right">إجراءات</th>}
          </tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-3">{l.action}</td>
                <td className="p-3">{l.module}</td>
                <td className="p-3 text-xs">{l.record_id || '—'}</td>
                <td className="p-3">{l.created_at?.slice(0, 16).replace('T', ' ')}</td>
                {user?.is_superuser && (
                  <td className="p-3">
                    <button onClick={() => handleDelete(l.id)} className="text-red-600 hover:underline">حذف</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
