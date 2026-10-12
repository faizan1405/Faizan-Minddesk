"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";

import { initialDeskData } from "./seed";
import type { DeskData } from "./types";

const STORAGE_KEY = "minddesk-prototype-v1";

interface DeskContextValue {
  data: DeskData;
  update: (recipe: (current: DeskData) => DeskData) => void;
  selectedItem: string | null;
  setSelectedItem: (id: string | null) => void;
}

const DeskContext = createContext<DeskContextValue | null>(null);

export function MindDeskProvider({ children }: { children: ReactNode }) {
  const existing = useContext(DeskContext);
  const { setTheme } = useTheme();
  const [data, setData] = useState<DeskData>(initialDeskData);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (existing) return;
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
  }, [existing]);

  useEffect(() => {
    if (existing) return;
    document.documentElement.classList.toggle("dark", data.theme === "dark");
    setTheme?.(data.theme);
    if (ready) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // Editing remains available when local browser storage is unavailable.
      }
    }
  }, [data, existing, ready, setTheme]);

  if (existing) {
    return <>{children}</>;
  }

  return (
    <DeskContext.Provider
      value={{
        data,
        update: (recipe) => setData(recipe),
        selectedItem,
        setSelectedItem,
      }}
    >
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
