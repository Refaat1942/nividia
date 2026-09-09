'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { api } from '@/lib/api';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  useEffect(() => {
    api<any>('/users').then((d) => setUsers(d.items)).catch(console.error);
    api<any>('/users/roles').then((d) => setRoles(d.items)).catch(console.error);
  }, []);

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">المستخدمون والصلاحيات</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-4">المستخدمون</h3>
          <table className="w-full text-sm">
            <thead><tr className="table-head"><th className="p-2 text-right">الاسم</th><th className="p-2 text-right">المستخدم</th><th className="p-2 text-right">الأدوار</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-2">{u.full_name}</td>
                  <td className="p-2">{u.username}</td>
                  <td className="p-2">{u.roles?.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-4">الأدوار</h3>
          {roles.map((r) => (
            <div key={r.id} className="border-b py-3">
              <p className="font-medium">{r.name_ar}</p>
              <p className="text-xs text-slate-500 mt-1">{r.permissions?.length} صلاحية</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
