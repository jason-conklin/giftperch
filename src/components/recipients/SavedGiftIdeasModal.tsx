import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { Database } from "@/lib/database.types";
import type { GiftSuggestion } from "@/components/gifts/GiftSuggestionsPanel";
import { getGiftPreviewIcon } from "@/lib/gifts/getGiftPreviewIcon";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import {
  AFFILIATE_DISCLOSURE,
  AFFILIATE_LINK_REL,
  AFFILIATE_SHOPPING_BUTTON_CLASS,
  getMatchedProductPresentation,
  getSafeExternalUrl,
  getSafeImageUrl,
  isExpectedAmazonAffiliateUrl,
  normalizeProductMatch,
} from "@/lib/affiliateProduct";

type SavedGiftIdea =
  Database["public"]["Tables"]["recipient_saved_gift_ideas"]["Row"];
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
  onSavedGiftRemoved?: (
    recipientId: string,
    gift: Pick<SavedGiftIdea, "id" | "title" | "product_match">,
  ) => void;
};

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; gifts: SavedGiftIdea[] };

export function SavedGiftIdeasModal({
  recipientId,
  recipientName,
  recipientAvatarUrl,
  recipientAvatarIcon,
  isOpen,
  onClose,
  authToken,
  onSavedGiftRemoved,
}: Props) {
  const { user } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [state, setState] = useState<FetchState>({ status: "idle" });
  const [removingId, setRemovingId] = useState<string | null>(null);
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

  const mapToSuggestionShape = (gift: SavedGiftIdea): GiftSuggestion => ({
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
    price_min: gift.estimated_price_min,
    price_max: gift.estimated_price_max,
    price_hint: null,
    price_guidance: null,
    why_it_fits: gift.rationale ?? "",
    suggested_url: gift.product_url,
    image_url: gift.image_url,
    productMatch: normalizeProductMatch(gift.product_match),
    initialSaved: true,
  });

  const headers = useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) h.Authorization = `Bearer ${authToken}`;
    return h;
  }, [authToken]);

  const fetchGifts = async (targetRecipientId: string) => {
    setState({ status: "loading" });
    try {
      const savedRes = await fetch(
        `/api/recipients/${targetRecipientId}/saved-gifts`,
        { headers },
      );
      if (!savedRes.ok) {
        const body = await savedRes.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load saved gifts");
      }
      const saved = (await savedRes.json()) as { savedGifts: SavedGiftIdea[] };
      setState({
        status: "success",
        gifts: saved.savedGifts || [],
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
      setIsRecipientMenuOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedRecipientId]);

  useEffect(() => {
    if (!isOpen) return;
    listRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [isOpen, selectedRecipientId]);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

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

  const handleRemove = async (gift: SavedGiftIdea) => {
    if (!selectedRecipientId) return;
    setRemovingId(gift.id);
    try {
      const res = await fetch(
        `/api/recipients/${selectedRecipientId}/saved-gifts?id=${encodeURIComponent(
          gift.id,
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
          gifts: prev.gifts.filter((item) => item.id !== gift.id),
        };
      });
      onSavedGiftRemoved?.(selectedRecipientId, gift);
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

  const gifts = state.status === "success" ? state.gifts : [];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[190] flex items-center justify-center bg-black/40 p-2 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="flex max-h-[calc(100vh-1rem)] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-gp-cream shadow-2xl sm:max-h-[calc(100vh-2rem)] lg:max-h-[calc(100vh-4rem)]"
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

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-gp-evergreen/10 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-display text-lg font-semibold text-gp-evergreen">
                  Your saved collection
                </p>
                <p className="mt-0.5 text-sm text-gp-evergreen/65">
                  Keep promising ideas together until you are ready to gift.
                </p>
              </div>
              {state.status === "success" ? (
                <span className="shrink-0 rounded-full bg-gp-gold/25 px-3 py-1 text-xs font-semibold text-gp-evergreen">
                  {gifts.length} saved
                </span>
              ) : null}
            </div>
          </div>

          <div
            ref={listRef}
            className="min-h-[12rem] flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6"
          >
            {state.status === "loading" && (
              <p className="text-sm text-gp-evergreen/70">Loading saved gifts…</p>
            )}
            {state.status === "error" && (
              <p className="text-sm text-red-700">{state.message}</p>
            )}
            {state.status === "success" && gifts.length === 0 && (
              <p className="text-sm text-gp-evergreen/70">
                No saved gift ideas yet. Save ideas from AI suggestions to see them
                here.
              </p>
            )}
            {state.status === "success" && gifts.length > 0 && (
              <div className="space-y-3">
                {gifts.map((gift) => {
                  const priceMin = gift.estimated_price_min;
                  const priceMax = gift.estimated_price_max;
                  const suggestionShape = mapToSuggestionShape(gift);
                  const previewIcon = getGiftPreviewIcon(suggestionShape);
                  const matchedProduct = getMatchedProductPresentation(
                    gift.product_match,
                  );
                  const savedImage =
                    matchedProduct?.match.imageUrl ??
                    getSafeImageUrl(gift.image_url);
                  const legacyProductUrl = getSafeExternalUrl(gift.product_url);
                  const shoppingHref =
                    matchedProduct?.match.affiliateUrl ?? legacyProductUrl;
                  const shoppingLabel = matchedProduct
                    ? matchedProduct.shoppingLabel
                    : legacyProductUrl &&
                      isExpectedAmazonAffiliateUrl(legacyProductUrl)
                    ? "View on Amazon"
                    : "View product";
                  const isAffiliateShoppingLink =
                    Boolean(matchedProduct) ||
                    Boolean(
                      legacyProductUrl &&
                        isExpectedAmazonAffiliateUrl(legacyProductUrl),
                    );
                  const displayedPrice =
                    matchedProduct?.priceDisplay ??
                    (priceMin !== null || priceMax !== null
                      ? formatPriceRange(priceMin, priceMax)
                      : null);
                  return (
                    <div
                      key={gift.id}
                      className="flex flex-col gap-3 rounded-2xl border border-gp-evergreen/10 bg-white/90 p-4 shadow-sm sm:flex-row sm:items-start"
                    >
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gp-evergreen/10 bg-gp-cream">
                        <Image
                          src={savedImage ?? previewIcon}
                          alt={
                            savedImage
                              ? matchedProduct?.match.productTitle ?? gift.title
                              : gift.title
                          }
                          fill
                          sizes="80px"
                          className={savedImage ? "object-contain" : "object-cover"}
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
                        </div>
                        {gift.rationale ? (
                          <p className="text-sm text-gp-evergreen/80 line-clamp-2">
                            {gift.rationale}
                          </p>
                        ) : null}
                        {matchedProduct ? (
                          <div className="pt-1 text-xs text-gp-evergreen/75">
                            <p className="font-semibold text-gp-evergreen">
                              {matchedProduct.match.productTitle}
                            </p>
                            <p>{matchedProduct.merchantLabel}</p>
                          </div>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-semibold text-gp-evergreen/70">
                          {displayedPrice ? <span>{displayedPrice}</span> : null}
                          {shoppingHref ? (
                            <a
                              href={shoppingHref}
                              target="_blank"
                              rel={
                                isAffiliateShoppingLink
                                  ? AFFILIATE_LINK_REL
                                  : "noopener noreferrer"
                              }
                              className={`${AFFILIATE_SHOPPING_BUTTON_CLASS} mt-1`}
                            >
                              {shoppingLabel}
                            </a>
                          ) : null}
                        </div>
                        {isAffiliateShoppingLink ? (
                          <p className="pt-1 text-[11px] text-gp-evergreen/60">
                            {AFFILIATE_DISCLOSURE}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:justify-between">
                        <button
                          type="button"
                          onClick={() => handleRemove(gift)}
                          disabled={removingId === gift.id}
                          className="text-xs font-semibold text-red-600 underline-offset-4 hover:underline disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                        >
                          {removingId === gift.id ? "Removing…" : "Remove"}
                        </button>
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
