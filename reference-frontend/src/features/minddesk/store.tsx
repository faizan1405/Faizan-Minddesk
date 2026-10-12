import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { initialDeskData } from "./seed";
import type { DeskData } from "./types";

const STORAGE_KEY = "minddesk-prototype-v1";

const DeskContext = createContext<{
  data: DeskData;
  update: (recipe: (current: DeskData) => DeskData) => void;
} | null>(null);

export function MindDeskProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DeskData>(initialDeskData);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (isDeskData(parsed)) setData(parsed);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", data.theme === "dark");
    if (ready) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // Editing remains available when local browser storage is unavailable.
      }
    }
  }, [data, ready]);

  return (
    <DeskContext.Provider value={{ data, update: (recipe) => setData(recipe) }}>
      {children}
    </DeskContext.Provider>
  );
}

export function useDeskData() {
  const context = useContext(DeskContext);
  if (!context) throw new Error("useDeskData must be rendered inside MindDeskProvider");
  return context;
}

function isDeskData(value: unknown): value is DeskData {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<DeskData>;
  return (
    Array.isArray(candidate.tasks) &&
    Array.isArray(candidate.notes) &&
    Array.isArray(candidate.maps) &&
    Array.isArray(candidate.projects) &&
    (candidate.theme === "light" || candidate.theme === "dark")
  );
}