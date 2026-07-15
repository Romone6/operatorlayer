"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type State<T> = {
  loading: boolean;
  data: T | null;
  error: string | null;
  refresh: () => Promise<void>;
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = (await response.json().catch(() => ({}))) as {
    data?: T;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Request failed");
  }
  return payload.data as T;
}

export function useApi<T>(url: string, deps: unknown[] = []) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const depsKey = useMemo(() => JSON.stringify(deps), [deps]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const nextData = await fetchJson<T>(url);
      setData(nextData);
      setError(null);
    } catch (fetchError) {
      setData(null);
      setError(fetchError instanceof Error ? fetchError.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    let cancelled = false;
    fetchJson<T>(url)
      .then((nextData) => {
        if (cancelled) return;
        setData(nextData);
        setError(null);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setData(null);
        setError(fetchError instanceof Error ? fetchError.message : "Request failed");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url, depsKey]);

  return { loading, data, error, refresh } as State<T>;
}
