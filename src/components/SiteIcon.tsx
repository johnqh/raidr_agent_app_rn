/**
 * A site's icon (the largest raster icon raidr_agent_api found, `iconUrl`),
 * or the first letter of its domain when there is none or it fails to load.
 */

import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { Text } from '@sudobility/components-rn';

export interface SiteIconProps {
  iconUrl?: string;
  domain: string;
  /** Edge in px. */
  size?: number;
}

export default function SiteIcon({
  iconUrl,
  domain,
  size = 40,
}: SiteIconProps) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size, borderRadius: size / 5 };
  if (iconUrl && !failed) {
    return (
      <Image
        source={{ uri: iconUrl }}
        style={box}
        resizeMode='contain'
        onError={() => setFailed(true)}
        accessibilityIgnoresInvertColors
        testID='site-icon'
      />
    );
  }
  return (
    <View
      style={box}
      className='bg-foreground/10 items-center justify-center'
      testID='site-icon-fallback'
    >
      <Text size={size < 30 ? 'xs' : 'base'} weight='semibold' color='muted'>
        {domain.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}
