"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import {
  OccasionsCalendar,
  type OccasionEvent,
} from "@/components/occasions/OccasionsCalendar";
import { getDefaultUsHolidaysForYear } from "@/lib/holidays";
import Link from "next/link";
import { PerchPalFlyingAvatar } from "@/components/perchpal/PerchPalLoader";

type RecipientOption = {
  id: string;
  name: string;
  relationship: string | null;
  birthday: string | null;
};

type Occasion = {
  id: string;
  label: string | null;
  event_type: string | null;
  event_date: string | null;
  icon_key?: string | null;
  notes: string | null;
  recipient?: {
    name: string;
    relationship: string | null;
  } | null;
};

const formatDisplayDate = (iso: string | null) => {
  if (!iso) return "No date";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const startOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
};

const parseDateSafe = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(12, 0, 0, 0);
  return parsed;
};

type OccasionMood =
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

const getOccasionTypeForMood = (event: OccasionEvent): OccasionMood => {
  if (event.type === "birthday") return "birthday";
  if (event.type === "anniversary") return "anniversary";
  if (event.type === "holiday") {
    const normalized = (event.title ?? "").toLowerCase();
    if (normalized.includes("christmas")) return "christmas";
    if (normalized.includes("valentine")) return "valentines";
    if (normalized.includes("mother")) return "mothersday";
    if (normalized.includes("father")) return "fathersday";
    if (normalized.includes("new year")) return "newyears";
    if (normalized.includes("thank")) return "thanksgiving";
  }

  const normalized = `${event.type ?? ""} ${event.title ?? ""}`.toLowerCase();
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

const getOccasionMoodText = (type: OccasionMood): string => {
  switch (type) {
    case "birthday":
      return "Birthday coming up — start planning gift ideas?";
    case "christmas":
      return "Holiday gifting season is around the corner.";
    case "anniversary":
      return "Anniversary on the horizon — don’t leave it last-minute.";
    case "graduation":
      return "Big milestone ahead — celebrate their hard work.";
    case "valentines":
      return "Romantic moment ahead — make it feel special.";
    case "mothersday":
      return "A chance to show extra appreciation.";
    case "fathersday":
      return "Time to thank them for all they do.";
    case "newyears":
      return "New year, new gifts to share!";
    case "thanksgiving":
      return "Gathering soon — thoughtful thanks go a long way.";
    default:
      return "A special occasion is coming up — plan something thoughtful.";
  }
};

const countdownLabel = (target: Date | null): string | null => {
  if (!target) return null;
  const today = startOfDay(new Date());
  const cleanTarget = startOfDay(target);
  const diffMs = cleanTarget.getTime() - today.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 0) return null;
  if (days === 0) return "Today";
  if (days === 1) return "1 day away";
  return `${days} days away`;
};

export function OccasionsManager() {
  const { status, user } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [recipients, setRecipients] = useState<RecipientOption[]>([]);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [error, setError] = useState("");

  const [newRecipientId, setNewRecipientId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newEventType, setNewEventType] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newIconKey, setNewIconKey] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchOccasions = useCallback(async (): Promise<Occasion[]> => {
    if (!user?.id) return [];
    const { data, error } = await supabase
      .from("recipient_events")
      .select(
        "id, label, event_type, event_date, icon_key, notes, recipient:recipient_profiles(name, relationship)"
      )
      .eq("recipient_profiles.user_id", user.id)
      .eq("recipient_profiles.is_self", false)
      .order("event_date", { ascending: true })
      .limit(30);

    if (error) throw error;

    return (
      data?.map((occasion) => {
        const recipientValue = (occasion as { recipient?: unknown }).recipient;
        const resolvedRecipient =
          recipientValue && !Array.isArray(recipientValue)
            ? {
                name: (recipientValue as { name?: string }).name ?? "",
                relationship:
                  (recipientValue as { relationship?: string | null }).relationship ??
                  null,
              }
            : Array.isArray(recipientValue) && recipientValue[0]
            ? {
                name: (recipientValue[0] as { name?: string }).name ?? "",
                relationship:
                  (recipientValue[0] as {
                    relationship?: string | null;
                  }).relationship ?? null,
              }
            : null;

        return {
          id: occasion.id as string,
          label: (occasion as { label?: string }).label ?? null,
          event_type: (occasion as { event_type?: string }).event_type ?? null,
          event_date: (occasion as { event_date?: string }).event_date ?? null,
          icon_key: (occasion as { icon_key?: string | null }).icon_key ?? null,
          notes: (occasion as { notes?: string }).notes ?? null,
          recipient: resolvedRecipient,
        } as Occasion;
      }) ?? []
    );
  }, [supabase, user]);

  useEffect(() => {
    if (status !== "authenticated" || !user?.id) return;
    const isMounted = { current: true };

    const loadRecipients = async () => {
      setLoadingRecipients(true);
      const { data, error } = await supabase
        .from("recipient_profiles")
        .select("id, name, relationship, birthday")
        .eq("user_id", user.id)
        .eq("is_self", false)
        .order("name", { ascending: true });

      if (!isMounted.current) return;

      if (error) {
        setError(error.message);
        setRecipients([]);
      } else {
        setRecipients((data ?? []) as RecipientOption[]);
      }
      setLoadingRecipients(false);
    };

    const loadOccasions = async () => {
      setLoading(true);
      setError("");
      try {
        const normalized = await fetchOccasions();
        if (isMounted.current) {
          setOccasions(normalized);
        }
      } catch (err) {
        if (isMounted.current) {
          const message = err instanceof Error ? err.message : "Unable to load occasions.";
          setError(message);
          setOccasions([]);
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    loadRecipients();
    void loadOccasions();

    return () => {
      isMounted.current = false;
    };
  }, [status, supabase, user?.id, fetchOccasions]);

  const handleAddOccasion = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.id || !newRecipientId || !newEventDate) return;
    setSaving(true);
    setError("");

    const { error } = await supabase.from("recipient_events").insert({
      recipient_id: newRecipientId,
      event_type: newEventType || "custom",
      label: newTitle || "Upcoming occasion",
      event_date: newEventDate,
      icon_key: newIconKey || null,
      notes: newNotes || null,
    });

    if (error) {
      setError(error.message);
    } else {
      setNewNotes("");
      setNewTitle("");
      setNewEventType("");
      setNewEventDate("");
      setNewIconKey("");
      setNewRecipientId("");
      try {
        const normalized = await fetchOccasions();
        setOccasions(normalized);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to refresh occasions.";
        setError(message);
      }
      setShowAddModal(false);
    }
    setSaving(false);
  };

  const hasRecipients = recipients.length > 0;

  const calendarEvents = useMemo<OccasionEvent[]>(() => {
    const currentYear = new Date().getFullYear();
    const mapped: OccasionEvent[] = [];
    const years = Array.from({ length: 11 }, (_v, i) => currentYear - 5 + i);

    const makeLocalIso = (year: number, month: number, day: number) => {
      // month is 1-based coming in; Date expects 0-based month
      const d = new Date(year, month - 1, day, 12, 0, 0);
      return d.toISOString();
    };

    years.forEach((year) => {
      const holidays = getDefaultUsHolidaysForYear(year);
      holidays.forEach((h) => mapped.push(h));
    });

    recipients.forEach((recipient) => {
      if (!recipient.birthday) return;
      const parts = recipient.birthday.split("-");
      if (parts.length < 3) return;
      const month = Number(parts[1]);
      const day = Number(parts[2]);
      if (!month || !day) return;

      years.forEach((year) => {
        mapped.push({
          id: `birthday-${recipient.id}-${year}`,
          date: makeLocalIso(year, month, day),
          title: `${recipient.name}'s birthday`,
          type: "birthday",
          recipientName: recipient.name,
          iconKey: "icon-occasion-birthday.png",
        });
      });
    });

    occasions.forEach((occasion) => {
      if (!occasion.event_date) return;
      const normalizedType: OccasionEvent["type"] =
        occasion.event_type === "anniversary"
          ? "anniversary"
          : occasion.event_type === "holiday"
          ? "holiday"
          : occasion.event_type === "birthday"
          ? "birthday"
          : "custom";

      mapped.push({
        id: `occasion-${occasion.id}`,
        date: occasion.event_date,
        title: occasion.label ?? "Upcoming occasion",
        type: normalizedType,
        recipientName: occasion.recipient?.name ?? undefined,
        iconKey: occasion.icon_key ?? null,
      });
    });

    return mapped.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [occasions, recipients]);

  const nextOccasionBundle = useMemo(() => {
    const today = startOfDay(new Date()).getTime();
    const normalized = calendarEvents
      .map((event) => {
        const parsed = parseDateSafe(event.date);
        return parsed
          ? {
              event,
              date: parsed,
              dayKey: startOfDay(parsed).getTime(),
            }
          : null;
      })
      .filter((entry): entry is { event: OccasionEvent; date: Date; dayKey: number } => Boolean(entry))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const upcoming = normalized.find((entry) => entry.dayKey >= today);
    if (!upcoming) return null;

    const sameDayCount =
      normalized.filter((entry) => entry.dayKey === upcoming.dayKey).length - 1;

    return {
      primary: upcoming,
      sameDayCount: Math.max(0, sameDayCount),
    };
  }, [calendarEvents]);

  const customOccasions = useMemo(() => {
    const filtered = occasions.filter(
      (occasion) =>
        occasion.event_type !== "birthday" &&
        occasion.event_type !== "anniversary" &&
        occasion.event_type !== "holiday"
    );

    return filtered.sort((a, b) => {
      const aDate = parseDateSafe(a.event_date);
      const bDate = parseDateSafe(b.event_date);
      if (!aDate || !bDate) return 0;
      return aDate.getTime() - bDate.getTime();
    });
  }, [occasions]);

  const handleRemoveOccasion = async (occasionId: string) => {
    if (!occasionId) return;
    setRemovingId(occasionId);
    setError("");
    const { error: deleteError } = await supabase.from("recipient_events").delete().eq("id", occasionId);
    if (deleteError) {
      setError(deleteError.message);
    } else {
      try {
        const normalized = await fetchOccasions();
        setOccasions(normalized);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to refresh occasions.";
        setError(message);
      }
    }
    setRemovingId(null);
  };

  const calendarEmptyMessage = calendarEvents.length
    ? undefined
    : hasRecipients
    ? "No occasions on the calendar yet. Add birthdays or special dates to see them here."
    : "You'll see birthdays and occasions here once you add your first recipient profile.";

  return (
    <div className="space-y-6">
      <OccasionsCalendar
        events={calendarEvents}
        emptyMessage={calendarEmptyMessage}
        isLoading={loading || loadingRecipients}
        onAddDate={(iso) => {
          const dateOnly = iso.split("T")[0] ?? iso;
          setNewEventDate(dateOnly);
          setShowAddModal(true);
        }}
      />

      <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
        <section className="gp-card flex flex-col gap-4">
          <header className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-gp-evergreen/60">
              Next big occasion
            </p>
            <p className="text-sm text-gp-evergreen/70">
              See what’s up next and jump into ideas before the rush.
            </p>
          </header>

          {loading ? (
            <p className="text-sm text-gp-evergreen/70">Loading occasions...</p>
          ) : nextOccasionBundle ? (
            (() => {
              const { primary, sameDayCount } = nextOccasionBundle;
              const moodType = getOccasionTypeForMood(primary.event);
              const countdown = countdownLabel(primary.date);
              return (
                <div className="flex flex-col gap-3 rounded-3xl border border-gp-evergreen/10 bg-gp-cream/70 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                      <Image
                        src={`/icons/occasions/${primary.event.iconKey ?? "icon-occasion-gift.png"}`}
                        alt={primary.event.title ?? "Occasion icon"}
                        width={48}
                        height={48}
                        className="h-10 w-10 object-contain"
                      />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-gp-evergreen/60">
                        Coming up
                      </p>
                      <h3 className="text-xl font-semibold text-gp-evergreen">
                        {primary.event.title}
                      </h3>
                      {primary.event.recipientName ? (
                        <p className="text-xs text-gp-evergreen/70">
                          for {primary.event.recipientName}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <p className="text-sm text-gp-evergreen/70">
                    {primary.date.toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    {countdown ? (
                      <span className="inline-flex rounded-full border border-gp-gold/60 bg-white px-3 py-1 text-xs font-semibold text-gp-evergreen">
                        {countdown}
                      </span>
                    ) : null}
                    {sameDayCount > 0 ? (
                      <span className="inline-flex rounded-full border border-gp-evergreen/20 bg-white/70 px-3 py-1 text-xs font-semibold text-gp-evergreen/80">
                        +{sameDayCount} more this day
                      </span>
                    ) : null}
                  </div>

                  <div className="inline-flex rounded-full bg-white/70 px-3 py-1">
                    <p className="text-[11px] text-gp-evergreen/70 sm:text-xs">
                      {getOccasionMoodText(moodType)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link href="/gifts" className="gp-primary-button">
                      Plan ideas →
                    </Link>
                    <Link href="/occasions" className="gp-secondary-button">
                      View calendar
                    </Link>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="gp-card-soft text-sm text-gp-evergreen/70">
              Add birthdays or occasions to see what&apos;s coming up next.
            </div>
          )}
        </section>

        <section className="gp-card flex flex-col gap-4">
          <header className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gp-evergreen/60">
                Custom Occasions
              </p>
              <p className="mt-1 text-sm text-gp-evergreen/70">
                Track your own milestones and plans.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="gp-secondary-button cursor-pointer"
            >
              Add occasion
            </button>
          </header>

          {loading ? (
            <p className="text-sm text-gp-evergreen/70">Loading occasions...</p>
          ) : customOccasions.length ? (
            <div className="space-y-3">
              {customOccasions.map((occasion) => (
                <article
                  key={occasion.id}
                  className="flex flex-col gap-2 rounded-2xl border border-gp-evergreen/10 bg-gp-cream/70 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                      <Image
                        src={`/icons/occasions/${occasion.icon_key ?? "icon-occasion-gift.png"}`}
                        alt={occasion.label ?? "Occasion icon"}
                        width={48}
                        height={48}
                        className="h-10 w-10 object-contain"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold text-gp-evergreen">
                        {occasion.label ?? "Upcoming occasion"}
                      </p>
                      <p className="text-xs text-gp-evergreen/70">
                        {occasion.recipient
                          ? `${occasion.recipient.name}${
                              occasion.recipient.relationship
                                ? ` (${occasion.recipient.relationship})`
                                : ""
                            }`
                          : "Recipient"}
                      </p>
                      <p className="text-xs text-gp-evergreen/60">
                        {formatDisplayDate(occasion.event_date)}
                      </p>
                      {occasion.notes ? (
                        <p className="text-sm text-gp-evergreen/80">
                          {occasion.notes}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href="/gifts" className="gp-primary-button px-4 py-2 text-xs">
                      Plan ideas
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleRemoveOccasion(occasion.id)}
                      className="cursor-pointer text-xs font-semibold text-red-600 underline-offset-4 hover:text-red-700 hover:underline disabled:opacity-60"
                      disabled={removingId === occasion.id}
                    >
                      {removingId === occasion.id ? "Removing..." : "Remove"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="gp-card-soft text-sm text-gp-evergreen/70">
              No custom occasions yet. Add your own milestones and gatherings.
            </div>
          )}
        </section>
      </div>
      <div className="gp-card-soft flex w-full items-center gap-4">
          <PerchPalFlyingAvatar size="lg" className="shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gp-evergreen">
              PerchPal Tip:
            </p>
            <p className="text-xs text-gp-evergreen/70">
              PerchPal uses these dates to prioritize reminders, queue fresh gift
            ideas, and surface budgets for the next few weeks. The more birthdays
            and milestones you log, the sharper your gifting radar becomes.
            </p>
          </div>
      </div>

      {error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      {showAddModal ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Add occasion"
        >
          <div className="relative w-full max-w-3xl rounded-3xl bg-gp-cream p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              className="absolute right-4 top-4 text-lg font-semibold text-gp-evergreen/70 hover:text-gp-evergreen"
              onClick={() => setShowAddModal(false)}
            >
              ×
            </button>
            <div className="space-y-1">
              <div className="gp-pill w-fit">Add occasion</div>
              <p className="text-sm text-gp-evergreen/70">
                Tie a date to a recipient so their history, preferences, and budget appear in Gift Ideas instantly.
              </p>
            </div>

            {loadingRecipients ? (
              <p className="mt-4 text-sm text-gp-evergreen/70">Loading recipients...</p>
            ) : hasRecipients ? (
              <form id="add-occasion-form" className="mt-4 space-y-4" onSubmit={handleAddOccasion}>
                <label className="flex flex-col gap-2 text-sm font-semibold text-gp-evergreen">
                  Recipient
                  <select
                    className="gp-input cursor-pointer bg-white"
                    value={newRecipientId}
                    onChange={(event) => setNewRecipientId(event.target.value)}
                    required
                  >
                    <option value="">Select recipient</option>
                    {recipients.map((recipient) => (
                      <option key={recipient.id} value={recipient.id}>
                        {recipient.name}
                        {recipient.relationship ? ` (${recipient.relationship})` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm font-semibold text-gp-evergreen">
                  Occasion name
                  <input
                    className="gp-input bg-white"
                    value={newTitle}
                    onChange={(event) => setNewTitle(event.target.value)}
                    placeholder="Maya's birthday brunch"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-semibold text-gp-evergreen">
                  Occasion type
                  <select
                    className="gp-input cursor-pointer bg-white"
                    value={newEventType}
                    onChange={(event) => setNewEventType(event.target.value)}
                  >
                    <option value="">Choose an occasion</option>
                    <option value="birthday">Birthday</option>
                    <option value="christmas_holidays">Christmas / Holidays</option>
                    <option value="anniversary">Anniversary</option>
                    <option value="graduation">Graduation</option>
                    <option value="wedding">Wedding</option>
                    <option value="baby">Baby shower / New baby</option>
                    <option value="housewarming">Housewarming</option>
                    <option value="promotion">Promotion / New job</option>
                    <option value="thank_you">Thank you / Appreciation</option>
                    <option value="get_well">Get well soon</option>
                    <option value="valentines">Valentine’s Day</option>
                    <option value="mothers_day">Mother’s Day</option>
                    <option value="fathers_day">Father’s Day</option>
                    <option value="just_because">Just because / No special occasion</option>
                  </select>
                </label>

                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-gp-evergreen">Icon</p>
                  <p className="text-xs text-gp-evergreen/70">
                    Pick an icon for this occasion. This will show on the gifting calendar.
                  </p>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {[
                      { key: "icon-occasion-day.png", label: "Everyday" },
                      { key: "icon-occasion-gift.png", label: "Gift" },
                      { key: "icon-occasion-birthday.png", label: "Birthday" },
                      { key: "icon-occasion-christmas.png", label: "Christmas" },
                      { key: "icon-occasion-anniversary.png", label: "Anniversary" },
                      { key: "icon-occasion-graduation.png", label: "Graduation" },
                      { key: "icon-occasion-valentines.png", label: "Valentine's" },
                      { key: "icon-occasion-mothersday.png", label: "Mother's Day" },
                      { key: "icon-occasion-fathersday.png", label: "Father's Day" },
                      { key: "icon-occasion-newyears.png", label: "New Year's" },
                      { key: "icon-occasion-thanksgiving.png", label: "Thanksgiving" },
                      { key: "icon-occasion-halloween.png", label: "Halloween" },
                    ].map((option) => {
                      const selected = newIconKey === option.key;
                      return (
                        <button
                          type="button"
                          key={option.key}
                          onClick={() => setNewIconKey(option.key)}
                          className={`flex flex-col items-center gap-2 rounded-2xl border px-3 py-2 text-center text-xs font-semibold transition ${
                            selected
                              ? "border-gp-evergreen bg-gp-cream shadow-sm"
                              : "border-gp-evergreen/15 bg-white hover:border-gp-evergreen/40"
                          }`}
                        >
                          <Image
                            src={`/icons/occasions/${option.key}`}
                            alt={option.label}
                            width={48}
                            height={48}
                            className="h-12 w-12 object-contain"
                          />
                          <span className="text-gp-evergreen">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="flex flex-col gap-2 text-sm font-semibold text-gp-evergreen">
                  Event date
                  <input
                    type="date"
                    className="gp-input cursor-pointer bg-white"
                    value={newEventDate}
                    onChange={(event) => setNewEventDate(event.target.value)}
                    required
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-semibold text-gp-evergreen">
                  Notes
                  <textarea
                    className="gp-input min-h-[90px] resize-none bg-white"
                    value={newNotes}
                    onChange={(event) => setNewNotes(event.target.value)}
                    placeholder="Prefers experience gifts, loves art supplies."
                  />
                </label>

                <button
                  type="submit"
                  className="gp-primary-button w-full cursor-pointer disabled:cursor-not-allowed"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save occasion"}
                </button>
              </form>
            ) : (
              <div className="gp-card-soft mt-4 text-sm text-gp-evergreen/70">
                You need at least one recipient profile before you can plan occasions. Head to the Recipients page to add a person.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
