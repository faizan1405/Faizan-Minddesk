import type { MindMapTheme } from "../types";

export interface ThemeConfig {
  name: MindMapTheme;
  label: string;
  canvasBg: string;
  gridColor: string;
  nodeBg: string;
  nodeText: string;
  nodeBorder: string;
  nodeShadow: string;
  edgeStroke: string;
  edgeStrokeSelected: string;
  rootBg: string;
  rootText: string;
  rootBorder: string;
  toolbarBg: string;
  toolbarText: string;
  toolbarBorder: string;
  minimapBg: string;
  minimapMask: string;
  colors: Record<string, { bg: string; text: string; border: string; accent: string }>;
}

export const THEME_CONFIGS: Record<MindMapTheme, ThemeConfig> = {
  calm: {
    name: "calm",
    label: "Calm",
    canvasBg: "#f8fafc",
    gridColor: "#e2e8f0",
    nodeBg: "#ffffff",
    nodeText: "#0f172a",
    nodeBorder: "#cbd5e1",
    nodeShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
    edgeStroke: "#94a3b8",
    edgeStrokeSelected: "#6366f1",
    rootBg: "#6366f1",
    rootText: "#ffffff",
    rootBorder: "#4f46e5",
    toolbarBg: "rgba(255, 255, 255, 0.95)",
    toolbarText: "#0f172a",
    toolbarBorder: "#e2e8f0",
    minimapBg: "#ffffff",
    minimapMask: "rgba(241, 245, 249, 0.7)",
    colors: {
      violet: {
        bg: "#ede9fe",
        text: "#5b21b6",
        border: "#c4b5fd",
        accent: "#7c3aed",
      },
      blue: {
        bg: "#e0f2fe",
        text: "#0369a1",
        border: "#7dd3fc",
        accent: "#0284c7",
      },
      mint: {
        bg: "#ecfdf5",
        text: "#065f46",
        border: "#6ee7b7",
        accent: "#10b981",
      },
      amber: {
        bg: "#fef3c7",
        text: "#92400e",
        border: "#fcd34d",
        accent: "#f59e0b",
      },
      coral: {
        bg: "#ffe4e6",
        text: "#9f1239",
        border: "#fda4af",
        accent: "#f43f5e",
      },
      rose: {
        bg: "#fce7f3",
        text: "#9d174d",
        border: "#fbcfe8",
        accent: "#ec4899",
      },
      emerald: {
        bg: "#d1fae5",
        text: "#065f46",
        border: "#a7f3d0",
        accent: "#059669",
      },
      indigo: {
        bg: "#e0e7ff",
        text: "#3730a3",
        border: "#a5b4fc",
        accent: "#4f46e5",
      },
    },
  },
  paper: {
    name: "paper",
    label: "Paper",
    canvasBg: "#fbf8f2",
    gridColor: "#e7decb",
    nodeBg: "#fffdf9",
    nodeText: "#1c1917",
    nodeBorder: "#d6c7b2",
    nodeShadow: "0 4px 14px rgba(68, 51, 34, 0.08)",
    edgeStroke: "#a89a85",
    edgeStrokeSelected: "#9a3412",
    rootBg: "#3c332a",
    rootText: "#fffdf9",
    rootBorder: "#27211b",
    toolbarBg: "rgba(255, 252, 247, 0.96)",
    toolbarText: "#292524",
    toolbarBorder: "#ded4c3",
    minimapBg: "#fbf8f2",
    minimapMask: "rgba(238, 230, 218, 0.75)",
    colors: {
      violet: {
        bg: "#f3edf7",
        text: "#4c2859",
        border: "#d9c5e3",
        accent: "#703884",
      },
      blue: {
        bg: "#e9f2f7",
        text: "#1e4458",
        border: "#bcd8e7",
        accent: "#2c6382",
      },
      mint: {
        bg: "#eef5ed",
        text: "#294d27",
        border: "#bedebd",
        accent: "#3d733b",
      },
      amber: {
        bg: "#fdf4e7",
        text: "#6b4515",
        border: "#f0d5b0",
        accent: "#9c631e",
      },
      coral: {
        bg: "#fbf0ed",
        text: "#6d2919",
        border: "#f2cac1",
        accent: "#9e3c25",
      },
      rose: {
        bg: "#fbf0f4",
        text: "#6e2042",
        border: "#f3c7d9",
        accent: "#9c3160",
      },
      emerald: {
        bg: "#edf7f2",
        text: "#1c4e38",
        border: "#bde3cf",
        accent: "#297151",
      },
      indigo: {
        bg: "#edf0f8",
        text: "#293963",
        border: "#c4cfeb",
        accent: "#3a528f",
      },
    },
  },
  midnight: {
    name: "midnight",
    label: "Midnight",
    canvasBg: "#0f172a",
    gridColor: "#1e293b",
    nodeBg: "#1e293b",
    nodeText: "#f8fafc",
    nodeBorder: "#334155",
    nodeShadow: "0 6px 20px rgba(0, 0, 0, 0.35)",
    edgeStroke: "#475569",
    edgeStrokeSelected: "#818cf8",
    rootBg: "#6366f1",
    rootText: "#ffffff",
    rootBorder: "#818cf8",
    toolbarBg: "rgba(30, 41, 59, 0.95)",
    toolbarText: "#f8fafc",
    toolbarBorder: "#334155",
    minimapBg: "#1e293b",
    minimapMask: "rgba(15, 23, 42, 0.8)",
    colors: {
      violet: {
        bg: "#2e1065",
        text: "#e9d5ff",
        border: "#6b21a8",
        accent: "#a855f7",
      },
      blue: {
        bg: "#082f49",
        text: "#bae6fd",
        border: "#0369a1",
        accent: "#38bdf8",
      },
      mint: {
        bg: "#022c22",
        text: "#a7f3d0",
        border: "#047857",
        accent: "#34d399",
      },
      amber: {
        bg: "#451a03",
        text: "#fde68a",
        border: "#b45309",
        accent: "#fbbf24",
      },
      coral: {
        bg: "#4c0519",
        text: "#fecdd3",
        border: "#be123c",
        accent: "#fb7185",
      },
      rose: {
        bg: "#500724",
        text: "#fbcfe8",
        border: "#be185d",
        accent: "#f472b6",
      },
      emerald: {
        bg: "#064e3b",
        text: "#6ee7b7",
        border: "#059669",
        accent: "#10b981",
      },
      indigo: {
        bg: "#1e1b4b",
        text: "#c7d2fe",
        border: "#4338ca",
        accent: "#818cf8",
      },
    },
  },
};

export const COLOR_OPTIONS: Array<{ id: string; name: string; hex: string }> = [
  { id: "violet", name: "Violet", hex: "#8b5cf6" },
  { id: "blue", name: "Sky Blue", hex: "#0ea5e9" },
  { id: "mint", name: "Mint", hex: "#10b981" },
  { id: "amber", name: "Amber", hex: "#f59e0b" },
  { id: "coral", name: "Coral", hex: "#f43f5e" },
  { id: "rose", name: "Rose", hex: "#ec4899" },
  { id: "emerald", name: "Emerald", hex: "#059669" },
  { id: "indigo", name: "Indigo", hex: "#6366f1" },
];

export const SHAPE_OPTIONS: Array<{ id: "rounded" | "pill" | "rectangle" | "diamond" | "circle"; label: string }> = [
  { id: "rounded", label: "Rounded Card" },
  { id: "pill", label: "Pill" },
  { id: "rectangle", label: "Rectangle" },
  { id: "diamond", label: "Diamond" },
  { id: "circle", label: "Circle" },
];

export const EMOJI_PALETTE = ["💡", "🎯", "🚀", "✨", "📌", "⚠️", "🔍", "📝", "🎨", "⚡", "🔥", "💎", "🏆", "📊", "🧩", "🌱"];
