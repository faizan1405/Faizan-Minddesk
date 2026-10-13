"use client";

import { useCalendar } from "../calendar-context";
import { CalendarViewType } from "../types";
import { format, startOfWeek, endOfWeek } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Settings,
  Filter,
  CalendarDays,
} from "lucide-react";
import { PlanYourDayButton } from "@/features/planner/components/plan-your-day-button";

interface CalendarHeaderProps {
  onOpenCreate: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onOpenFilters: () => void;
  activeCategoryCount: number;
}

export function CalendarHeader({
  onOpenCreate,
  onOpenSearch,
  onOpenSettings,
  onOpenFilters,
  activeCategoryCount,
}: CalendarHeaderProps) {
  const {
    selectedDate,
    view,
    setView,
    goToToday,
    goToPrevious,
    goToNext,
    settings,
  } = useCalendar();

  // Format header title based on view
  const headerTitle = (() => {
    switch (view) {
      case "month":
        return format(selectedDate, "MMMM yyyy");
      case "week": {
        const start = startOfWeek(selectedDate, { weekStartsOn: settings.weekStartsOn });
        const end = endOfWeek(selectedDate, { weekStartsOn: settings.weekStartsOn });
        if (format(start, "MMM") === format(end, "MMM")) {
          return `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`;
        }
        return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
      }
      case "day":
        return format(selectedDate, "EEEE, MMMM d, yyyy");
      case "agenda":
        return `Agenda · ${format(selectedDate, "MMMM yyyy")}`;
      default:
        return format(selectedDate, "MMMM yyyy");
    }
  })();

  const viewOptions: { id: CalendarViewType; label: string }[] = [
    { id: "month", label: "Month" },
    { id: "week", label: "Week" },
    { id: "day", label: "Day" },
    { id: "agenda", label: "Agenda" },
  ];

  return (
    <header className="flex flex-col gap-3 rounded-2xl border border-border bg-card text-card-foreground p-3.5 sm:p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      {/* Left side: Navigation, Today, and Title */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={goToToday}
            className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs sm:text-sm font-semibold text-foreground shadow-2xs hover:bg-muted active:scale-95 transition-all cursor-pointer"
          >
            Today
          </button>

          <div className="flex items-center rounded-xl border border-border bg-muted/50 p-0.5">
            <button
              type="button"
              onClick={goToPrevious}
              aria-label="Previous period"
              className="flex size-7 sm:size-8 items-center justify-center rounded-lg text-foreground hover:bg-background hover:shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={goToNext}
              aria-label="Next period"
              className="flex size-7 sm:size-8 items-center justify-center rounded-lg text-foreground hover:bg-background hover:shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2 min-w-[140px] sm:min-w-[200px]">
          <CalendarDays className="size-5 text-primary shrink-0 hidden sm:inline-block" />
          <span>{headerTitle}</span>
        </h1>
      </div>

      {/* Right side: View Switcher, Actions & Plan your day */}
      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 sm:gap-2.5">
        {/* View Switcher Tabs */}
        <div className="flex items-center rounded-xl bg-muted p-1 border border-border">
          {viewOptions.map((opt) => {
            const isActive = view === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setView(opt.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-background text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenSearch}
            title="Search events (Ctrl+K)"
            aria-label="Search events"
            className="flex size-8 sm:size-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer"
          >
            <Search size={15} />
          </button>

          <button
            type="button"
            onClick={onOpenFilters}
            title="Filter categories"
            aria-label="Filter categories"
            className="relative flex size-8 sm:size-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer"
          >
            <Filter size={15} />
            {activeCategoryCount > 0 && (
              <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-xs">
                {activeCategoryCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            title="Calendar settings"
            aria-label="Calendar settings"
            className="flex size-8 sm:size-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer"
          >
            <Settings size={15} />
          </button>
        </div>

        {/* Plan your day button */}
        <PlanYourDayButton size="sm" variant="subtle" />

        {/* Create Event Button */}
        <button
          type="button"
          onClick={onOpenCreate}
          className="inline-flex h-8 sm:h-9 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 sm:px-3.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer"
        >
          <Plus size={16} strokeWidth={2.4} />
          <span>Create</span>
        </button>
      </div>
    </header>
  );
}
