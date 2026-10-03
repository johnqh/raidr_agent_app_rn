/**
 * Service initialization for raidr_agent_app_rn (Desktop: macOS / Windows)
 *
 * Firebase Auth is the JS SDK on every platform, initialised lazily in
 * AuthContext. No native Firebase analytics or DI services are available on
 * desktop.
 */

import type { FirebaseAnalyticsService } from '@sudobility/di_rn';

/**
 * Initialize all services (desktop no-op).
 *
 * Firebase Auth is initialized lazily in AuthContext using the Firebase JS
 * SDK, as on every platform. Native analytics and DI services are not
 * available on desktop.
 */
export async function initializeAllServices(): Promise<null> {
  return null;
}

/**
 * Get the analytics service (not available on desktop)
 */
export function getAnalytics(): FirebaseAnalyticsService | null {
  return null;
}
