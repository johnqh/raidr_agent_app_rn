import { getAnalytics } from '@/di/initializeServices';

export function trackScreenView(screenName: string, screenClass?: string): void {
  getAnalytics()?.trackScreenView(screenName, screenClass);
}

export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  getAnalytics()?.trackEvent(eventName, params);
}

export function trackButtonClick(buttonName: string, params?: Record<string, unknown>): void {
  getAnalytics()?.trackButtonClick(buttonName, params);
}

export function trackError(errorMessage: string, errorCode?: string): void {
  getAnalytics()?.trackError(errorMessage, errorCode);
}
