'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import Modal from '@/components/Modal';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const emptyUserForm = {
  username: '', full_name: '', email: '', password: '', role_ids: [] as string[],
};

export default function UsersPage() {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [rolePerms, setRolePerms] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'users' | 'roles'>('users');

  function load() {
    api<any>('/users').then((d) => setUsers(d.items)).catch((e) => setError(e.message));
    api<any>('/users/roles').then((d) => setRoles(d.items)).catch(console.error);
    api<any>('/users/permissions').then((d) => setPermissions(d.items)).catch(console.error);
  }

  useEffect(() => { load(); }, []);

  if (!hasPermission('users.manage')) {
    return (
      <Layout>
        <div className="card text-center py-12">
          <p className="text-lg font-semibold text-red-600">ليس لديك صلاحية إدارة المستخدمين</p>
          <p className="text-slate-500 mt-2">تواصل مع مدير النظام لتفعيل صلاحية users.manage</p>
        </div>
      </Layout>
    );
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('/users', {
        method: 'POST',
        body: JSON.stringify({
          username: userForm.username,
          full_name: userForm.full_name,
          email: userForm.email || null,
          password: userForm.password,
          role_ids: userForm.role_ids,
        }),
      });
      setShowCreate(false);
      setUserForm(emptyUserForm);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ');
    }
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    await api(`/users/${editingUser.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        full_name: userForm.full_name,
        is_active: userForm.is_active,
        role_ids: userForm.role_ids,
      }),
    });
    setEditingUser(null);
    load();
  }

  async function handleSaveRolePerms(e: React.FormEvent) {
    e.preventDefault();
    await api(`/users/roles/${editingRole.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ permission_codes: rolePerms }),
    });
    setEditingRole(null);
    load();
  }

  const permsByModule = permissions.reduce((acc: Record<string, any[]>, p) => {
    (acc[p.module] ||= []).push(p);
    return acc;
  }, {});

  const moduleLabels: Record<string, string> = {
    customers: 'العملاء', packages: 'الباقات', rooms: 'الغرف', bookings: 'الحجوزات',
    offices: 'المكاتب', contracts: 'العقود', documents: 'المستندات', payments: 'المدفوعات',
    reports: 'التقارير', users: 'المستخدمون', settings: 'الإعدادات', audit: 'السجل',
    hours: 'الساعات', sessions: 'الحضور',
  };

  return (
    <Layout>
      <div className="flex justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">المستخدمون والصلاحيات</h1>
          <p className="text-slate-500 text-sm">إضافة مستخدمين وتحديد ما يرى كل دور في القائمة</p>
        </div>
        {tab === 'users' && (
          <button onClick={() => { setShowCreate(true); setUserForm(emptyUserForm); }} className="btn-primary">
            + مستخدم جديد
          </button>
        )}
      </div>

      {error && <div className="card mb-4 bg-red-50 text-red-700 text-sm">{error}</div>}

      <div className="flex gap-2 mb-4 border-b">
        <button onClick={() => setTab('users')} className={`px-4 py-2 text-sm border-b-2 ${tab === 'users' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}>
          المستخدمون
        </button>
        <button onClick={() => setTab('roles')} className={`px-4 py-2 text-sm border-b-2 ${tab === 'roles' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}>
          الأدوار والصلاحيات
        </button>
      </div>

      {tab === 'users' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head">
                <th className="p-3 text-right">الاسم</th>
                <th className="p-3 text-right">اسم المستخدم</th>
                <th className="p-3 text-right">الأدوار</th>
                <th className="p-3 text-right">الحالة</th>
                <th className="p-3 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3">{u.full_name}</td>
                  <td className="p-3">{u.username}</td>
                  <td className="p-3">{u.roles?.join(', ') || '—'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active ? 'نشط' : 'معطل'}
                    </span>
                  </td>
                  <td className="p-3">
                    {!u.is_superuser && (
                      <button
                        onClick={() => {
                          setEditingUser(u);
                          setUserForm({
                            username: u.username,
                            full_name: u.full_name,
                            email: u.email || '',
                            password: '',
                            is_active: u.is_active,
                            role_ids: roles.filter((r) => u.roles?.includes(r.name)).map((r) => r.id),
                          } as any);
                        }}
                        className="text-primary hover:underline"
                      >
                        تعديل
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((r) => (
            <div key={r.id} className="card">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold">{r.name_ar}</h3>
                  <p className="text-xs text-slate-500">{r.name}</p>
                </div>
                {r.name !== 'super_admin' && (
                  <button
                    onClick={() => { setEditingRole(r); setRolePerms(r.permission_codes || []); }}
                    className="text-sm text-primary hover:underline"
                  >
                    تعديل الصلاحيات
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400 mb-2">{r.permission_codes?.length || 0} صلاحية</p>
              <div className="flex flex-wrap gap-1">
                {(r.permissions || []).slice(0, 8).map((p: any) => (
                  <span key={p.code} className="px-2 py-0.5 bg-slate-100 rounded text-xs">{p.name_ar}</span>
                ))}
                {(r.permissions || []).length > 8 && (
                  <span className="text-xs text-slate-400">+{r.permissions.length - 8} أكثر</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} title="مستخدم جديد" onClose={() => setShowCreate(false)}>
        <form onSubmit={handleCreateUser} className="space-y-4">
          <input className="input" placeholder="اسم المستخدم (للدخول)" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} required />
          <input className="input" placeholder="الاسم الكامل" value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} required />
          <input className="input" placeholder="البريد (اختياري)" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
          <input type="password" className="input" placeholder="كلمة المرور (8 أحرف على الأقل)" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required minLength={8} />
          <div>
            <p className="text-sm font-medium mb-2">الدور</p>
            {roles.filter((r) => r.name !== 'super_admin').map((r) => (
              <label key={r.id} className="flex items-center gap-2 text-sm mb-1">
                <input
                  type="checkbox"
                  checked={userForm.role_ids.includes(r.id)}
                  onChange={(e) => setUserForm({
                    ...userForm,
                    role_ids: e.target.checked
                      ? [...userForm.role_ids, r.id]
                      : userForm.role_ids.filter((id) => id !== r.id),
                  })}
                />
                {r.name_ar}
              </label>
            ))}
          </div>
          <button type="submit" className="btn-primary">إنشاء المستخدم</button>
        </form>
      </Modal>

      <Modal open={!!editingUser} title="تعديل مستخدم" onClose={() => setEditingUser(null)}>
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <input className="input" value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} required />
          <select className="input" value={(userForm as any).is_active ? 'true' : 'false'} onChange={(e) => setUserForm({ ...userForm, is_active: e.target.value === 'true' } as any)}>
            <option value="true">نشط</option>
            <option value="false">معطل</option>
          </select>
          <div>
            <p className="text-sm font-medium mb-2">الأدوار</p>
            {roles.filter((r) => r.name !== 'super_admin').map((r) => (
              <label key={r.id} className="flex items-center gap-2 text-sm mb-1">
                <input
                  type="checkbox"
                  checked={userForm.role_ids.includes(r.id)}
                  onChange={(e) => setUserForm({
                    ...userForm,
                    role_ids: e.target.checked
                      ? [...userForm.role_ids, r.id]
                      : userForm.role_ids.filter((id) => id !== r.id),
                  })}
                />
                {r.name_ar}
              </label>
            ))}
          </div>
          <button type="submit" className="btn-primary">حفظ</button>
        </form>
      </Modal>

      <Modal open={!!editingRole} title={`صلاحيات: ${editingRole?.name_ar}`} onClose={() => setEditingRole(null)}>
        <form onSubmit={handleSaveRolePerms} className="space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-sm text-slate-500">حدد ما يمكن لهذا الدور رؤيته والقيام به في النظام</p>
          {Object.entries(permsByModule).map(([module, perms]) => (
            <div key={module} className="border rounded-lg p-3">
              <p className="font-medium text-sm mb-2">{moduleLabels[module] || module}</p>
              <div className="space-y-1">
                {perms.map((p) => (
                  <label key={p.code} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={rolePerms.includes(p.code)}
                      onChange={(e) => setRolePerms(
                        e.target.checked
                          ? [...rolePerms, p.code]
                          : rolePerms.filter((c) => c !== p.code),
                      )}
                    />
                    <span>{p.name_ar}</span>
                    <code className="text-xs text-slate-400">{p.code}</code>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button type="submit" className="btn-primary sticky bottom-0">حفظ الصلاحيات</button>
        </form>
      </Modal>
    </Layout>
  );
}
