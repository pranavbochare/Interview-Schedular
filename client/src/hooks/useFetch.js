import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

// Minimal data-fetching hook: { data, loading, error, reload }
export function useFetch(path, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!enabled || !path) return;
    try {
      setError(null);
      setData(await api.get(path));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [path, enabled]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
