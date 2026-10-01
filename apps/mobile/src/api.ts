import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { randomUUID } from 'expo-crypto';
import Constants from 'expo-constants';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Config } from './types';

function resolveApiUrl(): string {
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
// Split session JSON into small encrypted entries for native keychain size limits.
const secureStorage = {
  async getItem(key: string) {
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
  const config = await request<Config>('/config', undefined, false);
  if (!config.supabaseUrl || !config.supabaseKey)
    throw new Error('Supabase is not configured on the server yet.');
  if (!auth) {
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
  }
  return { config, auth };
}
export async function request<T>(
  path: string,
  body?: unknown,
  authenticated = true,
  method?: string,
): Promise<T> {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 40000);
  try {
    const token = authenticated
      ? (await auth?.auth.getSession())?.data.session?.access_token
      : undefined;
    if (authenticated && !token) throw new Error('Please sign in again.');
    const response = await fetch(`${API_URL}/api${path}`, {
      method: method || (body === undefined ? 'GET' : 'POST'),
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || 'Unable to complete this request.');
    return result;
  } catch (e) {
    if (e instanceof Error && (e.name === 'AbortError' || e.message === 'Network request failed'))
      throw new Error('Cannot reach ClassAssist. Check your connection and try again.');
    throw e;
  } finally {
    clearTimeout(timer);
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
