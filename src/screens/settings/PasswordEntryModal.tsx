/**
 * Add or edit one saved login: the website, the email (typed, or an agent
 * address — it makes no difference here), and the password, with a reveal
 * toggle and a Generate button. Domain is fixed when editing (it is the key).
 */

import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Input, Text } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import { generatePassword } from '@/lib/agentCredentials';
import { normalizeDomain, type PasswordEntry } from '@/lib/passwordVault';
import CopyButton from '@/components/CopyButton';

export interface PasswordDraft {
  domain: string;
  email: string;
  password: string;
}

export default function PasswordEntryModal({
  visible,
  entry,
  initialEmail,
  initialPassword,
  busy,
  onSave,
  onClose,
}: {
  visible: boolean;
  /** The entry being edited; absent when adding. */
  entry?: PasswordEntry;
  /** When editing, the email/password loaded for the entry. */
  initialEmail?: string;
  initialPassword?: string;
  busy: boolean;
  onSave: (draft: PasswordDraft) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const editing = entry !== undefined;
  const [domain, setDomain] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState(false);

  // Seed the fields each time the modal opens.
  useEffect(() => {
    if (visible) {
      setDomain(entry?.domain ?? '');
      setEmail(initialEmail ?? '');
      setPassword(initialPassword ?? '');
      setReveal(false);
      setError(false);
    }
  }, [visible, entry, initialEmail, initialPassword]);

  const valid =
    normalizeDomain(domain) !== '' && email.trim() !== '' && password !== '';

  const submit = async () => {
    setError(false);
    try {
      await onSave({ domain, email: email.trim(), password });
    } catch {
      setError(true);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={onClose}
    >
      <View className='flex-1 bg-background'>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps='handled'
        >
          <Text size='2xl' weight='bold' className='mb-4'>
            {editing
              ? t('settings.passwords.editTitle')
              : t('settings.passwords.addTitle')}
          </Text>

          <Text size='sm' color='muted' className='mb-1'>
            {t('settings.passwords.website')}
          </Text>
          <Input
            value={domain}
            onChangeText={setDomain}
            editable={!editing}
            placeholder='example.com'
            autoCapitalize='none'
            autoCorrect={false}
            keyboardType='url'
            spellCheck={false}
            accessibilityLabel={t('settings.passwords.website')}
            testID='password-domain'
          />

          <Text size='sm' color='muted' className='mb-1 mt-4'>
            {t('settings.passwords.email')}
          </Text>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder='you@example.com'
            autoCapitalize='none'
            autoCorrect={false}
            keyboardType='email-address'
            spellCheck={false}
            accessibilityLabel={t('settings.passwords.email')}
            testID='password-email'
          />

          <Text size='sm' color='muted' className='mb-1 mt-4'>
            {t('settings.passwords.password')}
          </Text>
          <Input
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!reveal}
            autoCapitalize='none'
            autoCorrect={false}
            autoComplete='off'
            textContentType='none'
            spellCheck={false}
            accessibilityLabel={t('settings.passwords.password')}
            testID='password-value'
          />
          <View className='flex-row flex-wrap items-center mt-2 gap-2'>
            <Button
              variant='ghost'
              size='sm'
              onPress={() => setReveal(r => !r)}
              accessibilityLabel={
                reveal
                  ? t('settings.passwords.hide')
                  : t('settings.passwords.show')
              }
              testID='password-reveal-toggle'
            >
              {reveal
                ? t('settings.passwords.hide')
                : t('settings.passwords.show')}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onPress={() => {
                setPassword(generatePassword());
                setReveal(true);
              }}
              accessibilityLabel={t('settings.passwords.generate')}
              testID='password-generate'
            >
              {t('settings.passwords.generate')}
            </Button>
            {password ? (
              <CopyButton
                text={password}
                sensitive
                label={t('settings.passwords.copyPassword')}
                testID='password-copy-draft'
              />
            ) : null}
          </View>

          {error ? (
            <Text size='sm' color='danger' className='mt-3'>
              {t('settings.passwords.saveError')}
            </Text>
          ) : null}
        </ScrollView>

        <View className='p-4 border-t border-foreground/10 gap-3'>
          <Button
            variant='primary'
            disabled={!valid || busy}
            onPress={submit}
            accessibilityLabel={t('settings.passwords.save')}
            testID='password-save'
          >
            {t('settings.passwords.save')}
          </Button>
          <Button
            variant='ghost'
            disabled={busy}
            onPress={onClose}
            accessibilityLabel={t('common.cancel')}
          >
            {t('common.cancel')}
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24 },
});
