"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";
import type { Bi, Lang } from "@/lib/rules/types";
import { createStore } from "@/lib/state/store";
import { UI, type UiKey } from "./strings";

const KEY = "nivaaran.lang";

function read(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === "hi" || saved === "en" ? saved : "en";
  } catch {
    return "en";
  }
}

const store = createStore<Lang>(read, "en");

interface LangValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Resolve a bilingual string from the engine. */
  t: (bi: Bi) => string;
  /** Resolve a chrome string by key. */
  ui: (key: UiKey) => string;
}

const Ctx = createContext<LangValue | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(store.subscribe, store.get, store.server);

  // Legitimate effect: synchronising an external system (the DOM) with state.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* non-fatal */
    }
    store.set(l);
  }, []);

  const t = useCallback((bi: Bi) => bi[lang] || bi.en, [lang]);
  const ui = useCallback((key: UiKey) => UI[key][lang] || UI[key].en, [lang]);

  return <Ctx.Provider value={{ lang, setLang, t, ui }}>{children}</Ctx.Provider>;
}

export function useLang(): LangValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLang must be used inside LangProvider");
  return v;
}
