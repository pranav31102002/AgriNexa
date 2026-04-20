export type UserRole = 'admin' | 'farmer' | 'viewer';

export function normalizeUserRole(value: unknown): UserRole {
  if (value === 'admin') return 'admin';
  if (value === 'viewer') return 'viewer';
  if (value === 'farmer' || value === 'owner') return 'farmer';
  return 'farmer';
}

