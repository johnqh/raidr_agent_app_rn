import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';
import { Text } from '@sudobility/components-rn';
import type { ResultItem } from '@sudobility/raidr_agent_types';
import type { Coordinates } from '@/stores/runFlowStore';

export type LocatedResult = ResultItem & { location?: Coordinates | null };

interface Props {
  items: LocatedResult[];
  userLocation: Coordinates | null;
  onSelect: (item: ResultItem) => void;
}

export default function ResultsMap({ items, userLocation, onSelect }: Props) {
  const located = items.filter(
    (item): item is LocatedResult & { location: Coordinates } =>
      item.location != null &&
      Number.isFinite(item.location.latitude) &&
      Number.isFinite(item.location.longitude)
  );
  const center = userLocation ?? located[0]?.location;
  if (!center) return null;

  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: center.latitude,
        longitude: center.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }}
      showsUserLocation={!!userLocation}
      accessibilityLabel='Map of results'
    >
      {located.map(item => (
        <Marker
          key={item.id}
          coordinate={item.location}
          title={item.title}
          description={item.summary}
        >
          <Callout onPress={() => onSelect(item)}>
            <Pressable style={styles.callout} onPress={() => onSelect(item)}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.image} />
              ) : null}
              <View style={styles.copy}>
                <Text size='sm' weight='semibold' numberOfLines={2}>
                  {item.title}
                </Text>
                <Text size='xs' color='muted' numberOfLines={2}>
                  {item.summary || item.siteTitle}
                </Text>
              </View>
            </Pressable>
          </Callout>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { height: 420, width: '100%' },
  callout: { width: 240, flexDirection: 'row', padding: 8 },
  image: { width: 56, height: 56, borderRadius: 6, marginRight: 8 },
  copy: { flex: 1 },
});
