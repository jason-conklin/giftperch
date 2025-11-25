"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export type OccasionEvent = {
  id: string;
  date: string;
  title: string;
  type: "birthday" | "anniversary" | "holiday" | "custom";
  recipientName?: string;
  isGlobal?: boolean;
};

type CalendarDay = {
  key: string;
  date: Date;
  isCurrentMonth: boolean;
  events: OccasionEvent[];
};

export type OccasionsCalendarProps = {
  events: OccasionEvent[];
  emptyMessage?: string;
  isLoading?: boolean;
  onAddDate?: (isoDate: string) => void;
};

const getDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getOccasionIcon = (event: OccasionEvent) => {
  const value = `${event.type ?? ""} ${event.title ?? ""}`.toLowerCase();

  if (value.includes("birthday")) return "/icons/occasions/icon-occasion-birthday.png";
  if (value.includes("christmas")) return "/icons/occasions/icon-occasion-christmas.png";
  if (value.includes("valentine")) return "/icons/occasions/icon-occasion-valentines.png";
  if (value.includes("mother")) return "/icons/occasions/icon-occasion-mothersday.png";
  if (value.includes("father")) return "/icons/occasions/icon-occasion-fathersday.png";
  if (value.includes("new year")) return "/icons/occasions/icon-occasion-newyears.png";
  if (value.includes("thank")) return "/icons/occasions/icon-occasion-thanksgiving.png";
  if (value.includes("anniversary") || value.includes("wedding"))
    return "/icons/occasions/icon-occasion-anniversary.png";
  if (value.includes("graduation")) return "/icons/occasions/icon-occasion-graduation.png";
  if (value.includes("halloween")) return "/icons/occasions/icon-occasion-halloween.png";
  return "/icons/occasions/icon-occasion-gift.png";
};

const eventTypeStyles: Record<
  OccasionEvent["type"],
  { chip: string; label: string }
> = {
  birthday: {
    chip: "bg-gp-gold/25 text-gp-evergreen",
    label: "Birthday",
  },
  anniversary: {
    chip: "bg-gp-evergreen/10 text-gp-evergreen",
    label: "Anniversary",
  },
  holiday: {
    chip: "bg-gp-evergreen text-gp-cream",
    label: "Holiday",
  },
  custom: {
    chip: "bg-white text-gp-evergreen border border-gp-evergreen/20",
    label: "Occasion",
  },
};

const HolidayCell = ({ title, icon }: { title: string; icon: string }) => (
  <div className="flex w-full flex-1 flex-col items-center justify-center gap-1 overflow-hidden px-1 text-center">
    <Image
      src={icon}
      alt={title}
      width={32}
      height={32}
      className="h-6 w-6 sm:h-8 sm:w-8 object-contain pointer-events-none"
    />
    <span className="w-full text-[11px] leading-tight text-gp-evergreen/80 sm:text-xs text-center">
      {title}
    </span>
  </div>
);

export function OccasionsCalendar({
  events,
  emptyMessage,
  isLoading = false,
  onAddDate,
}: OccasionsCalendarProps) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const yearRange = 5;
  const yearOptions = useMemo(
    () =>
      Array.from({ length: yearRange * 2 + 1 }, (_, index) => currentYear - yearRange + index),
    [currentYear, yearRange],
  );
  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, OccasionEvent[]>();
    events.forEach((event) => {
      const eventDate = new Date(event.date);
      if (Number.isNaN(eventDate.getTime())) return;
      const normalized = new Date(
        eventDate.getFullYear(),
        eventDate.getMonth(),
        eventDate.getDate()
      );
      const key = getDateKey(normalized);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(event);
    });
    return map;
  }, [events]);

  const calendarDays = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const startOffset = start.getDay();
    const firstVisible = new Date(start);
    firstVisible.setDate(firstVisible.getDate() - startOffset);

    const days: CalendarDay[] = [];
    for (let index = 0; index < 42; index += 1) {
      const date = new Date(firstVisible);
      date.setDate(firstVisible.getDate() + index);
      const key = getDateKey(date);
      days.push({
        key,
        date,
        isCurrentMonth: date.getMonth() === currentMonth.getMonth(),
        events: [...(eventsByDay.get(key) ?? [])].sort((a, b) => {
          const aDate = new Date(a.date).getTime();
          const bDate = new Date(b.date).getTime();
          return aDate - bDate;
        }),
      });
    }
    return days;
  }, [currentMonth, eventsByDay]);

  const selectedEvents =
    selectedDayKey && eventsByDay.has(selectedDayKey)
      ? eventsByDay.get(selectedDayKey) ?? []
      : [];

  const hasEvents = events.length > 0;
  const appliedEmptyMessage =
    emptyMessage ??
    "No occasions on the calendar yet. Add birthdays || special dates to see them here.";

  const changeMonth = (direction: "prev" | "next") => {
    setSelectedDayKey(null);
    setCurrentMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1));
      return next;
    });
  };

  const handleSelectMonth = (monthIndex: number) => {
    setSelectedDayKey(null);
    setCurrentMonth((prev) => new Date(prev.getFullYear(), monthIndex, 1));
  };

  const handleSelectYear = (year: number) => {
    setSelectedDayKey(null);
    setCurrentMonth((prev) => new Date(year, prev.getMonth(), 1));
  };

  const handleJumpToToday = () => {
    setSelectedDayKey(null);
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const isOnCurrentMonth =
    currentMonth.getFullYear() === today.getFullYear() &&
    currentMonth.getMonth() === today.getMonth();

  return (
    <section
      aria-label="Occasions calendar"
      className="gp-card space-y-5"
      role="region"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-gp-evergreen/60">
            Gifting calendar
          </p>
          <h2 className="text-2xl font-semibold text-gp-evergreen">
            {currentMonth.toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isOnCurrentMonth ? (
            <button
              type="button"
              onClick={handleJumpToToday}
              className="rounded-full border border-gp-evergreen/30 bg-gp-cream/80 px-3 py-1.5 text-xs font-semibold text-gp-evergreen transition hover:bg-gp-cream focus:outline-none focus:ring-2 focus:ring-gp-evergreen/30"
            >
              Jump to present
            </button>
          ) : null}
          <select
            aria-label="Select month"
            value={currentMonth.getMonth()}
            onChange={(event) => handleSelectMonth(Number(event.target.value))}
            className="rounded-full border border-gp-cream bg-gp-cream/80 px-3 py-1 text-sm font-semibold text-gp-evergreen shadow-sm transition hover:bg-gp-cream focus:outline-none focus:ring-2 focus:ring-gp-evergreen/40 cursor-pointer"
          >
            {MONTH_LABELS.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Select year"
            value={currentMonth.getFullYear()}
            onChange={(event) => handleSelectYear(Number(event.target.value))}
            className="rounded-full border border-gp-cream bg-gp-cream/80 px-3 py-1 text-sm font-semibold text-gp-evergreen shadow-sm transition hover:bg-gp-cream focus:outline-none focus:ring-2 focus:ring-gp-evergreen/40 cursor-pointer"
          >
            {yearOptions.map((yearOption) => (
              <option key={yearOption} value={yearOption}>
                {yearOption}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-full bg-gp-evergreen px-3 py-2 text-sm font-semibold text-gp-cream transition hover:bg-[#0c3132] cursor-pointer"
            onClick={() => changeMonth("prev")}
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded-full bg-gp-evergreen px-3 py-2 text-sm font-semibold text-gp-cream transition hover:bg-[#0c3132] cursor-pointer"
            onClick={() => changeMonth("next")}
          >
            Next
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-x-hidden">
        <div className="rounded-[32px] border border-gp-evergreen/5 bg-white/95 px-3 py-4 shadow-sm sm:px-6 sm:py-6">
          <div className="grid grid-cols-7 gap-x-2 text-[11px] font-medium text-gp-evergreen/70 sm:text-xs">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center">
                {day}
              </div>
            ))}
          </div>
          <div
            className="mt-3 grid grid-cols-7 gap-1 sm:mt-4 sm:gap-3"
            role="grid"
          >
            {calendarDays.map((day) => {
              const isToday =
                day.date.getFullYear() === today.getFullYear() &&
                day.date.getMonth() === today.getMonth() &&
                day.date.getDate() === today.getDate();
              const primaryEvent = day.events[0];

              return (
                <button
                  key={day.key}
                  type="button"
                  role="gridcell"
                  aria-label={`${
                    day.date.toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                    }) ?? ""
                  } with ${day.events.length} events`}
                  className={`relative flex aspect-square flex-col items-center justify-start overflow-hidden rounded-3xl border px-2 pb-1 pt-1 text-left transition sm:px-3 sm:pb-2 sm:pt-2 ${
                    day.isCurrentMonth
                      ? "bg-gp-cream/70 text-gp-evergreen"
                      : "bg-gp-cream/50 text-gp-evergreen/50"
                  } ${
                    isToday
                      ? "border-gp-gold/70 ring-2 ring-gp-gold/25"
                      : "border-gp-evergreen/10 hover:border-gp-evergreen/40"
                  } focus:outline-none focus:ring-2 focus:ring-gp-evergreen/30`}
                  onClick={() => setSelectedDayKey(day.key)}
                >
                  <div className="flex w-full justify-start px-1">
                    <p className="text-[11px] font-semibold sm:text-sm">
                      {day.date.getDate()}
                    </p>
                  </div>
                  {primaryEvent ? (
                    <HolidayCell
                      title={primaryEvent.title}
                      icon={getOccasionIcon(primaryEvent)}
                    />
                  ) : (
                    <div className="flex flex-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-gp-evergreen/70">Loading occasions...</p>
      ) : null}

      {!hasEvents ? (
        <p className="rounded-2xl border border-dashed border-gp-evergreen/20 bg-gp-cream/60 px-4 py-3 text-sm text-gp-evergreen/70">
          {appliedEmptyMessage}
        </p>
      ) : null}

      <div className="rounded-3xl border border-gp-evergreen/10 bg-gp-cream/70 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.2em] text-gp-evergreen/60">
            {selectedEvents.length ? "Day details" : "Browse dates"}
          </p>
          {selectedEvents.length ? (
            <button
              type="button"
              className="text-sm font-semibold text-gp-evergreen/70 hover:text-gp-evergreen focus:outline-none"
              aria-label="Close day details"
              onClick={() => setSelectedDayKey(null)}
            >
              ×
            </button>
          ) : null}
        </div>
        {selectedEvents.length ? (
          <div className="mt-3 space-y-3">
            {selectedEvents.map((event) => {
              const icon = getOccasionIcon(event);
              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 rounded-2xl bg-white/80 p-3 shadow-sm"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gp-cream/80 border border-gp-evergreen/10">
                    <Image
                      src={icon}
                      alt={event.title}
                      width={28}
                      height={28}
                      className="h-7 w-7 object-contain"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gp-evergreen">
                        {event.title}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          event.isGlobal && event.type === "holiday"
                            ? "bg-gp-gold/30 text-gp-evergreen border border-gp-gold/50"
                            : eventTypeStyles[event.type].chip
                        }`}
                      >
                        {eventTypeStyles[event.type].label}
                      </span>
                    </div>
                    {event.recipientName ? (
                      <p className="text-xs text-gp-evergreen/70">
                        {event.recipientName}
                      </p>
                    ) : null}
                    {event.isGlobal ? (
                      <p className="text-[11px] uppercase tracking-wide text-gp-evergreen/60">
                        Global holiday (U.S.)
                      </p>
                    ) : null}
                    <p className="text-xs text-gp-evergreen/60">
                      {new Date(event.date).toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : selectedDayKey ? (
          <div className="mt-3 space-y-3">
            <div className="flex items-start gap-3 rounded-2xl bg-white/80 p-3 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gp-cream/80 border border-gp-evergreen/10">
                <Image
                  src="/icons/occasions/icon-occasion-day.png"
                  alt="Day icon"
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold text-gp-evergreen">
                  No special occasion
                </p>
                <p className="text-xs text-gp-evergreen/60">
                  {new Date(selectedDayKey).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                {onAddDate ? (
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center justify-center rounded-full border border-gp-evergreen/20 bg-white px-3 py-1 text-xs font-semibold text-gp-evergreen transition hover:bg-gp-cream"
                    onClick={() => onAddDate(selectedDayKey)}
                  >
                    Add occasion
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-gp-evergreen/70">
            Tap any day with highlights to see birthdays and reminders planned
            for that date.
          </p>
        )}
      </div>
    </section>
  );
}
