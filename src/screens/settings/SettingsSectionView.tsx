/** A settings section's content, in the split view's detail or its own screen. */

import React from 'react';
import type { SettingsSectionId } from './sections';
import AccountSection from './AccountSection';
import AppearanceSection from './AppearanceSection';
import CredentialsSection from './CredentialsSection';
import AgentEmailSection from './AgentEmailSection';
import PasswordsSection from './PasswordsSection';
import AppSettingsSection from './AppSettingsSection';

export default function SettingsSectionView({
  section,
}: {
  section: SettingsSectionId;
}) {
  switch (section) {
    case 'account':
      return <AccountSection />;
    case 'appearance':
      return <AppearanceSection />;
    case 'credentials':
      return <CredentialsSection />;
    case 'agentEmail':
      return <AgentEmailSection />;
    case 'passwords':
      return <PasswordsSection />;
    case 'app':
      return <AppSettingsSection />;
  }
}
