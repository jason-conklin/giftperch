import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { Database } from "@/lib/database.types";
import type { GiftSuggestion } from "@/components/gifts/GiftSuggestionsPanel";
import { getGiftPreviewIcon } from "@/lib/gifts/getGiftPreviewIcon";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";

type SavedGiftIdea =
  Database["public"]["Tables"]["recipient_saved_gift_ideas"]["Row"];
type FeedbackIdea = {
  id: string;
  suggestion_id: string;
  title: string;
  tier: string | null;
  rationale: string | null;
  estimated_price_min: number | null;
  estimated_price_max: number | null;
  product_url: string | null;
  image_url: string | null;
  preference: "liked" | "disliked";
};
type CombinedGift = SavedGiftIdea | FeedbackIdea;
type RecipientSwitchOption = {
  id: string;
  name: string;
  relationship: string | null;
  avatar_url: string | null;
  avatar_icon: string | null;
};

type Props = {
  recipientId: string;
  recipientName: string;
  recipientAvatarUrl?: string | null;
  recipientAvatarIcon?: string | null;
  isOpen: boolean;
  onClose: () => void;
  authToken?: string | null;
};

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "success";
      saved: SavedGiftIdea[];
      liked: FeedbackIdea[];
      disliked: FeedbackIdea[];
    };

export function SavedGiftIdeasModal({
  recipientId,
  recipientName,
  recipientAvatarUrl,
  recipientAvatarIcon,
  isOpen,
  onClose,
  authToken,
}: Props) {
  const { user } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [state, setState] = useState<FetchState>({ status: "idle" });
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removingFeedbackId, setRemovingFeedbackId] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<"saved" | "liked" | "disliked">(
    "saved",
  );
  const [selectedRecipientId, setSelectedRecipientId] = useState(recipientId);
  const [recipientOptions, setRecipientOptions] = useState<RecipientSwitchOption[]>([]);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
  const [isRecipientMenuOpen, setIsRecipientMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const recipientSwitcherButtonRef = useRef<HTMLButtonElement>(null);
  const recipientSwitcherMenuRef = useRef<HTMLDivElement>(null);
  const recipientMenuWasOpenRef = useRef(false);

  const fallbackRecipientOption = useMemo<RecipientSwitchOption>(
    () => ({
      id: recipientId,
      name: recipientName,
      relationship: null,
      avatar_url: recipientAvatarUrl ?? null,
      avatar_icon: recipientAvatarIcon ?? null,
    }),
    [recipientAvatarIcon, recipientAvatarUrl, recipientId, recipientName],
  );

  const selectedRecipient = useMemo(() => {
    if (selectedRecipientId === fallbackRecipientOption.id) {
      return (
        recipientOptions.find((item) => item.id === selectedRecipientId) ??
        fallbackRecipientOption
      );
    }
    return (
      recipientOptions.find((item) => item.id === selectedRecipientId) ?? null
    );
  }, [fallbackRecipientOption, recipientOptions, selectedRecipientId]);

  const mapToSuggestionShape = (gift: CombinedGift): GiftSuggestion => ({
    id: gift.id,
    title: gift.title,
    short_description: "",
    tier:
      (gift as { tier?: string | null }).tier === "experience"
        ? "experience"
        : (gift as { tier?: string | null }).tier === "splurge"
        ? "splurge"
        : (gift as { tier?: string | null }).tier === "safe"
        ? "safe"
        : "thoughtful",
    price_min:
      "estimated_price_min" in gift ? gift.estimated_price_min : null,
    price_max:
      "estimated_price_max" in gift ? gift.estimated_price_max : null,
    price_hint: null,
    price_guidance: null,
    why_it_fits:
      "rationale" in gift && gift.rationale
        ? gift.rationale
        : "",
    suggested_url:
      "product_url" in gift ? gift.product_url ?? null : null,
    image_url:
      "image_url" in gift ? gift.image_url ?? null : null,
    initialSaved: true,
    initialPreference:
      "preference" in gift ? (gift.preference as "liked" | "disliked") : null,
  });

  const headers = useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) h.Authorization = `Bearer ${authToken}`;
    return h;
  }, [authToken]);

  const fetchGifts = async (targetRecipientId: string) => {
    setState({ status: "loading" });
    try {
      const [savedRes, feedbackRes] = await Promise.all([
        fetch(`/api/recipients/${targetRecipientId}/saved-gifts`, { headers }),
        fetch(`/api/recipients/${targetRecipientId}/feedback/summary`, { headers }),
      ]);
      if (!savedRes.ok) {
        const body = await savedRes.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load saved gifts");
      }
      if (!feedbackRes.ok) {
        const body = await feedbackRes.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load feedback");
      }
      const saved = (await savedRes.json()) as { savedGifts: SavedGiftIdea[] };
      const feedback = (await feedbackRes.json()) as {
        liked: FeedbackIdea[];
        disliked: FeedbackIdea[];
      };
      setState({
        status: "success",
        saved: saved.savedGifts || [],
        liked: feedback.liked || [],
        disliked: feedback.disliked || [],
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load saved gifts";
      setState({ status: "error", message });
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedRecipientId(recipientId);
      setIsRecipientMenuOpen(false);
    }
  }, [isOpen, recipientId]);

  useEffect(() => {
    if (!isOpen || !user?.id) return;
    let active = true;
    const loadRecipients = async () => {
      setIsLoadingRecipients(true);
      const { data, error } = await supabase
        .from("recipient_profiles")
        .select("id, name, relationship, avatar_url, avatar_icon, is_self")
        .eq("user_id", user.id)
        .eq("is_self", false)
        .order("name", { ascending: true });

      if (!active) return;

      if (error) {
        console.error("Failed to load recipients for saved gifts modal", error);
        setRecipientOptions([fallbackRecipientOption]);
        setIsLoadingRecipients(false);
        return;
      }

      const options = ((data ?? []) as unknown[])
        .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
        .map((row) => ({
          id: typeof row.id === "string" ? row.id : "",
          name: typeof row.name === "string" ? row.name : "",
          relationship:
            typeof row.relationship === "string" ? row.relationship : null,
          avatar_url:
            typeof row.avatar_url === "string" ? row.avatar_url : null,
          avatar_icon:
            typeof row.avatar_icon === "string" ? row.avatar_icon : null,
        }))
        .filter((row) => row.id && row.name);

      const hasFallback = options.some(
        (row) => row.id === fallbackRecipientOption.id,
      );
      setRecipientOptions(
        hasFallback ? options : [fallbackRecipientOption, ...options],
      );
      setIsLoadingRecipients(false);
    };

    void loadRecipients();

    return () => {
      active = false;
    };
  }, [fallbackRecipientOption, isOpen, supabase, user?.id]);

  useEffect(() => {
    if (isOpen) {
      if (selectedRecipientId) {
        fetchGifts(selectedRecipientId);
      }
    } else {
      setState({ status: "idle" });
      setActiveTab("saved");
      setIsRecipientMenuOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedRecipientId]);

  useEffect(() => {
    if (!isOpen) return;
    listRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [isOpen, selectedRecipientId]);

  useEffect(() => {
    if (!isOpen || !isRecipientMenuOpen) return;
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (recipientSwitcherButtonRef.current?.contains(target)) return;
      if (recipientSwitcherMenuRef.current?.contains(target)) return;
      setIsRecipientMenuOpen(false);
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [isOpen, isRecipientMenuOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        if (isRecipientMenuOpen) {
          setIsRecipientMenuOpen(false);
          return;
        }
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isRecipientMenuOpen, onClose]);

  useEffect(() => {
    if (isRecipientMenuOpen) {
      recipientMenuWasOpenRef.current = true;
      return;
    }
    if (recipientMenuWasOpenRef.current) {
      recipientSwitcherButtonRef.current?.focus();
      recipientMenuWasOpenRef.current = false;
    }
  }, [isRecipientMenuOpen]);

  const handleRemove = async (id: string) => {
    if (!selectedRecipientId) return;
    setRemovingId(id);
    try {
      const res = await fetch(
        `/api/recipients/${selectedRecipientId}/saved-gifts?id=${encodeURIComponent(
          id,
        )}`,
        { method: "DELETE", headers },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to remove gift");
      }
      setState((prev) => {
        if (prev.status !== "success") return prev;
        return {
          ...prev,
          saved: prev.saved.filter((gift) => gift.id !== id),
        };
      });
    } catch (err) {
      console.error(err);
      alert(
        err instanceof Error
          ? err.message
          : "Unable to remove saved gift. Please try again.",
      );
    } finally {
      setRemovingId(null);
    }
  };

  const handleRemoveFeedback = async (
    id: string,
    kind: "liked" | "disliked",
  ) => {
    if (!selectedRecipientId) return;
    setRemovingFeedbackId(id);
    try {
      const res = await fetch(
        `/api/recipients/${selectedRecipientId}/feedback?id=${encodeURIComponent(
          id,
        )}`,
        { method: "DELETE", headers },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to remove feedback");
      }
      setState((prev) => {
        if (prev.status !== "success") return prev;
        return {
          ...prev,
          liked:
            kind === "liked"
              ? prev.liked.filter((gift) => gift.id !== id)
              : prev.liked,
          disliked:
            kind === "disliked"
              ? prev.disliked.filter((gift) => gift.id !== id)
              : prev.disliked,
        };
      });
    } catch (err) {
      console.error(err);
      alert(
        err instanceof Error
          ? err.message
          : "Unable to remove feedback. Please try again.",
      );
    } finally {
      setRemovingFeedbackId(null);
    }
  };

  const { savedTab, liked, disliked } = useMemo(() => {
    if (state.status !== "success") {
      return {
        savedTab: [] as CombinedGift[],
        liked: [] as FeedbackIdea[],
        disliked: [] as FeedbackIdea[],
      };
    }

    // Saved tab should only contain explicitly saved ideas (do not merge liked here).
    return {
      savedTab: state.saved,
      liked: state.liked,
      disliked: state.disliked,
    };
  }, [state]);

  const activeList =
    activeTab === "saved" ? savedTab : activeTab === "liked" ? liked : disliked;

  const savedCount = savedTab.length;
  const likedCount = liked.length;
  const dislikedCount = disliked.length;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[190] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="flex w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-gp-cream shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-gp-evergreen/10 bg-gp-evergreen px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gp-cream/80">
              Saved gifts
            </p>
            <div className="relative mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-gp-cream">
                Saved ideas for
              </h2>
              <button
                ref={recipientSwitcherButtonRef}
                id="saved-gifts-recipient-switcher"
                type="button"
                aria-haspopup="menu"
                aria-expanded={isRecipientMenuOpen}
                aria-controls="saved-gifts-recipient-menu"
                onClick={() => setIsRecipientMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-gp-cream/40 bg-white/10 px-3 py-1.5 text-sm font-semibold text-gp-cream transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-gold/70 cursor-pointer"
              >
                <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-gp-cream/40 bg-white/90">
                  {selectedRecipient?.avatar_url ? (
                    <Image
                      src={selectedRecipient.avatar_url}
                      alt={selectedRecipient.name}
                      width={24}
                      height={24}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : selectedRecipient?.avatar_icon ? (
                    <Image
                      src={resolveRecipientAvatarIcon(selectedRecipient.avatar_icon)}
                      alt={selectedRecipient.name}
                      width={24}
                      height={24}
                      className="h-full w-full object-contain"
                      unoptimized
                    />
                  ) : (
                    <span className="text-[11px] font-semibold text-gp-evergreen">
                      {getInitials(selectedRecipient?.name ?? recipientName)}
                    </span>
                  )}
                </span>
                <span className="max-w-[11rem] truncate">
                  {selectedRecipient?.name ?? recipientName}
                </span>
                <svg
                  viewBox="0 0 20 20"
                  className={`h-4 w-4 transition ${isRecipientMenuOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m5 7 5 6 5-6" />
                </svg>
              </button>

              {isRecipientMenuOpen ? (
                <div
                  ref={recipientSwitcherMenuRef}
                  id="saved-gifts-recipient-menu"
                  role="menu"
                  aria-labelledby="saved-gifts-recipient-switcher"
                  className="absolute left-0 top-full z-30 mt-2 w-full max-w-sm overflow-hidden rounded-2xl border border-gp-evergreen/15 bg-white shadow-xl"
                >
                  <div className="max-h-64 overflow-y-auto p-1.5">
                    {isLoadingRecipients && recipientOptions.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-gp-evergreen/70">
                        Loading recipients…
                      </p>
                    ) : recipientOptions.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-gp-evergreen/70">
                        No recipients found.
                      </p>
                    ) : (
                      recipientOptions.map((recipient) => {
                        const isCurrent = recipient.id === selectedRecipientId;
                        return (
                          <button
                            key={recipient.id}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setSelectedRecipientId(recipient.id);
                              setIsRecipientMenuOpen(false);
                            }}
                            className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-gold/70 ${
                              isCurrent
                                ? "bg-gp-cream/80 text-gp-evergreen"
                                : "text-gp-evergreen hover:bg-gp-cream/60"
                            }`}
                          >
                            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-gp-evergreen/15 bg-gp-cream">
                              {recipient.avatar_url ? (
                                <Image
                                  src={recipient.avatar_url}
                                  alt={recipient.name}
                                  width={32}
                                  height={32}
                                  className="h-full w-full object-cover"
                                  unoptimized
                                />
                              ) : recipient.avatar_icon ? (
                                <Image
                                  src={resolveRecipientAvatarIcon(recipient.avatar_icon)}
                                  alt={recipient.name}
                                  width={32}
                                  height={32}
                                  className="h-full w-full object-contain"
                                  unoptimized
                                />
                              ) : (
                                <span className="text-xs font-semibold text-gp-evergreen">
                                  {getInitials(recipient.name)}
                                </span>
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">
                                {recipient.name}
                              </span>
                              <span className="block truncate text-xs text-gp-evergreen/70">
                                {recipient.relationship || "Relationship TBD"}
                              </span>
                            </span>
                            {isCurrent ? (
                              <svg
                                viewBox="0 0 20 20"
                                className="h-4 w-4 text-gp-evergreen"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="m4 10 4 4 8-8" />
                              </svg>
                            ) : null}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gp-cream/50 text-gp-cream transition hover:bg-white/15 cursor-pointer"
            aria-label="Close saved gifts"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-3 px-5 py-4 sm:px-6">
          <div className="inline-flex w-full rounded-full bg-white p-1 text-sm font-semibold text-gp-evergreen shadow-sm border border-gp-evergreen/15">
            {(["saved", "liked", "disliked"] as const).map((tab) => {
              const isActive = activeTab === tab;
              const label =
                tab === "saved"
                  ? `Saved (${savedCount})`
                  : tab === "liked"
                  ? `Liked (${likedCount})`
                  : `Disliked (${dislikedCount})`;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 rounded-full px-3 py-2 transition ${
                    isActive
                      ? "bg-gp-gold text-gp-evergreen shadow-sm"
                      : "bg-white text-gp-evergreen/80 hover:bg-gp-cream/70"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto">
          {state.status === "loading" && (
            <p className="text-sm text-gp-evergreen/70">Loading saved gifts…</p>
          )}
          {state.status === "error" && (
            <p className="text-sm text-red-700">{state.message}</p>
          )}
          {state.status === "success" && activeList.length === 0 && (
            <p className="text-sm text-gp-evergreen/70">
              No saved gift ideas yet. Save ideas from AI suggestions to see them
              here.
            </p>
          )}
          {state.status === "success" && activeList.length > 0 && (
            <div className="space-y-3">
              {activeList.map((gift) => {
                const isFeedback = "preference" in gift;
                const priceMin =
                  "estimated_price_min" in gift ? gift.estimated_price_min : null;
                const priceMax =
                  "estimated_price_max" in gift ? gift.estimated_price_max : null;
                const previewIcon = getGiftPreviewIcon(mapToSuggestionShape(gift));
                return (
                  <div
                    key={gift.id}
                    className="flex flex-col gap-3 rounded-2xl border border-gp-evergreen/10 bg-white/90 p-4 shadow-sm sm:flex-row sm:items-start"
                  >
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gp-evergreen/10 bg-gp-cream">
                      <Image
                        src={previewIcon}
                        alt={gift.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-gp-evergreen">
                          {gift.title}
                        </p>
                        {gift.tier ? (
                          <span className="rounded-full bg-gp-gold/30 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gp-evergreen">
                            {gift.tier}
                          </span>
                        ) : null}
                        {isFeedback ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                              gift.preference === "liked"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {gift.preference === "liked" ? "Liked" : "Disliked"}
                          </span>
                        ) : null}
                      </div>
                      {gift.rationale ? (
                        <p className="text-sm text-gp-evergreen/80 line-clamp-2">
                          {gift.rationale}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-semibold text-gp-evergreen/70">
                        {priceMin !== null || priceMax !== null ? (
                          <span>{formatPriceRange(priceMin, priceMax)}</span>
                        ) : null}
                        {gift.product_url ? (
                          <a
                            href={gift.product_url}
                            target="_blank"
                            rel="noreferrer"
                            className="underline underline-offset-4 hover:text-gp-evergreen"
                          >
                            Open on Amazon
                          </a>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:justify-between">
                      {isFeedback ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveFeedback(
                              gift.id,
                              gift.preference === "liked"
                                ? "liked"
                                : "disliked",
                            )
                          }
                          disabled={removingFeedbackId === gift.id}
                          className="text-xs font-semibold text-red-600 underline-offset-4 hover:underline disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                        >
                          {removingFeedbackId === gift.id
                            ? "Removing…"
                            : "Remove"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRemove(gift.id)}
                          disabled={removingId === gift.id}
                          className="text-xs font-semibold text-red-600 underline-offset-4 hover:underline disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                        >
                          {removingId === gift.id ? "Removing…" : "Remove"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatPriceRange(
  min: number | null,
  max: number | null,
): string | null {
  if (min === null && max === null) return null;
  if (min !== null && max !== null) return `$${min}–$${max}`;
  if (min !== null) return `From $${min}`;
  return `Up to $${max}`;
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "GP";
  const initials = trimmed
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || "GP";
}

function resolveRecipientAvatarIcon(iconValue: string): string {
  if (!iconValue.trim()) return "";
  if (iconValue.startsWith("/")) return iconValue;
  return `/icons/recipients/${iconValue}_icon.png`;
}
