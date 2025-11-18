"use client";

import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";

type RecipientOption = {
  id: string;
  name: string;
  relationship: string | null;
};

type Occasion = {
  id: string;
  label: string | null;
  event_type: string | null;
  event_date: string | null;
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
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !user?.id) return;
    let isMounted = true;

    const loadRecipients = async () => {
      setLoadingRecipients(true);
      const { data, error } = await supabase
        .from("recipient_profiles")
        .select("id, name, relationship")
        .eq("user_id", user.id)
        .eq("is_self", false)
        .order("name", { ascending: true });

      if (!isMounted) return;

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
      const { data, error } = await supabase
        .from("recipient_events")
        .select(
          "id, label, event_type, event_date, notes, recipient:recipient_profiles(name, relationship)"
        )
        .eq("recipient_profiles.user_id", user.id)
        .eq("recipient_profiles.is_self", false)
        .order("event_date", { ascending: true })
        .limit(30);

      if (!isMounted) return;

      if (error) {
        setError(error.message);
        setOccasions([]);
      } else {
        setOccasions((data ?? []) as Occasion[]);
      }
      setLoading(false);
    };

    loadRecipients();
    loadOccasions();

    return () => {
      isMounted = false;
    };
  }, [status, supabase, user?.id]);

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
      notes: newNotes || null,
    });

    if (error) {
      setError(error.message);
    } else {
      setNewNotes("");
      setNewTitle("");
      setNewEventType("");
      setNewEventDate("");
      setNewRecipientId("");
      // refresh occasions
      const { data } = await supabase
        .from("recipient_events")
        .select(
          "id, label, event_type, event_date, notes, recipient:recipient_profiles(name, relationship)"
        )
        .eq("recipient_profiles.user_id", user.id)
        .eq("recipient_profiles.is_self", false)
        .order("event_date", { ascending: true })
        .limit(30);
      setOccasions((data ?? []) as Occasion[]);
    }
    setSaving(false);
  };

  const hasRecipients = recipients.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
      <section className="gp-card flex flex-col gap-5">
        <header className="flex flex-col gap-2">
          <div className="gp-pill">Upcoming moments</div>
          <p className="text-sm text-gp-evergreen/70">
            Sync the important dates for each profile so PerchPal can nudge you
            before shipping deadlines hit.
          </p>
        </header>

        {loading ? (
          <p className="text-sm text-gp-evergreen/70">Loading occasions…</p>
        ) : occasions.length === 0 ? (
          <div className="gp-card-soft text-center text-sm text-gp-evergreen/70">
            No occasions yet. Add one using the form to the right once you have
            at least one recipient profile.
          </div>
        ) : (
          <div className="space-y-4">
            {occasions.map((occasion) => (
              <article
                key={occasion.id}
                className="flex items-start gap-4 rounded-2xl border border-gp-evergreen/10 bg-gp-cream/70 p-4"
              >
                <div className="text-center">
                  <p className="text-lg font-semibold text-gp-evergreen">
                    {formatDisplayDate(occasion.event_date)}
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-gp-evergreen/60">
                    {occasion.event_type ?? "custom"}
                  </p>
                </div>
                <div className="flex-1">
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
                  {occasion.notes ? (
                    <p className="mt-1 text-sm text-gp-evergreen/80">
                      {occasion.notes}
                    </p>
                  ) : null}
                </div>
                <button className="gp-secondary-button px-3 py-1 text-xs">
                  Plan ideas
                </button>
              </article>
            ))}
          </div>
        )}

        {error ? (
          <p className="rounded-2xl bg-red-50 px-4 py-2 text-xs text-red-700">
            {error}
          </p>
        ) : null}
      </section>

      <section className="gp-card flex flex-col gap-4">
        <header>
          <div className="gp-pill">Add occasion</div>
          <p className="mt-2 text-sm text-gp-evergreen/70">
            Tie a date to a recipient so their history, preferences, and budget
            appear in Gift Ideas instantly.
          </p>
        </header>

        {loadingRecipients ? (
          <p className="text-sm text-gp-evergreen/70">
            Loading recipients…
          </p>
        ) : hasRecipients ? (
          <form className="space-y-4" onSubmit={handleAddOccasion}>
            <label className="flex flex-col gap-2 text-sm font-semibold text-gp-evergreen">
              Recipient
              <select
                className="gp-input"
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
                className="gp-input"
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="Maya's birthday brunch"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-gp-evergreen">
              Occasion type
              <input
                className="gp-input"
                value={newEventType}
                onChange={(event) => setNewEventType(event.target.value)}
                placeholder="birthday, anniversary, milestone…"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-gp-evergreen">
              Event date
              <input
                type="date"
                className="gp-input"
                value={newEventDate}
                onChange={(event) => setNewEventDate(event.target.value)}
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-gp-evergreen">
              Notes
              <textarea
                className="gp-input min-h-[90px] resize-none"
                value={newNotes}
                onChange={(event) => setNewNotes(event.target.value)}
                placeholder="Prefers experience gifts, loves art supplies."
              />
            </label>

            <button
              type="submit"
              className="gp-primary-button w-full"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save occasion"}
            </button>
          </form>
        ) : (
          <div className="gp-card-soft text-sm text-gp-evergreen/70">
            You need at least one recipient profile before you can plan
            occasions. Head to the Recipients page to add a person.
          </div>
        )}
      </section>
    </div>
  );
}
