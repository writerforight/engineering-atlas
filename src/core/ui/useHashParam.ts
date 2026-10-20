import { useCallback, useState } from 'react';

/** Query part of a hash route: "#/topic/x?tab=y&section=z" -> URLSearchParams. */
export function hashParams(): URLSearchParams {
  const hash = window.location.hash;
  const q = hash.indexOf('?');
  return new URLSearchParams(q >= 0 ? hash.slice(q + 1) : '');
}

/**
 * A string state mirrored into the hash query, so views like a tab can be
 * linked to directly. Uses replaceState, so it adds no history entries and
 * fires no hashchange.
 */
export function useHashParam<T extends string>(key: string, fallback: T, allowed: readonly T[]): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const v = hashParams().get(key);
    return v !== null && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  });
  const set = useCallback(
    (v: T) => {
      setValue(v);
      const hash = window.location.hash;
      const q = hash.indexOf('?');
      const path = q >= 0 ? hash.slice(0, q) : hash;
      const params = hashParams();
      params.set(key, v);
      history.replaceState(null, '', `${path}?${params.toString()}`);
    },
    [key],
  );
  return [value, set];
}
