/**
 * SplitView — master/detail. At iOS's regular width ({@link REGULAR_WIDTH},
 * measured on the view itself, so the desktop sidebar counts) a fixed-width
 * list on the left, a hairline, and the chosen item's detail on the right
 * under its own heading, held to the readable width. Narrower, the list
 * alone: choosing an entry is the screen's to handle (push a detail screen).
 *
 * Use inside `Screen layout='fill'`.
 */

import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Text } from '@sudobility/components-rn';
import { useTabBarHeight } from '@/hooks/useTabBarHeight';
import { READABLE_WIDTH } from './Screen';
import { REGULAR_WIDTH } from './TileGrid';

/** The list's width beside a detail, in pt. */
export const MASTER_WIDTH = 300;

/** Whether `width` has room for list and detail side by side. */
export function isSplitWidth(width: number): boolean {
  return width >= REGULAR_WIDTH;
}

export interface SplitViewProps {
  /** The list; `split` says whether a detail is beside it. */
  renderMaster: (split: boolean) => React.ReactNode;
  /** The chosen entry's title and content, shown only when split. */
  detailTitle: string;
  detail: React.ReactNode;
}

export default function SplitView({
  renderMaster,
  detailTitle,
  detail,
}: SplitViewProps) {
  const [width, setWidth] = useState(0);
  const bottom = useTabBarHeight() + 24;
  const split = isSplitWidth(width);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    if (next !== width) {
      setWidth(next);
    }
  };

  return (
    <View className='flex-1 flex-row' onLayout={onLayout} testID='split-view'>
      <ScrollView
        style={split ? styles.master : styles.full}
        contentContainerStyle={[
          split ? styles.masterContent : styles.listContent,
          { paddingBottom: bottom },
        ]}
      >
        {split ? (
          renderMaster(true)
        ) : (
          <View style={styles.column}>{renderMaster(false)}</View>
        )}
      </ScrollView>
      {split ? (
        <>
          <View className='bg-border' style={styles.divider} />
          <ScrollView
            style={styles.full}
            contentContainerStyle={[styles.detail, { paddingBottom: bottom }]}
            keyboardShouldPersistTaps='handled'
            testID='split-detail'
          >
            <View style={styles.column}>
              <Text size='2xl' weight='bold' className='mb-4 px-1'>
                {detailTitle}
              </Text>
              {detail}
            </View>
          </ScrollView>
        </>
      ) : null}
    </View>
  );
}

export interface SplitMenuEntry {
  id: string;
  label: string;
  /** Muted text on the right (the entry's current value). */
  value?: string;
}

/**
 * The master's entries on one card. When split the chosen entry is marked;
 * otherwise each row is a link to its own screen (chevron).
 */
export function SplitMenuList({
  entries,
  selected,
  onSelect,
}: {
  entries: readonly SplitMenuEntry[];
  /** The chosen entry; null when nothing is shown beside the list. */
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <View className='rounded-lg overflow-hidden bg-card'>
      {entries.map((entry, i) => {
        const isSelected = entry.id === selected;
        return (
          <React.Fragment key={entry.id}>
            {i > 0 ? <View className='h-px ml-4 bg-border' /> : null}
            <Pressable
              onPress={() => onSelect(entry.id)}
              accessibilityRole='button'
              accessibilityLabel={entry.label}
              accessibilityState={{ selected: isSelected }}
              testID={`split-entry-${entry.id}`}
              className={
                isSelected
                  ? 'flex-row items-center py-3 px-4 min-h-[48px] bg-primary/10'
                  : 'flex-row items-center py-3 px-4 min-h-[48px]'
              }
            >
              <Text
                size='base'
                weight={isSelected ? 'semibold' : 'normal'}
                className='flex-1'
              >
                {entry.label}
              </Text>
              {entry.value ? (
                <Text size='sm' color='muted' className='ml-2'>
                  {entry.value}
                </Text>
              ) : null}
              <Text size='xl' color='muted' className='ml-2'>
                {'›'}
              </Text>
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1 },
  master: { width: MASTER_WIDTH, flexGrow: 0 },
  masterContent: { padding: 16 },
  listContent: { paddingHorizontal: 16, paddingTop: 24, alignItems: 'center' },
  column: { width: '100%', maxWidth: READABLE_WIDTH },
  detail: { paddingHorizontal: 24, paddingTop: 24, alignItems: 'center' },
  divider: { width: StyleSheet.hairlineWidth },
});
