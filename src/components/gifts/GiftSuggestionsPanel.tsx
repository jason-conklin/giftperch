"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { PerchPalLoader } from "@/components/perchpal/PerchPalLoader";
import { AmazonProduct } from "@/lib/amazonPaapi";
import { buildAmazonAffiliateUrl } from "@/lib/amazonAffiliate";
import { ThumbDownIcon, ThumbUpIcon } from "@/components/icons/ThumbIcons";
import { SavedGiftIdeasModal } from "@/components/recipients/SavedGiftIdeasModal";
import { FirstSuggestionsTipBanner } from "@/components/gifts/FirstSuggestionsTipBanner";

type AvatarIconKey =
  | "babyboy"
  | "babygirl"
  | "boy"
  | "girl"
  | "man"
  | "woman"
  | "dog"
  | "cat";

type RecipientOption = {
  id: string;
  name: string;
  relationship: string | null;
  pet_type: string | null;
  avatar_url: string | null;
  avatar_icon: AvatarIconKey | null;
};

const PRESET_AVATAR_OPTIONS: ReadonlyArray<{
  key: AvatarIconKey;
  label: string;
  image: string;
}> = [
  { key: "babyboy", label: "Baby boy", image: "/babyboy_icon.png" },
  { key: "babygirl", label: "Baby girl", image: "/babygirl_icon.png" },
  { key: "boy", label: "Boy", image: "/boy_icon.png" },
  { key: "girl", label: "Girl", image: "/girl_icon.png" },
  { key: "man", label: "Man", image: "/man_icon.png" },
  { key: "woman", label: "Woman", image: "/woman_icon.png" },
  { key: "dog", label: "Dog", image: "/dog_icon.png" },
  { key: "cat", label: "Cat", image: "/cat_icon.png" },
];

type RecipientAvatarVisual =
  | { kind: "image"; src: string; alt: string }
  | { kind: "preset"; src: string; alt: string }
  | { kind: "initials"; text: string };

const getInitials = (name: string) => {
  const safe = name.trim();
  if (!safe) return "GP";
  return safe
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const describeRecipientRelationship = (recipient: RecipientOption) => {
  if (!recipient.relationship) return "Relationship TBD";
  if (
    recipient.relationship.toLowerCase() === "pet" &&
    recipient.pet_type?.trim()
  ) {
    return `Pet (${recipient.pet_type})`;
  }
  return recipient.relationship;
};

const getRecipientAvatarVisual = (
  recipient: RecipientOption,
): RecipientAvatarVisual => {
  if (recipient.avatar_url) {
    return {
      kind: "image",
      src: recipient.avatar_url,
      alt: `${recipient.name} avatar`,
    };
  }
  if (recipient.avatar_icon) {
    const preset = PRESET_AVATAR_OPTIONS.find(
      (option) => option.key === recipient.avatar_icon,
    );
    if (preset) {
      return { kind: "preset", src: preset.image, alt: preset.label };
    }
  }
  return { kind: "initials", text: getInitials(recipient.name) };
};

export type GiftSuggestion = {
  id: string;
  title: string;
  short_description: string;
  tier: "safe" | "thoughtful" | "experience" | "splurge";
  price_min?: number | null;
  price_max?: number | null;
  price_hint?: string | null;
  price_guidance?: string | null;
  why_it_fits: string;
  suggested_url?: string | null;
  image_url?: string | null;
  initialSaved?: boolean;
  initialPreference?: "liked" | "disliked" | null;
};

type GiftPromptContext = {
  recipient_id: string;
  recipient_name: string;
  relationship?: string | null;
  occasion?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  notes_summary?: string | null;
  interests_summary?: string | null;
  last_gifts_summary?: string | null;
};

type SuggestionRun = {
  id: string;
  created_at: string;
  prompt_context: GiftPromptContext;
  suggestions: GiftSuggestion[];
};

type TierFilter = "all" | GiftSuggestion["tier"];
type SortOption = "relevance" | "price-asc" | "price-desc" | "tier";

type AmazonSuggestionState = {
  loading: boolean;
  error: string;
  products: AmazonProduct[];
};

type GiftSuggestionsPanelProps = {
  onFirstRunComplete?: () => void;
};

const DEFAULT_GIFT_IMAGE = "/gift_placeholder_img.png";

const formatRunLabel = (run: SuggestionRun) => {
  const date = new Date(run.created_at);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const occasion =
    (run.prompt_context.occasion &&
      run.prompt_context.occasion
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())) ||
    "No occasion";
  return `${dateStr} • ${timeStr} • ${occasion}`;
};
const PERCHPAL_ERROR_MESSAGE =
  "PerchPal is temporarily unavailable. Please try again in a few minutes.";
const AMAZON_PLACEHOLDER_MESSAGE =
  "No product matches found yet. Product previews will appear here when available.";

const getSuggestionIdentity = (suggestion: GiftSuggestion) =>
  suggestion.id?.trim() || "";

type SuggestionCardProps = {
  suggestionKey: string;
  suggestion: GiftSuggestion;
  amazonState: AmazonSuggestionState | undefined;
  copiedSuggestionId: string | null;
  onCopy: (suggestion: GiftSuggestion) => void;
  onFetchAmazon: (suggestion: GiftSuggestion) => void;
  onSaveGift: (suggestion: GiftSuggestion) => void;
  onUnsaveGift: (suggestion: GiftSuggestion) => void;
  isSaved: boolean;
  isLiked: boolean;
  isDisliked: boolean;
  lastSavedId: string | null;
  lastUnsavedId: string | null;
  saveState?: {
    saving: boolean;
    success: boolean;
    error: string | null;
  };
  onOpenSaved?: () => void;
  onDismissSave?: () => void;
  onDismissFeedback?: () => void;
  onClearAmazon?: () => void;
  feedback?: "liked" | "disliked" | null;
  feedbackError?: string | null;
  onToggleFeedback: (next: "liked" | "disliked") => void;
  dismissedFeedback?: boolean;
};

function GiftSuggestionCard({
  suggestionKey,
  suggestion,
  amazonState,
  copiedSuggestionId,
  onCopy,
  onFetchAmazon,
  onSaveGift,
  onUnsaveGift,
  isSaved,
  isLiked: isLikedProp,
  isDisliked: isDislikedProp,
  lastSavedId,
  lastUnsavedId,
  saveState,
  onOpenSaved,
  onDismissSave,
  onDismissFeedback,
  onClearAmazon,
  feedback,
  onToggleFeedback,
  feedbackError,
  dismissedFeedback,
}: SuggestionCardProps) {
  const [imageSrc, setImageSrc] = useState(DEFAULT_GIFT_IMAGE);

  const handleImageError = () => {
    if (imageSrc !== DEFAULT_GIFT_IMAGE) {
      setImageSrc(DEFAULT_GIFT_IMAGE);
    }
  };

  const isLiked = isLikedProp ?? feedback === "liked";
  const isDisliked = isDislikedProp ?? feedback === "disliked";

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-gp-evergreen/15 bg-white/90 shadow-sm">
      <div className="relative h-40 w-full overflow-hidden bg-gp-cream/70">
        <Image
          src={imageSrc}
          alt={suggestion.title || "Gift idea preview"}
          fill
          unoptimized
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 33vw"
          onError={handleImageError}
        />
      </div>

      <div className="flex h-full flex-col gap-3 px-4 pb-4 pt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-gp-evergreen">
              {suggestion.title}
            </h3>
            <p className="text-sm text-gp-evergreen/80">
              {suggestion.short_description}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                tierBadgeClasses[suggestion.tier]
              }`}
            >
              {tierLabels[suggestion.tier]}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
            onClick={() => onToggleFeedback("liked")}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-blue-600 transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-gold/60 cursor-pointer ${
              isLiked ? "bg-blue-50" : ""
            }`}
            aria-label="Like this idea"
            aria-pressed={isLiked}
              >
                <ThumbUpIcon
                  className={`h-4 w-4 stroke-current ${
                    isLiked ? "fill-current" : "fill-none"
                  }`}
                />
              </button>
              <button
                type="button"
            onClick={() => onToggleFeedback("disliked")}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-red-500 transition hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-gold/60 cursor-pointer ${
              isDisliked ? "bg-red-50" : ""
            }`}
            aria-label="Dislike this idea"
            aria-pressed={isDisliked}
              >
                <ThumbDownIcon
                  className={`h-4 w-4 stroke-current ${
                    isDisliked ? "fill-current" : "fill-none"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {(() => {
          const priceDisplay = buildPriceDisplay(
            suggestion.price_min,
            suggestion.price_max,
            suggestion.price_hint,
            suggestion.price_guidance,
          );
          return priceDisplay ? (
            <div className="text-sm text-gp-evergreen/80">
              <p className="font-semibold text-gp-evergreen">Price range</p>
              <p className="text-sm">{priceDisplay}</p>
              {suggestion.suggested_url ? (
                <a
                  href={suggestion.suggested_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex text-xs font-semibold text-gp-evergreen underline-offset-4 hover:underline"
                >
                  View link
                </a>
              ) : null}
            </div>
          ) : null;
        })()}

        <div className="rounded-2xl border border-gp-evergreen/15 bg-gp-cream/60 px-4 py-3 text-sm text-gp-evergreen/90">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70">
            Why this fits
          </p>
          <p>{suggestion.why_it_fits}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onCopy(suggestion)}
            className="flex-1 rounded-full border border-gp-evergreen/30 px-3 py-1 text-xs font-semibold text-gp-evergreen transition hover:bg-gp-cream/80 cursor-pointer"
          >
            {copiedSuggestionId === suggestion.id ? "Copied!" : "Copy idea"}
          </button>
          <button
            type="button"
            onClick={() => onFetchAmazon(suggestion)}
            className="flex-1 rounded-full border border-gp-gold/50 bg-gp-gold/20 px-3 py-1 text-xs font-semibold text-gp-evergreen transition hover:bg-gp-gold/30 cursor-pointer"
          >
            {amazonState?.loading ? "Searching Amazon..." : "Find on Amazon"}
          </button>
          <button
            type="button"
            onClick={() =>
              isSaved ? onUnsaveGift(suggestion) : onSaveGift(suggestion)
            }
            disabled={saveState?.saving}
            className="flex-1 rounded-full border border-gp-evergreen/30 px-3 py-1 text-xs font-semibold text-gp-evergreen transition hover:bg-gp-cream/80 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
          >
            {saveState?.saving ? "Saving..." : isSaved ? "Unsave" : "Save"}
          </button>
        </div>

        {(() => {
        const recentlySaved =
          isSaved && lastSavedId === suggestionKey && saveState?.success;
        const recentlyUnsaved =
          !isSaved && lastUnsavedId === suggestionKey && !saveState?.success;
          const banner = isLiked && !dismissedFeedback
            ? {
              className: "border border-emerald-200 bg-emerald-50 text-emerald-900",
              message: "Gift idea liked. ",
              onDismiss: onDismissFeedback,
              }
            : isDisliked && !dismissedFeedback
            ? {
              className: "border border-red-200 bg-red-50 text-red-900",
              message: "Gift idea disliked. ",
              onDismiss: onDismissFeedback,
              }
            : recentlySaved
            ? {
                className:
                  "border border-gp-evergreen/15 bg-green-50 text-gp-evergreen",
                message: "Gift idea saved. ",
                onDismiss: onDismissSave,
              }
            : recentlyUnsaved
            ? {
                className: "border border-red-200 bg-red-50 text-red-900",
                message: "Gift idea unsaved. ",
                onDismiss: onDismissSave,
              }
            : null;
          if (!banner) return null;
          return (
            <div
              className={`flex items-start justify-between gap-2 rounded-2xl px-3 py-2 text-xs ${banner.className}`}
            >
              <span>
                {banner.message}
                <button
                  type="button"
                  className="font-semibold underline underline-offset-4 hover:text-gp-evergreen/70"
                  onClick={onOpenSaved}
                >
                  View saved ideas →
                </button>
              </span>
              <button
                type="button"
                aria-label="Dismiss notice"
                className="h-6 w-6 shrink-0 rounded-full border border-gp-evergreen/20 text-gp-evergreen transition hover:bg-gp-cream cursor-pointer"
                onClick={banner.onDismiss}
              >
                ×
              </button>
            </div>
          );
        })()}
        {feedbackError ? (
          <p className="text-xs text-red-600">{feedbackError}</p>
        ) : null}
        {saveState?.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {saveState.error}
          </div>
        ) : null}

        {amazonState && (
          <div className="rounded-2xl border border-gp-evergreen/15 bg-gp-cream/40 p-3 text-sm text-gp-evergreen">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70">
                Amazon finds
              </p>
              <button
                type="button"
                className="h-6 w-6 shrink-0 rounded-full border border-gp-evergreen/20 text-gp-evergreen transition hover:bg-gp-cream cursor-pointer"
                aria-label="Close Amazon finds"
                onClick={onClearAmazon}
              >
                ×
              </button>
            </div>
            {amazonState.loading ? (
              <div className="flex justify-center">
                <PerchPalLoader
                  variant="inline"
                  size="sm"
                  message="Searching Amazon for matches..."
                />
              </div>
            ) : amazonState.error ? (
              <p className="text-xs text-gp-evergreen/70">
                {amazonState.error}
              </p>
            ) : amazonState.products.length === 0 ? (
              <p className="text-xs text-gp-evergreen/70">
                {AMAZON_PLACEHOLDER_MESSAGE}
              </p>
            ) : (
              <div className="mt-2 space-y-3">
                {amazonState.products.map((product) => {
                  const href = buildAmazonAffiliateUrl({
                    productUrl: product.detailPageUrl,
                    title: product.title,
                  });
                  return (
                    <a
                      key={product.asin}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-2xl border border-gp-evergreen/15 bg-white/80 p-2 text-xs text-gp-evergreen transition hover:bg-gp-cream/70"
                    >
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.title}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-xl object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gp-evergreen/20 bg-gp-cream text-[10px] font-semibold">
                          No image
                        </div>
                      )}
                      <div>
                        <p className="font-semibold">{product.title}</p>
                        <p className="text-gp-evergreen/70">
                          {product.priceDisplay ?? "Price unavailable"}
                        </p>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function GiftSuggestionsPanel({ onFirstRunComplete }: GiftSuggestionsPanelProps) {
  const { user, status } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [recipients, setRecipients] = useState<RecipientOption[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [occasion, setOccasion] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [numSuggestions, setNumSuggestions] = useState("9");

  const [runs, setRuns] = useState<SuggestionRun[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("relevance");
  const [searchTerm, setSearchTerm] = useState("");

  const [isLoadingRecipients, setIsLoadingRecipients] = useState(true);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState("");
  const [copiedSuggestionId, setCopiedSuggestionId] = useState<string | null>(
    null,
  );
  const [amazonBySuggestion, setAmazonBySuggestion] = useState<
    Record<string, AmazonSuggestionState>
  >({});
  const searchParams = useSearchParams();
  const recipientIdFromQuery = searchParams?.get("recipientId") ?? "";
  const suggestionsCardRef = useRef<HTMLDivElement | null>(null);
  const appliedQueryRecipientRef = useRef<string | null>(null);
  const [prefilledRecipientId, setPrefilledRecipientId] = useState<string | null>(
    null,
  );
  const [recipientMenuOpen, setRecipientMenuOpen] = useState(false);
  const summaryButtonRef = useRef<HTMLButtonElement | null>(null);
  const recipientMenuRef = useRef<HTMLDivElement | null>(null);
  const [savedGiftsRecipientId, setSavedGiftsRecipientId] = useState<
    string | null
  >(null);
  const [savedGiftsRecipientName, setSavedGiftsRecipientName] = useState("");
  const [savedGiftsOpen, setSavedGiftsOpen] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [dislikedMap, setDislikedMap] = useState<Record<string, boolean>>({});
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [lastUnsavedId, setLastUnsavedId] = useState<string | null>(null);
  const [saveStates, setSaveStates] = useState<
    Record<
      string,
      { saving: boolean; success: boolean; error: string | null; ts: number }
    >
  >({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingRun, setIsDeletingRun] = useState(false);
  const [feedbackById, setFeedbackById] = useState<
    Record<string, "liked" | "disliked" | null>
  >({});
  const [feedbackErrorById, setFeedbackErrorById] = useState<
    Record<string, string | null>
  >({});
  const [dismissedFeedbackByKey, setDismissedFeedbackByKey] = useState<
    Record<string, boolean>
  >({});
  const selectedRecipient = useMemo(
    () => recipients.find((r) => r.id === selectedRecipientId) ?? null,
    [recipients, selectedRecipientId],
  );
  const [showTipBanner, setShowTipBanner] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    let isMounted = true;

    const loadRecipients = async () => {
      setIsLoadingRecipients(true);
      setError("");
      const { data, error } = await supabase
        .from("recipient_profiles")
        .select(
          "id, name, relationship, pet_type, avatar_url, avatar_icon, is_self",
        )
        .eq("user_id", user.id)
        .eq("is_self", false)
        .order("name", { ascending: true });

      if (!isMounted) return;

      if (error) {
        setError(error.message);
        setRecipients([]);
      } else {
        const options = (data ?? []) as RecipientOption[];
        setRecipients(options);
      }

      setIsLoadingRecipients(false);
    };

    loadRecipients();
    return () => {
      isMounted = false;
    };
  }, [status, user, supabase]);

  useEffect(() => {
    if (!recipients.length) return;
    const fromQuery = recipientIdFromQuery;
    if (
      fromQuery &&
      recipients.some((recipient) => recipient.id === fromQuery) &&
      appliedQueryRecipientRef.current !== fromQuery
    ) {
      appliedQueryRecipientRef.current = fromQuery;
      setSelectedRecipientId(fromQuery);
      setPrefilledRecipientId(fromQuery);
      requestAnimationFrame(() => {
        suggestionsCardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
      return;
    }
    setSelectedRecipientId((prev) => {
      if (prev && recipients.some((recipient) => recipient.id === prev)) {
        return prev;
      }
      return recipients[0]?.id ?? "";
    });
  }, [recipients, recipientIdFromQuery]);

  useEffect(() => {
    if (!recipientIdFromQuery) {
      appliedQueryRecipientRef.current = null;
    }
  }, [recipientIdFromQuery]);

  useEffect(() => {
    if (prefilledRecipientId && selectedRecipientId !== prefilledRecipientId) {
      setPrefilledRecipientId(null);
    }
  }, [selectedRecipientId, prefilledRecipientId]);

  useEffect(() => {
    if (!recipientMenuOpen) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      const inButton = summaryButtonRef.current?.contains(target);
      const inMenu = recipientMenuRef.current?.contains(target);
      if (!inButton && !inMenu) {
        setRecipientMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [recipientMenuOpen]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthToken(data.session?.access_token ?? null);
    });
  }, [supabase]);

  const handleSaveGift = async (suggestion: GiftSuggestion) => {
    if (!selectedRecipient) {
      setError("Please select a recipient before saving gift ideas.");
      return;
    }
    const suggestionKey = getSuggestionIdentity(suggestion);
    setSaveStates((prev) => ({
      ...prev,
      [suggestionKey]: {
        saving: true,
        success: false,
        error: null,
        ts: Date.now(),
      },
    }));

    try {
      const res = await fetch(
        `/api/recipients/${selectedRecipient.id}/saved-gifts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            suggestionId: suggestion.id,
            title: suggestion.title,
            tier: suggestion.tier,
            rationale: suggestion.why_it_fits,
            estimated_price_min: suggestion.price_min ?? null,
            estimated_price_max: suggestion.price_max ?? null,
            product_url: suggestion.suggested_url ?? null,
            image_url: suggestion.image_url ?? null,
          }),
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save gift idea");
      }

      setSavedMap((prev) => ({ ...prev, [suggestionKey]: true }));
      setLastSavedId(suggestionKey);
      setLastUnsavedId(null);
      setSaveStates((prev) => ({
        ...prev,
        [suggestionKey]: {
          saving: false,
          success: true,
          error: null,
          ts: Date.now(),
        },
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save gift idea";
      setSaveStates((prev) => ({
        ...prev,
        [suggestionKey]: {
          saving: false,
          success: false,
          error: message,
          ts: Date.now(),
        },
      }));
    }
  };

  const handleUnsaveGift = async (suggestion: GiftSuggestion) => {
    if (!selectedRecipient) return;
    const suggestionKey = getSuggestionIdentity(suggestion);
    setSaveStates((prev) => ({
      ...prev,
      [suggestionKey]: {
        saving: true,
        success: false,
        error: null,
        ts: Date.now(),
      },
    }));
    try {
      const res = await fetch(
        `/api/recipients/${selectedRecipient.id}/saved-gifts?suggestionId=${encodeURIComponent(
          suggestion.id,
        )}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to unsave gift idea");
      }
      setSavedMap((prev) => {
        const next = { ...prev };
        delete next[suggestionKey];
        return next;
      });
      setLastUnsavedId(suggestionKey);
      setLastSavedId(null);
      setSaveStates((prev) => ({
        ...prev,
        [suggestionKey]: {
          saving: false,
          success: false,
          error: null,
          ts: Date.now(),
        },
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to unsave gift idea";
      setSaveStates((prev) => ({
        ...prev,
        [suggestionKey]: {
          saving: false,
          success: false,
          error: message,
          ts: Date.now(),
        },
      }));
    }
  };

  const handleDismissSave = (suggestionId: string) => {
    setSaveStates((prev) => {
      if (!prev[suggestionId]) return prev;
      const next = { ...prev };
      next[suggestionId] = { ...next[suggestionId], success: false };
      return next;
    });
  };

  const handleClearAmazon = (suggestionId: string) => {
    setAmazonBySuggestion((prev) => {
      const next = { ...prev };
      delete next[suggestionId];
      return next;
    });
  };

  const handleDeleteRun = async () => {
    if (!activeRunId || !user?.id) return;
    try {
      setIsDeletingRun(true);
      const { error } = await supabase
        .from("gift_suggestions")
        .delete()
        .eq("id", activeRunId)
        .eq("recipient_id", selectedRecipientId || "")
        .eq("user_id", user.id);
      if (error) throw error;

      setRuns((prev) => {
        const remaining = prev.filter((run) => run.id !== activeRunId);
        const next = remaining[0];
        setActiveRunId(next ? next.id : null);
        if (!next) {
          setAmazonBySuggestion({});
        }
        return remaining;
      });

      setShowDeleteConfirm(false);
    } catch (err) {
      console.error("Failed to delete run", err);
    } finally {
      setIsDeletingRun(false);
    }
  };

  const toggleFeedback = async (
    suggestionKey: string,
    suggestion: GiftSuggestion,
    suggestionIndex: number,
    next: "liked" | "disliked",
  ) => {
    if (!selectedRecipientId || !selectedRecipient) {
      return;
    }
    const current = feedbackById[suggestionKey] ?? null;
    const preference = current === next ? "clear" : next;

    try {
      setFeedbackErrorById((prev) => ({ ...prev, [suggestionKey]: null }));
      setDismissedFeedbackByKey((prev) => {
        const nextMap = { ...prev };
        delete nextMap[suggestionKey];
        return nextMap;
      });
      const res = await fetch(
        `/api/recipients/${selectedRecipient.id}/suggestions/${activeRunId}/feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            preference,
            suggestionIndex,
            suggestionId: suggestion.id,
            title: suggestion.title,
          }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save feedback");
      }
      setFeedbackById((prev) => ({
        ...prev,
        [suggestionKey]:
          preference === "clear" ? null : (preference as "liked" | "disliked"),
      }));
      if (preference === "clear") {
        setLikedMap((prev) => {
          const next = { ...prev };
          delete next[suggestionKey];
          return next;
        });
        setDislikedMap((prev) => {
          const next = { ...prev };
          delete next[suggestionKey];
          return next;
        });
      } else if (preference === "liked") {
        setLikedMap((prev) => ({ ...prev, [suggestionKey]: true }));
        setDislikedMap((prev) => {
          const next = { ...prev };
          delete next[suggestionKey];
          return next;
        });
      } else if (preference === "disliked") {
        setDislikedMap((prev) => ({ ...prev, [suggestionKey]: true }));
        setLikedMap((prev) => {
          const next = { ...prev };
          delete next[suggestionKey];
          return next;
        });
      }
    } catch (err) {
      setFeedbackErrorById((prev) => ({
        ...prev,
        [suggestionKey]:
          err instanceof Error ? err.message : "Failed to save feedback",
      }));
    }
  };

  useEffect(() => {
    if (!selectedRecipientId) {
      setRuns([]);
      setActiveRunId(null);
      return;
    }

    let isMounted = true;
    const loadRuns = async () => {
      setIsLoadingRuns(true);
      setError("");
      const { data, error } = await supabase
        .from("gift_suggestions")
        .select("id, created_at, prompt_context, suggestions")
        .eq("recipient_id", selectedRecipientId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!isMounted) return;

      if (error) {
        setError(error.message);
        setRuns([]);
        setActiveRunId(null);
      } else {
        const fetchedRuns = (data ?? []) as SuggestionRun[];
        setRuns(fetchedRuns);
        setActiveRunId(fetchedRuns.length > 0 ? fetchedRuns[0].id : null);
        if (fetchedRuns.length > 0 && onFirstRunComplete) {
          onFirstRunComplete();
        }
      }

      setIsLoadingRuns(false);
    };

    loadRuns();
    return () => {
      isMounted = false;
    };
  }, [selectedRecipientId, supabase, onFirstRunComplete]);

  const activeRun = useMemo(
    () => runs.find((run) => run.id === activeRunId) ?? null,
    [runs, activeRunId],
  );

  useEffect(() => {
    setAmazonBySuggestion({});
    setFeedbackById({});
    setFeedbackErrorById({});
  }, [activeRunId]);

  const visibleSuggestions = useMemo(() => {
    if (!activeRun) return [];
    let suggestions = [...(activeRun.suggestions ?? [])];

    if (tierFilter !== "all") {
      suggestions = suggestions.filter((sugg) => sugg.tier === tierFilter);
    }

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      suggestions = suggestions.filter((sugg) => {
        const haystack = `${sugg.title} ${sugg.short_description} ${sugg.why_it_fits}`.toLowerCase();
        return haystack.includes(term);
      });
    }

    suggestions.sort((a, b) => {
      if (sortOption === "price-asc" || sortOption === "price-desc") {
        const aPrice = a.price_min ?? a.price_max ?? Infinity;
        const bPrice = b.price_min ?? b.price_max ?? Infinity;
        if (sortOption === "price-asc") {
          return (aPrice || Infinity) - (bPrice || Infinity);
        }
        return (bPrice || -Infinity) - (aPrice || -Infinity);
      }

      if (sortOption === "tier") {
        const order: Record<GiftSuggestion["tier"], number> = {
          safe: 0,
          thoughtful: 1,
          experience: 2,
          splurge: 3,
        };
        return order[a.tier] - order[b.tier];
      }

      return 0;
    });

    return suggestions;
  }, [activeRun, tierFilter, searchTerm, sortOption]);
  const visibleSuggestionsKey = visibleSuggestions
    .map((s) => getSuggestionIdentity(s))
    .join("|");

  useEffect(() => {
    if (!selectedRecipientId || visibleSuggestions.length === 0) {
      setSavedMap({});
      setLikedMap({});
      setDislikedMap({});
      setFeedbackById({});
      setShowTipBanner(false);
      return;
    }

    const nextSaved: Record<string, boolean> = {};
    const nextLiked: Record<string, boolean> = {};
    const nextDisliked: Record<string, boolean> = {};
    const nextFeedback: Record<string, "liked" | "disliked" | null> = {};

    visibleSuggestions.forEach((sugg) => {
      const key = getSuggestionIdentity(sugg);
      if (!key) return;
      if (sugg.initialSaved) {
        nextSaved[key] = true;
      }
      if (sugg.initialPreference === "liked") {
        nextLiked[key] = true;
        nextFeedback[key] = "liked";
      } else if (sugg.initialPreference === "disliked") {
        nextDisliked[key] = true;
        nextFeedback[key] = "disliked";
      }
    });

    setSavedMap(nextSaved);
    setLikedMap(nextLiked);
    setDislikedMap(nextDisliked);
    setFeedbackById(nextFeedback);
    setDismissedFeedbackByKey({});
    setShowTipBanner(true);
  }, [
    selectedRecipientId,
    visibleSuggestionsKey,
    visibleSuggestions.length,
    visibleSuggestions,
  ]);

  const isInitialLoading =
    status === "loading" ||
    (status === "authenticated" && isLoadingRecipients && !recipients.length);

  const handleRequestSuggestions = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedRecipientId) {
      setError("Select a recipient before requesting suggestions.");
      return;
    }

    setError("");
    setIsRequesting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const payload = {
        recipientId: selectedRecipientId,
        occasion: occasion.trim() || null,
        budgetMin: budgetMin ? Number(budgetMin) : null,
        budgetMax: budgetMax ? Number(budgetMax) : null,
        numSuggestions: numSuggestions ? Number(numSuggestions) : undefined,
      };

      const response = await fetch("/api/perchpal/suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const json = (await response.json().catch(() => null)) as
        | {
            suggestionRunId?: string;
            createdAt?: string;
            suggestions?: GiftSuggestion[];
            promptContext?: GiftPromptContext;
            error?: string;
          }
        | null;

      if (
        !response.ok ||
        !json ||
        (json && typeof json.error === "string")
      ) {
        throw new Error(
          json && typeof json.error === "string"
            ? json.error
            : PERCHPAL_ERROR_MESSAGE,
        );
      }
      const suggestionRunId =
        json.suggestionRunId ?? `run-${Date.now()}`;
      const createdAt = json.createdAt ?? new Date().toISOString();
      const promptContext: GiftPromptContext =
        json.promptContext ?? {
          recipient_id: selectedRecipientId,
          recipient_name: selectedRecipient?.name ?? "Recipient",
          relationship: selectedRecipient?.relationship ?? null,
          occasion: occasion || null,
          budget_min: budgetMin ? Number(budgetMin) : null,
          budget_max: budgetMax ? Number(budgetMax) : null,
          notes_summary: null,
          interests_summary: null,
          last_gifts_summary: null,
        };
      const suggestions = json.suggestions ?? [];

      const newRun: SuggestionRun = {
        id: suggestionRunId,
        created_at: createdAt,
        prompt_context: promptContext,
        suggestions,
      };

      setRuns((prev) => [newRun, ...prev]);
      setActiveRunId(newRun.id);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : PERCHPAL_ERROR_MESSAGE;
      setError(message);
    } finally {
      setIsRequesting(false);
      if (onFirstRunComplete) {
        onFirstRunComplete();
      }
    }
  };

  const handleFetchAmazonProducts = async (suggestion: GiftSuggestion) => {
    const query = suggestion.title.trim();
    if (!query) return;

    const partnerTag =
      process.env.NEXT_PUBLIC_AMAZON_PA_PARTNER_TAG || "giftperch-20";
    const baseUrl = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
    const url = `${baseUrl}&tag=${encodeURIComponent(partnerTag)}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleCopySuggestion = async (suggestion: GiftSuggestion) => {
    const text = [
      suggestion.title,
      suggestion.short_description,
      suggestion.why_it_fits,
      suggestion.price_hint ||
        buildPriceDisplay(
          suggestion.price_min,
          suggestion.price_max,
          suggestion.price_hint,
          suggestion.price_guidance,
        ),
      suggestion.suggested_url,
    ]
      .filter(Boolean)
      .join(" - ");

    try {
      await navigator.clipboard.writeText(text);
      setCopiedSuggestionId(suggestion.id);
      setTimeout(() => setCopiedSuggestionId(null), 2000);
    } catch {
      setError("Unable to copy idea to clipboard.");
    }
  };

  if (isInitialLoading) {
    return (
      <section className="rounded-3xl border border-gp-evergreen/15 bg-white/95 p-6">
        <PerchPalLoader
          variant="block"
          size="md"
          message="PerchPal is loading your recipients..."
        />
      </section>
    );
  }

  if (status !== "authenticated" || !user) {
    return null;
  }

  const showPrefilledHint =
    !!selectedRecipient && prefilledRecipientId === selectedRecipient.id;
  const selectedRelationshipLabel = selectedRecipient
    ? describeRecipientRelationship(selectedRecipient)
    : "";

  return (
    <section
      ref={suggestionsCardRef}
      className="space-y-4 rounded-3xl border border-gp-evergreen/15 bg-white/95 p-4 sm:p-6 shadow-sm"
    >
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-gp-evergreen">
          AI Gift Suggestions
        </h2>
        <p className="text-sm text-gp-evergreen/70">
          Choose a recipient, set a budget or occasion, and PerchPal will craft
          tailored gift ideas with clear reasoning.
        </p>
      </header>

      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {recipients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gp-evergreen/30 bg-gp-cream/60 p-6 text-sm text-gp-evergreen">
          Add a recipient profile first so PerchPal knows who you are gifting
          for.
        </div>
      ) : (
        <>
          <form className="mt-2 space-y-4" onSubmit={handleRequestSuggestions}>
            {selectedRecipient ? (
              <>
                <label
                  htmlFor="recipient-summary"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70"
                >
                  Recipient
                </label>
                <div className="relative" id="recipient-summary">
                  <button
                    type="button"
                    ref={summaryButtonRef}
                    onClick={() =>
                      setRecipientMenuOpen((previous) => !previous)
                    }
                    className="flex w-full items-center gap-3 rounded-2xl border border-gp-evergreen/10 bg-gp-cream/80 px-4 py-3 text-left transition hover:border-gp-evergreen/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-gold/70 cursor-pointer"
                  >
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-gp-evergreen/20 bg-white text-sm font-semibold text-gp-evergreen">
                      {(() => {
                        const avatar = getRecipientAvatarVisual(selectedRecipient);
                        if (avatar.kind === "image") {
                          return (
                            <Image
                              src={avatar.src}
                              alt={avatar.alt}
                              width={48}
                              height={48}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          );
                        }
                        if (avatar.kind === "preset") {
                          return (
                            <Image
                              src={avatar.src}
                              alt={avatar.alt}
                              width={40}
                              height={40}
                              className="h-10 w-10 object-contain"
                              unoptimized
                            />
                          );
                        }
                        return avatar.text;
                      })()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gp-evergreen">
                        {selectedRecipient.name}
                      </p>
                      <p className="text-xs text-gp-evergreen/70">
                        {selectedRelationshipLabel}
                      </p>
                    </div>
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-5 w-5 text-gp-evergreen/70 transition-transform ${
                        recipientMenuOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  {recipientMenuOpen ? (
                    <div
                      ref={recipientMenuRef}
                      className="absolute left-0 right-0 z-20 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-gp-evergreen/15 bg-white shadow-lg"
                    >
                      <ul className="divide-y divide-gp-evergreen/10">
                        {recipients.map((recipient) => {
                          const avatar = getRecipientAvatarVisual(recipient);
                          const isActive = recipient.id === selectedRecipientId;
                          return (
                            <li key={recipient.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRecipientId(recipient.id);
                                  setRecipientMenuOpen(false);
                                }}
                                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition ${
                                  isActive
                                    ? "bg-gp-cream/70 text-gp-evergreen font-semibold"
                                    : "text-gp-evergreen hover:bg-gp-cream/60"
                                }`}
                              >
                                <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-gp-evergreen/15 bg-gp-cream text-xs font-semibold">
                                  {avatar.kind === "image" ? (
                                    <Image
                                      src={avatar.src}
                                      alt={avatar.alt}
                                      width={40}
                                      height={40}
                                      className="h-full w-full object-cover"
                                      unoptimized
                                    />
                                  ) : avatar.kind === "preset" ? (
                                    <Image
                                      src={avatar.src}
                                      alt={avatar.alt}
                                      width={32}
                                      height={32}
                                      className="h-8 w-8 object-contain"
                                      unoptimized
                                    />
                                  ) : (
                                    avatar.text
                                  )}
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate">
                                    {recipient.name}
                                  </span>
                                  <span className="text-xs text-gp-evergreen/70">
                                    {describeRecipientRelationship(recipient)}
                                  </span>
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}
                </div>
                {showPrefilledHint ? (
                  <p className="text-xs text-gp-evergreen/70">
                    Ready to generate ideas for {selectedRecipient.name}. Adjust
                    budget or occasion, then click &quot;Ask PerchPal for
                    suggestions&quot;.
                  </p>
                ) : null}
              </>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="occasion-select"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70"
                >
                  Occasion (optional)
                </label>
                <select
                  id="occasion-select"
                  value={occasion}
                  onChange={(event) => setOccasion(event.target.value)}
                  className="w-full rounded-2xl border border-gp-evergreen/30 bg-white px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
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
                  <option value="just_because">
                    Just because / No special occasion
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="num-suggestions-input"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70"
                >
                  # of ideas (3-10)
                </label>
                <input
                  id="num-suggestions-input"
                  type="number"
                  min={3}
                  max={10}
                  value={numSuggestions}
                  onChange={(event) => setNumSuggestions(event.target.value)}
                  className="w-full rounded-2xl border border-gp-evergreen/30 bg-white px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="budget-min-input"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70"
                >
                  Min budget (optional)
                </label>
                <input
                  id="budget-min-input"
                  type="number"
                  min={0}
                  placeholder="Min"
                  value={budgetMin}
                  onChange={(event) => setBudgetMin(event.target.value)}
                  className="w-full rounded-2xl border border-gp-evergreen/30 bg-white px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="budget-max-input"
                  className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70"
                >
                  Max budget (optional)
                </label>
                <input
                  id="budget-max-input"
                  type="number"
                  min={0}
                  placeholder="Max"
                  value={budgetMax}
                  onChange={(event) => setBudgetMax(event.target.value)}
                  className="w-full rounded-2xl border border-gp-evergreen/30 bg-white px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-center">
              {isRequesting ? (
                <div className="flex w-full max-w-sm flex-col items-center justify-center gap-2 text-sm text-gp-evergreen/80">
                  <PerchPalLoader
                    variant="inline"
                    size="md"
                    message={null}
                    ariaLabel="Asking PerchPal for suggestions"
                  />
                  <span>Retrieving gifts...</span>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={!selectedRecipientId}
                  className="inline-flex w-full max-w-sm items-center justify-center rounded-full bg-gp-evergreen px-6 py-3 text-base font-semibold text-gp-cream transition hover:bg-[#0c3132] hover:-translate-y-0.5 hover:shadow-md cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                >
                  Ask PerchPal for suggestions
                </button>
              )}
            </div>
          </form>

          {selectedRecipient?.name ? (
            <div className="mt-4">
              <p className="text-base font-semibold text-gp-evergreen sm:text-lg">
                Gift ideas for {selectedRecipient.name}
              </p>
            </div>
          ) : null}

          {runs.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 text-gp-evergreen">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex-1 max-w-md">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gp-evergreen/60">
                    Previous runs
                  </label>
                  <select
                    value={activeRunId ?? ""}
                    onChange={(e) =>
                      setActiveRunId(e.target.value || null)
                    }
                    className="w-full rounded-full border border-gp-evergreen/20 bg-white px-4 py-2.5 text-sm text-gp-evergreen shadow-sm focus:outline-none focus:ring-2 focus:ring-gp-gold/60 cursor-pointer"
                  >
                    {runs.map((run) => (
                      <option key={run.id} value={run.id}>
                        {formatRunLabel(run)}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={!activeRunId}
                  onClick={() => setShowDeleteConfirm(true)}
                  className="mt-2 inline-flex items-center justify-center rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-6"
                >
                  Delete run
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="md:col-span-1">
              <label
                htmlFor="search-suggestions"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70"
              >
                Search ideas
              </label>
              <input
                id="search-suggestions"
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by title or rationale"
                className="w-full rounded-2xl border border-gp-evergreen/30 bg-white px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="tier-filter"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70"
              >
                Filter by tier
              </label>
              <select
                id="tier-filter"
                value={tierFilter}
                onChange={(event) =>
                  setTierFilter(event.target.value as TierFilter)
                }
                className="w-full rounded-2xl border border-gp-evergreen/30 bg-white px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
              >
                <option value="all">All tiers</option>
                <option value="safe">Safe favorites</option>
                <option value="thoughtful">Thoughtful</option>
                <option value="experience">Experiences</option>
                <option value="splurge">Splurges</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="sort-option"
                className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70"
              >
                Sort by
              </label>
              <select
                id="sort-option"
                value={sortOption}
                onChange={(event) =>
                  setSortOption(event.target.value as SortOption)
                }
                className="w-full rounded-2xl border border-gp-evergreen/30 bg-white px-4 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
              >
                <option value="relevance">Model order</option>
                <option value="price-asc">Price: Low to high</option>
                <option value="price-desc">Price: High to low</option>
                <option value="tier">Tier</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            {isLoadingRuns ? (
              <PerchPalLoader
                variant="block"
                size="md"
                message="PerchPal is gathering previous suggestion runs..."
              />
            ) : !activeRun ? (
              <div className="rounded-2xl border border-dashed border-gp-evergreen/30 bg-gp-cream/60 p-6 text-center text-sm text-gp-evergreen">
                Ask PerchPal for suggestions to see curated gift ideas here.
              </div>
            ) : visibleSuggestions.length === 0 ? (
              <div className="rounded-2xl border border-gp-evergreen/20 bg-white/90 p-6 text-sm text-gp-evergreen">
                No suggestions match your filters. Clear the filters to see all
                ideas from this run.
              </div>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gp-evergreen/70">
                  <span>
                    Generated {new Date(activeRun.created_at).toLocaleString()}{" "}
                    for {activeRun.prompt_context.recipient_name}
                    {activeRun.prompt_context.occasion
                      ? ` - ${activeRun.prompt_context.occasion}`
                      : ""}
                  </span>
                  <FirstSuggestionsTipBanner hasSuggestionsThisSession={showTipBanner} />
                  {activeRun.prompt_context.budget_min ||
                  activeRun.prompt_context.budget_max ? (
                    <span>
                      Budget:{" "}
                      {formatBudgetRange(
                        activeRun.prompt_context.budget_min,
                        activeRun.prompt_context.budget_max,
                      )}
                    </span>
                  ) : null}
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {visibleSuggestions.map((suggestion, idx) => {
                    const suggestionKey = getSuggestionIdentity(suggestion);
                    return (
                  <GiftSuggestionCard
                    key={suggestionKey}
                    suggestionKey={suggestionKey}
                    suggestion={suggestion}
                    amazonState={amazonBySuggestion[suggestion.id]}
                      copiedSuggestionId={copiedSuggestionId}
                      onCopy={handleCopySuggestion}
                      onFetchAmazon={handleFetchAmazonProducts}
                      onSaveGift={handleSaveGift}
                      onUnsaveGift={handleUnsaveGift}
                      isSaved={!!savedMap[suggestionKey]}
                      isLiked={!!likedMap[suggestionKey]}
                      isDisliked={!!dislikedMap[suggestionKey]}
                      lastSavedId={lastSavedId}
                      lastUnsavedId={lastUnsavedId}
                      saveState={saveStates[suggestionKey]}
                    onOpenSaved={() => {
                      if (selectedRecipient) {
                        setSavedGiftsRecipientId(selectedRecipient.id);
                        setSavedGiftsRecipientName(selectedRecipient.name);
                        setSavedGiftsOpen(true);
                      }
                    }}
                    onDismissSave={() => handleDismissSave(suggestionKey)}
                    onClearAmazon={() => handleClearAmazon(suggestion.id)}
                    feedback={feedbackById[suggestionKey] ?? null}
                    feedbackError={feedbackErrorById[suggestionKey] ?? null}
                    dismissedFeedback={!!dismissedFeedbackByKey[suggestionKey]}
                    onDismissFeedback={() =>
                      setDismissedFeedbackByKey((prev) => ({
                        ...prev,
                        [suggestionKey]: true,
                      }))
                    }
                    onToggleFeedback={(next) =>
                      toggleFeedback(suggestionKey, suggestion, idx, next)
                    }
                  />
                );
              })}
              </div>
            </>
          )}
          </div>
        </>
      )}
      <p className="mt-6 text-center text-xs text-gp-evergreen/55">
        As an Amazon Associate, I earn from qualifying purchases.
      </p>
      <p className="text-center text-xs text-gp-evergreen/70">
        Want to browse Amazon directly?{" "}
        <a
          href="https://www.amazon.com/?tag=giftperch-20"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-gp-evergreen underline underline-offset-4 transition hover:text-gp-gold"
        >
          Shop Amazon’s full catalog »
        </a>
      </p>
      {savedGiftsRecipientId ? (
        <SavedGiftIdeasModal
          recipientId={savedGiftsRecipientId}
          recipientName={savedGiftsRecipientName}
          isOpen={savedGiftsOpen}
          onClose={() => setSavedGiftsOpen(false)}
          authToken={authToken}
        />
      ) : null}

      {showDeleteConfirm && activeRunId ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-gp-cream p-5 shadow-xl">
            <p className="text-sm font-semibold text-gp-evergreen">
              Delete this run?
            </p>
            <p className="mt-2 text-sm text-gp-evergreen/80">
              This will remove the saved suggestions for this run from your
              history. This action can’t be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-gp-evergreen border border-gp-evergreen/20 hover:bg-gp-cream/80"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteRun}
                disabled={isDeletingRun}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
              >
                {isDeletingRun ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

const tierLabels: Record<GiftSuggestion["tier"], string> = {
  safe: "Safe favorite",
  thoughtful: "Thoughtful",
  experience: "Experience",
  splurge: "Splurge",
};

const tierBadgeClasses: Record<GiftSuggestion["tier"], string> = {
  safe: "border-gp-evergreen/25 bg-gp-cream/70 text-gp-evergreen",
  thoughtful: "border-gp-gold/40 bg-gp-gold/20 text-gp-evergreen",
  experience: "border-gp-evergreen/30 bg-gp-evergreen/10 text-gp-evergreen",
  splurge: "border-red-200 bg-red-50 text-red-700",
};

function buildPriceDisplay(
  min: number | null | undefined,
  max: number | null | undefined,
  hint?: string | null | undefined,
  guidance?: string | null | undefined,
) {
  const priceGuidance =
    typeof guidance === "string" && guidance.trim().length > 0
      ? guidance.trim()
      : "";
  if (priceGuidance) {
    return priceGuidance;
  }
  const priceHint = typeof hint === "string" ? hint.trim() : "";
  if (priceHint) {
    return priceHint;
  }
  if (typeof min === "number" && typeof max === "number") {
    return `$${Math.round(min)}-$${Math.round(max)}`;
  }
  if (typeof min === "number") {
    return `From $${Math.round(min)}`;
  }
  if (typeof max === "number") {
    return `Up to $${Math.round(max)}`;
  }
  return "";
}

function formatBudgetRange(
  min: number | null | undefined,
  max: number | null | undefined,
) {
  const display = buildPriceDisplay(min, max, undefined, undefined);
  return display ? display : "Not specified";
}

