export const BUILTIN_SPACE_TYPES: Record<string, string> = {
  admin_office: 'مكتب إداري',
  manager_office: 'غرفة مدير',
  meeting_room: 'قاعة اجتماعات',
};

export function isBookableSpaceType(spaceType: string) {
  return spaceType !== 'admin_office';
}

export function spaceTypeLabel(spaceType: string, customLabel?: string | null) {
  if (customLabel) return customLabel;
  return BUILTIN_SPACE_TYPES[spaceType] || spaceType;
}

export function slugifySpaceType(label: string) {
  const trimmed = label.trim();
  if (!trimmed) return 'custom';
  return trimmed.toLowerCase().replace(/\s+/g, '_').replace(/[^\w\u0600-\u06FF_]/g, '');
}
