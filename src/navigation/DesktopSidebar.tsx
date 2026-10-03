import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import {
  ChatBubbleLeftRightIcon,
  ClockIcon,
  Cog6ToothIcon,
} from 'react-native-heroicons/outline';
import {
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid,
  ClockIcon as ClockIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
} from 'react-native-heroicons/solid';

export type SidebarTab = 'AskTab' | 'HistoryTab' | 'SettingsTab';

interface DesktopSidebarProps {
  activeTab: SidebarTab;
  onTabPress: (tab: SidebarTab) => void;
}

const ICON_SIZE = 22;

const tabs: { key: SidebarTab; labelKey: string }[] = [
  { key: 'AskTab', labelKey: 'ask.title' },
  { key: 'HistoryTab', labelKey: 'history.title' },
  { key: 'SettingsTab', labelKey: 'settings.title' },
];

function TabIcon({ tab, focused }: { tab: SidebarTab; focused: boolean }) {
  const className = focused ? 'text-primary' : 'text-muted-foreground';
  switch (tab) {
    case 'AskTab':
      return focused ? (
        <ChatBubbleLeftRightIconSolid className={className} size={ICON_SIZE} />
      ) : (
        <ChatBubbleLeftRightIcon className={className} size={ICON_SIZE} />
      );
    case 'HistoryTab':
      return focused ? (
        <ClockIconSolid className={className} size={ICON_SIZE} />
      ) : (
        <ClockIcon className={className} size={ICON_SIZE} />
      );
    case 'SettingsTab':
      return focused ? (
        <Cog6ToothIconSolid className={className} size={ICON_SIZE} />
      ) : (
        <Cog6ToothIcon className={className} size={ICON_SIZE} />
      );
  }
}

export function DesktopSidebar({ activeTab, onTabPress }: DesktopSidebarProps) {
  const { t } = useTranslation();
  return (
    <View className='w-20 bg-card border-r border-border pt-2 items-center'>
      <View className='w-10 h-10 rounded-md justify-center items-center mb-4'>
        <Text size='xl' weight='bold' color='primary'>
          r
        </Text>
      </View>
      {tabs.map(({ key, labelKey }) => {
        const focused = activeTab === key;
        return (
          <Pressable
            key={key}
            className={`w-16 py-2 rounded-md items-center mb-1 ${
              focused ? 'bg-background' : ''
            }`}
            onPress={() => onTabPress(key)}
          >
            <TabIcon tab={key} focused={focused} />
            <Text
              size='xs'
              weight='medium'
              color={focused ? 'primary' : 'muted'}
              className='mt-1'
            >
              {t(labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
