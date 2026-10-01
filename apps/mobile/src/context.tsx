import React, { createContext, useContext, useEffect, useState } from 'react';
import { request } from './api';
import type { Config, Profile } from './types';
export type AppContextValue = {
  profile: Profile;
  config: Config;
  revision: number;
  refresh: () => void;
  busy: boolean;
  act: <T>(fn: () => Promise<T>, message?: string) => Promise<T | undefined>;
  open: (kind: string, id?: string) => void;
};
export const AppContext = createContext<AppContextValue>(null!);
export const useApp = () => useContext(AppContext);
export function useRemote<T>(path: string) {
  const { revision } = useApp();
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setError('');
    request<T>(path)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [path, revision]);
  return { data, error };
}
