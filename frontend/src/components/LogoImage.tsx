'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  className?: string;
  alt?: string;
  refreshKey?: number;
  /** Shown instead of the image when no logo is uploaded. */
  fallback?: React.ReactNode;
};

export default function LogoImage({ className, alt = 'شعار المكتب', refreshKey = 0, fallback = null }: Props) {
  const src = `/api/v1/settings/public/logo?v=${refreshKey}`;
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    // The image can fail before React attaches onError (server-rendered markup).
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (failed) return <>{fallback}</>;
  return <img ref={ref} src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}
