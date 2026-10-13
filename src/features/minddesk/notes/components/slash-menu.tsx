import React, { useEffect, useLayoutEffect, useRef } from "react";
import { computePosition, flip, offset, shift } from "@floating-ui/dom";
import type { SlashCategory, SlashCommandItem } from "../types";

interface SlashMenuProps {
  items: SlashCommandItem[];
  selectedIndex: number;
  onSelect: (item: SlashCommandItem) => void;
  clientRect: (() => DOMRect) | null;
  onClose: () => void;
}

export function SlashMenu({ items, selectedIndex, onSelect, clientRect, onClose }: SlashMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  // Position with Floating UI
  useLayoutEffect(() => {
    if (!menuRef.current || !clientRect) return;

    const rect = clientRect();
    if (!rect || (rect.width === 0 && rect.height === 0 && rect.top === 0 && rect.left === 0)) return;

    const virtualEl = {
      getBoundingClientRect: () => rect,
    };

    computePosition(virtualEl, menuRef.current, {
      placement: "bottom-start",
      middleware: [offset(6), flip(), shift({ padding: 12 })],
    }).then(({ x, y }) => {
      if (menuRef.current) {
        menuRef.current.style.left = `${x}px`;
        menuRef.current.style.top = `${y}px`;
      }
    });
  }, [clientRect, items]);

  // Keep selected item scrolled into view
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener("mousedown", handleOutside);
    return () => window.removeEventListener("mousedown", handleOutside);
  }, [onClose]);

  if (!items.length) {
    return (
      <div
        ref={menuRef}
        role="listbox"
        aria-label="No commands found"
        style={{ position: "fixed", top: 0, left: 0 }}
        className="z-50 w-64 rounded-xl border border-border bg-popover/95 p-3 text-popover-foreground shadow-2xl backdrop-blur-md"
      >
        <p className="text-xs text-muted-foreground text-center py-2">No matching blocks found</p>
      </div>
    );
  }

  // Group items by category while preserving overall index
  let currentIndex = 0;
  const categories: { category: SlashCategory; items: { item: SlashCommandItem; index: number }[] }[] = [];
  const categoryOrder: SlashCategory[] = ["Basic", "Formatting & Lists", "Structure", "MindDesk Links"];

  for (const cat of categoryOrder) {
    const catItems: { item: SlashCommandItem; index: number }[] = [];
    for (const item of items) {
      if (item.category === cat) {
        catItems.push({ item, index: currentIndex++ });
      }
    }
    if (catItems.length > 0) {
      categories.push({ category: cat, items: catItems });
    }
  }

  return (
    <div
      ref={menuRef}
      role="listbox"
      aria-label="Slash commands"
      style={{ position: "fixed", top: 0, left: 0 }}
      className="z-50 max-h-80 w-72 overflow-y-auto rounded-xl border border-border bg-popover/95 p-1.5 text-popover-foreground shadow-2xl backdrop-blur-md transition-all animate-in fade-in zoom-in-95 duration-100"
    >
      {categories.map((group) => (
        <div key={group.category} className="mb-2 last:mb-0">
          <div className="px-2.5 py-1 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/80">
            {group.category}
          </div>
          <div className="space-y-0.5">
            {group.items.map(({ item, index }) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  ref={isSelected ? activeItemRef : null}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(item);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                    isSelected ? "bg-accent text-accent-foreground shadow-xs" : "hover:bg-accent/60 text-foreground"
                  }`}
                >
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-md border text-sm transition-colors ${
                      isSelected ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-medium leading-tight">{item.label}</span>
                      {item.shortcut && (
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground/70 bg-muted/60 px-1 py-0.5 rounded">
                          {item.shortcut}
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-1 text-[11px] text-muted-foreground leading-tight mt-0.5">
                      {item.hint}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
