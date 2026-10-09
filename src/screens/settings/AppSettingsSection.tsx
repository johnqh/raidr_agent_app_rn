/** The app's own settings. Nothing yet. */

import React from 'react';
import { Text } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';

export default function AppSettingsSection() {
  const { t } = useTranslation();
  return (
    <Text size='base' color='muted' className='px-1'>
      {t('settings.app.empty')}
    </Text>
  );
}
