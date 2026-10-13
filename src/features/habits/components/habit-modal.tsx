"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { X, Check, Clock, Bell, Target } from "lucide-react";
import type { Habit, HabitFrequencyType, HabitType } from "../types";
import { useHabits } from "../context/habits-context";
import { Button } from "@/components/ui/button";

interface HabitModalProps {
  isOpen: boolean;
  habitToEdit?: Habit | null;
  onClose: () => void;
}

const EMOJI_PRESETS = [
  "💧", "🏃", "📖", "✨", "🧘", "🥗", "💪", "💡", "🎯", "🧠", "💼", "🚶", "🎸", "✍️", "☕", "🚴"
];

const COLOR_PRESETS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#8b5cf6", // Violet
  "#f59e0b", // Amber
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#f97316", // Orange
  "#6366f1", // Indigo
];

const CATEGORIES = [
  "Health & Wellness",
  "Productivity",
  "Learning",
  "Mindfulness",
  "Personal",
  "Career & Sales",
  "Fitness",
];

const WEEKDAYS = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

export function HabitModal({ isOpen, habitToEdit, onClose }: HabitModalProps) {
  const { createHabit, updateHabit } = useHabits();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("✨");
  const [color, setColor] = useState("#3b82f6");
  const [category, setCategory] = useState("Productivity");
  const [type, setType] = useState<HabitType>("checkbox");
  const [target, setTarget] = useState<number>(1);
  const [unit, setUnit] = useState<string>("times");
  const [frequency, setFrequency] = useState<HabitFrequencyType>("daily");
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [interval, setInterval] = useState<number>(2);
  const [timesPerWeek, setTimesPerWeek] = useState<number>(3);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [preferredTime, setPreferredTime] = useState("08:00");
  const [reminderMinutes, setReminderMinutes] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      if (habitToEdit) {
        setName(habitToEdit.name);
        setDescription(habitToEdit.description || "");
        setEmoji(habitToEdit.emoji);
        setColor(habitToEdit.color);
        setCategory(habitToEdit.category);
        setType(habitToEdit.type);
        setTarget(habitToEdit.target || 1);
        setUnit(habitToEdit.unit || (habitToEdit.type === "duration" ? "mins" : "times"));
        setFrequency(habitToEdit.schedule.frequency);
        setSelectedWeekdays(habitToEdit.schedule.daysOfWeek || [1, 2, 3, 4, 5]);
        setInterval(habitToEdit.schedule.interval || 2);
        setTimesPerWeek(habitToEdit.schedule.timesPerWeek || 3);
        setDayOfMonth(habitToEdit.schedule.dayOfMonth || 1);
        setStartDate(habitToEdit.startDate);
        setPreferredTime(habitToEdit.preferredTime || "08:00");
        setReminderMinutes(habitToEdit.reminderMinutes ?? 0);
      } else {
        setName("");
        setDescription("");
        setEmoji("✨");
        setColor("#3b82f6");
        setCategory("Productivity");
        setType("checkbox");
        setTarget(1);
        setUnit("times");
        setFrequency("daily");
        setSelectedWeekdays([1, 2, 3, 4, 5]);
        setInterval(2);
        setTimesPerWeek(3);
        setDayOfMonth(1);
        setStartDate(format(new Date(), "yyyy-MM-dd"));
        setPreferredTime("08:00");
        setReminderMinutes(0);
      }
    }
  }, [isOpen, habitToEdit]);

  if (!isOpen) return null;

  const toggleWeekday = (val: number) => {
    if (selectedWeekdays.includes(val)) {
      if (selectedWeekdays.length > 1) {
        setSelectedWeekdays(selectedWeekdays.filter((d) => d !== val));
      }
    } else {
      setSelectedWeekdays([...selectedWeekdays, val]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const schedule = {
      frequency,
      daysOfWeek: frequency === "specific_days" ? selectedWeekdays : undefined,
      interval: frequency === "every_n_days" ? interval : undefined,
      timesPerWeek: frequency === "times_per_week" ? timesPerWeek : undefined,
      dayOfMonth: frequency === "monthly" ? dayOfMonth : undefined,
    };

    if (habitToEdit) {
      updateHabit(habitToEdit.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        emoji,
        color,
        category,
        type,
        target: type === "checkbox" ? 1 : target,
        unit: type === "checkbox" ? "session" : unit,
        schedule,
        startDate,
        preferredTime: preferredTime || undefined,
        reminderMinutes,
      });
    } else {
      createHabit({
        name: name.trim(),
        description: description.trim() || undefined,
        emoji,
        color,
        category,
        type,
        target: type === "checkbox" ? 1 : target,
        unit: type === "checkbox" ? "session" : unit,
        schedule,
        startDate,
        preferredTime: preferredTime || undefined,
        reminderMinutes,
        isPaused: false,
        isArchived: false,
      });
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
                {habitToEdit ? "Edit Habit" : "Create New Habit"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Define the recurring cue, schedule, and measurable progress target.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs minddesk-scrollbar">
          {/* Name & Emoji */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Habit Name *</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                placeholder="e.g. Read 20 minutes, Drink water, Practice sales..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-medium text-foreground focus:outline-primary"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Description (Optional)</label>
            <input
              type="text"
              placeholder="Why does this habit matter to your daily routine?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-primary"
            />
          </div>

          {/* Emoji & Color Presets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="font-semibold text-foreground mb-1.5 block">Icon Emoji</label>
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_PRESETS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEmoji(em)}
                    className={`flex size-8 items-center justify-center rounded-lg border text-base cursor-pointer transition-transform ${
                      emoji === em
                        ? "border-primary bg-primary/10 scale-110"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground mb-1.5 block">Accent Color</label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PRESETS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setColor(col)}
                    className="flex size-7 items-center justify-center rounded-full border border-border/60 cursor-pointer transition-transform hover:scale-110"
                    style={{ backgroundColor: col }}
                  >
                    {color === col && <Check size={12} className="text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-primary"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Habit Type (Checkbox / Duration / Quantity) */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Tracking Type</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType("checkbox");
                  setTarget(1);
                  setUnit("session");
                }}
                className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center cursor-pointer transition-colors ${
                  type === "checkbox"
                    ? "border-primary bg-primary/5 text-primary font-bold"
                    : "border-border hover:bg-muted text-muted-foreground"
                }`}
              >
                <Check size={16} className="mb-1" />
                <span>Checkbox</span>
                <span className="text-[10px] font-normal opacity-70">Mark done</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType("duration");
                  setTarget(30);
                  setUnit("mins");
                }}
                className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center cursor-pointer transition-colors ${
                  type === "duration"
                    ? "border-primary bg-primary/5 text-primary font-bold"
                    : "border-border hover:bg-muted text-muted-foreground"
                }`}
              >
                <Clock size={16} className="mb-1" />
                <span>Duration</span>
                <span className="text-[10px] font-normal opacity-70">Log minutes</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType("quantity");
                  setTarget(8);
                  setUnit("glasses");
                }}
                className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center cursor-pointer transition-colors ${
                  type === "quantity"
                    ? "border-primary bg-primary/5 text-primary font-bold"
                    : "border-border hover:bg-muted text-muted-foreground"
                }`}
              >
                <Target size={16} className="mb-1" />
                <span>Quantity</span>
                <span className="text-[10px] font-normal opacity-70">Increment count</span>
              </button>
            </div>
          </div>

          {/* Target & Unit for Duration and Quantity */}
          {type !== "checkbox" && (
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3 border border-border">
              <div>
                <label className="font-semibold text-foreground mb-1 block">
                  Daily Target
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={target}
                  onChange={(e) => setTarget(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-semibold text-foreground"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground mb-1 block">
                  Unit
                </label>
                <input
                  type="text"
                  placeholder={type === "duration" ? "mins" : "glasses, pages, reps"}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-semibold text-foreground"
                />
              </div>
            </div>
          )}

          {/* Frequency */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Schedule Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as HabitFrequencyType)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-primary"
            >
              <option value="daily">Daily (Every day)</option>
              <option value="weekdays">Weekdays (Monday to Friday)</option>
              <option value="specific_days">Specific Days of Week</option>
              <option value="every_n_days">Every N Days (Custom Interval)</option>
              <option value="times_per_week">Flexible N Times per Week</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Specific Weekdays Selector */}
          {frequency === "specific_days" && (
            <div className="space-y-1.5 rounded-xl bg-muted/40 p-3 border border-border">
              <label className="font-semibold text-foreground">Select Scheduled Days</label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((w) => {
                  const isSelected = selectedWeekdays.includes(w.value);
                  return (
                    <button
                      key={w.label}
                      type="button"
                      onClick={() => toggleWeekday(w.value)}
                      className={`flex-1 min-w-[42px] py-1.5 text-center rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {w.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Every N Days */}
          {frequency === "every_n_days" && (
            <div className="rounded-xl bg-muted/40 p-3 border border-border">
              <label className="font-semibold text-foreground mb-1 block">
                Repeat Interval (Days)
              </label>
              <div className="flex items-center gap-2">
                <span>Every</span>
                <input
                  type="number"
                  min="2"
                  max="365"
                  value={interval}
                  onChange={(e) => setInterval(Math.max(2, parseInt(e.target.value) || 2))}
                  className="w-20 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-semibold text-foreground text-center"
                />
                <span>days starting from {startDate}</span>
              </div>
            </div>
          )}

          {/* Times Per Week */}
          {frequency === "times_per_week" && (
            <div className="rounded-xl bg-muted/40 p-3 border border-border">
              <label className="font-semibold text-foreground mb-1 block">
                Target Days per Week
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={timesPerWeek}
                  onChange={(e) => setTimesPerWeek(Math.max(1, Math.min(6, parseInt(e.target.value) || 3)))}
                  className="w-20 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-semibold text-foreground text-center"
                />
                <span>times each week</span>
              </div>
            </div>
          )}

          {/* Monthly */}
          {frequency === "monthly" && (
            <div className="rounded-xl bg-muted/40 p-3 border border-border">
              <label className="font-semibold text-foreground mb-1 block">
                Day of Month (1 - 31)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                className="w-24 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-semibold text-foreground text-center"
              />
            </div>
          )}

          {/* Start Date & Preferred Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground mb-1 block">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-primary"
              />
            </div>
            <div>
              <label className="font-semibold text-foreground mb-1 block">Preferred Time</label>
              <input
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-primary"
              />
            </div>
          </div>

          {/* Smart Reminder Offset */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground flex items-center gap-1.5">
              <Bell size={13} className="text-primary" /> Optional In-App Reminder
            </label>
            <select
              value={reminderMinutes}
              onChange={(e) => setReminderMinutes(parseInt(e.target.value) || 0)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-primary"
            >
              <option value="0">At scheduled preferred time</option>
              <option value="5">5 minutes before</option>
              <option value="10">10 minutes before</option>
              <option value="15">15 minutes before</option>
              <option value="30">30 minutes before</option>
              <option value="-1">No reminder</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl px-4 text-xs font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-xl px-5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {habitToEdit ? "Save Changes" : "Create Habit"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
