"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, ArrowUp, ArrowDown, Check } from "lucide-react";
import type { Routine, RoutineStep } from "../types";
import { useHabits } from "../context/habits-context";
import { Button } from "@/components/ui/button";

interface RoutineModalProps {
  isOpen: boolean;
  routineToEdit?: Routine | null;
  onClose: () => void;
}

const EMOJI_PRESETS = ["☀️", "🌙", "⚡", "🧘", "💪", "🎯", "🚀", "✨"];
const COLOR_PRESETS = ["#3b82f6", "#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

export function RoutineModal({ isOpen, routineToEdit, onClose }: RoutineModalProps) {
  const { createRoutine, updateRoutine, activeHabits } = useHabits();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("☀️");
  const [color, setColor] = useState("#3b82f6");
  const [frequency, setFrequency] = useState<"daily" | "weekdays" | "specific_days" | "weekly">("weekdays");
  const [preferredTime, setPreferredTime] = useState("08:00");
  const [steps, setSteps] = useState<Omit<RoutineStep, "id" | "order">[]>([
    { title: "Hydrate & Stretch", description: "Drink water and move joints", durationMinutes: 5 },
    { title: "Deep Focus Session", description: "Focus on primary work deliverable", durationMinutes: 20 },
  ]);

  useEffect(() => {
    if (isOpen) {
      if (routineToEdit) {
        setTitle(routineToEdit.title);
        setDescription(routineToEdit.description || "");
        setEmoji(routineToEdit.emoji);
        setColor(routineToEdit.color);
        setFrequency(routineToEdit.schedule?.frequency || "weekdays");
        setPreferredTime(routineToEdit.schedule?.preferredTime || "08:00");
        setSteps(
          routineToEdit.steps.map((s) => ({
            title: s.title,
            description: s.description,
            durationMinutes: s.durationMinutes,
            targetHabitId: s.targetHabitId,
          }))
        );
      } else {
        setTitle("");
        setDescription("");
        setEmoji("☀️");
        setColor("#3b82f6");
        setFrequency("weekdays");
        setPreferredTime("08:00");
        setSteps([
          { title: "Hydrate & Drink Water", description: "500ml cold water", durationMinutes: 2 },
          { title: "Morning Stretch", description: "Joint mobility and dynamic stretch", durationMinutes: 10 },
        ]);
      }
    }
  }, [isOpen, routineToEdit]);

  if (!isOpen) return null;

  const handleAddStep = () => {
    setSteps([...steps, { title: "New Routine Activity", durationMinutes: 5 }]);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index));
    }
  };

  const handleMoveStep = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= steps.length) return;
    const reordered = [...steps];
    const temp = reordered[index];
    reordered[index] = reordered[targetIdx];
    reordered[targetIdx] = temp;
    setSteps(reordered);
  };

  const handleUpdateStep = (index: number, updates: Partial<Omit<RoutineStep, "id" | "order">>) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], ...updates };
    setSteps(updated);
  };

  const totalEstimatedMinutes = steps.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || steps.length === 0) return;

    const formattedSteps: RoutineStep[] = steps.map((s, idx) => ({
      ...s,
      id: `step-${Date.now()}-${idx}`,
      order: idx,
    }));

    const routinePayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      emoji,
      color,
      steps: formattedSteps,
      estimatedMinutes: totalEstimatedMinutes,
      schedule: {
        frequency,
        preferredTime,
      },
    };

    if (routineToEdit) {
      updateRoutine(routineToEdit.id, routinePayload);
    } else {
      createRoutine(routinePayload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span
              className="flex size-9 items-center justify-center rounded-xl text-lg"
              style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
            >
              {emoji}
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {routineToEdit ? "Edit Routine" : "Create New Routine"}
              </h2>
              <p className="text-xs text-muted-foreground">
                A structured sequence of activities to automate high performance.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs minddesk-scrollbar">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Routine Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Morning Focus Protocol, Evening Wind-Down..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-medium text-foreground focus:outline-primary"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Description (Optional)</label>
            <input
              type="text"
              placeholder="Short intention or purpose for this sequence..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-primary"
            />
          </div>

          {/* Emoji & Colors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground mb-1.5 block">Icon Emoji</label>
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_PRESETS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEmoji(em)}
                    className={`flex size-8 items-center justify-center rounded-lg border text-base cursor-pointer ${
                      emoji === em ? "border-primary bg-primary/10 scale-110" : "border-border hover:bg-muted"
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground mb-1.5 block">Color Accent</label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PRESETS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setColor(col)}
                    className="flex size-7 items-center justify-center rounded-full border border-border/60 cursor-pointer"
                    style={{ backgroundColor: col }}
                  >
                    {color === col && <Check size={12} className="text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3 border border-border">
            <div>
              <label className="font-semibold text-foreground mb-1 block">Recurring Schedule</label>
              <select
                value={frequency}
                onChange={(e) =>
                  setFrequency(e.target.value as "daily" | "weekdays" | "weekly")
                }
                className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium"
              >
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays (Mon-Fri)</option>
                <option value="weekly">Weekly (Sundays)</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-foreground mb-1 block">Preferred Time</label>
              <input
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium"
              />
            </div>
          </div>

          {/* Steps Sequence */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-foreground">
                Routine Steps ({steps.length}) — ~{totalEstimatedMinutes} mins total
              </label>
              <button
                type="button"
                onClick={handleAddStep}
                className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary/20 cursor-pointer"
              >
                <Plus size={12} /> Add Step
              </button>
            </div>

            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-card p-3 space-y-2 shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-black text-muted-foreground">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Step activity title"
                      value={step.title}
                      onChange={(e) => handleUpdateStep(idx, { title: e.target.value })}
                      className="flex-1 rounded-lg border border-input bg-background px-2.5 py-1 text-xs font-semibold"
                    />

                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        min="1"
                        max="180"
                        value={step.durationMinutes}
                        onChange={(e) =>
                          handleUpdateStep(idx, {
                            durationMinutes: Math.max(1, parseInt(e.target.value) || 5),
                          })
                        }
                        className="w-14 rounded-lg border border-input bg-background px-1.5 py-1 text-center text-xs font-semibold"
                      />
                      <span className="text-[10px] text-muted-foreground">m</span>
                    </div>

                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveStep(idx, "up")}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
                        title="Move up"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === steps.length - 1}
                        onClick={() => handleMoveStep(idx, "down")}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
                        title="Move down"
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={steps.length <= 1}
                        onClick={() => handleRemoveStep(idx)}
                        className="p-1 text-destructive hover:bg-destructive/10 rounded cursor-pointer disabled:opacity-20"
                        title="Remove step"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Optional Habit link */}
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>Link to Habit:</span>
                    <select
                      value={step.targetHabitId || ""}
                      onChange={(e) =>
                        handleUpdateStep(idx, { targetHabitId: e.target.value || undefined })
                      }
                      className="flex-1 rounded-md border border-input bg-background px-2 py-0.5 text-[11px]"
                    >
                      <option value="">None (Independent step)</option>
                      {activeHabits.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.emoji} {h.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-xl px-5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {routineToEdit ? "Save Routine" : "Create Routine"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
