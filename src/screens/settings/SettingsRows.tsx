/**
 * The pieces a settings section is built from: a titled group of rows on a
 * card, and a row with a label on the left and a value or control on the
 * right.
 */

import React from 'react';
import { View } from 'react-native';
import { Text } from '@sudobility/components-rn';

export function SettingsGroup({
  title,
  footer,
  children,
}: {
  title?: string;
  /** Muted text under the card. */
  footer?: string;
  children: React.ReactNode;
}) {
  const rows = React.Children.toArray(children);
  return (
    <View className='mb-7'>
      {title ? (
        <Text
          size='sm'
          weight='semibold'
          color='muted'
          transform='uppercase'
          className='mb-2 px-1 tracking-wide'
        >
          {title}
        </Text>
      ) : null}
      <View className='rounded-lg overflow-hidden bg-card'>
        {rows.map((row, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <View className='h-px ml-4 bg-border' /> : null}
            {row}
          </React.Fragment>
        ))}
      </View>
      {footer ? (
        <Text size='sm' color='muted' className='mt-2 px-1'>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

export function SettingsRow({
  label,
  description,
  leading,
  children,
}: {
  label: string;
  description?: string;
  /** Drawn before the label (an icon). */
  leading?: React.ReactNode;
  /** The value or control on the right. */
  children?: React.ReactNode;
}) {
  return (
    <View className='flex-row items-center py-3 px-4 min-h-[48px]'>
      {leading ? <View className='mr-3'>{leading}</View> : null}
      <View className='flex-1 mr-3'>
        <Text size='base'>{label}</Text>
        {description ? (
          <Text size='sm' color='muted' className='mt-0.5'>
            {description}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}
