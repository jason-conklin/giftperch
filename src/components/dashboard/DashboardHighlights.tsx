"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
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

type OccasionType =
  | "birthday"
  | "christmas"
  | "anniversary"
  | "graduation"
  | "gift"
  | "valentines"
  | "mothersday"
  | "fathersday"
  | "newyears"
  | "thanksgiving";

const parseDateOnly = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const parts = value.split("-");
  if (parts.length !== 3) return null;
  const [yearStr, monthStr, dayStr] = parts;
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const day = Number(dayStr);
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 0 ||
    month > 11 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  return new Date(year, month, day);
};

const seasonalEvents = [
  { id: "valentines", month: 1, day: 14, label: "Valentine's Day" },
  { id: "christmas", month: 11, day: 25, label: "Christmas Day" },
] as const;

const formatFullDate = (date: Date) =>
  date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const buildCountdownLabel = (target: Date | null): string | null => {
  if (!target) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetClean = new Date(target);
  targetClean.setHours(0, 0, 0, 0);
  const diffMs = targetClean.getTime() - today.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 0) return null;
  if (days === 0) return "Today";
  if (days === 1) return "1 day away";
  return `${days} days away`;
};

const getOccasionType = (name: string): OccasionType => {
  const normalized = name.toLowerCase();
  if (normalized.includes("birthday")) return "birthday";
  if (normalized.includes("christmas")) return "christmas";
  if (normalized.includes("anniversary") || normalized.includes("wedding")) return "anniversary";
  if (normalized.includes("graduation")) return "graduation";
  if (normalized.includes("valentine")) return "valentines";
  if (normalized.includes("mother")) return "mothersday";
  if (normalized.includes("father")) return "fathersday";
  if (normalized.includes("new year")) return "newyears";
  if (normalized.includes("thanksgiving")) return "thanksgiving";
  return "gift";
};

const getOccasionIcon = (type: OccasionType) => {
  const map: Record<OccasionType, { src: string; alt: string }> = {
    birthday: { src: "/icons/occasions/icon-occasion-birthday.png", alt: "Birthday" },
    christmas: { src: "/icons/occasions/icon-occasion-christmas.png", alt: "Christmas" },
    anniversary: { src: "/icons/occasions/icon-occasion-anniversary.png", alt: "Anniversary" },
    graduation: { src: "/icons/occasions/icon-occasion-graduation.png", alt: "Graduation" },
    gift: { src: "/icons/occasions/icon-occasion-gift.png", alt: "Occasion" },
    valentines: { src: "/icons/occasions/icon-occasion-valentines.png", alt: "Valentine's Day" },
    mothersday: { src: "/icons/occasions/icon-occasion-mothersday.png", alt: "Mother's Day" },
    fathersday: { src: "/icons/occasions/icon-occasion-fathersday.png", alt: "Father's Day" },
    newyears: { src: "/icons/occasions/icon-occasion-newyears.png", alt: "New Year's" },
    thanksgiving: { src: "/icons/occasions/icon-occasion-thanksgiving.png", alt: "Thanksgiving" },
  };
  return map[type] ?? map.gift;
};

const getOccasionMoodText = (type: OccasionType): string => {
  switch (type) {
    case "birthday":
      return "Birthday coming up – start planning a surprise?";
    case "christmas":
      return "Holiday gifting season is around the corner.";
    case "anniversary":
      return "Anniversary on the horizon – don’t leave it last-minute.";
    case "graduation":
      return "Big milestone ahead – celebrate their hard work.";
    case "valentines":
      return "Romantic moment ahead – make it feel special.";
    case "mothersday":
      return "A chance to show extra appreciation.";
    case "fathersday":
      return "Time to thank them for all they do.";
    case "newyears":
      return "Fresh year, fresh surprises to share.";
    case "thanksgiving":
      return "Gathering soon – thoughtful thanks go a long way.";
    default:
      return "A special occasion is coming up – plan something thoughtful.";
  }
};

const getInitials = (name: string | null | undefined) => {
  if (!name) return "GP";
  const parts = name.trim().split(/\s+/);
  if (!parts.length) return "GP";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return `${first}${last}`.toUpperCase() || "GP";
};

export function DashboardHighlights() {
  const { user } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const [recipients, setRecipients] = useState<RecipientSummary[]>([]);
  const [events, setEvents] = useState<RecipientEventRow[]>([]);
  const [latestInteraction, setLatestInteraction] = useState<AiInteraction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeRecipientIndex, setActiveRecipientIndex] = useState(0);
  const [recipientsHover, setRecipientsHover] = useState(false);

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

  useEffect(() => {
    if (!recipients.length) return;
    setActiveRecipientIndex((prev) => prev % recipients.length);
  }, [recipients.length]);

  useEffect(() => {
    if (!recipients.length || recipientsHover) return;
    const id = window.setInterval(() => {
      setActiveRecipientIndex((prev) =>
        recipients.length ? (prev + 1) % recipients.length : 0
      );
    }, 2500);
    return () => window.clearInterval(id);
  }, [recipients.length, recipientsHover]);

  const nextOccasion = useMemo(() => {
    if (!recipients.length) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming: UpcomingEvent[] = [];

    recipients.forEach((recipient) => {
      if (!recipient.birthday) return;
      const original = parseDateOnly(recipient.birthday);
      if (!original) return;
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
      const eventDate = parseDateOnly(event.event_date);
      if (!eventDate || eventDate < today) return;
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

  const recipientsHighlight =
    recipients.length && activeRecipientIndex < recipients.length
      ? recipients[activeRecipientIndex]
      : null;
  const lastRunLabel = useMemo(() => {
    if (!latestInteraction?.message) return null;
    return latestInteraction.message;
  }, [latestInteraction]);

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
          (() => {
            const occasionType = getOccasionType(nextOccasion.label);
            const { src, alt } = getOccasionIcon(occasionType);
            const mood = getOccasionMoodText(occasionType);

            return (
              <>
                <div className="mt-0 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gp-cream/80 flex items-center justify-center shadow-sm">
                    <Image
                      src={src}
                      alt={alt}
                      width={48}
                      height={48}
                      className="h-10 w-10 object-contain"
                    />
                  </div>
                  <h3 className="text-xl font-semibold text-gp-evergreen">
                    {nextOccasion.label}
                  </h3>
                </div>

                <p className="text-sm text-gp-evergreen/70">
                  {formatFullDate(nextOccasion.date)}
                </p>

                {buildCountdownLabel(nextOccasion.date) ? (
                  <span className="inline-flex w-fit rounded-full border border-3 border-gp-gold/40 bg-white px-3 py-1 text-xs font-medium text-gp-evergreen">
                    {buildCountdownLabel(nextOccasion.date)}
                  </span>
                ) : null}

                <div className="mt-1 mb-1 inline-flex rounded-full bg-gp-cream/80 px-3 py-1">
                  <p className="text-[11px] text-gp-evergreen/70 sm:text-xs">
                    {mood}
                  </p>
                </div>

                {nextOccasion.recipientId ? (
                  <Link
                    href={`/recipients`}
                    className="text-sm font-semibold text-gp-evergreen underline-offset-4 hover:underline"
                  >
                    Prepare for {nextOccasion.recipientName}
                  </Link>
                ) : null}

                <Link
                  href="/occasions"
                  className="gp-primary-button w-fit"
                >
                  View occasions →
                </Link>
              </>
            );
          })()
        ) : (
          <p className="text-sm text-gp-evergreen/70">
            Add birthdays or occasions to see what&apos;s coming up next.
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
          <button
            type="button"
            onClick={() => router.push("/recipients")}
            className="rounded-2xl border border-gp-evergreen/10 bg-gp-cream/80 px-3 py-2 text-left shadow-sm transition hover:border-gp-evergreen/25"
            onMouseEnter={() => setRecipientsHover(true)}
            onMouseLeave={() => setRecipientsHover(false)}
          >
            <div className="flex items-center gap-3">
              {recipientsHighlight.avatar_url ? (
                <Image
                  src={recipientsHighlight.avatar_url}
                  alt={recipientsHighlight.name}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full border border-gp-evergreen/15 bg-white object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gp-evergreen/10 text-base font-semibold text-gp-evergreen">
                  {getInitials(recipientsHighlight.name)}
                </div>
              )}
              <div>
                <p className="text-base font-semibold text-gp-evergreen">
                  {recipientsHighlight.name}
                </p>
                <p className="text-[12px] uppercase tracking-wide text-gp-evergreen/60">
                  {recipientsHighlight.relationship ?? "Relationship TBD"}
                </p>
              </div>
            </div>
          </button>
        ) : null}
        <Link
          href="/recipients"
          className="gp-primary-button w-fit mt-1"
        >
          Manage recipients →
        </Link>
      </article>

      <article className="gp-card flex flex-col gap-3">
        <p className="text-xs uppercase tracking-wide text-gp-evergreen/60">
          PerchPal
        </p>
        <div className="flex items-center gap-3">
          <Image
            src="/giftperch_perchpal_front.png"
            alt="PerchPal"
            width={56}
            height={56}
            className="h-12 w-12 rounded-full border border-gp-evergreen/10 bg-gp-cream/80 object-contain shadow-sm"
          />
          <div>
            <h3 className="text-lg font-semibold text-gp-evergreen">Chat with PerchPal</h3>
            <p className="text-sm text-gp-evergreen/70">Your AI gifting assistant</p>
          </div>
        </div>
        <p className="text-sm text-gp-evergreen/80">
          Not sure what to buy next? Ask PerchPal for fresh, personalized gift ideas for each of your recipient profiles.
        </p>
        <Link href="/gifts" className="gp-primary-button mt-2 w-fit">
          Open Gift Ideas →
        </Link>
        {lastRunLabel ? (
          <p className="text-xs text-gp-evergreen/60">Last run: {lastRunLabel}</p>
        ) : null}
      </article>
    </div>
  );
}
