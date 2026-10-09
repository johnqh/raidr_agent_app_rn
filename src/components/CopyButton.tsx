/**
 * A small "Copy" button that puts a value on the clipboard and briefly shows
 * "Copied". The value may be given directly (`text`) or fetched when pressed
 * (`onCopy`, e.g. reading a password from the Keychain only on demand). Shows
 * nothing when there is no value to copy.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import { copySensitive, copyText } from '@/lib/clipboard';

export default function CopyButton({
  text,
  onCopy,
  sensitive = false,
  label,
  accessibilityLabel,
  testID,
}: {
  /** The value to copy, when it is already at hand. */
  text?: string;
  /** Fetched when pressed, for a value read on demand (overrides `text`). */
  onCopy?: () => Promise<string | null>;
  /** A secret (password, seed phrase): auto-clear the clipboard after a minute. */
  sensitive?: boolean;
  /** Button label; defaults to "Copy". */
  label?: string;
  accessibilityLabel?: string;
  testID?: string;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    []
  );

  const press = useCallback(async () => {
    const value = onCopy ? await onCopy() : text;
    if (!value) {
      return;
    }
    const ok = await (sensitive ? copySensitive(value) : copyText(value));
    if (ok) {
      setCopied(true);
      if (timer.current) {
        clearTimeout(timer.current);
      }
      timer.current = setTimeout(() => setCopied(false), 1500);
    }
  }, [onCopy, text, sensitive]);

  return (
    <Button
      variant='ghost'
      size='sm'
      onPress={press}
      accessibilityLabel={accessibilityLabel ?? label ?? t('common.copy')}
      testID={testID}
    >
      {copied ? t('common.copied') : label ?? t('common.copy')}
    </Button>
  );
}
