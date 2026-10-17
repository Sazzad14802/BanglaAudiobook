/**
 * useResource — one consistent loading / error / refresh lifecycle for screen data.
 *
 * - Reloads whenever the screen regains focus (so data stays fresh across tabs).
 * - Ignores results from stale requests (only the latest load may set state).
 * - Keeps showing the last good data during a refresh instead of flashing a spinner.
 */

import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { errorMessage } from '../api/client';

export interface Resource<T> {
  data: T | undefined;
  error: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  reload: () => Promise<void>;
  refresh: () => Promise<void>;
  setData: (updater: T | ((current: T | undefined) => T)) => void;
}

export function useResource<T>(loader: () => Promise<T>, deps: unknown[] = []): Resource<T> {
  const [data, setDataState] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const sequence = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async (mode: 'load' | 'refresh') => {
    const current = ++sequence.current;
    if (mode === 'refresh') setIsRefreshing(true);
    try {
      const result = await loaderRef.current();
      if (current !== sequence.current) return;
      setDataState(result);
      setError(null);
    } catch (e) {
      if (current !== sequence.current) return;
      setError(errorMessage(e));
    } finally {
      if (current === sequence.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      run('load');
      return () => {
        sequence.current++;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [run, ...deps]),
  );

  const setData = useCallback((updater: T | ((current: T | undefined) => T)) => {
    setDataState((current) =>
      typeof updater === 'function' ? (updater as (c: T | undefined) => T)(current) : updater,
    );
  }, []);

  return {
    data,
    error,
    isLoading: isLoading && data === undefined,
    isRefreshing,
    reload: () => run('load'),
    refresh: () => run('refresh'),
    setData,
  };
}
