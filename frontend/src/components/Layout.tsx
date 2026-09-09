'use client';

import Sidebar from './Sidebar';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" dir="rtl">
      <Sidebar />
      <main className="mr-64 p-6 lg:p-8">{children}</main>
    </div>
  );
}
