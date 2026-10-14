"use client";

import React, { useState } from "react";
import {
  Download,
  Upload,
  Undo2,
  Redo2,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Plus,
  Palette,
  LayoutGrid,
  FileCode,
  Image as ImageIcon,
  Crosshair,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MindMapLayout, MindMapTheme } from "../types";
import { THEME_CONFIGS } from "./theme-tokens";

export interface MindMapToolbarProps {
  theme: MindMapTheme;
  layout: MindMapLayout;
  canUndo: boolean;
  canRedo: boolean;
  searchQuery: string;
  matchCount: number;
  currentMatchIndex: number;
  onThemeChange: (theme: MindMapTheme) => void;
  onLayoutChange: (layout: MindMapLayout) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSearchChange: (query: string) => void;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onCenterRoot: () => void;
  onAddTopic: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  onExportJson: () => void;
  onImportJson: () => void;
}

export function MindMapToolbar({
  theme: currentTheme,
  layout: currentLayout,
  canUndo,
  canRedo,
  searchQuery,
  matchCount,
  currentMatchIndex,
  onThemeChange,
  onLayoutChange,
  onUndo,
  onRedo,
  onSearchChange,
  onNextMatch,
  onPrevMatch,
  onZoomIn,
  onZoomOut,
  onFitView,
  onCenterRoot,
  onAddTopic,
  onExportPng,
  onExportSvg,
  onExportJson,
  onImportJson,
}: MindMapToolbarProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [activeMenu, setActiveMenu] = useState<"layout" | "theme" | "export" | null>(null);

  const themeConfig = THEME_CONFIGS[currentTheme] || THEME_CONFIGS.calm;

  return (
    <div
      data-testid="mindmap-main-toolbar"
      className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 rounded-xl border p-1 shadow-lg backdrop-blur-md max-w-[calc(100%-1.5rem)] overflow-x-auto select-none"
      style={{
        backgroundColor: themeConfig.toolbarBg,
        borderColor: themeConfig.toolbarBorder,
        color: themeConfig.toolbarText,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Add Topic Primary Action */}
      <Button
        type="button"
        size="sm"
        className="h-8 gap-1 text-xs font-semibold px-2.5 rounded-lg shadow-sm"
        onClick={onAddTopic}
      >
        <Plus className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Add Topic</span>
      </Button>

      <div className="h-4 w-px bg-border/60 mx-0.5" />

      {/* 2. Undo / Redo */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-xs rounded-lg"
        title="Undo (Ctrl+Z)"
        disabled={!canUndo}
        onClick={onUndo}
      >
        <Undo2 className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-xs rounded-lg"
        title="Redo (Ctrl+Shift+Z / Ctrl+Y)"
        disabled={!canRedo}
        onClick={onRedo}
      >
        <Redo2 className="h-3.5 w-3.5" />
      </Button>

      <div className="h-4 w-px bg-border/60 mx-0.5" />

      {/* 3. Layout Selector Dropdown */}
      <div className="relative">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs px-2 rounded-lg"
          onClick={() => setActiveMenu(activeMenu === "layout" ? null : "layout")}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          <span className="capitalize hidden md:inline">
            {currentLayout === "tree" ? "Horizontal" : currentLayout}
          </span>
        </Button>

        {activeMenu === "layout" && (
          <div
            className="absolute top-10 left-0 z-50 flex flex-col gap-1 p-1.5 rounded-xl border shadow-xl bg-card min-w-[170px]"
            style={{ borderColor: themeConfig.toolbarBorder }}
          >
            <div className="text-[10px] font-semibold uppercase text-muted-foreground px-2 py-1">
              Layout Engine
            </div>
            {(
              [
                { id: "balanced", label: "Balanced Mind Map" },
                { id: "horizontal", label: "Horizontal Tree" },
                { id: "vertical", label: "Vertical Tree" },
                { id: "radial", label: "Radial Map" },
                { id: "freeform", label: "Freeform Canvas" },
              ] as const
            ).map((l) => (
              <button
                key={l.id}
                type="button"
                className={`text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between ${
                  currentLayout === l.id
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "hover:bg-muted text-foreground"
                }`}
                onClick={() => {
                  onLayoutChange(l.id);
                  setActiveMenu(null);
                }}
              >
                <span>{l.label}</span>
                {currentLayout === l.id && <span>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. Theme Selector Dropdown */}
      <div className="relative">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs px-2 rounded-lg"
          onClick={() => setActiveMenu(activeMenu === "theme" ? null : "theme")}
        >
          <Palette className="h-3.5 w-3.5" />
          <span className="capitalize hidden md:inline">{currentTheme}</span>
        </Button>

        {activeMenu === "theme" && (
          <div
            className="absolute top-10 left-0 z-50 flex flex-col gap-1 p-1.5 rounded-xl border shadow-xl bg-card min-w-[140px]"
            style={{ borderColor: themeConfig.toolbarBorder }}
          >
            <div className="text-[10px] font-semibold uppercase text-muted-foreground px-2 py-1">
              Canvas Theme
            </div>
            {(
              [
                { id: "calm", label: "Calm" },
                { id: "paper", label: "Paper" },
                { id: "midnight", label: "Midnight" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                className={`text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between ${
                  currentTheme === t.id
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "hover:bg-muted text-foreground"
                }`}
                onClick={() => {
                  onThemeChange(t.id);
                  setActiveMenu(null);
                }}
              >
                <span>{t.label}</span>
                {currentTheme === t.id && <span>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-4 w-px bg-border/60 mx-0.5" />

      {/* 5. Search Bar */}
      {showSearch ? (
        <div className="flex items-center gap-1 bg-muted/60 rounded-lg px-2 py-0.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            autoFocus
            aria-label="Search topics"
            placeholder="Search map…"
            className="bg-transparent text-xs w-28 sm:w-36 outline-none"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setShowSearch(false);
                onSearchChange("");
              } else if (e.key === "Enter") {
                onNextMatch();
              }
              e.stopPropagation();
            }}
          />
          {searchQuery && (
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {matchCount > 0 ? `${currentMatchIndex + 1}/${matchCount}` : "0"}
            </span>
          )}
          {matchCount > 1 && (
            <div className="flex items-center">
              <button
                type="button"
                className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                title="Previous match"
                onClick={onPrevMatch}
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
              <button
                type="button"
                className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                title="Next match"
                onClick={onNextMatch}
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}
          <button
            type="button"
            className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded"
            onClick={() => {
              setShowSearch(false);
              onSearchChange("");
            }}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-xs rounded-lg"
          title="Search Topics"
          onClick={() => setShowSearch(true)}
        >
          <Search className="h-3.5 w-3.5" />
        </Button>
      )}

      {/* 6. Zoom & View Controls */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-xs rounded-lg hidden sm:inline-flex"
        title="Zoom In"
        onClick={onZoomIn}
      >
        <ZoomIn className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-xs rounded-lg hidden sm:inline-flex"
        title="Zoom Out"
        onClick={onZoomOut}
      >
        <ZoomOut className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-xs rounded-lg"
        title="Fit All"
        onClick={onFitView}
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-xs rounded-lg hidden sm:inline-flex"
        title="Center Root"
        onClick={onCenterRoot}
      >
        <Crosshair className="h-3.5 w-3.5" />
      </Button>

      <div className="h-4 w-px bg-border/60 mx-0.5" />

      {/* 7. Export / Import Dropdown */}
      <div className="relative">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs px-2 rounded-lg"
          onClick={() => setActiveMenu(activeMenu === "export" ? null : "export")}
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Export</span>
        </Button>

        {activeMenu === "export" && (
          <div
            className="absolute top-10 right-0 z-50 flex flex-col gap-1 p-1.5 rounded-xl border shadow-xl bg-card min-w-[160px]"
            style={{ borderColor: themeConfig.toolbarBorder }}
          >
            <div className="text-[10px] font-semibold uppercase text-muted-foreground px-2 py-1">
              Export Map
            </div>
            <button
              type="button"
              className="text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors hover:bg-muted text-foreground flex items-center gap-2"
              onClick={() => {
                onExportPng();
                setActiveMenu(null);
              }}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              <span>Export PNG Image</span>
            </button>
            <button
              type="button"
              className="text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors hover:bg-muted text-foreground flex items-center gap-2"
              onClick={() => {
                onExportSvg();
                setActiveMenu(null);
              }}
            >
              <FileCode className="h-3.5 w-3.5" />
              <span>Export SVG Vector</span>
            </button>
            <button
              type="button"
              className="text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors hover:bg-muted text-foreground flex items-center gap-2"
              onClick={() => {
                onExportJson();
                setActiveMenu(null);
              }}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export JSON File</span>
            </button>

            <div className="h-px bg-border/60 my-1" />

            <button
              type="button"
              className="text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors hover:bg-muted text-foreground flex items-center gap-2"
              onClick={() => {
                onImportJson();
                setActiveMenu(null);
              }}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Import JSON File</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
