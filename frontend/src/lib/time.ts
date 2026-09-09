export function formatElapsed(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} س ${m} د ${sec} ث`;
  if (m > 0) return `${m} د ${sec} ث`;
  return `${sec} ث`;
}

export function formatRemainingFromHours(hours: number) {
  const totalSeconds = Math.max(0, Math.floor(hours * 3600));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h} س ${m} د ${s} ث`;
  return `${m} د ${s} ث`;
}

export function formatTimeBreakdown(t?: { display_short?: string; hours?: number; minutes?: number; seconds?: number }) {
  if (!t) return '—';
  if (t.display_short) return t.display_short;
  return `${t.hours || 0} س ${t.minutes || 0} د ${t.seconds || 0} ث`;
}
