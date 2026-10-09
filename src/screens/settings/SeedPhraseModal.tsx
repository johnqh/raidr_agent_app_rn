/**
 * The agent email's seed phrase, shown in a modal: the 12 words numbered, a
 * warning that it is the only way to restore the email, and whoever controls
 * it controls the mailbox. Two uses: `backup` after creating (the user
 * confirms they have written it down) and `reveal` for an existing email
 * (Done only).
 *
 * The app bundles no clipboard module, so there is no copy button; the words
 * are shown to be written down.
 */

import React from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import { seedPhraseWords } from '@/lib/agentWallet';
import CopyButton from '@/components/CopyButton';

export default function SeedPhraseModal({
  phrase,
  mode,
  onClose,
}: {
  /** The phrase to show; null hides the modal. */
  phrase: string | null;
  mode: 'backup' | 'reveal';
  /** Backup: the user confirmed they saved it. Reveal: just dismissed. */
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const words = phrase ? seedPhraseWords(phrase) : [];

  return (
    <Modal
      visible={phrase !== null}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={onClose}
    >
      <View className='flex-1 bg-background'>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps='handled'
        >
          <Text size='2xl' weight='bold' className='mb-2'>
            {t('settings.agentEmail.seed.title')}
          </Text>
          <Text size='sm' color='muted' className='mb-4'>
            {t('settings.agentEmail.seed.warning')}
          </Text>
          <View
            className='flex-row flex-wrap rounded-lg bg-card p-2'
            testID='seed-phrase-words'
          >
            {words.map((word, i) => (
              <View key={`${i}-${word}`} className='w-1/2 p-1'>
                <View className='flex-row items-center rounded-md bg-background px-3 py-2'>
                  <Text size='sm' color='muted' className='w-6'>
                    {i + 1}
                  </Text>
                  <Text size='base' weight='medium'>
                    {word}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
        <View className='p-4 border-t border-foreground/10 gap-3'>
          <CopyButton
            text={words.join(' ')}
            sensitive
            label={t('settings.agentEmail.seed.copy')}
            testID='seed-phrase-copy'
          />
          <Button
            variant='primary'
            onPress={onClose}
            accessibilityLabel={
              mode === 'backup'
                ? t('settings.agentEmail.seed.saved')
                : t('common.done')
            }
            testID='seed-phrase-done'
          >
            {mode === 'backup'
              ? t('settings.agentEmail.seed.saved')
              : t('common.done')}
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24 },
});
