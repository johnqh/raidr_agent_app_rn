/**
 * Go to a screen that needs a permission.
 *
 * Allowed before (on a permission screen)? Use it right here and go straight
 * on. Not yet, or it no longer works? Open the `Permission` screen with the
 * route to continue to; it replaces itself with that route on success, so
 * it never stays in the back stack.
 */

import { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PERMISSIONS, type PermissionKind } from '@/lib/permissions';
import { useSettingsStore } from '@/stores/settingsStore';
import type { NextRoute, PermissionParams } from '@/navigation/types';

type GateNavigation = NativeStackNavigationProp<{
  Permission: PermissionParams;
}>;

/**
 * Navigate (or replace) to a {@link NextRoute}: a route of the same stack
 * named at runtime, which the typed navigators cannot check.
 */
export function goTo(
  go: unknown,
  next: NextRoute
): void {
  (go as (name: string, params?: Record<string, unknown>) => void)(
    next.name,
    next.params
  );
}

export function usePermissionGate(): {
  /** Continue to `next` once `kind` is allowed. */
  goWith: (kind: PermissionKind, next: NextRoute) => Promise<void>;
  /** Using an already-allowed permission (e.g. getting a position fix). */
  busy: boolean;
} {
  const navigation = useNavigation<GateNavigation>();
  const [busy, setBusy] = useState(false);

  const goWith = useCallback(
    async (kind: PermissionKind, next: NextRoute) => {
      const { grantedPermissions, setPermissionGranted } =
        useSettingsStore.getState();
      if (grantedPermissions.includes(kind)) {
        setBusy(true);
        const ok = await PERMISSIONS[kind].allow();
        setBusy(false);
        if (ok) {
          goTo(navigation.navigate, next);
          return;
        }
        // Turned off since: ask again on the permission screen.
        setPermissionGranted(kind, false);
      }
      navigation.navigate('Permission', { kind, next });
    },
    [navigation]
  );

  return { goWith, busy };
}
