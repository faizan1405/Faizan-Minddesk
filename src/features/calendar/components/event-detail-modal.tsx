"use client";

import { ExpandedCalendarEvent } from "../types";
import { useCalendar } from "../calendar-context";
import {
  X,
  Clock,
  MapPin,
  Video,
  ExternalLink,
  Repeat,
  Edit3,
  Trash2,
  Copy,
  FolderKanban,
  CheckSquare,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { formatTimeDisplay } from "../services/calendar-layout";

interface EventDetailModalProps {
  isOpen: boolean;
  event: ExpandedCalendarEvent | null;
  onClose: () => void;
  onEdit: (event: ExpandedCalendarEvent) => void;
}

export function EventDetailModal({
  isOpen,
  event,
  onClose,
  onEdit,
}: EventDetailModalProps) {
  const {
    categories,
    deleteEvent,
    duplicateEvent,
    settings,
    projects,
    tasks,
  } = useCalendar();

  if (!isOpen || !event) return null;

  const category = categories.find((c) => c.id === event.categoryId) || categories[0];
  const linkedProject = projects.find((p) => p.id === event.projectId);
  const linkedTask = tasks.find((t) => t.id === event.linkedTaskId);

  const formattedDate = (() => {
    try {
      const start = parseISO(event.startDate);
      const end = event.endDate ? parseISO(event.endDate) : start;
      if (event.allDay) {
        if (event.startDate === event.endDate || !event.endDate) {
          return `${format(start, "EEEE, MMMM d, yyyy")} · All day`;
        }
        return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")} · All day`;
      }
      const timeStr = `${formatTimeDisplay(event.startTime, settings.timeFormat)} – ${formatTimeDisplay(
        event.endTime,
        settings.timeFormat
      )}`;
      return `${format(start, "EEEE, MMMM d, yyyy")} · ${timeStr}`;
    } catch {
      return `${event.startDate} ${event.startTime || ""}`;
    }
  })();

  const handleDelete = () => {
    deleteEvent(
      event.originalEventId || event.id,
      event.isOccurrence ? "this" : "series",
      event.occurrenceDate || event.startDate
    );
    onClose();
  };

  const handleDuplicate = () => {
    duplicateEvent(event.originalEventId || event.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs motion-safe:animate-fade-in">
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card text-card-foreground p-5 sm:p-6 shadow-2xl motion-safe:animate-fade-in-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
      >
        {/* Top actions & close */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-1.5">
            <span
              className="size-3 rounded-full"
              style={{ backgroundColor: event.customColor || category?.color || "#2563eb" }}
            />
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${category?.bgClass}`}
            >
              {category?.name || "General"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(event);
              }}
              title="Edit event"
              aria-label="Edit event"
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <Edit3 size={15} />
            </button>
            <button
              type="button"
              onClick={handleDuplicate}
              title="Duplicate event"
              aria-label="Duplicate event"
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <Copy size={15} />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              title="Delete event"
              aria-label="Delete event"
              className="flex size-7 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <Trash2 size={15} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="mt-4">
          <h2 id="detail-title" className="text-lg font-bold text-foreground leading-snug">
            {event.title}
          </h2>
          <p className="mt-1 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Clock size={13} className="shrink-0" />
            <span>{formattedDate}</span>
          </p>
        </div>

        {/* Recurrence badge */}
        {event.recurrence && (
          <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary border border-primary/20">
            <Repeat size={12} />
            <span>Repeats {event.recurrence.frequency.toLowerCase()}</span>
          </div>
        )}

        {/* Meeting Join Button */}
        {event.meetingUrl && (
          <div className="mt-4">
            <a
              href={event.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs sm:text-sm font-semibold text-primary-foreground shadow-xs hover:opacity-90 active:scale-98 transition-all cursor-pointer"
            >
              <Video size={15} />
              <span>Join with Video Call</span>
              <ExternalLink size={13} />
            </a>
          </div>
        )}

        {/* Location */}
        {event.location && (
          <div className="mt-3.5 flex items-start gap-2 text-xs text-foreground">
            <MapPin size={14} className="text-muted-foreground shrink-0 mt-0.5" />
            <span className="font-medium">{event.location}</span>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div className="mt-3.5 rounded-xl bg-muted/50 p-3 text-xs text-foreground leading-relaxed border border-border whitespace-pre-wrap">
            {event.description}
          </div>
        )}

        {/* Linked Project or Task */}
        {(linkedProject || linkedTask) && (
          <div className="mt-4 border-t border-border pt-3 flex flex-wrap gap-2 text-xs">
            {linkedProject && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 font-medium text-foreground">
                <FolderKanban size={12} />
                <span>{linkedProject.name}</span>
              </span>
            )}
            {linkedTask && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 font-medium text-primary border border-primary/20">
                <CheckSquare size={12} />
                <span>Task: {linkedTask.title}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
