import { useEffect, useState, useCallback } from "react";

/**
 * useApi(fn, deps)
 * Calls an async service function on mount (and whenever deps change),
 * tracking loading / error / data. Falls back to `fallback` data if the
 * request fails, so pages still render their static demo content even
 * if the backend isn't running yet.
 */
export default function useApi(fn, deps = [], fallback = null) {
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fn()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          if (fallback !== null) setData(fallback);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => reload(), [reload]);

  return { data, loading, error, reload };
}
