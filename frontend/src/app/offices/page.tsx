'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OfficesRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/rooms');
  }, [router]);
  return null;
}
