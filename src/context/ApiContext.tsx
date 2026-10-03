/**
 * API Context for React Native
 *
 * Provides a fetch-based {@link NetworkClient}, the API base URL, and the
 * current authentication token so that any component in the tree can make
 * authenticated API calls without prop-drilling.
 *
 * The network client is created once and remains stable across re-renders.
 * The token and userId are refreshed whenever the auth state changes.
 */

import React, { createContext, useContext, useMemo, useRef } from 'react';
import type {
  NetworkClient,
  NetworkResponse,
  NetworkRequestOptions,
  Optional,
} from '@sudobility/types';
import { env } from '@/config/env';
import { useAuth } from './AuthContext';

/** Values exposed by the API context to descendant components. */
export interface ApiContextValue {
  /** The fetch-based network client for making HTTP requests. */
  networkClient: NetworkClient;
  /** The base URL for the raidr agent API (e.g. `http://localhost:3001`). */
  baseUrl: string;
  /** The current Firebase ID token, or `null` if not authenticated. */
  token: string | null;
  /** The current user's UID, or `null` if not authenticated. */
  userId: string | null;
  /** Whether the auth state has been determined (Firebase listener fired). */
  isReady: boolean;
  /** Whether an auth operation is in progress. */
  isLoading: boolean;
}

/**
 * Execute an HTTP request using the Fetch API and return a typed {@link NetworkResponse}.
 *
 * Automatically sets `Content-Type: application/json` and parses the response
 * body as JSON. When the response is not OK, the function attempts to extract
 * a human-readable error message from the JSON body (`error` or `message` field).
 * If the body cannot be parsed as JSON, the raw response text is included as
 * the error message instead of a generic `HTTP {status}` string.
 *
 * @typeParam T - The expected shape of the successful response data.
 * @param url - The fully-qualified URL to request.
 * @param options - Optional request configuration (method, headers, body, signal).
 * @returns A {@link NetworkResponse} with `success`, `data`, and/or `error` fields.
 */
async function makeRequest<T>(
  url: string,
  options?: Optional<NetworkRequestOptions>
): Promise<NetworkResponse<T>> {
  const method = options?.method ?? 'GET';
  const body = options?.body as BodyInit | undefined;

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body,
    signal: options?.signal,
  });

  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let data: T | undefined;
  let error: string | undefined;

  try {
    const json = await response.json();
    if (response.ok) {
      data = json as T;
    } else {
      error = json.error || json.message || `HTTP ${response.status}`;
    }
  } catch (_e) {
    if (!response.ok) {
      // When JSON parsing fails, try to read the response as plain text
      // so the caller gets a meaningful error instead of a generic status code.
      try {
        const text = await response.text();
        error = text || `HTTP ${response.status}: ${response.statusText}`;
      } catch {
        error = `HTTP ${response.status}: ${response.statusText}`;
      }
    }
  }

  return {
    success: response.ok,
    data,
    error,
    timestamp: new Date().toISOString(),
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    headers,
  };
}

/**
 * Wrap {@link makeRequest} with automatic 401 token-refresh retry logic.
 *
 * If the initial request returns a 401, the provided `refreshTokenFn` is
 * called to obtain a fresh Firebase ID token. When a fresh token is
 * available the request is retried with the new `Authorization` header.
 * If the refresh fails the original 401 response is returned as-is.
 */
async function makeRequestWithRetry<T>(
  url: string,
  options: Optional<NetworkRequestOptions> | undefined,
  refreshTokenFn: () => Promise<string | null>
): Promise<NetworkResponse<T>> {
  const result = await makeRequest<T>(url, options);
  if (result.status === 401) {
    console.log('[Network] 401 received, refreshing token and retrying...');
    const freshToken = await refreshTokenFn();
    if (freshToken) {
      const retryOptions = {
        ...options,
        headers: {
          ...options?.headers,
          Authorization: `Bearer ${freshToken}`,
        },
      };
      return makeRequest<T>(url, retryOptions);
    }
    console.warn('[Network] Token refresh failed, returning 401 response');
  }
  return result;
}

/**
 * Create a fetch-based {@link NetworkClient} that conforms to the
 * `@sudobility/types` interface.
 *
 * Each HTTP method delegates to {@link makeRequest}, automatically
 * serializing request bodies as JSON for `POST` and `PUT` requests.
 *
 * @returns A stateless {@link NetworkClient} instance.
 */
const createNetworkClient = (
  refreshTokenRef: React.RefObject<() => Promise<string | null>>
): NetworkClient => ({
  request: <T,>(
    url: string,
    options?: Optional<NetworkRequestOptions>
  ): Promise<NetworkResponse<T>> =>
    makeRequestWithRetry(url, options, refreshTokenRef.current),

  get: <T,>(
    url: string,
    options?: Optional<Omit<NetworkRequestOptions, 'method' | 'body'>>
  ): Promise<NetworkResponse<T>> =>
    makeRequestWithRetry(
      url,
      { ...options, method: 'GET' },
      refreshTokenRef.current
    ),

  post: <T,>(
    url: string,
    body?: Optional<unknown>,
    options?: Optional<Omit<NetworkRequestOptions, 'method'>>
  ): Promise<NetworkResponse<T>> =>
    makeRequestWithRetry(
      url,
      {
        ...options,
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      },
      refreshTokenRef.current
    ),

  put: <T,>(
    url: string,
    body?: Optional<unknown>,
    options?: Optional<Omit<NetworkRequestOptions, 'method'>>
  ): Promise<NetworkResponse<T>> =>
    makeRequestWithRetry(
      url,
      {
        ...options,
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined,
      },
      refreshTokenRef.current
    ),

  delete: <T,>(
    url: string,
    options?: Optional<Omit<NetworkRequestOptions, 'method' | 'body'>>
  ): Promise<NetworkResponse<T>> =>
    makeRequestWithRetry(
      url,
      { ...options, method: 'DELETE' },
      refreshTokenRef.current
    ),
});

const ApiContext = createContext<ApiContextValue | null>(null);

/**
 * Provider that creates a {@link NetworkClient} and exposes it alongside
 * auth-related values (token, userId, readiness) to the component tree.
 *
 * Must be rendered inside an {@link AuthProvider}.
 */
export function ApiProvider({ children }: { children: React.ReactNode }) {
  const { token, user, isReady, isLoading, refreshToken } = useAuth();
  const refreshTokenRef = useRef(refreshToken);
  refreshTokenRef.current = refreshToken;
  const networkClient = useMemo(() => createNetworkClient(refreshTokenRef), []);

  const value = useMemo<ApiContextValue>(
    () => ({
      networkClient,
      baseUrl: env.API_URL,
      token,
      userId: user?.uid ?? null,
      isReady,
      isLoading,
    }),
    [networkClient, token, user?.uid, isReady, isLoading]
  );

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

/**
 * Consume the {@link ApiContextValue} from the nearest {@link ApiProvider}.
 *
 * @throws {Error} If called outside of an {@link ApiProvider}.
 * @returns The current {@link ApiContextValue}.
 */
export function useApi(): ApiContextValue {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
}
