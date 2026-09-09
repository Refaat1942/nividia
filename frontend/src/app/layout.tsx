import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'فراتيلانزا - نظام إدارة المكاتب',
  description: 'نظام إدارة المكاتب الإدارية وغرف الاجتماعات',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
