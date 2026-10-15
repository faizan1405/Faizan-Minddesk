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
  Pencil,
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

  // Edit category state
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState("");

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

  const handleStartEdit = (cat: { id: string; name: string; color: string }) => {
    setEditingCatId(cat.id);
    setEditingName(cat.name);
    setEditingColor(cat.color);
    setErrorMsg(null);
  };

  const handleSaveEdit = (catId: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setErrorMsg("Category name cannot be empty.");
      return;
    }

    const duplicate = categories.some(
      (c) => c.id !== catId && c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setErrorMsg("Another category already has this name.");
      return;
    }

    updatePlannerCategory(catId, {
      name: trimmed,
      color: editingColor,
    });

    setEditingCatId(null);
    setErrorMsg(null);
  };

  const handleCancelEdit = () => {
    setEditingCatId(null);
    setErrorMsg(null);
  };

  const confirmDeleteCategory = () => {
    if (!deletingCatId) return;
    deletePlannerCategory(deletingCatId, reassignTargetId);
    setDeletingCatId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Tag size={16} />
            </span>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Manage Categories
              </h3>
              <p className="text-xs text-muted-foreground">
                Customize time-blocking categories, colors, and classifications.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 p-2.5 rounded-xl border border-destructive/20">
            <AlertCircle size={14} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Categories List */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
            All Categories ({categories.length})
          </label>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {categories.map((cat) => {
              const isEditing = editingCatId === cat.id;

              if (isEditing) {
                return (
                  <div
                    key={cat.id}
                    className="p-3 rounded-xl border-2 border-primary/40 bg-primary/5 space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        placeholder="Category name"
                        className="flex-1 rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-primary shadow-2xs"
                        autoFocus
                      />
                      <input
                        type="color"
                        value={editingColor}
                        onChange={(e) => setEditingColor(e.target.value)}
                        title="Pick color"
                        className="w-8 h-8 rounded-lg border border-border cursor-pointer p-0.5 bg-background shrink-0"
                      />
                    </div>

                    {/* Color Swatches */}
                    <div className="flex flex-wrap gap-1.5">
                      {CURATED_CATEGORY_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setEditingColor(c.value)}
                          className={`w-5 h-5 rounded-full border transition-all cursor-pointer flex items-center justify-center ${
                            editingColor === c.value
                              ? "ring-2 ring-primary ring-offset-1 scale-110"
                              : "border-black/10 hover:scale-105"
                          }`}
                          style={{ backgroundColor: c.value }}
                          title={c.label}
                        >
                          {editingColor === c.value && (
                            <Check size={10} className="text-white drop-shadow-xs" />
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(cat.id)}
                        className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 shadow-2xs"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 bg-background hover:border-border transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-4 w-4 rounded-full border border-black/10 shrink-0 shadow-2xs"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-xs sm:text-sm font-semibold text-foreground">
                      {cat.name}
                    </span>
                    {cat.isDefault && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-2xs font-semibold text-muted-foreground">
                        Default
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(cat)}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                      title={`Edit ${cat.name}`}
                    >
                      <Pencil size={14} />
                    </button>

                    {categories.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingCatId(cat.id);
                          const fallback = categories.find((c) => c.id !== cat.id)?.id || "cat-work-focus";
                          setReassignTargetId(fallback);
                        }}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                        title={cat.isDefault ? `Delete ${cat.name}` : "Delete custom category"}
                        aria-label={`Delete ${cat.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Category Form */}
        <form onSubmit={handleCreateCategory} className="space-y-2.5 pt-3 border-t border-border/60">
          <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
            Create Category
          </label>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Deep Coding, Side Project, Sales, Client Work..."
              className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-primary shadow-2xs"
            />
            <input
              type="color"
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              title="Custom color"
              className="w-9 h-9 rounded-xl border border-border cursor-pointer p-0.5 bg-background shrink-0"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 shadow-2xs transition-all cursor-pointer shrink-0"
            >
              <Plus size={14} />
              <span>Add</span>
            </button>
          </div>

          {/* Curated Color Palette Swatches */}
          <div className="space-y-1">
            <span className="text-2xs text-muted-foreground font-medium flex items-center gap-1">
              <Palette size={11} />
              <span>Palette suggestions:</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {CURATED_CATEGORY_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setNewCatColor(c.value)}
                  className={`w-5 h-5 rounded-full border transition-all cursor-pointer flex items-center justify-center ${
                    newCatColor === c.value
                      ? "ring-2 ring-primary ring-offset-2 scale-110"
                      : "border-black/10 hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                >
                  {newCatColor === c.value && <Check size={10} className="text-white drop-shadow-xs" />}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Safe Reassignment Confirmation Sub-Modal */}
        {deletingCatId && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 space-y-3 animate-in fade-in-0">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-bold text-foreground">
                  Safe Category Reassignment
                </p>
                <p className="text-muted-foreground">
                  Your blocks will not be deleted. Any existing time blocks currently using this category will be safely reassigned to:
                </p>
              </div>
            </div>

            <select
              value={reassignTargetId}
              onChange={(e) => setReassignTargetId(e.target.value)}
              className="w-full rounded-lg border border-input bg-background p-2 text-xs font-semibold text-foreground focus:outline-primary cursor-pointer"
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
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCategory}
                className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:opacity-90 cursor-pointer shadow-2xs"
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
