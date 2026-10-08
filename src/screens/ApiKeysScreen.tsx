/**
 * API Keys screen — choose Cloud or Local agent mode and manage the user's own
 * AI provider keys.
 *
 * - Cloud / Local segmented control. Local is disabled until at least one key
 *   is saved; removing the last key switches back to Cloud (`useLlmKeys`).
 * - The four providers in `providerOrder`. The first one with a key is used,
 *   the others are fallbacks. Rows reorder by dragging the handle, or through
 *   "Move up" / "Move down" (buttons in the expanded row, and accessibility
 *   actions on the row for screen readers).
 * - Tapping a row opens its editor: a secure input, Save, Remove. A saved key
 *   is only ever shown masked (at most its last four characters).
 *
 * Dragging uses core `PanResponder` + `Animated` only (no native modules), so
 * it works the same on iOS, Android, macOS and Windows: pressing the handle
 * claims the responder immediately (touch on mobile, mouse on desktop), the
 * list stops scrolling for the duration, and the row follows the pointer while
 * the rows it passes slide out of the way. The reorder math is in
 * `src/lib/reorder.ts`.
 */

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Pressable,
  Animated,
  PanResponder,
  Alert,
  Linking,
  StyleSheet,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type PanResponderInstance,
} from 'react-native';
import Screen from '@/components/layout/Screen';
import {
  Text,
  Button,
  Badge,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@sudobility/components-rn';
import { Bars3Icon } from 'react-native-heroicons/outline';
import { useTranslation } from 'react-i18next';
import { useAppColors } from '@/hooks/useAppColors';
import { useLlmKeys } from '@/hooks/useLlmKeys';
import { useSettingsStore } from '@/stores/settingsStore';
import {
  LLM_PROVIDER_INFO,
  type LocalLlmProvider,
} from '@/config/llmProviders';
import { canUseLocal, type AgentMode } from '@/lib/agentMode';
import { clampDrag, indexFromDrag, moveItem, shiftForRow } from '@/lib/reorder';
import { trackScreenView, trackButtonClick } from '@/analytics';
import type { ApiKeysScreenProps } from '@/navigation/types';

/** Section heading, styled like SettingsScreen's. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text
      size='sm'
      weight='semibold'
      color='muted'
      transform='uppercase'
      className='mb-2 px-1 tracking-wide'
    >
      {children}
    </Text>
  );
}

interface ProviderRowProps {
  provider: LocalLlmProvider;
  index: number;
  count: number;
  mask: string | null;
  expanded: boolean;
  dragging: boolean;
  translateY: Animated.Value;
  panHandlers: PanResponderInstance['panHandlers'];
  handleColor: string;
  onLayout: (provider: LocalLlmProvider, height: number) => void;
  onToggle: (provider: LocalLlmProvider) => void;
  onMove: (provider: LocalLlmProvider, direction: -1 | 1) => void;
  onSave: (provider: LocalLlmProvider, key: string) => Promise<void>;
  onRemove: (provider: LocalLlmProvider) => void;
}

function ProviderRow({
  provider,
  index,
  count,
  mask,
  expanded,
  dragging,
  translateY,
  panHandlers,
  handleColor,
  onLayout,
  onToggle,
  onMove,
  onSave,
  onRemove,
}: ProviderRowProps) {
  const { t } = useTranslation();
  const info = LLM_PROVIDER_INFO[provider];
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const hasKey = mask !== null;
  const status = hasKey ? t('apiKeys.keySaved') : t('apiKeys.noKey');

  // Never carry an unsaved key across a collapse.
  useEffect(() => {
    if (!expanded) {
      setDraft('');
    }
  }, [expanded]);

  const actions = useMemo(
    () => [
      ...(index > 0 ? [{ name: 'moveUp', label: t('apiKeys.moveUp') }] : []),
      ...(index < count - 1
        ? [{ name: 'moveDown', label: t('apiKeys.moveDown') }]
        : []),
    ],
    [index, count, t]
  );

  const handleAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'moveUp') {
        onMove(provider, -1);
      } else if (event.nativeEvent.actionName === 'moveDown') {
        onMove(provider, 1);
      }
    },
    [onMove, provider]
  );

  const handleSave = useCallback(async () => {
    if (!draft.trim()) {
      return;
    }
    setSaving(true);
    try {
      await onSave(provider, draft);
      setDraft('');
    } finally {
      setSaving(false);
    }
  }, [draft, onSave, provider]);

  return (
    <Animated.View
      onLayout={(e: LayoutChangeEvent) =>
        onLayout(provider, e.nativeEvent.layout.height)
      }
      style={[
        { transform: [{ translateY }] },
        dragging ? styles.dragging : null,
      ]}
    >
      <View
        className={`bg-card ${
          index > 0 ? 'border-t border-foreground/10' : ''
        }`}
      >
        <View className='flex-row items-center'>
          <View
            {...panHandlers}
            className='py-3 pl-4 pr-2 justify-center'
            accessibilityLabel={t('apiKeys.dragHandle', {
              provider: info.name,
            })}
            accessibilityElementsHidden
            importantForAccessibility='no-hide-descendants'
            testID={`api-keys-handle-${provider}`}
          >
            <Bars3Icon color={handleColor} size={20} />
          </View>
          <Pressable
            className='flex-1 flex-row items-center justify-between py-3 pr-4'
            onPress={() => onToggle(provider)}
            accessibilityRole='button'
            accessibilityLabel={`${info.name}, ${status}`}
            accessibilityHint={t('apiKeys.rowHint')}
            accessibilityState={{ expanded }}
            accessibilityActions={actions}
            onAccessibilityAction={handleAction}
            testID={`api-keys-row-${provider}`}
          >
            <View className='flex-1 mr-3'>
              <Text size='base' weight='semibold'>
                {info.name}
              </Text>
              {hasKey ? (
                <Text size='sm' color='muted' className='mt-0.5'>
                  {mask}
                </Text>
              ) : null}
            </View>
            <Badge variant={hasKey ? 'success' : 'default'} size='sm'>
              {status}
            </Badge>
          </Pressable>
        </View>

        {expanded ? (
          <View className='px-4 pb-4'>
            <Input
              value={draft}
              onChangeText={setDraft}
              placeholder={info.keyPlaceholder}
              secureTextEntry
              autoCapitalize='none'
              autoCorrect={false}
              autoComplete='off'
              textContentType='none'
              importantForAutofill='no'
              spellCheck={false}
              onSubmitEditing={handleSave}
              accessibilityLabel={t('apiKeys.keyLabel', {
                provider: info.name,
              })}
              testID={`api-keys-input-${provider}`}
            />
            <View className='flex-row flex-wrap items-center mt-3 gap-2'>
              <Button
                variant='primary'
                size='sm'
                disabled={!draft.trim() || saving}
                onPress={handleSave}
                accessibilityLabel={t('apiKeys.save')}
                testID={`api-keys-save-${provider}`}
              >
                {t('apiKeys.save')}
              </Button>
              {hasKey ? (
                <Button
                  variant='destructive-outline'
                  size='sm'
                  onPress={() => onRemove(provider)}
                  accessibilityLabel={t('apiKeys.remove')}
                  testID={`api-keys-remove-${provider}`}
                >
                  {t('apiKeys.remove')}
                </Button>
              ) : null}
              <Button
                variant='ghost'
                size='sm'
                disabled={index === 0}
                onPress={() => onMove(provider, -1)}
                accessibilityLabel={t('apiKeys.moveUp')}
              >
                {t('apiKeys.moveUp')}
              </Button>
              <Button
                variant='ghost'
                size='sm'
                disabled={index === count - 1}
                onPress={() => onMove(provider, 1)}
                accessibilityLabel={t('apiKeys.moveDown')}
              >
                {t('apiKeys.moveDown')}
              </Button>
            </View>
            <Pressable
              className='mt-3'
              onPress={() => {
                trackButtonClick('api_keys_get_key', { provider });
                Linking.openURL(info.keyUrl).catch(() => {});
              }}
              accessibilityRole='link'
              accessibilityLabel={t('apiKeys.getKey', { provider: info.name })}
            >
              <Text size='sm' color='primary'>
                {t('apiKeys.getKey', { provider: info.name })}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

/** In-progress drag, kept in a ref so pan callbacks never see stale state. */
interface DragState {
  provider: LocalLlmProvider;
  from: number;
  to: number;
  heights: number[];
}

export default function ApiKeysScreen(_props: ApiKeysScreenProps) {
  const { t } = useTranslation();
  const colors = useAppColors();
  const agentMode = useSettingsStore(s => s.agentMode);
  const setAgentMode = useSettingsStore(s => s.setAgentMode);
  const providerOrder = useSettingsStore(s => s.providerOrder);
  const setProviderOrder = useSettingsStore(s => s.setProviderOrder);
  const { configured, masks, loading, save, remove } = useLlmKeys();
  // While the Keychain is still being read, keep a saved Local choice usable.
  const localAllowed =
    canUseLocal(configured) || (loading && agentMode === 'local');

  const [expanded, setExpanded] = useState<LocalLlmProvider | null>(null);
  const [dragging, setDragging] = useState<LocalLlmProvider | null>(null);

  useEffect(() => {
    trackScreenView('ApiKeys');
  }, []);

  // ---- mode ---------------------------------------------------------------

  const handleModeChange = useCallback(
    (value: string) => {
      const mode = value as AgentMode;
      if (mode === agentMode || (mode === 'local' && !localAllowed)) {
        return;
      }
      trackButtonClick('api_keys_mode', { mode });
      setAgentMode(mode);
    },
    [agentMode, localAllowed, setAgentMode]
  );

  // ---- keys ---------------------------------------------------------------

  const handleSave = useCallback(
    async (provider: LocalLlmProvider, key: string) => {
      trackButtonClick('api_keys_save', { provider });
      await save(provider, key);
    },
    [save]
  );

  const handleRemove = useCallback(
    (provider: LocalLlmProvider) => {
      const name = LLM_PROVIDER_INFO[provider].name;
      Alert.alert(
        t('apiKeys.removeTitle'),
        t('apiKeys.removeMessage', { provider: name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('apiKeys.remove'),
            style: 'destructive',
            onPress: () => {
              trackButtonClick('api_keys_remove', { provider });
              remove(provider);
            },
          },
        ]
      );
    },
    [remove, t]
  );

  const handleToggle = useCallback((provider: LocalLlmProvider) => {
    setExpanded(current => (current === provider ? null : provider));
  }, []);

  // ---- reorder ------------------------------------------------------------

  const orderRef = useRef(providerOrder);
  orderRef.current = providerOrder;
  const heightsRef = useRef<Partial<Record<LocalLlmProvider, number>>>({});
  const dragRef = useRef<DragState | null>(null);
  const resetAfterCommit = useRef(false);

  const anims = useRef<Record<LocalLlmProvider, Animated.Value>>({
    openai: new Animated.Value(0),
    anthropic: new Animated.Value(0),
    deepseek: new Animated.Value(0),
    openrouter: new Animated.Value(0),
  }).current;

  // After a drag is committed, the new order renders with every row back in
  // its natural place; clear the offsets in the same frame to avoid a jump.
  useLayoutEffect(() => {
    if (resetAfterCommit.current) {
      resetAfterCommit.current = false;
      for (const provider of providerOrder) {
        anims[provider].setValue(0);
      }
    }
  }, [providerOrder, anims]);

  const handleLayout = useCallback(
    (provider: LocalLlmProvider, height: number) => {
      heightsRef.current[provider] = height;
    },
    []
  );

  const moveBy = useCallback(
    (provider: LocalLlmProvider, direction: -1 | 1) => {
      const order = orderRef.current;
      const from = order.indexOf(provider);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= order.length) {
        return;
      }
      trackButtonClick('api_keys_reorder', { method: 'button' });
      setProviderOrder(moveItem(order, from, to));
    },
    [setProviderOrder]
  );

  const finishDrag = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragging(null);
    if (!drag) {
      return;
    }
    if (drag.to !== drag.from) {
      trackButtonClick('api_keys_reorder', { method: 'drag' });
      resetAfterCommit.current = true;
      setProviderOrder(moveItem(orderRef.current, drag.from, drag.to));
    } else {
      for (const provider of orderRef.current) {
        Animated.timing(anims[provider], {
          toValue: 0,
          duration: 120,
          useNativeDriver: false,
        }).start();
      }
    }
  }, [anims, setProviderOrder]);

  const panResponders = useMemo(() => {
    const make = (provider: LocalLlmProvider) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          const order = orderRef.current;
          const from = order.indexOf(provider);
          dragRef.current = {
            provider,
            from,
            to: from,
            heights: order.map(p => heightsRef.current[p] ?? 0),
          };
          setDragging(provider);
        },
        onPanResponderMove: (_event, gesture) => {
          const drag = dragRef.current;
          if (!drag) {
            return;
          }
          const dy = clampDrag(drag.heights, drag.from, gesture.dy);
          anims[provider].setValue(dy);
          const to = indexFromDrag(drag.heights, drag.from, dy);
          if (to === drag.to) {
            return;
          }
          drag.to = to;
          orderRef.current.forEach((p, i) => {
            if (p === provider) {
              return;
            }
            Animated.timing(anims[p], {
              toValue: shiftForRow(i, drag.from, to, drag.heights[drag.from]),
              duration: 120,
              useNativeDriver: false,
            }).start();
          });
        },
        onPanResponderRelease: finishDrag,
        onPanResponderTerminate: finishDrag,
      });
    return {
      openai: make('openai'),
      anthropic: make('anthropic'),
      deepseek: make('deepseek'),
      openrouter: make('openrouter'),
    } as Record<LocalLlmProvider, PanResponderInstance>;
  }, [anims, finishDrag]);

  // ---- render -------------------------------------------------------------

  return (
    <Screen title={t('apiKeys.title')} scrollEnabled={dragging === null}>
      {/* Mode */}
      <View className='mb-7'>
        <SectionTitle>{t('apiKeys.modeSection')}</SectionTitle>
        <Tabs value={agentMode} onValueChange={handleModeChange}>
          <TabsList>
            <TabsTrigger value='cloud'>{t('apiKeys.mode.cloud')}</TabsTrigger>
            <TabsTrigger value='local' disabled={!localAllowed}>
              {t('apiKeys.mode.local')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <View className='mt-3 px-1'>
          <Text size='sm' color={agentMode === 'cloud' ? 'default' : 'muted'}>
            <Text size='sm' weight='semibold'>
              {t('apiKeys.mode.cloud')}
              {': '}
            </Text>
            {t('apiKeys.cloudDescription')}
          </Text>
          <Text
            size='sm'
            color={agentMode === 'local' ? 'default' : 'muted'}
            className='mt-1'
          >
            <Text size='sm' weight='semibold'>
              {t('apiKeys.mode.local')}
              {': '}
            </Text>
            {t('apiKeys.localDescription')}
          </Text>
          {!localAllowed && !loading ? (
            <View className='mt-2' testID='api-keys-local-disabled'>
              <Text size='sm' color='warning'>
                {t('apiKeys.localDisabled')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Providers */}
      <View className='mb-7'>
        <SectionTitle>{t('apiKeys.providersSection')}</SectionTitle>
        <View className='rounded-lg overflow-hidden bg-card'>
          {providerOrder.map((provider, index) => (
            <ProviderRow
              key={provider}
              provider={provider}
              index={index}
              count={providerOrder.length}
              mask={masks[provider]}
              expanded={expanded === provider}
              dragging={dragging === provider}
              translateY={anims[provider]}
              panHandlers={panResponders[provider].panHandlers}
              handleColor={colors.textMuted}
              onLayout={handleLayout}
              onToggle={handleToggle}
              onMove={moveBy}
              onSave={handleSave}
              onRemove={handleRemove}
            />
          ))}
        </View>
        <Text size='sm' color='muted' className='mt-2 px-1'>
          {t('apiKeys.orderNote')}
        </Text>
        <Text size='sm' color='muted' className='mt-1 px-1'>
          {t('apiKeys.storageNote')}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dragging: { zIndex: 10, elevation: 6, opacity: 0.95 },
});
