'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);

  function load() {
    api<any>('/notifications?unread_only=false')
      .then((d) => { setItems(d.items); setUnread(d.unread_count); })
      .catch(() => {});
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, []);

  async function markRead(id: string) {
    await api(`/notifications/${id}/read`, { method: 'POST' });
    load();
  }

  async function markAllRead() {
    await api('/notifications/read-all', { method: 'POST' });
    load();
  }

  async function deleteNotification(id: string) {
    if (!confirm('حذف هذا الإشعار؟')) return;
    await api(`/notifications/${id}`, { method: 'DELETE' });
    load();
  }

  const typeIcon: Record<string, string> = {
    session_checkin: '🟢',
    session_checkout: '🔴',
    low_balance: '⚠️',
    session_overdue: '⏰',
    contract_expiring: '📄',
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition"
        title="الإشعارات"
      >
        <span className="text-xl">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1 -left-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-semibold text-sm">الإشعارات</h3>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                تعليم الكل كمقروء
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {items.length === 0 ? (
              <p className="p-4 text-center text-slate-500 text-sm">لا توجد إشعارات</p>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={`w-full text-right p-3 border-b hover:bg-slate-50 transition ${
                    !n.is_read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex gap-2">
                    <span>{typeIcon[n.notification_type] || '📌'}</span>
                    <button
                      type="button"
                      onClick={() => !n.is_read && markRead(n.id)}
                      className="flex-1 min-w-0 text-right"
                    >
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {n.created_at ? new Date(n.created_at).toLocaleString('ar-EG') : ''}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteNotification(n.id)}
                      className="text-xs text-red-600 hover:underline shrink-0 self-start"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
