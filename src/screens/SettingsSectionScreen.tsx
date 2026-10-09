/** One settings section as its own screen: Settings on a narrow window. */

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Screen from '@/components/layout/Screen';
import type { SettingsSectionScreenProps } from '@/navigation/types';
import { trackScreenView } from '@/analytics';
import { SECTION_LABEL } from './settings/sections';
import SettingsSectionView from './settings/SettingsSectionView';

export default function SettingsSectionScreen({
  route,
}: SettingsSectionScreenProps) {
  const { section } = route.params;
  const { t } = useTranslation();

  useEffect(() => {
    trackScreenView(`Settings.${section}`);
  }, [section]);

  return (
    <Screen title={t(SECTION_LABEL[section])}>
      <SettingsSectionView section={section} />
    </Screen>
  );
}
