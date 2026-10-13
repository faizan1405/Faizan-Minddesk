"use client";

import { useState, useEffect } from "react";
import { useCalendar } from "../calendar-context";
import {
  CalendarEvent,
  ExpandedCalendarEvent,
  RecurrenceFrequency,
  DayOfWeek,
  RecurrenceRule,
} from "../types";
import {
  X,
  Clock,
  Tag,
  MapPin,
  Video,
  Repeat,
  Bell,
  FolderKanban,
  CheckSquare,
  FileText,
  Trash2,
  Copy,
} from "lucide-react";
import { format } from "date-fns";
import { RecurrencePromptDialog } from "./recurrence-prompt-dialog";

interface FullEventEditorProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: ExpandedCalendarEvent | null;
  initialData?: Partial<CalendarEvent>;
}

const DAYS_OF_WEEK: { id: DayOfWeek; label: string }[] = [
  { id: "MO", label: "M" },
  { id: "TU", label: "T" },
  { id: "WE", label: "W" },
  { id: "TH", label: "T" },
  { id: "FR", label: "F" },
  { id: "SA", label: "S" },
  { id: "SU", label: "S" },
];

export function FullEventEditor({
  isOpen,
  onClose,
  eventToEdit,
  initialData,
}: FullEventEditorProps) {
  const {
    categories,
    projects,
    tasks,
    addEvent,
    updateEvent,
    deleteEvent,
    duplicateEvent,
    updateEventOccurrence,
  } = useCalendar();

  const isEditing = !!eventToEdit;
  const isRecurringOccurrence = !!eventToEdit?.isOccurrence;

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "cat-work");
  const [customColor, setCustomColor] = useState("");
  const [location, setLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");

  // Recurrence states
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("WEEKLY");
  const [interval, setInterval] = useState(1);
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(["MO"]);
  const [endType, setEndType] = useState<"never" | "untilDate" | "count">("never");
  const [untilDate, setUntilDate] = useState("");
  const [recurrenceCount, setRecurrenceCount] = useState(10);

  // Reminders & Relations
  const [reminderMinutes, setReminderMinutes] = useState<number>(10);
  const [projectId, setProjectId] = useState<string>("");
  const [linkedTaskId, setLinkedTaskId] = useState<string>("");
  const [linkedNoteId, setLinkedNoteId] = useState<string>("");

  // Recurrence scope prompt dialog
  const [scopePromptOpen, setScopePromptOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"edit" | "delete" | null>(null);

  // Initialize form
  useEffect(() => {
    if (!isOpen) return;

    if (eventToEdit) {
      setTitle(eventToEdit.title || "");
      setDescription(eventToEdit.description || "");
      setStartDate(eventToEdit.startDate);
      setStartTime(eventToEdit.startTime || "09:00");
      setEndDate(eventToEdit.endDate || eventToEdit.startDate);
      setEndTime(eventToEdit.endTime || "10:00");
      setAllDay(eventToEdit.allDay || false);
      setCategoryId(eventToEdit.categoryId || categories[0]?.id || "cat-work");
      setCustomColor(eventToEdit.customColor || "");
      setLocation(eventToEdit.location || "");
      setMeetingUrl(eventToEdit.meetingUrl || "");
      setReminderMinutes(eventToEdit.reminderMinutes !== undefined ? eventToEdit.reminderMinutes : 10);
      setProjectId(eventToEdit.projectId || "");
      setLinkedTaskId(eventToEdit.linkedTaskId || "");
      setLinkedNoteId(eventToEdit.linkedNoteId || "");

      if (eventToEdit.recurrence) {
        setIsRecurring(true);
        setFrequency(eventToEdit.recurrence.frequency);
        setInterval(eventToEdit.recurrence.interval || 1);
        setSelectedDays(eventToEdit.recurrence.daysOfWeek || ["MO"]);
        setEndType(eventToEdit.recurrence.endType || "never");
        setUntilDate(eventToEdit.recurrence.untilDate || "");
        setRecurrenceCount(eventToEdit.recurrence.count || 10);
      } else {
        setIsRecurring(false);
      }
    } else {
      // Create mode
      setTitle(initialData?.title || "");
      setDescription(initialData?.description || "");
      setStartDate(initialData?.startDate || format(new Date(), "yyyy-MM-dd"));
      setStartTime(initialData?.startTime || "09:00");
      setEndDate(initialData?.endDate || initialData?.startDate || format(new Date(), "yyyy-MM-dd"));
      setEndTime(initialData?.endTime || "10:00");
      setAllDay(initialData?.allDay || false);
      setCategoryId(initialData?.categoryId || categories[0]?.id || "cat-work");
      setCustomColor(initialData?.customColor || "");
      setLocation(initialData?.location || "");
      setMeetingUrl(initialData?.meetingUrl || "");
      setIsRecurring(false);
      setReminderMinutes(10);
      setProjectId(initialData?.projectId || "");
      setLinkedTaskId(initialData?.linkedTaskId || "");
      setLinkedNoteId(initialData?.linkedNoteId || "");
    }
  }, [isOpen, eventToEdit, initialData, categories]);

  if (!isOpen) return null;

  const buildRecurrenceRule = (): RecurrenceRule | undefined => {
    if (!isRecurring) return undefined;
    return {
      frequency,
      interval: Math.max(1, interval),
      daysOfWeek: frequency === "WEEKLY" ? selectedDays : undefined,
      endType,
      untilDate: endType === "untilDate" ? untilDate : undefined,
      count: endType === "count" ? recurrenceCount : undefined,
    };
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (isEditing && isRecurringOccurrence) {
      setPendingAction("edit");
      setScopePromptOpen(true);
      return;
    }

    commitSave("series");
  };

  const commitSave = (scope: "this" | "series") => {
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      startDate,
      startTime: allDay ? undefined : startTime,
      endDate: allDay ? startDate : endDate,
      endTime: allDay ? undefined : endTime,
      allDay,
      categoryId,
      customColor: customColor || undefined,
      location: location.trim() || undefined,
      meetingUrl: meetingUrl.trim() || undefined,
      recurrence: buildRecurrenceRule(),
      reminderMinutes,
      projectId: projectId || undefined,
      linkedTaskId: linkedTaskId || undefined,
      linkedNoteId: linkedNoteId || undefined,
    };

    if (isEditing && eventToEdit) {
      if (scope === "this" && isRecurringOccurrence) {
        updateEventOccurrence(
          eventToEdit.originalEventId || eventToEdit.id,
          eventToEdit.occurrenceDate || eventToEdit.startDate,
          payload
        );
      } else {
        updateEvent(eventToEdit.originalEventId || eventToEdit.id, payload);
      }
    } else {
      addEvent(payload);
    }

    onClose();
  };

  const handleDelete = () => {
    if (!eventToEdit) return;
    if (isRecurringOccurrence) {
      setPendingAction("delete");
      setScopePromptOpen(true);
      return;
    }
    deleteEvent(eventToEdit.id, "series");
    onClose();
  };

  const handleDuplicate = () => {
    if (!eventToEdit) return;
    duplicateEvent(eventToEdit.originalEventId || eventToEdit.id);
    onClose();
  };

  const handleScopeDecision = (scope: "this" | "series") => {
    setScopePromptOpen(false);
    if (!eventToEdit) return;

    if (pendingAction === "edit") {
      commitSave(scope);
    } else if (pendingAction === "delete") {
      deleteEvent(
        eventToEdit.originalEventId || eventToEdit.id,
        scope,
        eventToEdit.occurrenceDate || eventToEdit.startDate
      );
      onClose();
    }
    setPendingAction(null);
  };

  const toggleDayOfWeek = (day: DayOfWeek) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? (prev.length > 1 ? prev.filter((d) => d !== day) : prev) : [...prev, day]
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
        <div
          className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-card text-card-foreground p-5 sm:p-6 shadow-2xl motion-safe:animate-fade-in-up my-auto"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              {isEditing ? "Edit Event" : "Create Event"}
            </h2>
            <div className="flex items-center gap-1.5">
              {isEditing && (
                <>
                  <button
                    type="button"
                    onClick={handleDuplicate}
                    title="Duplicate event"
                    aria-label="Duplicate event"
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    title="Delete event"
                    aria-label="Delete event"
                    className="flex size-8 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSave} className="mt-4 space-y-4 sm:space-y-5">
            {/* Title */}
            <div>
              <label htmlFor="evt-title" className="block text-xs font-semibold text-foreground mb-1">
                Event Title *
              </label>
              <input
                id="evt-title"
                type="text"
                required
                placeholder="e.g. Executive Strategy Alignment"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>

            {/* Date & Time Settings */}
            <div className="rounded-xl border border-border bg-muted/40 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Clock size={14} className="text-primary" />
                  Date & Time
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
                    className="size-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-muted-foreground">All-day event</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Starts</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (endDate < e.target.value) setEndDate(e.target.value);
                      }}
                      className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground"
                    />
                    {!allDay && (
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-24 rounded-lg border border-input bg-background px-2 py-1.5 text-xs font-medium text-foreground"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Ends</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground"
                    />
                    {!allDay && (
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-24 rounded-lg border border-input bg-background px-2 py-1.5 text-xs font-medium text-foreground"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Recurrence Settings */}
            <div className="rounded-xl border border-border bg-muted/40 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Repeat size={14} className="text-primary" />
                  Recurrence
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="size-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-muted-foreground">Repeat</span>
                </label>
              </div>

              {isRecurring && (
                <div className="space-y-3 pt-1 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Frequency</label>
                      <select
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                        className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground"
                      >
                        <option value="DAILY">Daily</option>
                        <option value="WEEKDAY">Every weekday (Mon–Fri)</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="YEARLY">Yearly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Interval</label>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={interval}
                        onChange={(e) => setInterval(parseInt(e.target.value, 10) || 1)}
                        className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground"
                      />
                    </div>
                  </div>

                  {frequency === "WEEKLY" && (
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1.5">Repeat on</label>
                      <div className="flex gap-1.5">
                        {DAYS_OF_WEEK.map((d) => {
                          const isSel = selectedDays.includes(d.id);
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => toggleDayOfWeek(d.id)}
                              className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-all cursor-pointer ${
                                isSel
                                  ? "bg-primary text-primary-foreground shadow-xs"
                                  : "bg-background border border-border text-foreground hover:bg-muted"
                              }`}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Ends</label>
                      <select
                        value={endType}
                        onChange={(e) => setEndType(e.target.value as "never" | "untilDate" | "count")}
                        className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground"
                      >
                        <option value="never">Never</option>
                        <option value="untilDate">On date</option>
                        <option value="count">After occurrences</option>
                      </select>
                    </div>

                    {endType === "untilDate" && (
                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">End Date</label>
                        <input
                          type="date"
                          value={untilDate}
                          onChange={(e) => setUntilDate(e.target.value)}
                          className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground"
                        />
                      </div>
                    )}

                    {endType === "count" && (
                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Max count</label>
                        <input
                          type="number"
                          min="1"
                          max="999"
                          value={recurrenceCount}
                          onChange={(e) => setRecurrenceCount(parseInt(e.target.value, 10) || 1)}
                          className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Category & Color */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Tag size={13} className="text-primary" />
                Category
              </label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? "ring-2 ring-primary font-semibold shadow-xs"
                          : "opacity-80 hover:opacity-100"
                      } ${cat.bgClass}`}
                    >
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Location & Meeting URL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
                  <MapPin size={13} className="text-muted-foreground" />
                  Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Conference Room B"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
                  <Video size={13} className="text-muted-foreground" />
                  Meeting URL
                </label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-primary"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
                <FileText size={13} className="text-muted-foreground" />
                Description / Notes
              </label>
              <textarea
                rows={3}
                placeholder="Add meeting agenda, notes, or preparation guidelines..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-primary resize-none"
              />
            </div>

            {/* Relations: Reminder, Project, Linked Task */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                  <Bell size={12} />
                  Reminder
                </label>
                <select
                  value={reminderMinutes}
                  onChange={(e) => setReminderMinutes(parseInt(e.target.value, 10))}
                  className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs font-medium text-foreground"
                >
                  <option value={0}>At event time</option>
                  <option value={5}>5 minutes before</option>
                  <option value={10}>10 minutes before</option>
                  <option value={15}>15 minutes before</option>
                  <option value={30}>30 minutes before</option>
                  <option value={60}>1 hour before</option>
                  <option value={1440}>1 day before</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                  <FolderKanban size={12} />
                  Project
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs font-medium text-foreground"
                >
                  <option value="">None</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                  <CheckSquare size={12} />
                  Linked Task
                </label>
                <select
                  value={linkedTaskId}
                  onChange={(e) => setLinkedTaskId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs font-medium text-foreground"
                >
                  <option value="">None</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title.slice(0, 24)}...
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 border-t border-border pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border px-4 py-2 text-xs sm:text-sm font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-primary px-5 py-2 text-xs sm:text-sm font-semibold text-primary-foreground shadow-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                {isEditing ? "Save Changes" : "Create Event"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <RecurrencePromptDialog
        isOpen={scopePromptOpen}
        actionType={pendingAction || "edit"}
        onSelectScope={handleScopeDecision}
        onClose={() => {
          setScopePromptOpen(false);
          setPendingAction(null);
        }}
      />
    </>
  );
}
