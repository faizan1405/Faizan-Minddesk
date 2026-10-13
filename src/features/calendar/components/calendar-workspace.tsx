"use client";

import { useState, useEffect } from "react";
import { useCalendar } from "../calendar-context";
import { CalendarHeader } from "./calendar-header";
import { MonthView } from "./views/month-view";
import { WeekView } from "./views/week-view";
import { DayView } from "./views/day-view";
import { AgendaView } from "./views/agenda-view";
import { QuickEventComposer, QuickEventData } from "./quick-event-composer";
import { FullEventEditor } from "./full-event-editor";
import { EventDetailModal } from "./event-detail-modal";
import { CalendarSearchDialog } from "./calendar-search-dialog";
import { CalendarSettingsDialog } from "./calendar-settings-dialog";
import { CategoryFilterPopover } from "./category-filter-popover";
import { ExpandedCalendarEvent } from "../types";
import { parseISO } from "date-fns";

export function CalendarWorkspace() {
  const { isLoaded, view, setView, goToToday, setSelectedDate, categories } = useCalendar();

  // Modals state
  const [quickComposerOpen, setQuickComposerOpen] = useState(false);
  const [fullEditorOpen, setFullEditorOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);

  // Active items for modals
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<ExpandedCalendarEvent | null>(null);
  const [eventToEdit, setEventToEdit] = useState<ExpandedCalendarEvent | null>(null);
  const [composerDate, setComposerDate] = useState<string | undefined>(undefined);
  const [composerTime, setComposerTime] = useState<string | undefined>(undefined);
  const [fullEditorInitialData, setFullEditorInitialData] = useState<Partial<QuickEventData> | undefined>(undefined);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if focus is inside an input, textarea, or select
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchDialogOpen(true);
        return;
      }

      switch (e.key.toLowerCase()) {
        case "m":
          setView("month");
          break;
        case "w":
          setView("week");
          break;
        case "d":
          setView("day");
          break;
        case "a":
          setView("agenda");
          break;
        case "t":
          goToToday();
          break;
        case "c":
          e.preventDefault();
          setComposerDate(undefined);
          setComposerTime(undefined);
          setQuickComposerOpen(true);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setView, goToToday]);

  // Click on event
  const handleSelectEvent = (event: ExpandedCalendarEvent) => {
    setSelectedEventForDetail(event);
    setDetailModalOpen(true);
  };

  // Click on date cell (Month view)
  const handleDateClick = (dateStr: string) => {
    setComposerDate(dateStr);
    setComposerTime(undefined);
    setQuickComposerOpen(true);
  };

  // Click on time slot (Week & Day view)
  const handleSlotClick = (dateStr: string, timeStr: string) => {
    setComposerDate(dateStr);
    setComposerTime(timeStr);
    setQuickComposerOpen(true);
  };

  // Transition from Quick Composer to Full Editor
  const handleMoreOptions = (data: QuickEventData) => {
    setQuickComposerOpen(false);
    setEventToEdit(null);
    setFullEditorInitialData(data);
    setFullEditorOpen(true);
  };

  // Open Full Editor for editing
  const handleEditFromDetail = (event: ExpandedCalendarEvent) => {
    setDetailModalOpen(false);
    setEventToEdit(event);
    setFullEditorInitialData(undefined);
    setFullEditorOpen(true);
  };

  const activeCategoryCount = categories.filter((c) => c.isVisible).length;

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <div className="h-16 w-full rounded-2xl bg-muted/60 animate-pulse" />
        <div className="h-[600px] w-full rounded-2xl bg-muted/60 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <CalendarHeader
        onOpenCreate={() => {
          setComposerDate(undefined);
          setComposerTime(undefined);
          setQuickComposerOpen(true);
        }}
        onOpenSearch={() => setSearchDialogOpen(true)}
        onOpenSettings={() => setSettingsDialogOpen(true)}
        onOpenFilters={() => setFilterPopoverOpen(true)}
        activeCategoryCount={activeCategoryCount}
      />

      <section className="transition-all">
        {view === "month" && (
          <MonthView
            onSelectEvent={handleSelectEvent}
            onDateClick={handleDateClick}
          />
        )}
        {view === "week" && (
          <WeekView
            onSelectEvent={handleSelectEvent}
            onSlotClick={handleSlotClick}
          />
        )}
        {view === "day" && (
          <DayView
            onSelectEvent={handleSelectEvent}
            onSlotClick={handleSlotClick}
          />
        )}
        {view === "agenda" && (
          <AgendaView
            onSelectEvent={handleSelectEvent}
            onSelectDate={(dateStr) => {
              setSelectedDate(parseISO(dateStr));
              setView("day");
            }}
          />
        )}
      </section>

      {/* Modals & Popovers */}
      <QuickEventComposer
        isOpen={quickComposerOpen}
        onClose={() => setQuickComposerOpen(false)}
        onMoreOptions={handleMoreOptions}
        initialDate={composerDate}
        initialTime={composerTime}
      />

      <FullEventEditor
        isOpen={fullEditorOpen}
        onClose={() => setFullEditorOpen(false)}
        eventToEdit={eventToEdit}
        initialData={fullEditorInitialData}
      />

      <EventDetailModal
        isOpen={detailModalOpen}
        event={selectedEventForDetail}
        onClose={() => setDetailModalOpen(false)}
        onEdit={handleEditFromDetail}
      />

      <CalendarSearchDialog
        isOpen={searchDialogOpen}
        onClose={() => setSearchDialogOpen(false)}
        onSelectEvent={handleSelectEvent}
      />

      <CalendarSettingsDialog
        isOpen={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
      />

      <CategoryFilterPopover
        isOpen={filterPopoverOpen}
        onClose={() => setFilterPopoverOpen(false)}
      />
    </div>
  );
}
