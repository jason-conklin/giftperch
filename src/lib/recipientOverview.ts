import type { SupabaseClient } from "@supabase/supabase-js";

export type OverviewRecipient = {
  id: string;
  name: string;
  relationship: string | null;
  pet_type: string | null;
  notes: string | null;
  birthday: string | null;
  annual_budget: number | null;
  gift_budget_min: number | null;
  gift_budget_max: number | null;
  created_at: string;
  updated_at: string;
};

export type RecipientOccasion = {
  id: string;
  recipient_id: string;
  label: string | null;
  event_date: string | null;
  event_type: string | null;
  occurs_every_year: boolean | null;
};
export type NextRecipientOccasion = {
  date: Date;
  label: string;
  recipientId: string;
};
export type RecipientSort = "newest" | "updated" | "name" | "occasion";

// Same local-calendar recurrence as Occasions: birthdays and explicitly annual
// events recur; one-off past dates do not. Global holidays aren't recipient dates.
export function recipientOccasions(
  recipients: ReadonlyArray<OverviewRecipient>,
  events: ReadonlyArray<RecipientOccasion>,
  now = new Date(),
): NextRecipientOccasion[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ids = new Set(recipients.map((recipient) => recipient.id));
  const result: NextRecipientOccasion[] = [];
  const add = (
    recipientId: string,
    raw: string | null,
    label: string,
    annual: boolean,
  ) => {
    if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return;
    const [year, month, day] = raw.split("-").map(Number);
    const original = new Date(year, month - 1, day);
    if (
      original.getFullYear() !== year ||
      original.getMonth() !== month - 1 ||
      original.getDate() !== day
    )
      return;
    const date = new Date(annual ? today.getFullYear() : year, month - 1, day);
    if (annual && date < today) date.setFullYear(date.getFullYear() + 1);
    if (date < today) return;
    if (
      !result.some(
        (item) =>
          item.recipientId === recipientId &&
          item.date.getTime() === date.getTime() &&
          item.label.toLowerCase() === label.toLowerCase(),
      )
    ) {
      result.push({ recipientId, date, label });
    }
  };
  for (const recipient of recipients)
    add(recipient.id, recipient.birthday, "Birthday", true);
  for (const event of events) {
    if (ids.has(event.recipient_id))
      add(
        event.recipient_id,
        event.event_date,
        event.event_type === "birthday"
          ? "Birthday"
          : event.label?.trim() || "Occasion",
        Boolean(event.occurs_every_year),
      );
  }
  return result.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function filterAndSortRecipients<T extends OverviewRecipient>(
  recipients: ReadonlyArray<T>,
  search: string,
  sort: RecipientSort,
  occasions: ReadonlyArray<NextRecipientOccasion>,
): T[] {
  const term = search.trim().toLowerCase();
  const next = new Map<string, number>();
  for (const occasion of occasions)
    if (!next.has(occasion.recipientId))
      next.set(occasion.recipientId, occasion.date.getTime());
  return recipients
    .filter((recipient) =>
      [recipient.name, recipient.relationship, recipient.pet_type].some(
        (value) => value?.toLowerCase().includes(term),
      ),
    )
    .sort((a, b) => {
      if (sort === "name")
        return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
      if (sort === "occasion")
        return (
          (next.get(a.id) ?? Infinity) - (next.get(b.id) ?? Infinity) ||
          a.name.localeCompare(b.name)
        );
      const field = sort === "updated" ? "updated_at" : "created_at";
      return b[field].localeCompare(a[field]) || a.id.localeCompare(b.id);
    });
}

// One paginated user-scoped scan, not a request per recipient. Fetch only IDs,
// never the saved product snapshots. Pagination avoids PostgREST's row cap.
export async function fetchRecipientSavedCounts(
  supabase: SupabaseClient,
  userId: string,
) {
  if (!userId) throw new Error("A user is required to load saved gift counts.");
  const counts: Record<string, number> = {};
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("recipient_saved_gift_ideas")
      .select("id, recipient_id")
      .eq("user_id", userId)
      .order("id")
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error("Unable to load saved gift counts.");
    for (const row of data ?? [])
      counts[row.recipient_id] = (counts[row.recipient_id] ?? 0) + 1;
    if (!data || data.length < pageSize) return counts;
  }
}
