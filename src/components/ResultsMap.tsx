import React from 'react';
import { Text } from '@sudobility/components-rn';
import type { ResultItem } from '@sudobility/raidr_agent_types';
import type { Coordinates } from '@/stores/runFlowStore';

interface Props {
  items: ResultItem[];
  userLocation: Coordinates | null;
  onSelect: (item: ResultItem) => void;
}

export default function ResultsMap(_props: Props) {
  return <Text size='sm'>Map view is unavailable on this device.</Text>;
}
