/** Strip Google placeholder surnames and build a display name. */
const PLACEHOLDER_LAST = /^(google(\s+user)?|user)$/i;

export function cleanNamePart(name) {
  const v = (name || '').trim();
  return PLACEHOLDER_LAST.test(v) ? '' : v;
}

export function formatUserDisplayName(user = {}) {
  const parts = [cleanNamePart(user.first_name), cleanNamePart(user.last_name)].filter(Boolean);
  if (parts.length) return parts.join(' ');
  const email = user.email || '';
  return email.split('@')[0] || 'User';
}

export function userInitials(user = {}) {
  const display = formatUserDisplayName(user);
  return display
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || 'U';
}
