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
  { href: '/rooms', label: 'الغرف والمساحات', icon: '🏢', permission: ['offices.view', 'rooms.view'] },
  { href: '/bookings', label: 'الحجوزات', icon: '📅', permission: ['bookings.view', 'rooms.book'] },
  { href: '/sessions', label: 'الحضور والانصراف', icon: '🕐', permission: 'sessions.view' },
  { href: '/contracts', label: 'العقود', icon: '📄', permission: 'contracts.view' },
  { href: '/reports', label: 'التقارير', icon: '📈', permission: 'reports.view' },
  { href: '/users', label: 'المستخدمون والصلاحيات', icon: '🔐', permission: 'users.manage' },
  { href: '/audit', label: 'سجل العمليات', icon: '📋', permission: 'audit.view' },
  { href: '/account', label: 'حسابي', icon: '👤' },
  { href: '/settings', label: 'الإعدادات', icon: '⚙️', permission: 'settings.manage' },
];
