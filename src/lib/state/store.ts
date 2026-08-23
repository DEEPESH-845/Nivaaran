/**
 * A minimal external store for browser-only state (localStorage).
 *
 * Using useSyncExternalStore rather than an effect matters here: reading
 * storage in an effect and calling setState triggers a cascading render on
 * every page of the journey. React hydrates with the server snapshot, then
 * swaps to the client snapshot in one pass.
 */
export interface Store<T> {
  subscribe: (listener: () => void) => () => void;
  get: () => T;
  server: () => T;
  set: (next: T) => void;
}

const UNSET = Symbol("unset");

export function createStore<T>(read: () => T, serverValue: T): Store<T> {
  let cache: T | typeof UNSET = UNSET;
  const listeners = new Set<() => void>();

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    get() {
      if (cache === UNSET) cache = read();
      return cache as T;
    },
    server: () => serverValue,
    set(next) {
      cache = next;
      for (const l of listeners) l();
    },
  };
}

/** True once React has hydrated, without touching state in an effect. */
const noop = () => () => {};
export const hydratedStore = {
  subscribe: noop,
  get: () => true,
  server: () => false,
};
