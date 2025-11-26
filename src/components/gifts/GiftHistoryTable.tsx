"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { PerchPalLoader } from "@/components/perchpal/PerchPalLoader";
import Link from "next/link";
import Image from "next/image";
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
  avatar_url?: string | null;
  avatar_icon?: string | null;
};

type GiftFormState = {
  recipient_id: string;
  title: string;
  url: string;
  price: string;
  purchased_at: string;
  notes: string;
};

type SavedIdeaAggregated = {
  id: string;
  recipient_id: string;
  recipient_name: string;
  recipient_relationship: string | null;
  title: string;
  url: string | null;
  status: "saved" | "liked" | "disliked";
  created_at: string;
};

const getInitials = (value: string) => {
  if (!value) return "GP";
  const parts = value.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  const initials = `${first}${last}`.toUpperCase();
  return initials || "GP";
};

const toNoonIso = (dateStr: string | null | undefined) => {
  if (!dateStr) return null;
  const parsed = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const emptyGiftForm: GiftFormState = {
  recipient_id: "",
  title: "",
  url: "",
  price: "",
  purchased_at: "",
  notes: "",
};

type AddGiftModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  recipients: RecipientSummary[];
  formState: GiftFormState;
  formError: string;
  formSaving: boolean;
  onClose: () => void;
  onChange: (updater: (prev: GiftFormState) => GiftFormState) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

type GiftHistoryItemProps = {
  gift: GiftHistoryEntry;
  recipient: RecipientSummary | undefined;
  onEdit: (gift: GiftHistoryEntry) => void;
  onDelete: (gift: GiftHistoryEntry) => void;
};

function AddGiftModal({
  isOpen,
  mode,
  recipients,
  formState,
  formError,
  formSaving,
  onClose,
  onChange,
  onSubmit,
}: AddGiftModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Add gift"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-gp-cream p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-semibold text-gp-evergreen/70 shadow-sm transition hover:scale-105 hover:text-gp-evergreen cursor-pointer"
          aria-label="Close"
        >
          ×
        </button>

        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-gp-evergreen/60">
            Log a gift
          </p>
          <h2 className="text-xl font-semibold text-gp-evergreen">
            {mode === "create" ? "Add a new gift" : "Edit gift"}
          </h2>
        </div>

        <form className="mt-4 space-y-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-2 text-sm font-semibold text-gp-evergreen">
            Recipient*
            <select
              required
              value={formState.recipient_id}
              onChange={(event) =>
                onChange((prev) => ({
                  ...prev,
                  recipient_id: event.target.value,
                }))
              }
              className="gp-input cursor-pointer bg-white"
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
            Gift title*
            <input
              required
              value={formState.title}
              onChange={(event) =>
                onChange((prev) => ({ ...prev, title: event.target.value }))
              }
              className="gp-input bg-white"
            />
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-semibold text-gp-evergreen">
              URL
              <input
                type="url"
                value={formState.url}
                onChange={(event) =>
                  onChange((prev) => ({ ...prev, url: event.target.value }))
                }
                className="gp-input bg-white"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-gp-evergreen">
              Price
              <input
                type="number"
                min="0"
                step="0.01"
                value={formState.price}
                onChange={(event) =>
                  onChange((prev) => ({ ...prev, price: event.target.value }))
                }
                className="gp-input bg-white"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm font-semibold text-gp-evergreen">
            Purchased date
            <input
              type="date"
              value={formState.purchased_at}
              onChange={(event) =>
                onChange((prev) => ({
                  ...prev,
                  purchased_at: event.target.value,
                }))
              }
              className="gp-input cursor-pointer bg-white"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-semibold text-gp-evergreen">
            Notes
            <textarea
              value={formState.notes}
              onChange={(event) =>
                onChange((prev) => ({ ...prev, notes: event.target.value }))
              }
              className="gp-input min-h-[90px] resize-none bg-white"
              placeholder="Any details you want to remember."
            />
          </label>

          {formError ? (
            <p className="rounded-2xl bg-red-50 px-3 py-2 text-xs text-red-700">
              {formError}
            </p>
          ) : null}

          <button
            type="submit"
            className="gp-primary-button w-full cursor-pointer disabled:opacity-70"
            disabled={formSaving}
          >
            {formSaving ? "Saving..." : "Log gift"}
          </button>
        </form>
      </div>
    </div>
  );
}

function GiftHistoryItem({
  gift,
  recipient,
  onEdit,
  onDelete,
}: GiftHistoryItemProps) {
  const dateLabel = gift.purchased_at
    ? new Date(gift.purchased_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="gp-card flex w-full gap-3 rounded-2xl border border-gp-evergreen/10 bg-white/95 px-4 py-3 shadow-sm">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gp-cream text-sm font-semibold text-gp-evergreen shadow-sm overflow-hidden">
        {recipient?.avatar_url ? (
          <Image
            src={recipient.avatar_url}
            alt={recipient.name}
            width={48}
            height={48}
            className="h-full w-full object-cover"
          />
        ) : recipient?.avatar_icon ? (
          <Image
            src={`/${recipient.avatar_icon}_icon.png`}
            alt={recipient.name}
            width={48}
            height={48}
            className="h-full w-full object-cover"
          />
        ) : (
          getInitials(recipient?.name ?? "")
        )}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <p className="text-sm font-semibold text-gp-evergreen">
              {gift.title}
            </p>
          </div>
          {gift.url ? (
            <Link
              href={gift.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-full bg-gp-cream/80 px-2 py-1 text-[11px] font-semibold text-gp-evergreen transition hover:bg-gp-cream"
            >
              Link
            </Link>
          ) : null}
        </div>
        <p className="text-xs text-gp-evergreen/70">
          For: {recipient?.name ?? "Unknown"}
          {recipient?.relationship ? ` (${recipient.relationship})` : ""}
        </p>
        {dateLabel ? (
          <p className="text-xs text-gp-evergreen/70">Purchased: {dateLabel}</p>
        ) : null}
        {gift.notes ? (
          <p className="text-xs text-gp-evergreen/80">{gift.notes}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(gift)}
            className="rounded-full border border-gp-evergreen/25 px-3 py-1 text-[11px] font-semibold text-gp-evergreen transition hover:bg-gp-cream/70"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(gift)}
            className="text-[11px] font-semibold text-red-600 underline-offset-4 hover:underline"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function SavedIdeaItem({
  idea,
  onLog,
}: {
  idea: SavedIdeaAggregated;
  onLog: () => void;
}) {
  const badgeStyles =
    idea.status === "saved"
      ? "bg-gp-gold/25 text-gp-evergreen"
      : idea.status === "liked"
      ? "bg-emerald-100 text-emerald-800"
      : "bg-red-100 text-red-700";

  const savedLabel =
    idea.status === "saved"
      ? "Saved"
      : idea.status === "liked"
      ? "Liked"
      : "Disliked";

  const dateLabel = idea.created_at
    ? new Date(idea.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="gp-card flex flex-col gap-1 rounded-2xl border border-gp-evergreen/10 bg-white/95 px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gp-evergreen">{idea.title}</p>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeStyles}`}>
          {savedLabel}
        </span>
      </div>
      <p className="text-xs text-gp-evergreen/70">
        For: {idea.recipient_name}
        {idea.recipient_relationship ? ` (${idea.recipient_relationship})` : ""}{" "}
        {dateLabel ? `· ${dateLabel}` : ""}
      </p>
      {idea.url ? (
        <a
          href={idea.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-gp-evergreen underline-offset-4 hover:underline"
        >
          Open link
        </a>
      ) : null}
      <div className="mt-2">
        <button
          type="button"
          onClick={onLog}
          className="rounded-full bg-gp-evergreen px-3 py-1 text-[11px] font-semibold text-gp-cream transition hover:bg-[#0c3132] cursor-pointer"
        >
          Log this gift
        </button>
      </div>
    </div>
  );
}

export function GiftHistoryTable() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();
  const userId = useSupabaseSession().user?.id ?? null;
  const [gifts, setGifts] = useState<GiftHistoryEntry[]>([]);
  const [recipients, setRecipients] = useState<RecipientSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [recipientFilter, setRecipientFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [activeGift, setActiveGift] = useState<GiftHistoryEntry | null>(null);
  const [formState, setFormState] = useState<GiftFormState>(emptyGiftForm);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [initializedFilter, setInitializedFilter] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "saved">("history");
  const [savedIdeas, setSavedIdeas] = useState<SavedIdeaAggregated[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedError, setSavedError] = useState("");
  const [savedRecipientFilter, setSavedRecipientFilter] = useState("all");
  const [savedTypeFilter, setSavedTypeFilter] = useState<"all" | "saved" | "liked" | "disliked">("all");
  const [giftToDelete, setGiftToDelete] = useState<GiftHistoryEntry | null>(null);
  const [isDeletingGift, setIsDeletingGift] = useState(false);
  const [loggedFromSaved, setLoggedFromSaved] = useState(false);
  const [showSavedLogToast, setShowSavedLogToast] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!userId) return;
      setIsLoading(true);
      setError("");

      const [recipientsRes, giftsRes] = await Promise.all([
        supabase
          .from("recipient_profiles")
          .select("id, name, relationship, is_self, avatar_url, avatar_icon")
          .eq("user_id", userId)
          .order("name", { ascending: true }),
        supabase
          .from("gift_history")
          .select("*")
          .eq("user_id", userId)
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
  }, [supabase, userId]);

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

  const filteredSavedIdeas = useMemo(() => {
    return savedIdeas.filter((idea) => {
      if (savedRecipientFilter !== "all" && idea.recipient_id !== savedRecipientFilter) {
        return false;
      }
      if (savedTypeFilter !== "all" && idea.status !== savedTypeFilter) {
        return false;
      }
      return true;
    });
  }, [savedIdeas, savedRecipientFilter, savedTypeFilter]);

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
    setShowAddModal(true);
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
    setShowAddModal(true);
  };

  const closeForm = () => {
    setShowAddModal(false);
    setActiveGift(null);
    setFormState(emptyGiftForm);
    setFormError("");
    setFormSaving(false);
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) {
      setFormError("You must be signed in to log gifts.");
      return;
    }
    setFormSaving(true);
    setFormError("");

    const payload = {
      recipient_id: formState.recipient_id,
      title: formState.title.trim(),
      url: formState.url.trim() || null,
      price: formState.price ? Number(formState.price) : null,
      purchased_at: toNoonIso(formState.purchased_at),
      notes: formState.notes.trim() || null,
      user_id: userId,
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
        closeForm();
        if (loggedFromSaved) {
          setShowSavedLogToast(true);
          setActiveTab("saved");
        }
        setLoggedFromSaved(false);
      } else if (formMode === "edit" && activeGift) {
        const { data, error } = await supabase
          .from("gift_history")
          .update(payload)
          .eq("id", activeGift.id)
          .eq("user_id", userId)
          .select()
          .single();
        if (error) throw error;
        setGifts((prev) =>
          prev.map((gift) => (gift.id === data.id ? data : gift))
        );
        closeForm();
        setLoggedFromSaved(false);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to save gift.";
      setFormError(message);
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteGift = (gift: GiftHistoryEntry) => {
    setDeleteError("");
    setGiftToDelete(gift);
  };

  const confirmDeleteGift = async () => {
    if (!giftToDelete || !userId) {
      setDeleteError("You must be signed in to delete gifts.");
      setGiftToDelete(null);
      return;
    }
    setIsDeletingGift(true);
    try {
      const { error } = await supabase
        .from("gift_history")
        .delete()
        .eq("id", giftToDelete.id)
        .eq("user_id", userId);
      if (error) throw error;
      setGifts((prev) => prev.filter((entry) => entry.id !== giftToDelete.id));
      setGiftToDelete(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to delete gift.";
      setDeleteError(message);
    } finally {
      setIsDeletingGift(false);
    }
  };

  const handleLogSavedIdea = (idea: SavedIdeaAggregated) => {
    setFormMode("create");
    setActiveGift(null);
    setFormError("");
    setFormSaving(false);
    setLoggedFromSaved(true);
    setFormState({
      recipient_id: idea.recipient_id,
      title: idea.title,
      url: idea.url ?? "",
      price: "",
      purchased_at: "",
      notes: "",
    });
    setShowAddModal(true);
  };

  useEffect(() => {
    const loadSavedIdeas = async () => {
      if (activeTab !== "saved") return;
      if (!userId) return;
      if (!recipients.length) return;
      setSavedLoading(true);
      setSavedError("");

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

        const fetches = recipients.map(async (recipient) => {
          const [savedRes, feedbackRes] = await Promise.all([
            fetch(`/api/recipients/${recipient.id}/saved-gifts`, { headers }),
            fetch(`/api/recipients/${recipient.id}/feedback/summary`, { headers }),
          ]);

          if (!savedRes.ok) {
            const body = await savedRes.json().catch(() => ({}));
            throw new Error(body.error || "Failed to load saved gifts");
          }
          if (!feedbackRes.ok) {
            const body = await feedbackRes.json().catch(() => ({}));
            throw new Error(body.error || "Failed to load feedback");
          }

          const saved = (await savedRes.json()) as {
            savedGifts: {
              id: string;
              title: string;
              product_url: string | null;
              created_at: string;
            }[];
          };
          const feedback = (await feedbackRes.json()) as {
            liked: { id: string; title: string; product_url: string | null; created_at: string }[];
            disliked: { id: string; title: string; product_url: string | null; created_at: string }[];
          };

          const mapItem = (
            item: { id: string; title: string; product_url: string | null; created_at: string },
            status: "saved" | "liked" | "disliked",
          ): SavedIdeaAggregated => ({
            id: item.id,
            recipient_id: recipient.id,
            recipient_name: recipient.name,
            recipient_relationship: recipient.relationship ?? null,
            title: item.title,
            url: item.product_url,
            status,
            created_at: item.created_at,
          });

          return [
            ...saved.savedGifts.map((item) => mapItem(item, "saved")),
            ...feedback.liked.map((item) => mapItem(item, "liked")),
            ...feedback.disliked.map((item) => mapItem(item, "disliked")),
          ];
        });

        const results = await Promise.all(fetches);
        const flattened = results.flat().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setSavedIdeas(flattened);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load saved ideas.";
        setSavedError(message);
      } finally {
        setSavedLoading(false);
      }
    };

    loadSavedIdeas();
  }, [activeTab, recipients, supabase, userId]);

  return (
    <div className="space-y-6">
      {activeTab === "history" ? (
        <div className="gp-card space-y-3 rounded-2xl border border-gp-evergreen/10 bg-white/95 p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-semibold text-gp-evergreen">
              Recipient
              <select
                value={recipientFilter}
                onChange={(event) => setRecipientFilter(event.target.value)}
                className="gp-input cursor-pointer"
              >
                <option value="all">All recipients</option>
                {recipients.map((recipient) => (
                  <option key={recipient.id} value={recipient.id}>
                    {recipient.name}
                    {recipient.relationship ? ` (${recipient.relationship})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm font-semibold text-gp-evergreen">
              Search
              <input
                type="text"
                placeholder="Search by gift title or notes..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="gp-input"
              />
            </label>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition cursor-pointer ${
              activeTab === "history"
                ? "bg-gp-gold text-gp-evergreen shadow-sm"
                : "text-gp-evergreen/60 hover:text-gp-evergreen"
            }`}
          >
            Gift history
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("saved")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition cursor-pointer ${
              activeTab === "saved"
                ? "bg-gp-gold text-gp-evergreen shadow-sm"
                : "text-gp-evergreen/60 hover:text-gp-evergreen"
            }`}
          >
            Saved ideas
          </button>
        </div>
        {activeTab === "history" ? (
          <button
            type="button"
            onClick={openCreateForm}
            className="gp-primary-button cursor-pointer rounded-full px-5 py-2 text-sm font-semibold"
          >
            Add gift
          </button>
        ) : null}
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
      ) : activeTab === "history" ? (
        filteredGifts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gp-evergreen/15 bg-gp-cream/60 px-6 py-10 text-center text-sm text-gp-evergreen">
            <p className="text-lg font-semibold text-gp-evergreen">
              No gifts logged yet
            </p>
            <p className="mt-3 text-sm text-gp-evergreen/80">
              Track what you’ve gifted so PerchPal can avoid duplicates and surface better ideas. Start by logging a recent present.
            </p>
            <button
              type="button"
              onClick={openCreateForm}
              className="gp-primary-button mt-5 cursor-pointer rounded-full px-5 py-2 text-sm font-semibold"
            >
              Log your first gift
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredGifts.map((gift) => (
              <GiftHistoryItem
                key={gift.id}
                gift={gift}
                recipient={recipientMap[gift.recipient_id]}
                onEdit={openEditForm}
                onDelete={handleDeleteGift}
              />
            ))}
          </div>
        )
      ) : savedLoading ? (
        <div className="flex justify-center">
          <PerchPalLoader
            variant="block"
            size="md"
            message="Loading saved ideas..."
          />
        </div>
      ) : savedError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {savedError}
        </div>
      ) : (
        <div className="space-y-3">
          {showSavedLogToast ? (
            <div className="flex items-start justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm">
              <div className="space-y-1">
                <p className="font-semibold">Gift logged</p>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-semibold text-emerald-900 underline-offset-4 hover:underline"
                  onClick={() => setActiveTab("history")}
                >
                  View here →
                </button>
              </div>
              <button
                type="button"
                aria-label="Dismiss gift logged"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-semibold text-emerald-800 shadow-sm transition hover:scale-105"
                onClick={() => setShowSavedLogToast(false)}
              >
                ×
              </button>
            </div>
          ) : null}
          <div className="flex flex-col gap-3 rounded-2xl border border-gp-evergreen/15 bg-white/95 p-4 shadow-sm md:flex-row md:items-end md:justify-between">
            <label className="flex flex-1 flex-col gap-2 text-sm font-semibold text-gp-evergreen">
              Recipient
              <select
                value={savedRecipientFilter}
                onChange={(event) => setSavedRecipientFilter(event.target.value)}
                className="gp-input cursor-pointer"
              >
                <option value="all">All recipients</option>
                {recipients.map((recipient) => (
                  <option key={recipient.id} value={recipient.id}>
                    {recipient.name}
                    {recipient.relationship ? ` (${recipient.relationship})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              {(["all", "saved", "liked", "disliked"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSavedTypeFilter(type)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                    savedTypeFilter === type
                      ? "bg-gp-gold text-gp-evergreen shadow-sm"
                      : "bg-gp-cream/70 text-gp-evergreen/70 hover:bg-gp-cream"
                  }`}
                >
                  {type === "all"
                    ? "All"
                    : type === "saved"
                    ? "Saved"
                    : type === "liked"
                    ? "Liked"
                    : "Disliked"}
                </button>
              ))}
            </div>
          </div>

          {filteredSavedIdeas.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gp-evergreen/15 bg-gp-cream/60 px-6 py-10 text-center text-sm text-gp-evergreen">
              <p className="text-base font-semibold text-gp-evergreen">
                {savedIdeas.length === 0
                  ? "No saved ideas yet"
                  : "No saved ideas match your filters"}
              </p>
              <p className="mt-2 text-sm text-gp-evergreen/70">
                {savedIdeas.length === 0
                  ? "Try saving or liking suggestions from PerchPal on the Gift Ideas page. They’ll show up here so you can log them once you’ve gifted them."
                  : "Adjust filters or clear them to see your saved, liked, and disliked ideas."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSavedIdeas.map((idea) => (
                <SavedIdeaItem
                  key={`${idea.status}-${idea.id}`}
                  idea={idea}
                  onLog={() => handleLogSavedIdea(idea)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <AddGiftModal
        isOpen={showAddModal}
        mode={formMode}
        recipients={recipients}
        formState={formState}
        formError={formError}
        formSaving={formSaving}
        onClose={closeForm}
        onChange={setFormState}
        onSubmit={handleFormSubmit}
      />

      {giftToDelete ? (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-gp-cream p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gp-evergreen/60">
                  Delete gift
                </p>
                <h2 className="text-xl font-semibold text-gp-evergreen">
                  Remove “{giftToDelete.title}”?
                </h2>
                <p className="mt-1 text-sm text-gp-evergreen/70">
                  This will delete the logged gift from your history. This action cannot be undone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGiftToDelete(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-semibold text-gp-evergreen/70 shadow-sm transition hover:scale-105 hover:text-gp-evergreen cursor-pointer"
                aria-label="Close delete confirmation"
              >
                ×
              </button>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="gp-secondary-button"
                onClick={() => setGiftToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteGift}
                disabled={isDeletingGift}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {isDeletingGift ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
