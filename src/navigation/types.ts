/**
 * Navigation type definitions
 */
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type {
  BestData,
  ResultGroup,
  ResultItem,
} from '@sudobility/raidr_agent_types';
import type { ResultCopy } from '@/lib/results';
import type { PermissionKind } from '@/lib/permissionKinds';
import type { SettingsSectionId } from '@/screens/settings/sections';

/** Result detail: the item, and why it was picked when it is the best one. */
export type ResultDetailParams = { item: ResultItem; reason?: string };

/** Where to get a merged result: its copies, one per listing. */
export type ResultSourcesParams = { copies: ResultCopy[] };

/** Every result of a run, as a list (the "See all N results" step). */
export type AllResultsParams = {
  results: ResultItem[];
  groups?: ResultGroup[];
  best?: BestData | null;
};

/** The screen to continue to after a permission screen (same stack). */
export type NextRoute = { name: string; params?: Record<string, unknown> };

/** A permission screen: which permission, and where to go once allowed. */
export type PermissionParams = { kind: PermissionKind; next: NextRoute };

/**
 * Sign in to a site in a web view. `purpose: 'credential'` (Settings → Add
 * credential) only stores the sign-in; the default also selects the site
 * for the run being prepared.
 */
export type LoginParams = { apiHost: string; purpose?: 'run' | 'credential' };

export type AskStackParamList = {
  Ask: undefined;
  Permission: PermissionParams;
  Sites: undefined;
  Prepare: undefined;
  Login: LoginParams;
  Results: undefined;
  AllResults: AllResultsParams;
  ResultSources: ResultSourcesParams;
  ResultDetail: ResultDetailParams;
};

export type HistoryStackParamList = {
  History: undefined;
  HistoryRun: { runId: string; request: string };
  AllResults: AllResultsParams;
  ResultSources: ResultSourcesParams;
  ResultDetail: ResultDetailParams;
};

/** Settings → Credentials → Add credential: find a site, then sign in. */
export type AddCredentialStackParamList = {
  FindSite: undefined;
  Login: LoginParams;
};

export type FindSiteScreenProps = NativeStackScreenProps<
  AddCredentialStackParamList,
  'FindSite'
>;

export type SettingsStackParamList = {
  Settings: undefined;
  SettingsSection: { section: SettingsSectionId };
  ApiKeys: undefined;
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
export type PrepareScreenProps = NativeStackScreenProps<
  AskStackParamList,
  'Prepare'
>;
export type PermissionScreenProps = NativeStackScreenProps<
  AskStackParamList,
  'Permission'
>;
/**
 * The Login screen runs in the Ask stack and in Add credential's stack, so
 * its props are only what it uses.
 */
export type LoginScreenProps = {
  route: { params: LoginParams };
  navigation: { goBack: () => void };
};
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

export type SettingsSectionScreenProps = NativeStackScreenProps<
  SettingsStackParamList,
  'SettingsSection'
>;

export type ApiKeysScreenProps = NativeStackScreenProps<
  SettingsStackParamList,
  'ApiKeys'
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
