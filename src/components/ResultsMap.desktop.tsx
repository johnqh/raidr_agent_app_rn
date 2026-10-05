import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import type { ResultItem } from '@sudobility/raidr_agent_types';
import type { Coordinates } from '@/stores/runFlowStore';

type LocatedResult = ResultItem & { location?: Coordinates | null };

interface Props {
  items: ResultItem[];
  userLocation: Coordinates | null;
  onSelect: (item: ResultItem) => void;
}

const htmlForResults = (items: LocatedResult[]) => {
  const points = items
    .filter(
      item =>
        item.location &&
        Number.isFinite(item.location.latitude) &&
        Number.isFinite(item.location.longitude)
    )
    .map(item => ({
      id: item.id,
      title: item.title,
      subtitle: item.summary || item.siteTitle || '',
      image: item.imageUrl || '',
      latitude: item.location!.latitude,
      longitude: item.location!.longitude,
    }));
  const serialized = JSON.stringify(points).replace(/</g, '\\u003c');

  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>
    html,body,#map{height:100%;width:100%;margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif} .leaflet-popup-content{min-width:190px;margin:10px 12px}.card{display:flex;gap:10px;align-items:flex-start}.card img{width:64px;height:64px;border-radius:8px;object-fit:cover}.title{font-weight:650;font-size:14px;margin:1px 0 4px}.subtitle{font-size:12px;color:#596273;line-height:1.35}.leaflet-popup-content-wrapper{border-radius:12px}
  </style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
    const points=${serialized};
    const map=L.map('map',{scrollWheelZoom:true});
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'}).addTo(map);
    const bounds=[];
    points.forEach(p=>{const marker=L.marker([p.latitude,p.longitude]).addTo(map);bounds.push([p.latitude,p.longitude]);const card=document.createElement('div');card.className='card';if(p.image){const img=document.createElement('img');img.src=p.image;img.alt='';card.appendChild(img)}const copy=document.createElement('div');const title=document.createElement('div');title.className='title';title.textContent=p.title;const subtitle=document.createElement('div');subtitle.className='subtitle';subtitle.textContent=p.subtitle;copy.append(title,subtitle);card.appendChild(copy);marker.bindPopup(card);marker.on('click',()=>window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(p.id))});
    if(bounds.length===1)map.setView(bounds[0],14);else if(bounds.length)map.fitBounds(bounds,{padding:[32,32],maxZoom:14});else map.setView([20,0],2);
  </script></body></html>`;
};

export default function ResultsMap({ items, onSelect }: Props) {
  const html = useMemo(
    () => htmlForResults(items as LocatedResult[]),
    [items]
  );
  const byId = useMemo(
    () => new Map(items.map(item => [item.id, item])),
    [items]
  );

  return (
    <WebView
      style={styles.map}
      originWhitelist={['*']}
      source={{ html, baseUrl: 'https://www.openstreetmap.org/' }}
      onMessage={event => {
        const item = byId.get(event.nativeEvent.data);
        if (item) onSelect(item);
      }}
      accessibilityLabel='Map of results'
    />
  );
}

const styles = StyleSheet.create({ map: { height: 420, width: '100%' } });
