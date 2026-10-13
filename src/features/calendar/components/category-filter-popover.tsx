"use client";

import { useState } from "react";
import { useCalendar } from "../calendar-context";
import { X, Plus, Check } from "lucide-react";

interface CategoryFilterPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  "#2563eb", // blue
  "#10b981", // green
  "#8b5cf6", // purple
  "#f59e0b", // amber
  "#06b6d4", // cyan
  "#ef4444", // red
  "#ec4899", // pink
  "#64748b", // slate
];

export function CategoryFilterPopover({
  isOpen,
  onClose,
}: CategoryFilterPopoverProps) {
  const { categories, toggleCategoryVisibility, addCategory } = useCalendar();
  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0]);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    addCategory({
      name: newCatName.trim(),
      color: newCatColor,
      bgClass: "bg-muted text-foreground border-border",
      textClass: "text-foreground",
      borderClass: "border-border",
      isVisible: true,
    });

    setNewCatName("");
    setIsAdding(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs motion-safe:animate-fade-in">
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card text-card-foreground p-5 shadow-2xl motion-safe:animate-fade-in-up"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-base font-bold text-foreground">Event Categories</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Toggle categories to filter events on your calendar view:
        </p>

        {/* Category List */}
        <div className="mt-3.5 space-y-1.5 max-h-60 overflow-y-auto">
          {categories.map((cat) => {
            return (
              <label
                key={cat.id}
                className="flex items-center justify-between rounded-xl p-2.5 hover:bg-muted cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-xs font-semibold text-foreground">{cat.name}</span>
                </div>
                <input
                  type="checkbox"
                  checked={cat.isVisible}
                  onChange={() => toggleCategoryVisibility(cat.id)}
                  className="size-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                />
              </label>
            );
          })}
        </div>

        {/* Add Category Form */}
        {isAdding ? (
          <form onSubmit={handleCreate} className="mt-4 border-t border-border pt-3 space-y-2.5">
            <div>
              <input
                type="text"
                autoFocus
                placeholder="Category name..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-primary"
              />
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-muted-foreground mb-1">Color</span>
              <div className="flex gap-1.5">
                {PRESET_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setNewCatColor(col)}
                    className="flex size-6 items-center justify-center rounded-full transition-transform cursor-pointer"
                    style={{ backgroundColor: col }}
                  >
                    {newCatColor === col && <Check size={12} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer transition-opacity"
              >
                Save
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-4 border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-xs font-semibold text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Custom Category</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
