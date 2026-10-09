/**
 * Settings, as master and detail ({@link SplitView}): Account, Appearance,
 * Credentials (the sites the user is signed in to) and App settings, then
 * API Keys. Wide, the chosen section shows beside the list; narrow (a
 * phone), each section is its own screen (`SettingsSection`).
 *
 * API Keys is a screen of its own in either layout (its drag-ordered list
 * needs the whole screen), so it is a link, not a section.
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Screen from '@/components/layout/Screen';
import SplitView, { SplitMenuList } from '@/components/layout/SplitView';
import { useSettingsStore } from '@/stores/settingsStore';
import { useLlmKeys } from '@/hooks/useLlmKeys';
import { LLM_PROVIDER_INFO } from '@/config/llmProviders';
import type { SettingsScreenProps } from '@/navigation/types';
import { trackButtonClick, trackScreenView } from '@/analytics';
import {
  SECTION_LABEL,
  SETTINGS_SECTIONS,
  isSettingsSection,
  type SettingsSectionId,
} from './settings/sections';
import SettingsSectionView from './settings/SettingsSectionView';

const API_KEYS = 'apiKeys';

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { t } = useTranslation();
  const agentMode = useSettingsStore(s => s.agentMode);
  const { effective } = useLlmKeys();
  const [chosen, setChosen] = useState<SettingsSectionId>('account');

  useEffect(() => {
    trackScreenView('Settings');
  }, []);

  /** "Cloud", or "Local · <provider in use>". */
  const agentModeLabel =
    agentMode === 'local'
      ? effective[0]
        ? t('settings.agentMode.localWith', {
            provider: LLM_PROVIDER_INFO[effective[0]].name,
          })
        : t('settings.agentMode.local')
      : t('settings.agentMode.cloud');

  const entries = [
    ...SETTINGS_SECTIONS.map(id => ({ id, label: t(SECTION_LABEL[id]) })),
    { id: API_KEYS, label: t('settings.apiKeys'), value: agentModeLabel },
  ];

  const choose = (id: string, split: boolean) => {
    trackButtonClick(`settings_${id}`);
    if (id === API_KEYS) {
      navigation.navigate('ApiKeys');
    } else if (isSettingsSection(id)) {
      if (split) {
        setChosen(id);
      } else {
        navigation.navigate('SettingsSection', { section: id });
      }
    }
  };

  return (
    <Screen title={t('settings.title')} hideBack layout='fill'>
      <SplitView
        renderMaster={split => (
          <SplitMenuList
            entries={entries}
            selected={split ? chosen : null}
            onSelect={id => choose(id, split)}
          />
        )}
        detailTitle={t(SECTION_LABEL[chosen])}
        detail={<SettingsSectionView section={chosen} />}
      />
    </Screen>
  );
}
