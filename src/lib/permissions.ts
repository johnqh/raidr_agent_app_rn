/**
 * Permission screens: what each one says and what "Allow" does.
 *
 * A permission is asked on its own screen (`Permission`) between two steps,
 * never left in the back stack: the step before navigates to it with the
 * route to continue to, and on success it *replaces* itself with that route
 * (`screen 1 → permission → screen 2`; back on screen 2 returns to screen 1).
 * "Not now" goes back to screen 1.
 *
 * To add one (camera, microphone…): add the kind to `PERMISSION_KINDS`
 * (`./permissionKinds`),
 * its strings under `permission.<kind>` in the locale, and a
 * {@link PermissionSpec} in {@link PERMISSIONS} whose `allow` asks the OS
 * (and gets the value the next screen needs, if any).
 */

import { getDeviceLocation } from '@/lib/deviceLocation';
import { useRunFlowStore } from '@/stores/runFlowStore';

export { PERMISSION_KINDS, type PermissionKind } from './permissionKinds';
import type { PermissionKind } from './permissionKinds';

export interface PermissionSpec {
  /**
   * Ask the OS and do what the next screen needs (store the position…).
   * `true` when it worked. A refusal or failure resolves `false`.
   */
  allow: () => Promise<boolean>;
}

export const PERMISSIONS: Record<PermissionKind, PermissionSpec> = {
  location: {
    allow: async () => {
      const location = await getDeviceLocation().catch(() => null);
      if (!location) {
        return false;
      }
      useRunFlowStore.getState().setLocation(location);
      return true;
    },
  },
};
