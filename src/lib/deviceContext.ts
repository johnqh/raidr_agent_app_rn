/**
 * The device context sent with a request so the agent can rank sites for the
 * user's country and resolve "tonight" / "next weekend" against their clock:
 * country (ISO 3166-1 alpha-2), locale (BCP 47), IANA time zone and the
 * current time as ISO 8601 with the local offset.
 *
 * `react-native-localize` answers on every platform it has a native module
 * for; anything it cannot answer falls back to `Intl`, and is left out when
 * that fails too. No personal data: no location, no account.
 */

import * as RNLocalize from 'react-native-localize';
import type { IntentRequest } from '@sudobility/raidr_agent_types';

export type DeviceContext = Omit<IntentRequest, 'request'>;

const pad = (n: number, width = 2) => String(Math.abs(n)).padStart(width, '0');

/** ISO 8601 with the local UTC offset, e.g. `2026-10-08T09:50:00-07:00`. */
export function isoWithOffset(date: Date): string {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
      date.getSeconds()
    )}` +
    `${sign}${pad(Math.trunc(offset / 60))}:${pad(offset % 60)}`
  );
}

function attempt<T>(read: () => T): T | undefined {
  try {
    const value = read();
    return value || undefined;
  } catch {
    return undefined;
  }
}

/** Gather the device context; never throws. */
export function getDeviceContext(now: Date = new Date()): DeviceContext {
  const intl = attempt(() => Intl.DateTimeFormat().resolvedOptions());
  const country = attempt(() => RNLocalize.getCountry())?.toUpperCase();
  const locale =
    attempt(() => RNLocalize.getLocales()[0]?.languageTag) ?? intl?.locale;
  const timeZone = attempt(() => RNLocalize.getTimeZone()) ?? intl?.timeZone;
  return {
    ...(country && /^[A-Z]{2}$/.test(country) ? { country } : {}),
    ...(locale ? { locale } : {}),
    ...(timeZone ? { timeZone } : {}),
    now: isoWithOffset(now),
  };
}
