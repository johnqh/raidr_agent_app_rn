/**
 * Restore an agent email: a text box for the seed phrase and a Restore
 * button, enabled only once the words are a valid BIP-39 phrase. On success
 * the modal closes; the caller then shows the restored address.
 */

import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, TextArea } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import { isValidSeedPhrase } from '@/lib/agentWallet';

export default function RestoreEmailModal({
  visible,
  busy,
  onRestore,
  onClose,
}: {
  visible: boolean;
  busy: boolean;
  /** Called with the entered phrase; may reject (shown as an error). */
  onRestore: (phrase: string) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [phrase, setPhrase] = useState('');
  const [error, setError] = useState(false);
  const valid = isValidSeedPhrase(phrase);

  const close = () => {
    setPhrase('');
    setError(false);
    onClose();
  };

  const submit = async () => {
    setError(false);
    try {
      await onRestore(phrase);
      setPhrase('');
    } catch {
      setError(true);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={close}
    >
      <View className='flex-1 bg-background'>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps='handled'
        >
          <Text size='2xl' weight='bold' className='mb-2'>
            {t('settings.agentEmail.restore.title')}
          </Text>
          <Text size='sm' color='muted' className='mb-4'>
            {t('settings.agentEmail.restore.hint')}
          </Text>
          <TextArea
            value={phrase}
            onChangeText={text => {
              setPhrase(text);
              setError(false);
            }}
            placeholder={t('settings.agentEmail.restore.placeholder')}
            numberOfLines={4}
            autoCapitalize='none'
            autoCorrect={false}
            autoComplete='off'
            spellCheck={false}
            accessibilityLabel={t('settings.agentEmail.restore.placeholder')}
            testID='restore-email-input'
          />
          {error ? (
            <Text size='sm' color='danger' className='mt-2'>
              {t('settings.agentEmail.restore.invalid')}
            </Text>
          ) : null}
        </ScrollView>
        <View className='p-4 border-t border-foreground/10 gap-3'>
          <Button
            variant='primary'
            disabled={!valid || busy}
            onPress={submit}
            accessibilityLabel={t('settings.agentEmail.restore.cta')}
            testID='restore-email-submit'
          >
            {t('settings.agentEmail.restore.cta')}
          </Button>
          <Button
            variant='ghost'
            disabled={busy}
            onPress={close}
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
