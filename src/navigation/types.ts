/**
 * Navigation type definitions
 */
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { ResultItem } from '@sudobility/raidr_agent_types';

export type AskStackParamList = {
  Ask: undefined;
  Sites: undefined;
  Login: { apiHost: string };
  Results: undefined;
  ResultDetail: { item: ResultItem };
};

export type HistoryStackParamList = {
  History: undefined;
  HistoryRun: { runId: string; request: string };
  ResultDetail: { item: ResultItem };
};

export type SettingsStackParamList = {
  Settings: undefined;
};

// Root tab param list
export type RootTabParamList = {
  AskTab: NavigatorScreenParams<AskStackParamList>;
  HistoryTab: NavigatorScreenParams<HistoryStackParamList>;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};

// Screen props types — Ask stack
export type AskScreenProps = NativeStackScreenProps<AskStackParamList, 'Ask'>;
export type SitesScreenProps = NativeStackScreenProps<
  AskStackParamList,
  'Sites'
>;
export type LoginScreenProps = NativeStackScreenProps<
  AskStackParamList,
  'Login'
>;
export type ResultsScreenProps = NativeStackScreenProps<
  AskStackParamList,
  'Results'
>;

// Screen props types — History stack
export type HistoryScreenProps = NativeStackScreenProps<
  HistoryStackParamList,
  'History'
>;
export type HistoryRunScreenProps = NativeStackScreenProps<
  HistoryStackParamList,
  'HistoryRun'
>;

export type SettingsScreenProps = NativeStackScreenProps<
  SettingsStackParamList,
  'Settings'
>;

// Tab screen props
export type SettingsTabProps = BottomTabScreenProps<
  RootTabParamList,
  'SettingsTab'
>;

// Utility type for navigation prop
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootTabParamList {}
  }
}
