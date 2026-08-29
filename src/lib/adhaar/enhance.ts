/**
 * Whether this client gets the WebGL studio.
 *
 * Split out as a pure function of a plain object for one reason: it is the
 * promise that `/adhaar` costs nothing on a bad connection, and a promise
 * buried inside a `useEffect` full of `navigator` lookups cannot be tested.
 * The browser reading lives in `readEnhanceEnv`; the decision lives here.
 * See AGENTS.md rule 14.
 */

export const ENHANCE_KEY = "nivaaran.adhaar.enhanced";

/** Connections on which a ~170KB chunk is a real cost to a real person. */
const TOO_SLOW = new Set(["slow-2g", "2g", "3g"]);

export interface EnhanceEnv {
  saveData: boolean;
  effectiveType: string | null;
  deviceMemory: number | null;
  hardwareConcurrency: number | null;
  reducedMotion: boolean;
  webgl: boolean;
  optOut: boolean;
}

export function shouldEnhance(env: EnhanceEnv): boolean {
  if (env.optOut || env.reducedMotion || !env.webgl) return false;
  if (env.saveData) return false;
  if (env.effectiveType !== null && TOO_SLOW.has(env.effectiveType)) return false;
  if (env.deviceMemory !== null && env.deviceMemory < 4) return false;
  if (env.hardwareConcurrency !== null && env.hardwareConcurrency < 4) return false;
  return true;
}

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

export function readEnhanceEnv(optOut: boolean): EnhanceEnv {
  const nav = navigator as Navigator & {
    connection?: NetworkInformation;
    deviceMemory?: number;
  };
  const c = nav.connection;
  return {
    saveData: c?.saveData === true,
    effectiveType: c?.effectiveType ?? null,
    deviceMemory: typeof nav.deviceMemory === "number" ? nav.deviceMemory : null,
    hardwareConcurrency:
      typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : null,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    webgl: hasWebGL(),
    optOut,
  };
}

/**
 * Cached, and it must be. `readEnhanceEnv` is the snapshot for a
 * `useSyncExternalStore`, so it runs on every render — and this probe creates
 * a real WebGL context each time. A browser allows about sixteen before it
 * starts discarding the oldest, which would take the studio's own context
 * down with it.
 */
let webglProbe: boolean | null = null;

function hasWebGL(): boolean {
  if (webglProbe !== null) return webglProbe;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    // Hand the context straight back rather than waiting for a GC that may
    // never come.
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    webglProbe = Boolean(gl);
  } catch {
    webglProbe = false;
  }
  return webglProbe;
}

/* ------------------------------------------------------------ as a store */

/**
 * The gate is browser state, not React state: it lives in `localStorage`, in a
 * media query and on `navigator.connection`, all of which can change without
 * us. Reading it through `useSyncExternalStore` keeps that out of effects —
 * this codebase's lint forbids `setState` inside one, and rightly.
 */

const listeners = new Set<() => void>();

export function subscribeEnhance(onChange: () => void): () => void {
  listeners.add(onChange);
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  motion.addEventListener("change", onChange);
  const conn = (navigator as Navigator & { connection?: EventTarget }).connection;
  conn?.addEventListener("change", onChange);
  return () => {
    listeners.delete(onChange);
    motion.removeEventListener("change", onChange);
    conn?.removeEventListener("change", onChange);
  };
}

export function readOptOut(): boolean {
  try {
    return localStorage.getItem(ENHANCE_KEY) === "off";
  } catch {
    return false;
  }
}

export function writeOptOut(next: boolean): void {
  try {
    localStorage.setItem(ENHANCE_KEY, next ? "off" : "on");
  } catch {
    // Storage denied. The choice still holds for this page view.
  }
  for (const l of listeners) l();
}

/** The whole decision, as one snapshot. */
export const enhancedNow = (): boolean => shouldEnhance(readEnhanceEnv(readOptOut()));

/** The server cannot know any of this, and must not guess. */
export const enhancedOnServer = (): boolean => false;
