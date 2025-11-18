"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { PerchPalLoader } from "@/components/perchpal/PerchPalLoader";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export type GiftHistoryEntry = {
  id: string;
  user_id: string;
  recipient_id: string;
  title: string;
  url: string | null;
  image_url: string | null;
  price: number | null;
  purchased_at: string | null;
  notes: string | null;
  created_at: string;
};

export type RecipientSummary = {
  id: string;
  name: string;
  relationship: string | null;
  is_self?: boolean;
};

type GiftFormState = {
  recipient_id: string;
  title: string;
  url: string;
  price: string;
  purchased_at: string;
  notes: string;
};

const emptyGiftForm: GiftFormState = {
  recipient_id: "",
  title: "",
  url: "",
  price: "",
  purchased_at: "",
  notes: "",
};

export function GiftHistoryTable() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();
  const [gifts, setGifts] = useState<GiftHistoryEntry[]>([]);
  const [recipients, setRecipients] = useState<RecipientSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [recipientFilter, setRecipientFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [activeGift, setActiveGift] = useState<GiftHistoryEntry | null>(null);
  const [formState, setFormState] = useState<GiftFormState>(emptyGiftForm);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [initializedFilter, setInitializedFilter] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setError("");

      const [recipientsRes, giftsRes] = await Promise.all([
        supabase
          .from("recipient_profiles")
          .select("id, name, relationship, is_self")
          .order("name", { ascending: true }),
        supabase
          .from("gift_history")
          .select("*")
          .order("purchased_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false }),
      ]);

      if (!isMounted) return;

      if (recipientsRes.error) {
        setError(recipientsRes.error.message);
      } else {
        const recipientRows = (recipientsRes.data ?? []) as RecipientSummary[];
        setRecipients(recipientRows.filter((recipient) => !recipient.is_self));
      }

      if (giftsRes.error) {
        setError(giftsRes.error.message);
      } else {
        setGifts((giftsRes.data ?? []) as GiftHistoryEntry[]);
      }

      setIsLoading(false);
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (initializedFilter || !recipients.length) return;
    const recipientFromQuery = searchParams?.get("recipient");
    if (recipientFromQuery) {
      const exists = recipients.some(
        (recipient) => recipient.id === recipientFromQuery
      );
      if (exists) {
        setRecipientFilter(recipientFromQuery);
      }
    }
    setInitializedFilter(true);
  }, [recipients, searchParams, initializedFilter]);

  const recipientMap = useMemo(
    () =>
      recipients.reduce<Record<string, RecipientSummary>>((acc, recipient) => {
        acc[recipient.id] = recipient;
        return acc;
      }, {}),
    [recipients]
  );

  const filteredGifts = useMemo(() => {
    return gifts.filter((gift) => {
      if (recipientFilter !== "all" && gift.recipient_id !== recipientFilter) {
        return false;
      }

      const term = search.trim().toLowerCase();
      if (term) {
        const matchTitle = gift.title.toLowerCase().includes(term);
        const matchNotes =
          gift.notes?.toLowerCase().includes(term) ?? false;
        if (!matchTitle && !matchNotes) return false;
      }

      if (dateFrom) {
        if (!gift.purchased_at) return false;
        if (new Date(gift.purchased_at) < new Date(dateFrom)) return false;
      }

      if (dateTo) {
        if (!gift.purchased_at) return false;
        if (new Date(gift.purchased_at) > new Date(dateTo)) return false;
      }

      return true;
    });
  }, [gifts, recipientFilter, search, dateFrom, dateTo]);

  const openCreateForm = () => {
    setFormMode("create");
    setActiveGift(null);
    setFormState(emptyGiftForm);
    setFormError("");
    setFormMessage("");
    setIsFormOpen(true);
  };

  const openEditForm = (gift: GiftHistoryEntry) => {
    setFormMode("edit");
    setActiveGift(gift);
    setFormState({
      recipient_id: gift.recipient_id,
      title: gift.title,
      url: gift.url ?? "",
      price: gift.price ? String(gift.price) : "",
      purchased_at: gift.purchased_at
        ? gift.purchased_at.slice(0, 10)
        : "",
      notes: gift.notes ?? "",
    });
    setFormError("");
    setFormMessage("");
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setActiveGift(null);
    setFormState(emptyGiftForm);
    setFormError("");
    setFormMessage("");
    setFormSaving(false);
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormSaving(true);
    setFormError("");
    setFormMessage("");

    const payload = {
      recipient_id: formState.recipient_id,
      title: formState.title.trim(),
      url: formState.url.trim() || null,
      price: formState.price ? Number(formState.price) : null,
      purchased_at: formState.purchased_at
        ? new Date(formState.purchased_at).toISOString()
        : null,
      notes: formState.notes.trim() || null,
    };

    try {
      if (!payload.recipient_id) throw new Error("Recipient is required.");
      if (!payload.title) throw new Error("Gift title is required.");

      if (formMode === "create") {
        const { data, error } = await supabase
          .from("gift_history")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setGifts((prev) => [data, ...prev]);
        setFormMessage("Gift saved.");
        setFormState(emptyGiftForm);
      } else if (formMode === "edit" && activeGift) {
        const { data, error } = await supabase
          .from("gift_history")
          .update(payload)
          .eq("id", activeGift.id)
          .select()
          .single();
        if (error) throw error;
        setGifts((prev) =>
          prev.map((gift) => (gift.id === data.id ? data : gift))
        );
        setFormMessage("Gift updated.");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to save gift.";
      setFormError(message);
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteGift = async (gift: GiftHistoryEntry) => {
    setDeleteError("");
    const confirmDelete = window.confirm(
      `Remove "${gift.title}" from gift history?`
    );
    if (!confirmDelete) return;
    try {
      const { error } = await supabase
        .from("gift_history")
        .delete()
        .eq("id", gift.id);
      if (error) throw error;
      setGifts((prev) => prev.filter((entry) => entry.id !== gift.id));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to delete gift.";
      setDeleteError(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-gp-evergreen/15 bg-white/90 p-4 shadow-sm md:grid md:grid-cols-2 md:items-end">
        <div className="space-y-2">
          <label
            htmlFor="recipient-filter"
            className="text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70"
          >
            Recipient
          </label>
          <select
            id="recipient-filter"
            value={recipientFilter}
            onChange={(event) => setRecipientFilter(event.target.value)}
            className="w-full rounded-full border border-gp-evergreen/30 bg-transparent px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
          >
            <option value="all">All recipients</option>
            {recipients.map((recipient) => (
              <option key={recipient.id} value={recipient.id}>
                {recipient.name}
                {recipient.relationship
                  ? ` (${recipient.relationship})`
                  : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label
            htmlFor="gift-search"
            className="text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70"
          >
            Search
          </label>
          <input
            id="gift-search"
            type="text"
            placeholder="Search by gift title or notes..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-full border border-gp-evergreen/30 bg-transparent px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="date-from"
            className="text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70"
          >
            Date from
          </label>
          <input
            id="date-from"
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="w-full rounded-full border border-gp-evergreen/30 bg-transparent px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="date-to"
            className="text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70"
          >
            Date to
          </label>
          <input
            id="date-to"
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="w-full rounded-full border border-gp-evergreen/30 bg-transparent px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="button"
            onClick={openCreateForm}
            className="w-full rounded-full bg-gp-evergreen px-5 py-2 text-sm font-semibold text-gp-cream transition hover:bg-[#0c3132] md:w-auto"
          >
            Add gift
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {deleteError && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {deleteError}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center">
          <PerchPalLoader
            variant="block"
            size="md"
            message="PerchPal is loading your gift history..."
          />
        </div>
      ) : filteredGifts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gp-evergreen/30 bg-gp-cream/70 p-6 text-center text-sm text-gp-evergreen">
          <p className="text-base font-semibold text-gp-evergreen">
            No gifts logged yet
          </p>
          <p className="mt-2 text-sm text-gp-evergreen/80">
            Track what you’ve gifted so PerchPal can avoid duplicates and
            surface new ideas. Start by logging a recent present.
          </p>
          <button
            type="button"
            onClick={openCreateForm}
            className="mt-4 rounded-full bg-gp-evergreen px-5 py-2 text-sm font-semibold text-gp-cream transition hover:bg-[#0c3132]"
          >
            Log your first gift
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredGifts.map((gift) => {
            const recipient = recipientMap[gift.recipient_id];
            return (
              <div
                key={gift.id}
                className="rounded-2xl border border-gp-evergreen/15 bg-white/90 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-gp-evergreen">
                      {gift.title}
                    </p>
                    {recipient ? (
                      <p className="text-sm text-gp-evergreen/70">
                        {recipient.name}
                        {recipient.relationship
                          ? ` · ${recipient.relationship}`
                          : ""}
                      </p>
                    ) : (
                      <p className="text-sm text-gp-evergreen/70">
                        Unknown recipient
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(gift)}
                      className="rounded-full border border-gp-evergreen/30 px-3 py-1 text-xs font-semibold text-gp-evergreen transition hover:bg-gp-cream/80"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGift(gift)}
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <dl className="mt-4 space-y-2 text-sm text-gp-evergreen/80">
                  {gift.purchased_at && (
                    <div className="flex justify-between">
                      <dt className="font-semibold">Purchased</dt>
                      <dd>
                        {new Date(gift.purchased_at).toLocaleDateString()}
                      </dd>
                    </div>
                  )}
                  {gift.price !== null && (
                    <div className="flex justify-between">
                      <dt className="font-semibold">Price</dt>
                      <dd>${gift.price.toFixed(2)}</dd>
                    </div>
                  )}
                </dl>
                {gift.url && (
                  <Link
                    href={gift.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-xs font-semibold text-gp-evergreen underline-offset-4 hover:underline"
                  >
                    View product link
                  </Link>
                )}
                {gift.notes && (
                  <p className="mt-3 rounded-xl bg-gp-cream/70 px-3 py-2 text-xs text-gp-evergreen/80">
                    {gift.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isFormOpen && (
        <section className="rounded-3xl border border-gp-evergreen/20 bg-white/95 p-6 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-gp-evergreen/60">
                {formMode === "create" ? "Log a gift" : "Edit gift"}
              </p>
              <h2 className="text-2xl font-semibold text-gp-evergreen">
                {formMode === "create"
                  ? "Add a new gift"
                  : `Update ${activeGift?.title ?? "gift"}`}
              </h2>
            </div>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-full border border-gp-evergreen/30 px-3 py-1 text-xs font-semibold text-gp-evergreen transition hover:bg-gp-cream/80"
            >
              Close
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleFormSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="form-recipient"
                  className="text-sm font-medium text-gp-evergreen"
                >
                  Recipient*
                </label>
                <select
                  id="form-recipient"
                  required
                  value={formState.recipient_id}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      recipient_id: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                >
                  <option value="">Select recipient</option>
                  {recipients.map((recipient) => (
                    <option key={recipient.id} value={recipient.id}>
                      {recipient.name}
                      {recipient.relationship
                        ? ` (${recipient.relationship})`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="form-title"
                  className="text-sm font-medium text-gp-evergreen"
                >
                  Gift title*
                </label>
                <input
                  id="form-title"
                  type="text"
                  required
                  value={formState.title}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label
                  htmlFor="form-url"
                  className="text-sm font-medium text-gp-evergreen"
                >
                  URL
                </label>
                <input
                  id="form-url"
                  type="url"
                  value={formState.url}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      url: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="form-price"
                  className="text-sm font-medium text-gp-evergreen"
                >
                  Price
                </label>
                <input
                  id="form-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.price}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      price: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="form-purchased"
                  className="text-sm font-medium text-gp-evergreen"
                >
                  Purchased date
                </label>
                <input
                  id="form-purchased"
                  type="date"
                  value={formState.purchased_at}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      purchased_at: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="form-notes"
                className="text-sm font-medium text-gp-evergreen"
              >
                Notes
              </label>
              <textarea
                id="form-notes"
                rows={3}
                value={formState.notes}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-gp-evergreen/30 bg-transparent px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-gp-gold px-5 py-3 text-sm font-semibold text-gp-evergreen transition hover:bg-[#bda775] disabled:opacity-60"
              disabled={formSaving}
            >
              {formMode === "create" ? "Save gift" : "Update gift"}
            </button>

            {formSaving && (
              <div className="flex justify-center">
                <PerchPalLoader
                  variant="inline"
                  size="sm"
                  message="PerchPal is saving your gift..."
                />
              </div>
            )}

            {formError && (
              <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-700">
                {formError}
              </p>
            )}
            {formMessage && (
              <p className="rounded-2xl bg-gp-cream px-4 py-2 text-sm text-gp-evergreen">
                {formMessage}
              </p>
            )}
          </form>
        </section>
      )}
    </div>
  );
}
