'use client';

import { useEffect, useState } from 'react';
import { fetchAuthenticatedBlob } from '@/lib/api';

type Props = {
  className?: string;
  alt?: string;
  refreshKey?: number;
};

export default function LogoImage({ className, alt = 'شعار المكتب', refreshKey = 0 }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      const blob = await fetchAuthenticatedBlob('/settings/logo');
      if (cancelled) return;
      if (blob) {
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } else {
        setSrc(null);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [refreshKey]);

  if (!src) return null;
  return <img src={src} alt={alt} className={className} />;
}
