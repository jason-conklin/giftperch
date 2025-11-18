"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { PerchPalLoader } from "@/components/perchpal/PerchPalLoader";

type Recipient = {
  id: string;
  name: string;
  relationship: string | null;
  avatar_url: string | null;
  birthday: string | null;
};

type RecipientEventRow = {
  id: string;
  label: string | null;
  event_type: string | null;
  event_date: string | null;
  notes: string | null;
  recipient_id: string | null;
};

type CalendarEvent = {
  id: string;
  date: Date;
  title: string;
  type: "birthday" | "event" | "seasonal";
  repeat?: "yearly";
  recipientId?: string | null;
  recipientName?: string | null;
  notes?: string | null;
};

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const seasonalTemplates = [
  { id: "valentines", month: 1, day: 14, title: "Valentine's Day" },
  { id: "mothers-day", month: 4, day: 12, title: "Mother's Day" },
  { id: "christmas", month: 11, day: 25, title: "Christmas Day" },
] as const;

export function OccasionsCalendar() {
  const { user } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [events, setEvents] = useState<RecipientEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const { data: recipientRows, error: recipientError } = await supabase
          .from("recipient_profiles")
          .select("id, name, relationship, avatar_url, birthday")
          .eq("user_id", user.id)
          .eq("is_self", false)
          .order("name", { ascending: true });
        if (recipientError) throw recipientError;
        const recipientList = (recipientRows ?? []) as Recipient[];
        if (!active) return;
        setRecipients(recipientList);

        if (recipientList.length) {
          const ids = recipientList.map((recipient) => recipient.id);
          const { data: eventRows, error: eventError } = await supabase
            .from("recipient_events")
            .select("id, label, event_type, event_date, notes, recipient_id")
            .in("recipient_id", ids);
          if (eventError) throw eventError;
          if (active) {
            setEvents((eventRows ?? []) as RecipientEventRow[]);
          }
        } else {
          setEvents([]);
        }
      } catch (err) {
        if (!active) return;
        const message =
          err instanceof Error ? err.message : "Unable to load occasions.";
        setError(message);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [supabase, user?.id]);

  const calendarEvents = useMemo(() => {
    const year = currentMonth.getFullYear();
    const eventsForMonth: CalendarEvent[] = [];

    recipients.forEach((recipient) => {
      if (!recipient.birthday) return;
      const birthdayDate = new Date(recipient.birthday);
      const displayDate = new Date(
        year,
        birthdayDate.getMonth(),
        birthdayDate.getDate()
      );
      eventsForMonth.push({
        id: `birthday-${recipient.id}-${year}`,
        date: displayDate,
        title: `${recipient.name}'s birthday`,
        type: "birthday",
        repeat: "yearly",
        recipientId: recipient.id,
        recipientName: recipient.name,
        notes: `Celebrate ${recipient.relationship ?? "this friend"}`,
      });
    });

    events.forEach((event) => {
      if (!event.event_date) return;
      const eventDate = new Date(event.event_date);
      eventsForMonth.push({
        id: event.id,
        date: eventDate,
        title: event.label ?? "Upcoming occasion",
        type: "event",
        recipientId: event.recipient_id,
        recipientName:
          recipients.find((recipient) => recipient.id === event.recipient_id)
            ?.name ?? undefined,
        notes: event.notes ?? undefined,
      });
    });

    seasonalTemplates.forEach((season) => {
      const date = new Date(year, season.month, season.day);
      eventsForMonth.push({
        id: `season-${season.id}-${year}`,
        date,
        title: season.title,
        type: "seasonal",
        repeat: "yearly",
      });
    });

    return eventsForMonth;
  }, [currentMonth, recipients, events]);

  const days = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const grid: { date: Date | null; events: CalendarEvent[] }[] = [];

    for (let i = 0; i < startWeekday; i += 1) {
      grid.push({ date: null, events: [] });
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const date = new Date(year, month, day);
      const eventsForDay = calendarEvents.filter((event) => {
        if (event.type === "birthday" || event.repeat === "yearly") {
          return (
            event.date.getMonth() === date.getMonth() &&
            event.date.getDate() === date.getDate()
          );
        }
        return (
          event.date.getFullYear() === date.getFullYear() &&
          event.date.getMonth() === date.getMonth() &&
          event.date.getDate() === date.getDate()
        );
      });
      grid.push({ date, events: eventsForDay });
    }

    while (grid.length % 7 !== 0) {
      grid.push({ date: null, events: [] });
    }

    return grid;
  }, [calendarEvents, currentMonth]);

  const changeMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const year = prev.getFullYear();
      const month = prev.getMonth();
      return new Date(year, month + (direction === "next" ? 1 : -1), 1);
    });
    setSelectedEvent(null);
  };

  if (loading) {
    return (
      <div className="gp-card-soft">
        <PerchPalLoader
          variant="inline"
          size="sm"
          message="Loading your occasions calendar..."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="gp-card-soft text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-gp-evergreen/15 bg-white/95 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-gp-evergreen/60">
            Occasions calendar
          </p>
          <h2 className="text-2xl font-semibold text-gp-evergreen">
            {currentMonth.toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="gp-secondary-button px-3"
            onClick={() => changeMonth("prev")}
          >
            Previous
          </button>
          <button
            type="button"
            className="gp-secondary-button px-3"
            onClick={() => changeMonth("next")}
          >
            Next
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-gp-evergreen/15 bg-white/95 p-4 shadow-sm">
        <div className="grid grid-cols-7 text-xs font-semibold uppercase text-gp-evergreen/60">
          {weekdays.map((day) => (
            <div key={day} className="px-2 py-1 text-center">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-sm">
          {days.map((day, index) => (
            <button
              key={index}
              type="button"
              onClick={() =>
                day.events.length ? setSelectedEvent(day.events[0]) : undefined
              }
              className={`min-h-[90px] rounded-xl border border-gp-evergreen/10 bg-gp-cream/50 p-2 text-left ${
                !day.date ? "opacity-30" : ""
              }`}
            >
              {day.date ? (
                <>
                  <p className="text-xs font-semibold text-gp-evergreen">
                    {day.date.getDate()}
                  </p>
                  <div className="mt-1 space-y-1">
                    {day.events.map((event) => (
                      <span
                        key={event.id}
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          event.type === "birthday"
                            ? "bg-pink-50 text-pink-700"
                            : event.type === "seasonal"
                            ? "bg-gp-gold/20 text-gp-evergreen"
                            : "bg-gp-evergreen/10 text-gp-evergreen"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                        }}
                      >
                        {event.title}
                      </span>
                    ))}
                  </div>
                </>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {selectedEvent ? (
        <div className="gp-card-soft space-y-2">
          <p className="text-xs uppercase tracking-wide text-gp-evergreen/60">
            Selected occasion
          </p>
          <h3 className="text-xl font-semibold text-gp-evergreen">
            {selectedEvent.title}
          </h3>
          <p className="text-sm text-gp-evergreen/70">
            {selectedEvent.date.toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          {selectedEvent.notes ? (
            <p className="text-sm text-gp-evergreen/80">{selectedEvent.notes}</p>
          ) : null}
          {selectedEvent.recipientId ? (
            <Link
              href="/recipients"
              className="text-sm font-semibold text-gp-evergreen underline-offset-4 hover:underline"
            >
              View {selectedEvent.recipientName}'s profile
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
