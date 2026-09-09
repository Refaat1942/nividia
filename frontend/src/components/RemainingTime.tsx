'use client';

import { formatRemainingFromHours, formatTimeBreakdown } from '@/lib/time';

export default function RemainingTime({
  hours,
  time,
  label = 'المتبقي',
  className = '',
}: {
  hours?: number;
  time?: { display_short?: string };
  label?: string;
  className?: string;
}) {
  const text = time?.display_short || (hours != null ? formatRemainingFromHours(hours) : '—');
  return (
    <span className={`inline-flex items-center gap-1 text-green-700 font-medium ${className}`}>
      <span className="text-slate-500 font-normal">{label}:</span>
      {formatTimeBreakdown(time) !== '—' ? formatTimeBreakdown(time) : text}
    </span>
  );
}
