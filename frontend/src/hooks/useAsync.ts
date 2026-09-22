import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: true });
  const [reloadCount, setReloadCount] = useState(0);

  // Keeping the latest loader in a ref means the effect only reruns when deps change.
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, loading: true }));

    loaderRef.current()
      .then((data) => {
        if (active) setState({ data, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message =
          error instanceof ApiError
            ? error.message
            : 'Something went wrong. Reload the page and try again.';
        setState({ data: null, error: message, loading: false });
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadCount]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  const setData = useCallback((updater: (current: T) => T) => {
    setState((current) => (current.data ? { ...current, data: updater(current.data) } : current));
  }, []);

  return { ...state, reload, setData };
}
