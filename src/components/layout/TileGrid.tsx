/**
 * TileGrid — list content that adapts to the room it has.
 *
 * Narrower than iOS's regular width ({@link REGULAR_WIDTH}, 700pt): one item
 * per row, a list. Wider: tiles in 2–4 equal columns (as many as fit at
 * `minTileWidth`), each row as tall as its tallest tile. Measured on the
 * grid's own width, so the desktop sidebar or a split view counts.
 */

import React, { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

/**
 * iOS's line between compact and regular width — building_blocks_rn's
 * `REGULAR_WIDTH` (700); repeated here so this layout primitive does not pull
 * in that whole package.
 */
export const REGULAR_WIDTH = 700;

export interface TileGridProps {
  children: React.ReactNode;
  /** Narrowest a tile may get before a column is dropped. */
  minTileWidth?: number;
  /** Space between tiles, in pt. */
  gap?: number;
  maxColumns?: number;
  testID?: string;
}

/** How many columns `width` holds: 1 below regular width, else 2..max. */
export function columnsFor(
  width: number,
  minTileWidth = 300,
  gap = 12,
  maxColumns = 4
): number {
  if (width < REGULAR_WIDTH) {
    return 1;
  }
  const fit = Math.floor((width + gap) / (minTileWidth + gap));
  return Math.max(2, Math.min(maxColumns, fit));
}

export default function TileGrid({
  children,
  minTileWidth = 300,
  gap = 12,
  maxColumns = 4,
  testID,
}: TileGridProps) {
  const [width, setWidth] = useState(0);
  const items = React.Children.toArray(children);
  const columns =
    width > 0 ? columnsFor(width, minTileWidth, gap, maxColumns) : 1;

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    if (next !== width) {
      setWidth(next);
    }
  };

  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < items.length; i += columns) {
    rows.push(items.slice(i, i + columns));
  }

  return (
    <View onLayout={onLayout} testID={testID}>
      {rows.map((row, r) => (
        <View
          key={r}
          className='flex-row items-stretch'
          style={[{ gap }, r > 0 ? { marginTop: gap } : null]}
        >
          {row.map((item, c) => (
            <View key={c} style={styles.tile}>
              {item}
            </View>
          ))}
          {/* Keep the last row's tiles the same width as the rows above. */}
          {Array.from({ length: columns - row.length }, (_, k) => (
            <View key={`pad-${k}`} style={styles.tile} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // minWidth 0 lets a tile shrink below its text's natural width.
  tile: { flex: 1, minWidth: 0 },
});
