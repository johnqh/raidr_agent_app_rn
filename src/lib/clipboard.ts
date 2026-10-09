/**
 * Copy text to the system clipboard. The native module is loaded lazily and
 * guarded, so a build that does not link it (or a test) fails softly with
 * `false` instead of throwing.
 *
 * {@link copySensitive} also schedules an auto-clear: after a minute the
 * clipboard is wiped, but only if it still holds exactly what was copied, so a
 * value the user copied afterwards is never clobbered. Any later copy cancels
 * a pending clear.
 */

import type Clipboard from '@react-native-clipboard/clipboard';

/** How long a sensitive value stays on the clipboard before auto-clear. */
export const SENSITIVE_CLEAR_MS = 60_000;

let clearTimer: ReturnType<typeof setTimeout> | null = null;

function getClipboard(): typeof Clipboard | null {
  try {
    return require('@react-native-clipboard/clipboard').default;
  } catch {
    return null;
  }
}

function cancelPendingClear(): void {
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }
}

/** Put `text` on the clipboard. Returns whether it was copied. */
export async function copyText(text: string): Promise<boolean> {
  const clipboard = getClipboard();
  if (!clipboard) {
    return false;
  }
  try {
    clipboard.setString(text);
    // The clipboard now holds something the user chose; drop any pending wipe.
    cancelPendingClear();
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy `text`, then clear the clipboard after `clearAfterMs` unless its
 * contents changed in the meantime. For passwords and seed phrases.
 */
export async function copySensitive(
  text: string,
  clearAfterMs: number = SENSITIVE_CLEAR_MS
): Promise<boolean> {
  const ok = await copyText(text);
  if (!ok) {
    return false;
  }
  clearTimer = setTimeout(() => {
    clearTimer = null;
    clearIfUnchanged(text);
  }, clearAfterMs);
  return true;
}

/** Wipe the clipboard only while it still holds `value`. Never throws. */
function clearIfUnchanged(value: string): void {
  const clipboard = getClipboard();
  if (!clipboard) {
    return;
  }
  Promise.resolve(clipboard.getString())
    .then(current => {
      if (current === value) {
        clipboard.setString('');
      }
    })
    .catch(() => {
      // Leave the clipboard alone if it cannot be read.
    });
}
