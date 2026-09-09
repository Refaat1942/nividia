export type NavItem = {
  href: string;
  label: string;
  icon: string;
  permission?: string | string[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: '📊' },
  { href: '/customers', label: 'العملاء', icon: '👥', permission: 'customers.view' },
  { href: '/packages', label: 'الباقات', icon: '📦', permission: 'packages.view' },
  { href: '/offices', label: 'المكاتب', icon: '🏢', permission: 'offices.view' },
  { href: '/rooms', label: 'غرف الاجتماعات', icon: '🚪', permission: 'rooms.view' },
  { href: '/bookings', label: 'الحجوزات', icon: '📅', permission: ['bookings.view', 'rooms.book'] },
  { href: '/sessions', label: 'الحضور والانصراف', icon: '🕐', permission: 'sessions.view' },
  { href: '/contracts', label: 'العقود', icon: '📄', permission: 'contracts.view' },
  { href: '/documents', label: 'المستندات', icon: '📁', permission: 'documents.view' },
  { href: '/payments', label: 'المدفوعات', icon: '💰', permission: 'payments.view' },
  { href: '/hours', label: 'الساعات', icon: '⏱️', permission: 'hours.manage' },
  { href: '/reports', label: 'التقارير', icon: '📈', permission: 'reports.view' },
  { href: '/users', label: 'المستخدمون والصلاحيات', icon: '🔐', permission: 'users.manage' },
  { href: '/audit', label: 'سجل العمليات', icon: '📋', permission: 'audit.view' },
  { href: '/settings', label: 'الإعدادات', icon: '⚙️', permission: 'settings.manage' },
];
