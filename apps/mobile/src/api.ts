import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { randomUUID } from 'expo-crypto';
import Constants from 'expo-constants';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Config, Profile } from './types';

function resolveApiUrl(): string {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return `${window.location.protocol}//${window.location.hostname}:3001`;
    }
    return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
  }
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (
      host &&
      host !== 'localhost' &&
      host !== '127.0.0.1' &&
      !host.includes('exp.direct') &&
      !host.includes('ngrok')
    ) {
      return `http://${host}:3001`;
    }
  }
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001';
}

export const API_URL = resolveApiUrl();
let auth: SupabaseClient;
let inMemoryToken: string | null = null;

export async function setAuthToken(token: string | null) {
  inMemoryToken = token;
  try {
    if (token) {
      await secureStorage.setItem('classassist_auth_token', token);
    } else {
      await secureStorage.removeItem('classassist_auth_token');
    }
  } catch {
    // Ignored in restricted environments
  }
}

export async function getAuthToken(): Promise<string | null> {
  if (inMemoryToken) return inMemoryToken;
  try {
    const stored = await secureStorage.getItem('classassist_auth_token');
    if (stored) {
      inMemoryToken = stored;
      return stored;
    }
  } catch {
    // Ignored
  }
  try {
    return (await auth?.auth.getSession())?.data.session?.access_token || null;
  } catch {
    return null;
  }
}

// Split session JSON into small encrypted entries for native keychain size limits.
const secureStorage = {
  async getItem(key: string) {
    if (Platform.OS === 'web') {
      try {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      } catch {
        return null;
      }
    }
    const manifest = await SecureStore.getItemAsync(key);
    if (!manifest) return null;
    const { generation, count } = JSON.parse(manifest);
    let value = '';
    for (let i = 0; i < count; i++) {
      const chunk = await SecureStore.getItemAsync(`${key}.${generation}.${i}`);
      if (chunk === null) return null;
      value += chunk;
    }
    return value;
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      } catch {}
      return;
    }
    const old = await SecureStore.getItemAsync(key);
    const generation = randomUUID(),
      count = Math.ceil(value.length / 1500);
    for (let i = 0; i < count; i++)
      await SecureStore.setItemAsync(
        `${key}.${generation}.${i}`,
        value.slice(i * 1500, (i + 1) * 1500),
      );
    await SecureStore.setItemAsync(key, JSON.stringify({ generation, count }));
    if (old) {
      const m = JSON.parse(old);
      for (let i = 0; i < m.count; i++)
        await SecureStore.deleteItemAsync(`${key}.${m.generation}.${i}`);
    }
  },
  async removeItem(key: string) {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      } catch {}
      return;
    }
    const old = await SecureStore.getItemAsync(key);
    await SecureStore.deleteItemAsync(key);
    if (old) {
      const m = JSON.parse(old);
      for (let i = 0; i < m.count; i++)
        await SecureStore.deleteItemAsync(`${key}.${m.generation}.${i}`);
    }
  },
};

export async function connect() {
  const config = await request<Config>('/config', undefined, false).catch(() => ({
    supabaseUrl: '',
    supabaseKey: '',
    aiConfigured: true,
    sampleEnabled: true,
    timezone: 'Asia/Manila',
  }));
  if (config.supabaseUrl && config.supabaseKey && !auth) {
    try {
      const url = new URL(config.supabaseUrl);
      if (['localhost', '127.0.0.1'].includes(url.hostname)) url.hostname = new URL(API_URL).hostname;
      auth = createClient(url.toString(), config.supabaseKey, {
        auth: {
          storage: secureStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      });
      AppState.addEventListener('change', (state) =>
        state === 'active' ? auth.auth.startAutoRefresh() : auth.auth.stopAutoRefresh(),
      );
    } catch {
      // Ignored
    }
  }
  const token = await getAuthToken();
  return { config, auth, token };
}

export async function request<T>(
  path: string,
  body?: unknown,
  authenticated = true,
  method?: string,
): Promise<T> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => {
        try {
          controller.abort();
        } catch {
          // Ignored
        }
      }, 45000)
    : null;

  try {
    const token = authenticated ? await getAuthToken() : undefined;
    if (authenticated && !token) throw new Error('Please sign in again.');
    const response = await fetch(`${API_URL}/api${path}`, {
      method: method || (body === undefined ? 'GET' : 'POST'),
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      ...(controller ? { signal: controller.signal } : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || 'Unable to complete this request.');
    return result;
  } catch (e) {
    const msg = (e as Error)?.message || String(e);
    const name = (e as Error)?.name || '';
    if (
      name === 'AbortError' ||
      msg.includes('Fetch request has been canceled') ||
      msg.includes('FetchRequestCanceledException') ||
      msg.includes('Network request failed') ||
      msg.includes('Failed to fetch') ||
      msg.includes('timed out') ||
      msg.includes('timeout') ||
      msg.includes('connection')
    ) {
      if (path === '/auth/register') {
        throw new Error('Could not create your account. Please check your connection and try again.');
      }
      throw new Error('Cannot reach Aider. Check your connection and try again.');
    }
    throw e;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export type AuthResponse = {
  ok: boolean;
  token: string;
  account: any;
  profile: Profile;
};

export async function loginAccount(body: { email: string; password: string }): Promise<AuthResponse> {
  const res = await request<AuthResponse>('/auth/login', body, false, 'POST');
  if (res && res.ok && res.token) {
    await setAuthToken(res.token);
  }
  return res;
}

export async function registerAccount(body: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'teacher' | 'student';
  school?: string;
  studentId?: string;
  course?: string;
  yearLevel?: string;
  facultyId?: string;
  department?: string;
}): Promise<AuthResponse> {
  const res = await request<AuthResponse>('/auth/register', body, false, 'POST');
  if (res && res.ok && res.token) {
    await setAuthToken(res.token);
  }
  return res;
}

export async function updateProfile(body: {
  name?: string;
  school?: string;
  facultyId?: string;
  department?: string;
}): Promise<Profile> {
  return request<Profile>('/me', body, true, 'PATCH');
}

export async function fetchMe(): Promise<Profile> {
  return request<Profile>('/me', undefined, true, 'GET');
}

export async function uploadProfilePhoto(base64: string, mimeType: string): Promise<Profile> {
  const token = await getAuthToken();
  if (!token) throw new Error('Please sign in again.');
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 60000) : null;
  try {
    const response = await fetch(`${API_URL}/api/me/avatar`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/plain',
        'X-Image-Mime-Type': mimeType,
      },
      body: base64,
      ...(controller ? { signal: controller.signal } : {}),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error?.message || 'Unable to save profile photo.');
    }
    return result as Profile;
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      throw new Error('Photo upload timed out. Check your connection and try again.');
    }
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
export const authClient = () => auth;
export const dateText = (value: string) =>
  new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
export const localDate = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
export const localDateTime = (iso: string) => {
  const date = new Date(new Date(iso).getTime() + 8 * 3600000);
  return date.toISOString().slice(0, 16).replace('T', ' ');
};
export function toISO(value: string) {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value))
    throw new Error('Use YYYY-MM-DD HH:mm for dates, in Asia/Manila.');
  const date = new Date(`${value.replace(' ', 'T')}:00+08:00`);
  if (!Number.isFinite(+date) || localDateTime(date.toISOString()) !== value)
    throw new Error('Enter a valid date and time.');
  return date.toISOString();
}
