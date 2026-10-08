/**
 * The permissions the app can ask for on a permission screen. Pure (no OS
 * modules), so persisted settings can name them; what each one does is in
 * `./permissions`.
 */

export const PERMISSION_KINDS = ['location'] as const;
export type PermissionKind = (typeof PERMISSION_KINDS)[number];

export function isPermissionKind(value: unknown): value is PermissionKind {
  return (PERMISSION_KINDS as readonly unknown[]).includes(value);
}

/** Known kinds from a persisted value, each once. */
export function normalizePermissions(value: unknown): PermissionKind[] {
  return Array.isArray(value)
    ? [...new Set(value.filter(isPermissionKind))]
    : [];
}
