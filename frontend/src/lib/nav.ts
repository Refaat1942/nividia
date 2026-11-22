import {
  BarChart3,
  CalendarClock,
  Clock,
  CreditCard,
  DoorOpen,
  FileSignature,
  FolderOpen,
  History,
  Hourglass,
  LayoutDashboard,
  Package,
  Settings,
  ShieldCheck,
  UserCircle,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: string | string[];
  /** Live count shown next to the item (see Sidebar). */
  badge?: 'present';
};

export type NavGroup = { title: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'اليوم',
    items: [
      { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
      { href: '/sessions', label: 'الحضور والانصراف', icon: Clock, permission: 'sessions.view', badge: 'present' },
      { href: '/bookings', label: 'الحجوزات', icon: CalendarClock, permission: ['bookings.view', 'rooms.book'] },
    ],
  },
  {
    title: 'العملاء والعقود',
    items: [
      { href: '/customers', label: 'العملاء', icon: Users, permission: 'customers.view' },
      { href: '/contracts', label: 'العقود', icon: FileSignature, permission: 'contracts.view' },
      { href: '/packages', label: 'الباقات', icon: Package, permission: 'packages.view' },
      { href: '/documents', label: 'المستندات', icon: FolderOpen, permission: 'documents.view' },
    ],
  },
  {
    title: 'المالية والمساحات',
    items: [
      { href: '/payments', label: 'المدفوعات', icon: CreditCard, permission: 'payments.view' },
      { href: '/hours', label: 'سجل الساعات', icon: Hourglass, permission: 'hours.manage' },
      { href: '/rooms', label: 'الغرف والمساحات', icon: DoorOpen, permission: ['offices.view', 'rooms.view'] },
      { href: '/reports', label: 'التقارير', icon: BarChart3, permission: 'reports.view' },
    ],
  },
  {
    title: 'الإدارة',
    items: [
      { href: '/users', label: 'المستخدمون والصلاحيات', icon: ShieldCheck, permission: 'users.manage' },
      { href: '/audit', label: 'سجل العمليات', icon: History, permission: 'audit.view' },
      { href: '/settings', label: 'الإعدادات', icon: Settings, permission: 'settings.manage' },
      { href: '/account', label: 'حسابي', icon: UserCircle },
    ],
  },
];

/** Flat list, kept for code that only needs the links. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
