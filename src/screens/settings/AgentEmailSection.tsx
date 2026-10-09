/**
 * Agent Email: a Signic email address the agent can use when a site asks for
 * one (you sign up and confirm; the address is where the verification mail
 * arrives). Its key is a standard Ethereum seed phrase held only on the
 * device.
 *
 * No email yet → instructions with Create and Restore. Set up → the address,
 * Show Seed Phrases, the "use automatically" toggle, and Remove. Reading the
 * mailbox is `useAgentInbox`; its UI comes later.
 */

import React, { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';
import { Button, Switch, Text } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import { useAgentEmail } from '@/hooks/useAgentEmail';
import { trackButtonClick, trackEvent } from '@/analytics';
import CopyButton from '@/components/CopyButton';
import { SettingsGroup, SettingsRow } from './SettingsRows';
import SeedPhraseModal from './SeedPhraseModal';
import RestoreEmailModal from './RestoreEmailModal';

export default function AgentEmailSection() {
  const { t } = useTranslation();
  const agent = useAgentEmail();
  const [restoring, setRestoring] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState<string | null>(null);
  const [seedMode, setSeedMode] = useState<'backup' | 'reveal'>('reveal');

  const create = useCallback(async () => {
    trackButtonClick('agent_email_create');
    try {
      const { phrase } = await agent.create();
      trackEvent('agent_email_created');
      setSeedMode('backup');
      setSeedPhrase(phrase);
    } catch (error) {
      Alert.alert(
        t('settings.agentEmail.error'),
        error instanceof Error ? error.message : undefined
      );
    }
  }, [agent, t]);

  const restore = useCallback(
    async (phrase: string) => {
      await agent.restore(phrase);
      trackEvent('agent_email_restored');
      setRestoring(false);
    },
    [agent]
  );

  const showSeed = useCallback(async () => {
    trackButtonClick('agent_email_show_seed');
    const phrase = await agent.reveal();
    if (phrase) {
      setSeedMode('reveal');
      setSeedPhrase(phrase);
    } else {
      Alert.alert(t('settings.agentEmail.seed.missing'));
    }
  }, [agent, t]);

  const confirmRemove = useCallback(() => {
    trackButtonClick('agent_email_remove');
    Alert.alert(
      t('settings.agentEmail.removeTitle'),
      t('settings.agentEmail.removeConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.agentEmail.remove'),
          style: 'destructive',
          onPress: () => {
            agent.remove().then(() => trackEvent('agent_email_removed'));
          },
        },
      ]
    );
  }, [agent, t]);

  const closeSeed = useCallback(() => setSeedPhrase(null), []);

  if (!agent.emailAddress) {
    return (
      <>
        <Text size='base' className='mb-2 px-1'>
          {t('settings.agentEmail.introTitle')}
        </Text>
        <Text size='sm' color='muted' className='mb-6 px-1'>
          {t('settings.agentEmail.introBody')}
        </Text>
        <View className='gap-3'>
          <Button
            variant='primary'
            disabled={agent.busy}
            onPress={create}
            accessibilityLabel={t('settings.agentEmail.create')}
            testID='agent-email-create'
          >
            {t('settings.agentEmail.create')}
          </Button>
          <Button
            variant='outline'
            disabled={agent.busy}
            onPress={() => {
              trackButtonClick('agent_email_restore_open');
              setRestoring(true);
            }}
            accessibilityLabel={t('settings.agentEmail.restore.cta')}
            testID='agent-email-restore'
          >
            {t('settings.agentEmail.restore.cta')}
          </Button>
        </View>
        <RestoreEmailModal
          visible={restoring}
          busy={agent.busy}
          onRestore={restore}
          onClose={() => setRestoring(false)}
        />
        <SeedPhraseModal
          phrase={seedPhrase}
          mode={seedMode}
          onClose={closeSeed}
        />
      </>
    );
  }

  return (
    <>
      <SettingsGroup footer={t('settings.agentEmail.addressFooter')}>
        <SettingsRow label={t('settings.agentEmail.addressLabel')}>
          <Text size='sm' color='muted' className='flex-1 text-right mr-1'>
            {agent.emailAddress}
          </Text>
          <CopyButton
            text={agent.emailAddress}
            accessibilityLabel={t('settings.agentEmail.copyAddress')}
            testID='agent-email-copy'
          />
        </SettingsRow>
        <SettingsRow
          label={t('settings.agentEmail.useAutomatically')}
          description={t('settings.agentEmail.useAutomaticallyHint')}
        >
          <Switch
            checked={agent.useAutomatically}
            onCheckedChange={on => {
              trackButtonClick('agent_email_auto');
              agent.setUseAutomatically(on);
            }}
            accessibilityLabel={t('settings.agentEmail.useAutomatically')}
            testID='agent-email-auto'
          />
        </SettingsRow>
      </SettingsGroup>

      <View className='gap-3'>
        <Button
          variant='outline'
          onPress={showSeed}
          accessibilityLabel={t('settings.agentEmail.showSeed')}
          testID='agent-email-show-seed'
        >
          {t('settings.agentEmail.showSeed')}
        </Button>
        <Button
          variant='destructive-outline'
          disabled={agent.busy}
          onPress={confirmRemove}
          accessibilityLabel={t('settings.agentEmail.remove')}
          testID='agent-email-remove'
        >
          {t('settings.agentEmail.remove')}
        </Button>
      </View>

      <SeedPhraseModal
        phrase={seedPhrase}
        mode={seedMode}
        onClose={closeSeed}
      />
    </>
  );
}
