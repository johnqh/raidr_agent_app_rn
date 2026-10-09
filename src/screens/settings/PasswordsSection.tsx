/**
 * The password manager: every saved login (domain, email, and the password
 * revealed on demand), whether created by the sign-up autofill (an agent
 * email) or entered by hand. Add, edit and remove. Passwords are read from
 * the Keychain only when revealed.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { Button, Text } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import SiteIcon from '@/components/SiteIcon';
import CopyButton from '@/components/CopyButton';
import { usePasswordIndexStore } from '@/stores/passwordIndexStore';
import {
  removeLogin,
  revealPassword,
  saveManualLogin,
  updateLogin,
  type PasswordEntry,
} from '@/lib/passwordVault';
import { trackButtonClick, trackEvent } from '@/analytics';
import PasswordEntryModal, { type PasswordDraft } from './PasswordEntryModal';

type Editing =
  | { mode: 'add' }
  | { mode: 'edit'; entry: PasswordEntry; email: string; password: string };

export default function PasswordsSection() {
  const { t } = useTranslation();
  const entries = usePasswordIndexStore(s => s.entries);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);

  const toggleReveal = useCallback(
    async (entry: PasswordEntry) => {
      if (revealed[entry.apiHost] !== undefined) {
        setRevealed(prev => {
          const next = { ...prev };
          delete next[entry.apiHost];
          return next;
        });
        return;
      }
      trackButtonClick('password_reveal');
      const password = await revealPassword(entry.apiHost);
      setRevealed(prev => ({ ...prev, [entry.apiHost]: password ?? '' }));
    },
    [revealed]
  );

  const openEdit = useCallback(async (entry: PasswordEntry) => {
    const password = (await revealPassword(entry.apiHost)) ?? '';
    setEditing({ mode: 'edit', entry, email: entry.email, password });
  }, []);

  const save = useCallback(
    async (draft: PasswordDraft) => {
      setBusy(true);
      try {
        if (editing?.mode === 'edit') {
          await updateLogin(editing.entry, draft.email, draft.password);
        } else {
          await saveManualLogin(draft);
          trackEvent('password_added');
        }
        setEditing(null);
      } finally {
        setBusy(false);
      }
    },
    [editing]
  );

  const confirmRemove = useCallback(
    (entry: PasswordEntry) => {
      trackButtonClick('password_remove');
      Alert.alert(
        t('settings.passwords.removeTitle', { domain: entry.domain }),
        t('settings.passwords.removeConfirm'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('settings.passwords.remove'),
            style: 'destructive',
            onPress: () => {
              removeLogin(entry.apiHost);
              setRevealed(prev => {
                const next = { ...prev };
                delete next[entry.apiHost];
                return next;
              });
            },
          },
        ]
      );
    },
    [t]
  );

  const addButton = (
    <Button
      variant='primary'
      onPress={() => {
        trackButtonClick('password_add');
        setEditing({ mode: 'add' });
      }}
      accessibilityLabel={t('settings.passwords.add')}
      testID='passwords-add'
    >
      {t('settings.passwords.add')}
    </Button>
  );

  const modal = (
    <PasswordEntryModal
      visible={editing !== null}
      {...(editing?.mode === 'edit'
        ? {
            entry: editing.entry,
            initialEmail: editing.email,
            initialPassword: editing.password,
          }
        : {})}
      busy={busy}
      onSave={save}
      onClose={() => setEditing(null)}
    />
  );

  const sorted = useMemo(
    () => entries.slice().sort((a, b) => a.domain.localeCompare(b.domain)),
    [entries]
  );

  if (entries.length === 0) {
    return (
      <>
        <Text size='base' color='muted' className='mb-6 px-1'>
          {t('settings.passwords.empty')}
        </Text>
        {addButton}
        {modal}
      </>
    );
  }

  return (
    <>
      <View className='gap-3 mb-4'>
        {sorted.map(entry => {
          const shown = revealed[entry.apiHost];
          return (
            <View
              key={entry.apiHost}
              className='rounded-lg bg-card p-4'
              testID={`password-row-${entry.apiHost}`}
            >
              <View className='flex-row items-center mb-2'>
                <View className='mr-3'>
                  <SiteIcon domain={entry.domain} size={28} />
                </View>
                <View className='flex-1'>
                  <Text size='base' weight='medium'>
                    {entry.domain}
                  </Text>
                  <Text size='sm' color='muted'>
                    {entry.email}
                  </Text>
                </View>
              </View>
              <View className='flex-row items-center'>
                <Text size='sm' color='muted' className='mr-2'>
                  {t('settings.passwords.password')}:
                </Text>
                <Text size='sm' weight='medium' className='flex-1'>
                  {shown !== undefined ? shown || '—' : '••••••••••'}
                </Text>
              </View>
              <View className='flex-row flex-wrap items-center mt-2 gap-2'>
                <Button
                  variant='ghost'
                  size='sm'
                  onPress={() => toggleReveal(entry)}
                  accessibilityLabel={
                    shown !== undefined
                      ? t('settings.passwords.hide')
                      : t('settings.passwords.show')
                  }
                  testID={`password-reveal-${entry.apiHost}`}
                >
                  {shown !== undefined
                    ? t('settings.passwords.hide')
                    : t('settings.passwords.show')}
                </Button>
                <CopyButton
                  onCopy={() => revealPassword(entry.apiHost)}
                  sensitive
                  label={t('settings.passwords.copyPassword')}
                  testID={`password-copy-${entry.apiHost}`}
                />
                <CopyButton
                  text={entry.email}
                  label={t('settings.passwords.copyEmail')}
                  testID={`password-copy-email-${entry.apiHost}`}
                />
                <Button
                  variant='ghost'
                  size='sm'
                  onPress={() => openEdit(entry)}
                  accessibilityLabel={t('settings.passwords.edit')}
                  testID={`password-edit-${entry.apiHost}`}
                >
                  {t('settings.passwords.edit')}
                </Button>
                <Button
                  variant='destructive-outline'
                  size='sm'
                  onPress={() => confirmRemove(entry)}
                  accessibilityLabel={t('settings.passwords.remove')}
                  testID={`password-remove-${entry.apiHost}`}
                >
                  {t('settings.passwords.remove')}
                </Button>
              </View>
            </View>
          );
        })}
      </View>
      {addButton}
      {modal}
    </>
  );
}
