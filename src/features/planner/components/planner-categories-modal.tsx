"use client";

import React, { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Check,
  Tag,
  Palette,
  AlertCircle,
} from "lucide-react";
import { useCalendar } from "@/features/calendar/calendar-context";
import {
  CURATED_CATEGORY_COLORS,
  DEFAULT_PLANNER_CATEGORIES,
} from "../types";

interface PlannerCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PlannerCategoriesModal({
  isOpen,
  onClose,
}: PlannerCategoriesModalProps) {
  const {
    plannerCategories,
    addPlannerCategory,
    updatePlannerCategory,
    deletePlannerCategory,
  } = useCalendar();

  const categories = plannerCategories?.length ? plannerCategories : DEFAULT_PLANNER_CATEGORIES;

  // New category form
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(CURATED_CATEGORY_COLORS[0].value);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reassignment dialog for category deletion
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<string>("cat-work-focus");

  if (!isOpen) return null;

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setErrorMsg("Please enter a category name.");
      return;
    }

    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg("A category with this name already exists.");
      return;
    }

    addPlannerCategory({
      name: trimmed,
      color: newCatColor,
      isDefault: false,
    });

    setNewCatName("");
    setNewCatColor(CURATED_CATEGORY_COLORS[(categories.length + 1) % CURATED_CATEGORY_COLORS.length].value);
    setErrorMsg(null);
  };

  const confirmDeleteCategory = () => {
    if (!deletingCatId) return;
    deletePlannerCategory(deletingCatId, reassignTargetId);
    setDeletingCatId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Tag size={16} />
            </span>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Planner Categories
              </h3>
              <p className="text-xs text-muted-foreground">
                5 default categories plus your own custom time-blocking tags.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Categories List */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 bg-background hover:border-border transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* Color preview circle */}
                <span
                  className="h-4 w-4 rounded-full border border-black/10 shrink-0 shadow-2xs"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-sm font-semibold text-foreground">
                  {cat.name}
                </span>
                {cat.isDefault && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-2xs font-semibold text-muted-foreground">
                    Default
                  </span>
                )}
              </div>

              {/* Color swatch picker or delete button */}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={cat.color}
                  onChange={(e) => updatePlannerCategory(cat.id, { color: e.target.value })}
                  title="Change category color"
                  className="w-6 h-6 rounded-md border border-border cursor-pointer p-0 bg-transparent"
                />

                {!cat.isDefault && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeletingCatId(cat.id);
                      const fallback = categories.find((c) => c.id !== cat.id)?.id || "cat-work-focus";
                      setReassignTargetId(fallback);
                    }}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                    title="Delete custom category"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add Category Form */}
        <form onSubmit={handleCreateCategory} className="space-y-3 pt-2 border-t border-border/60">
          <label className="block text-xs font-bold text-foreground">
            Add New Custom Category
          </label>

          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle size={14} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Deep Coding, Side Project, Fitness..."
              className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-primary shadow-2xs"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 shadow-2xs transition-all cursor-pointer shrink-0"
            >
              <Plus size={14} />
              <span>Add</span>
            </button>
          </div>

          {/* Curated Color Palette Swatches */}
          <div className="space-y-1.5">
            <span className="text-2xs text-muted-foreground font-medium flex items-center gap-1">
              <Palette size={11} />
              <span>Color swatch:</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {CURATED_CATEGORY_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setNewCatColor(c.value)}
                  className={`w-6 h-6 rounded-full border transition-all cursor-pointer flex items-center justify-center ${
                    newCatColor === c.value
                      ? "ring-2 ring-primary ring-offset-2 scale-110"
                      : "border-black/10 hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                >
                  {newCatColor === c.value && <Check size={12} className="text-white drop-shadow-xs" />}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Safe Reassignment Confirmation Sub-Modal */}
        {deletingCatId && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-bold text-foreground">
                  Safe Category Reassignment
                </p>
                <p className="text-muted-foreground">
                  Any existing time blocks tagged with this category will be safely moved to:
                </p>
              </div>
            </div>

            <select
              value={reassignTargetId}
              onChange={(e) => setReassignTargetId(e.target.value)}
              className="w-full rounded-lg border border-input bg-background p-2 text-xs font-semibold text-foreground focus:outline-primary"
            >
              {categories
                .filter((c) => c.id !== deletingCatId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingCatId(null)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCategory}
                className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:opacity-90"
              >
                Reassign & Delete
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-muted px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/80 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
