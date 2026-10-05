import { NativeModules } from 'react-native';
import type { Coordinates } from '@/stores/runFlowStore';

interface DeviceLocationModule {
  getCurrentLocation(): Promise<Coordinates>;
}

/** The desktop host implements this module with the operating system location API. */
export async function getDeviceLocation(): Promise<Coordinates | null> {
  const module = NativeModules.DeviceLocationModule as
    | DeviceLocationModule
    | undefined;
  if (!module) return null;
  try {
    return await module.getCurrentLocation();
  } catch {
    return null;
  }
}
