"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { PerchPalLoader } from "@/components/perchpal/PerchPalLoader";

type RecipientSummary = {
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

type AiInteraction = {
  message: string;
  created_at: string;
};

type UpcomingEvent = {
  id: string;
  date: Date;
  label: string;
  type: "birthday" | "event" | "seasonal";
  recipientId?: string | null;
  recipientName?: string | null;
};

const seasonalEvents = [
  { id: "valentines", month: 1, day: 14, label: "Valentine's Day" },
  { id: "christmas", month: 11, day: 25, label: "Christmas Day" },
] as const;

export function DashboardHighlights() {
  const { user } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [recipients, setRecipients] = useState<RecipientSummary[]>([]);
  const [events, setEvents] = useState<RecipientEventRow[]>([]);
  const [latestInteraction, setLatestInteraction] = useState<AiInteraction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const { data: recipientData, error: recipientError } = await supabase
          .from("recipient_profiles")
          .select("id, name, relationship, avatar_url, birthday")
          .eq("user_id", user.id)
          .eq("is_self", false)
          .order("created_at", { ascending: true });
        if (recipientError) throw recipientError;
        const recipientList = (recipientData ?? []) as RecipientSummary[];
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

        const { data: aiData } = await supabase
          .from("ai_interactions")
          .select("message, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (active) {
          setLatestInteraction(aiData ?? null);
        }
      } catch (err) {
        if (!active) return;
        const message =
          err instanceof Error ? err.message : "Unable to load dashboard data.";
        setError(message);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, [supabase, user?.id]);

  const nextOccasion = useMemo(() => {
    if (!recipients.length) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming: UpcomingEvent[] = [];

    recipients.forEach((recipient) => {
      if (!recipient.birthday) return;
      const original = new Date(recipient.birthday);
      const next = new Date(
        today.getFullYear(),
        original.getMonth(),
        original.getDate()
      );
      if (next < today) next.setFullYear(next.getFullYear() + 1);
      upcoming.push({
        id: `birthday-${recipient.id}`,
        date: next,
        label: `${recipient.name}'s birthday`,
        type: "birthday",
        recipientId: recipient.id,
        recipientName: recipient.name,
      });
    });

    events.forEach((event) => {
      if (!event.event_date) return;
      const eventDate = new Date(event.event_date);
      if (eventDate < today) return;
      upcoming.push({
        id: event.id,
        date: eventDate,
        label: event.label ?? "Upcoming occasion",
        type: "event",
        recipientId: event.recipient_id ?? undefined,
        recipientName:
          recipients.find((r) => r.id === event.recipient_id)?.name ?? undefined,
      });
    });

    const year = today.getFullYear();
    seasonalEvents.forEach((season) => {
      const eventDate = new Date(year, season.month, season.day);
      if (eventDate < today) {
        eventDate.setFullYear(year + 1);
      }
      upcoming.push({
        id: `seasonal-${season.id}-${eventDate.getFullYear()}`,
        date: eventDate,
        label: season.label,
        type: "seasonal",
      });
    });

    upcoming.sort((a, b) => a.date.getTime() - b.date.getTime());
    return upcoming[0] ?? null;
  }, [events, recipients]);

  const recipientsHighlight = recipients[0];
  const tipMessage =
    latestInteraction?.message ??
    "Tip: Keep PerchPal close by logging budgets, anti-gifts, and notes right after conversations.";

  if (loading) {
    return (
      <div className="gp-card-soft">
        <PerchPalLoader variant="inline" size="sm" message="Loading dashboard insights..." />
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
    <div className="grid gap-4 md:grid-cols-3">
      <article className="gp-card flex flex-col gap-3">
        <p className="text-xs uppercase tracking-wide text-gp-evergreen/60">
          Next big occasion
        </p>
        {nextOccasion ? (
          <>
            <h3 className="text-xl font-semibold text-gp-evergreen">
              {nextOccasion.label}
            </h3>
            <p className="text-sm text-gp-evergreen/70">
              {nextOccasion.date.toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            {nextOccasion.recipientId ? (
              <Link
                href={`/recipients`}
                className="text-sm font-semibold text-gp-evergreen underline-offset-4 hover:underline"
              >
                Prepare for {nextOccasion.recipientName}
              </Link>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-gp-evergreen/70">
            Add birthdays or occasions to see what's coming up next.
          </p>
        )}
      </article>

      <article className="gp-card flex flex-col gap-3">
        <p className="text-xs uppercase tracking-wide text-gp-evergreen/60">
          Your recipients
        </p>
        <h3 className="text-3xl font-semibold text-gp-evergreen">
          {recipients.length}
        </h3>
        <p className="text-sm text-gp-evergreen/70">
          {recipients.length
            ? "Profiles ready for their next surprise."
            : "Start by adding the people you shop for most often."}
        </p>
        {recipientsHighlight ? (
          <div className="rounded-2xl border border-gp-evergreen/15 bg-gp-cream/70 p-3">
            <p className="text-sm font-semibold text-gp-evergreen">
              {recipientsHighlight.name}
            </p>
            <p className="text-xs text-gp-evergreen/60">
              {recipientsHighlight.relationship ?? "Relationship TBD"}
            </p>
          </div>
        ) : null}
        <Link
          href="/recipients"
          className="text-sm font-semibold text-gp-evergreen underline-offset-4 hover:underline"
        >
          Manage recipients
        </Link>
      </article>

      <article className="gp-card flex flex-col gap-3">
        <p className="text-xs uppercase tracking-wide text-gp-evergreen/60">
          PerchPal tip
        </p>
        <p className="text-sm text-gp-evergreen/80">{tipMessage}</p>
        <Link
          href="/gifts"
          className="text-sm font-semibold text-gp-evergreen underline-offset-4 hover:underline"
        >
          Ask PerchPal for ideas
        </Link>
      </article>
    </div>
  );
}
