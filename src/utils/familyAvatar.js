const FAMILY_AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-700',
  'from-emerald-500 to-teal-700',
  'from-sky-500 to-blue-700',
  'from-rose-500 to-pink-700',
  'from-amber-500 to-orange-700',
  'from-indigo-500 to-violet-700',
];

export function getFamilyInitials(name) {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
}

export function getFamilyAvatarGradient(name) {
  const source = (name || '').trim() || '?';
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = source.charCodeAt(i) + ((hash << 5) - hash);
  }
  return FAMILY_AVATAR_GRADIENTS[Math.abs(hash) % FAMILY_AVATAR_GRADIENTS.length];
}
