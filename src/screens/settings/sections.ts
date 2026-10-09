/**
 * Settings' sections, in the order they are listed: the person, how the app
 * looks, the sites they are signed in to, and the app's own settings.
 */

export const SETTINGS_SECTIONS = [
  'account',
  'appearance',
  'credentials',
  'agentEmail',
  'passwords',
  'app',
] as const;
export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number];

/** A record, so a section added to the list fails to compile without a name. */
export const SECTION_LABEL: Record<SettingsSectionId, string> = {
  account: 'settings.sections.account',
  appearance: 'settings.sections.appearance',
  credentials: 'settings.sections.credentials',
  agentEmail: 'settings.sections.agentEmail',
  passwords: 'settings.sections.passwords',
  app: 'settings.sections.app',
};

export function isSettingsSection(id: string): id is SettingsSectionId {
  return (SETTINGS_SECTIONS as readonly string[]).includes(id);
}
