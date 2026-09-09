'use client';

type Props = {
  className?: string;
  alt?: string;
  refreshKey?: number;
};

export default function LogoImage({ className, alt = 'شعار المكتب', refreshKey = 0 }: Props) {
  const src = `/api/v1/settings/public/logo?v=${refreshKey}`;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}
