"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { PerchPalLoader } from "@/components/perchpal/PerchPalLoader";
import { buildAmazonAffiliateUrl } from "@/lib/amazonAffiliate";
import { SavedGiftIdeasModal } from "@/components/recipients/SavedGiftIdeasModal";
import { FirstSuggestionsTipBanner } from "@/components/gifts/FirstSuggestionsTipBanner";
import { GiftPreviewImage } from "@/components/gifts/GiftPreviewImage";
import { resolveGiftPreviewSource } from "@/lib/gifts/getGiftPreviewIcon";
import {
  getSavedGiftProductKey,
  normalizeSavedGiftTitle,
} from "@/lib/savedGiftIdentity";
import {
  AFFILIATE_DISCLOSURE,
  AFFILIATE_LINK_REL,
  AFFILIATE_SHOPPING_BUTTON_CLASS,
  getMatchedProductPresentation,
  resolveProductMatch,
  type ProductMatch,
} from "@/lib/affiliateProduct";
import {
  Check,
  ChevronDown,
  ExternalLink,
  Heart,
  Trash2,
} from "lucide-react";

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
  budget_per_gift?: number | null;
  budget_annual?: number | null;
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
  productMatch?: ProductMatch | null;
  amazonProduct?: {
    asin: string;
    title: string;
    imageUrl: string | null;
    detailPageUrl: string | null;
    priceDisplay: string | null;
    currency?: string | null;
    primeEligible?: boolean | null;
  } | null;
  initialSaved?: boolean;
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

type SortOption = "relevance" | "price-asc" | "price-desc" | "tier";
type GiftCategoryFilter = "all" | GiftSuggestion["tier"];

const giftCategoryFilters: ReadonlyArray<{
  value: GiftCategoryFilter;
  label: string;
}> = [
  { value: "all", label: "All ideas" },
  { value: "thoughtful", label: "Thoughtful" },
  { value: "safe", label: "Safe favorites" },
  { value: "experience", label: "Experiences" },
  { value: "splurge", label: "Splurge" },
];

type GiftSuggestionsPanelProps = {
  onFirstRunComplete?: () => void;
};

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
  const ideaCount = Array.isArray(run.suggestions)
    ? run.suggestions.length
    : 0;
  const ideaLabel = ideaCount === 1 ? "idea" : "ideas";
  return `${dateStr} • ${timeStr} • ${occasion} • ${ideaCount} ${ideaLabel}`;
};

type RunHistoryMenuProps = {
  runs: SuggestionRun[];
  activeRunId: string | null;
  onSelect: (runId: string) => void;
  onRequestDelete: (runId: string) => void;
};

function RunHistoryMenu({
  runs,
  activeRunId,
  onSelect,
  onRequestDelete,
}: RunHistoryMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const activeRun = runs.find((run) => run.id === activeRunId) ?? runs[0];

  const closeMenu = (returnFocus = false) => {
    setIsOpen(false);
    if (returnFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    requestAnimationFrame(() => {
      const actions = Array.from(
        menuRef.current?.querySelectorAll<HTMLButtonElement>(
          "[data-run-menu-action]",
        ) ?? [],
      );
      const selectedAction = actions.find(
        (action) => action.dataset.runId === activeRunId,
      );
      (selectedAction ?? actions[0])?.focus();
    });

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [activeRunId, isOpen]);

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
      return;
    }

    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      return;
    }

    const actions = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        "[data-run-menu-action]",
      ) ?? [],
    );
    if (!actions.length) return;

    event.preventDefault();
    const currentIndex = actions.indexOf(document.activeElement as HTMLButtonElement);
    let nextIndex = currentIndex;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = actions.length - 1;
    if (event.key === "ArrowDown") {
      nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % actions.length;
    }
    if (event.key === "ArrowUp") {
      nextIndex =
        currentIndex < 0
          ? actions.length - 1
          : (currentIndex - 1 + actions.length) % actions.length;
    }
    actions[nextIndex]?.focus();
  };

  return (
    <div ref={rootRef} className="relative w-full min-w-0 sm:w-[21rem]">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((previous) => !previous)}
        onKeyDown={(event) => {
          if (!isOpen && ["ArrowDown", "ArrowUp"].includes(event.key)) {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
        className="flex min-h-10 w-full items-center justify-between gap-2 rounded-full border border-gp-evergreen/15 bg-white px-3.5 py-1.5 text-left text-xs font-semibold text-gp-evergreen transition hover:border-gp-evergreen/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-gold/70"
      >
        <span className="min-w-0 truncate">
          {activeRun ? formatRunLabel(activeRun) : "Previous runs"}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Previous recommendation runs"
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 z-40 mt-2 max-h-80 w-[min(28rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-gp-evergreen/15 bg-white p-1.5 shadow-[0_18px_44px_rgba(8,47,48,0.18)]"
        >
          {runs.map((run) => {
            const isSelected = run.id === activeRunId;
            return (
              <div
                key={run.id}
                className={`flex items-center gap-1 rounded-lg ${
                  isSelected ? "bg-gp-cream" : "hover:bg-[#fffdf7]"
                }`}
              >
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  data-run-menu-action
                  data-run-id={run.id}
                  onClick={() => {
                    onSelect(run.id);
                    closeMenu(true);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-gp-evergreen focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gp-gold/70"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {formatRunLabel(run)}
                  </span>
                  {isSelected ? (
                    <Check
                      className="h-4 w-4 shrink-0 text-gp-evergreen"
                      aria-hidden="true"
                    />
                  ) : null}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  data-run-menu-action
                  aria-label={`Delete run ${formatRunLabel(run)}`}
                  onClick={() => {
                    onRequestDelete(run.id);
                    closeMenu();
                  }}
                  className="mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gp-evergreen/40 transition hover:bg-red-50 hover:text-red-700 focus-visible:bg-red-50 focus-visible:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
const PERCHPAL_ERROR_MESSAGE =
  "PerchPal is temporarily unavailable. Please try again in a few minutes.";

const getSuggestionIdentity = (suggestion: GiftSuggestion) =>
  suggestion.id?.trim() || "";

type SuggestionCardProps = {
  suggestionKey: string;
  suggestion: GiftSuggestion;
  onSaveGift: (suggestion: GiftSuggestion) => void;
  onUnsaveGift: (suggestion: GiftSuggestion) => void;
  isSaved: boolean;
  lastSavedId: string | null;
  lastUnsavedId: string | null;
  saveState?: {
    saving: boolean;
    success: boolean;
    error: string | null;
  };
  onOpenSaved?: () => void;
  onDismissSave?: () => void;
};

function GiftSuggestionCard({
  suggestionKey,
  suggestion,
  onSaveGift,
  onUnsaveGift,
  isSaved,
  lastSavedId,
  lastUnsavedId,
  saveState,
  onOpenSaved,
  onDismissSave,
}: SuggestionCardProps) {
  const amazon = suggestion.amazonProduct;
  const matchedProduct = getMatchedProductPresentation(
    suggestion.productMatch,
    amazon,
  );
  const previewSource = resolveGiftPreviewSource({
    metadata: suggestion,
    imageUrl: suggestion.image_url,
    productMatch: suggestion.productMatch,
    amazonProduct: amazon,
  });

  const basePriceDisplay = buildPriceDisplay(
    suggestion.price_min,
    suggestion.price_max,
    suggestion.price_hint,
    suggestion.price_guidance,
  );
  const priceDisplay =
    matchedProduct?.priceDisplay || basePriceDisplay || "Not specified";

  const amazonHref = buildAmazonAffiliateUrl({
    productUrl: amazon?.detailPageUrl ?? undefined,
    title: suggestion.title,
  });
  const shoppingHref = matchedProduct?.match.affiliateUrl ?? amazonHref;
  const shoppingLabel = matchedProduct?.shoppingLabel ?? "View on Amazon";

  return (
    <article className="group flex min-w-0 self-start flex-col overflow-hidden rounded-2xl border border-gp-evergreen/10 bg-white shadow-[0_12px_32px_rgba(15,61,62,0.07)] transition duration-200 hover:-translate-y-0.5 hover:border-gp-gold/45 hover:shadow-[0_18px_38px_rgba(15,61,62,0.11)]">
      <div className="relative aspect-[16/10] min-h-48 w-full overflow-hidden border-b border-gp-evergreen/8 bg-[#f8f6ef]">
        <a
          href={shoppingHref}
          target="_blank"
          rel={AFFILIATE_LINK_REL}
          aria-label={`${shoppingLabel}: ${matchedProduct?.match.productTitle || suggestion.title} (opens in a new tab)`}
          className="absolute inset-0 z-0 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-gp-gold/80"
        >
          <GiftPreviewImage
            key={previewSource.primary}
            source={previewSource}
            alt={
              previewSource.isProductImage
                ? matchedProduct?.match.productTitle || suggestion.title
                : suggestion.title
                ? `${suggestion.title} preview icon`
                : "Gift preview icon"
            }
            sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 25vw"
            className="object-contain p-3 transition duration-300 group-hover:scale-[1.025]"
          />
        </a>
        <span
          className={`pointer-events-none absolute left-3 top-3 z-10 rounded-full border px-3 py-1 text-[11px] font-semibold shadow-sm ${
            tierBadgeClasses[suggestion.tier]
          }`}
        >
          {tierLabels[suggestion.tier]}
        </span>
        <button
          type="button"
          onClick={() =>
            isSaved ? onUnsaveGift(suggestion) : onSaveGift(suggestion)
          }
          disabled={saveState?.saving}
          className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-gp-evergreen/10 bg-white/95 text-gp-evergreen shadow-sm transition hover:bg-gp-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-gold/70 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={
            saveState?.saving
              ? "Saving gift idea"
              : isSaved
                ? "Remove from saved ideas"
                : "Save gift idea"
          }
          aria-pressed={isSaved}
        >
          <Heart
            className={`h-4.5 w-4.5 ${isSaved ? "fill-current" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="space-y-1.5">
          <h3 className="line-clamp-2 text-base font-bold leading-5 text-gp-evergreen">
            {suggestion.title}
          </h3>
          <p className="line-clamp-2 text-sm leading-5 text-gp-evergreen/65">
            {suggestion.short_description}
          </p>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
          <div>
            <p className="text-xl font-bold tracking-tight text-gp-evergreen">
              {priceDisplay}
            </p>
          </div>
          {matchedProduct ? (
            <div className="max-w-[55%] text-right">
              <p className="truncate text-sm font-semibold text-gp-evergreen/80">
                {matchedProduct.merchantLabel}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <a
            href={shoppingHref}
            target="_blank"
            rel={AFFILIATE_LINK_REL}
            className={`${AFFILIATE_SHOPPING_BUTTON_CLASS} gp-affiliate-shopping-button w-full justify-center`}
          >
            {shoppingLabel}
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
          <p className="text-center text-[10px] leading-4 text-gp-evergreen/50">
            {AFFILIATE_DISCLOSURE}
          </p>
        </div>

        {(() => {
          const recentlySaved =
            isSaved && lastSavedId === suggestionKey && saveState?.success;
          const recentlyUnsaved =
            !isSaved && lastUnsavedId === suggestionKey && !saveState?.success;
          const banner = recentlySaved
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
        {saveState?.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {saveState.error}
          </div>
        ) : null}

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
  const [numSuggestions, setNumSuggestions] = useState("9");

  const [runs, setRuns] = useState<SuggestionRun[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const [sortOption, setSortOption] = useState<SortOption>("relevance");
  const [categoryFilter, setCategoryFilter] =
    useState<GiftCategoryFilter>("all");

  const [isLoadingRecipients, setIsLoadingRecipients] = useState(true);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [requestProgress, setRequestProgress] = useState(0);
  const [error, setError] = useState("");
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
  const [savedIdMap, setSavedIdMap] = useState<Record<string, string>>({});
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [lastUnsavedId, setLastUnsavedId] = useState<string | null>(null);
  const [saveStates, setSaveStates] = useState<
    Record<
      string,
      { saving: boolean; success: boolean; error: string | null; ts: number }
    >
  >({});
  const [pendingDeleteRunId, setPendingDeleteRunId] = useState<string | null>(
    null,
  );
  const [isDeletingRun, setIsDeletingRun] = useState(false);
  const resultsSectionRef = useRef<HTMLDivElement | null>(null);
  const selectedRecipient = useMemo(
    () => recipients.find((r) => r.id === selectedRecipientId) ?? null,
    [recipients, selectedRecipientId],
  );
  const selectedBudgetDisplay = selectedRecipient
    ? formatBudgetRange(
        selectedRecipient.budget_per_gift,
        selectedRecipient.budget_annual,
      )
    : "Select a recipient";
  const pendingDeleteRun = useMemo(
    () => runs.find((run) => run.id === pendingDeleteRunId) ?? null,
    [pendingDeleteRunId, runs],
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
          "id, name, relationship, pet_type, avatar_url, avatar_icon, is_self, budget_per_gift, budget_annual",
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

  const openSavedIdeasModal = () => {
    if (!selectedRecipient) return;
    setSavedGiftsRecipientId(selectedRecipient.id);
    setSavedGiftsRecipientName(selectedRecipient.name);
    setSavedGiftsOpen(true);
  };

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
            suggestionRunId: activeRunId,
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

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Failed to save gift idea");
      }

      const savedId =
        body &&
        typeof body === "object" &&
        body !== null &&
        "savedGift" in body &&
        body.savedGift &&
        typeof (body as { savedGift?: { id?: string } }).savedGift?.id ===
          "string"
          ? (body as { savedGift: { id: string } }).savedGift.id
          : null;

      setSavedMap((prev) => ({ ...prev, [suggestionKey]: true }));
      if (savedId) {
        setSavedIdMap((prev) => ({ ...prev, [suggestionKey]: savedId }));
      }
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
    const savedId = savedIdMap[suggestionKey];

    const params = new URLSearchParams();
    if (savedId) {
      params.set("id", savedId);
    } else if (suggestion.title) {
      params.set("title", suggestion.title);
    }

    if ([...params.keys()].length === 0) {
      setSaveStates((prev) => ({
        ...prev,
        [suggestionKey]: {
          saving: false,
          success: false,
          error: "Unable to unsave this idea.",
          ts: Date.now(),
        },
      }));
      return;
    }

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
        `/api/recipients/${selectedRecipient.id}/saved-gifts?${params.toString()}`,
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
      setSavedIdMap((prev) => {
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
    setLastUnsavedId((prev) => (prev === suggestionId ? null : prev));
  };

  const handleDeleteRun = async () => {
    if (!pendingDeleteRunId || !user?.id) return;
    const runIdToDelete = pendingDeleteRunId;
    try {
      setIsDeletingRun(true);
      const { error } = await supabase
        .from("gift_suggestions")
        .delete()
        .eq("id", runIdToDelete)
        .eq("recipient_id", selectedRecipientId || "")
        .eq("user_id", user.id);
      if (error) throw error;

      setRuns((prev) => {
        const remaining = prev.filter((run) => run.id !== runIdToDelete);
        setActiveRunId((currentRunId) =>
          currentRunId === runIdToDelete
            ? (remaining[0]?.id ?? null)
            : currentRunId,
        );
        return remaining;
      });
      setPendingDeleteRunId(null);
    } catch (err) {
      console.error("Failed to delete run", err);
    } finally {
      setIsDeletingRun(false);
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
    setCategoryFilter("all");
  }, [activeRunId]);

  const visibleSuggestions = useMemo(() => {
    if (!activeRun) return [];
    const suggestions = [...(activeRun.suggestions ?? [])];

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
  }, [activeRun, sortOption]);
  const filteredSuggestions = useMemo(
    () =>
      categoryFilter === "all"
        ? visibleSuggestions
        : visibleSuggestions.filter(
            (suggestion) => suggestion.tier === categoryFilter,
          ),
    [categoryFilter, visibleSuggestions],
  );
  const categoryCounts = useMemo(() => {
    const counts: Record<GiftCategoryFilter, number> = {
      all: visibleSuggestions.length,
      safe: 0,
      thoughtful: 0,
      experience: 0,
      splurge: 0,
    };
    visibleSuggestions.forEach((suggestion) => {
      counts[suggestion.tier] += 1;
    });
    return counts;
  }, [visibleSuggestions]);
  const visibleSuggestionsKey = visibleSuggestions
    .map((s) => getSuggestionIdentity(s))
    .join("|");

  useEffect(() => {
    if (!selectedRecipientId || visibleSuggestions.length === 0) {
      setSavedMap({});
      setSavedIdMap({});
      setShowTipBanner(false);
      return;
    }

    const nextSaved: Record<string, boolean> = {};

    visibleSuggestions.forEach((sugg) => {
      const key = getSuggestionIdentity(sugg);
      if (!key) return;
      if (sugg.initialSaved) {
        nextSaved[key] = true;
      }
    });

    setSavedMap(nextSaved);
    setShowTipBanner(true);
  }, [
    selectedRecipientId,
    visibleSuggestionsKey,
    visibleSuggestions.length,
    visibleSuggestions,
  ]);

  useEffect(() => {
    if (!selectedRecipientId || !authToken || visibleSuggestions.length === 0) {
      return;
    }

    let active = true;
    const reconcileSavedIdeas = async () => {
      try {
        const response = await fetch(
          `/api/recipients/${selectedRecipientId}/saved-gifts`,
          { headers: { Authorization: `Bearer ${authToken}` } },
        );
        if (!response.ok) return;

        const body = (await response.json()) as {
          savedGifts?: Array<{
            id: string;
            title: string;
            product_match: unknown;
          }>;
        };
        if (!active) return;

        const nextSaved: Record<string, boolean> = {};
        const nextSavedIds: Record<string, string> = {};
        visibleSuggestions.forEach((suggestion) => {
          const suggestionKey = getSuggestionIdentity(suggestion);
          const suggestionProductKey = getSavedGiftProductKey(
            resolveProductMatch(
              suggestion.productMatch,
              suggestion.amazonProduct,
            ),
          );
          const suggestionTitleKey = normalizeSavedGiftTitle(suggestion.title);
          const savedGift = (body.savedGifts ?? []).find((gift) => {
            const savedProductKey = getSavedGiftProductKey(gift.product_match);
            if (suggestionProductKey && savedProductKey) {
              return suggestionProductKey === savedProductKey;
            }
            return normalizeSavedGiftTitle(gift.title) === suggestionTitleKey;
          });
          if (!suggestionKey || !savedGift) return;
          nextSaved[suggestionKey] = true;
          nextSavedIds[suggestionKey] = savedGift.id;
        });
        setSavedMap(nextSaved);
        setSavedIdMap(nextSavedIds);
      } catch {
        // The run's persisted flags remain a safe fallback when reconciliation fails.
      }
    };

    void reconcileSavedIdeas();
    return () => {
      active = false;
    };
  }, [authToken, selectedRecipientId, visibleSuggestions, visibleSuggestionsKey]);

  const handleSavedGiftRemoved = (
    recipientId: string,
    removedGift: { id: string; title: string; product_match: unknown },
  ) => {
    if (recipientId !== selectedRecipientId) return;
    const removedProductKey = getSavedGiftProductKey(removedGift.product_match);
    const removedTitleKey = normalizeSavedGiftTitle(removedGift.title);

    visibleSuggestions.forEach((suggestion) => {
      const suggestionKey = getSuggestionIdentity(suggestion);
      const suggestionProductKey = getSavedGiftProductKey(
        resolveProductMatch(suggestion.productMatch, suggestion.amazonProduct),
      );
      const matches =
        removedProductKey && suggestionProductKey
          ? removedProductKey === suggestionProductKey
          : normalizeSavedGiftTitle(suggestion.title) === removedTitleKey;
      if (!suggestionKey || !matches) return;

      setSavedMap((previous) => {
        const next = { ...previous };
        delete next[suggestionKey];
        return next;
      });
      setSavedIdMap((previous) => {
        const next = { ...previous };
        delete next[suggestionKey];
        return next;
      });
      setLastUnsavedId(suggestionKey);
      setLastSavedId(null);
    });
  };

  const isInitialLoading =
    status === "loading" ||
    (status === "authenticated" && isLoadingRecipients && !recipients.length);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    if (isGenerating) {
      setRequestProgress((prev) => (prev > 0 ? prev : 3));
      interval = setInterval(() => {
        setRequestProgress((prev) => {
          const target = 98;
          if (prev >= target) return prev;
          const increment = Math.min(
            0.8,
            Math.max(0.2, (target - prev) * 0.04),
          );
          return Math.min(target, prev + increment);
        });
      }, 220);
    } else {
      setRequestProgress((prev) => (prev > 0 && prev < 100 ? 100 : prev));
      timeout = setTimeout(() => setRequestProgress(0), 700);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, [isGenerating]);

  const handleRequestSuggestions = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedRecipientId) {
      setError("Select a recipient before requesting suggestions.");
      return;
    }

    setError("");
    setIsGenerating(true);
    resultsSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const budgetPerGift = selectedRecipient?.budget_per_gift;
      const budgetAnnual = selectedRecipient?.budget_annual;
      const parsedBudgetMin =
        typeof budgetPerGift === "number"
          ? budgetPerGift
          : budgetPerGift
          ? Number(budgetPerGift)
          : null;
      const parsedBudgetMax =
        typeof budgetAnnual === "number"
          ? budgetAnnual
          : budgetAnnual
          ? Number(budgetAnnual)
          : null;

      const payload = {
        recipientId: selectedRecipientId,
        occasion: occasion.trim() || null,
        budgetMin: parsedBudgetMin,
        budgetMax: parsedBudgetMax,
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
          budget_min: parsedBudgetMin,
          budget_max: parsedBudgetMax,
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
      setIsGenerating(false);
      requestAnimationFrame(() => {
        resultsSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
      if (onFirstRunComplete) {
        onFirstRunComplete();
      }
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
      className="space-y-4"
    >
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
          <form
            className="gp-gift-generator-grid rounded-2xl border border-[#e8dfca] bg-[#fffdf7] p-4 shadow-[0_10px_28px_rgba(15,61,62,0.045)]"
            onSubmit={handleRequestSuggestions}
          >
            <div className="gp-gift-generator-heading">
              <h2 className="font-display text-xl font-semibold text-gp-evergreen sm:text-2xl">
                Tell us who and what you&apos;re shopping for
              </h2>
            </div>
            {selectedRecipient ? (
              <div className="gp-gift-generator-recipient min-w-0">
                <label
                  htmlFor="recipient-summary"
                  className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-gp-evergreen/60"
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
                    className="flex min-h-13 w-full items-center gap-3 rounded-xl border border-gp-evergreen/15 bg-white px-3 py-1.5 text-left transition hover:border-gp-evergreen/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-gold/70 cursor-pointer"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gp-evergreen/15 bg-white text-sm font-semibold text-gp-evergreen">
                      {(() => {
                        const avatar = getRecipientAvatarVisual(selectedRecipient);
                        if (avatar.kind === "image") {
                          return (
                            <Image
                              src={avatar.src}
                              alt={avatar.alt}
                              width={40}
                              height={40}
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
                              width={34}
                              height={34}
                              className="h-8.5 w-8.5 object-contain"
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
                  <p className="gp-gift-generator-note mt-1.5 text-xs leading-4 text-gp-evergreen/55">
                    Ready to generate ideas for {selectedRecipient.name}. Adjust
                    the occasion if you like, then click &quot;Ask PerchPal for
                    suggestions&quot;.
                  </p>
                ) : null}
              </div>
            ) : null}

              <div className="gp-gift-generator-occasion min-w-0">
                <label
                  htmlFor="occasion-select"
                  className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-gp-evergreen/60"
                >
                  Occasion (optional)
                </label>
                <select
                  id="occasion-select"
                  value={occasion}
                  onChange={(event) => setOccasion(event.target.value)}
                  className="gp-input min-h-13 rounded-xl bg-white"
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

              <div className="gp-gift-generator-budget min-w-0">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-gp-evergreen/60">
                  Recipient profile budget
                </span>
                <div className="flex min-h-13 items-center rounded-xl border border-gp-evergreen/15 bg-white px-3.5 text-sm font-semibold text-gp-evergreen">
                  {selectedBudgetDisplay}
                </div>
              </div>

              <div className="gp-gift-generator-count min-w-0">
                <label
                  htmlFor="num-suggestions-input"
                  className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-gp-evergreen/60"
                >
                  Number of ideas
                </label>
                <select
                  id="num-suggestions-input"
                  value={numSuggestions}
                  onChange={(event) => setNumSuggestions(event.target.value)}
                  className="gp-input min-h-13 rounded-xl bg-white"
                >
                  {Array.from({ length: 10 }, (_, index) => index + 3).map(
                    (count) => (
                      <option key={count} value={count}>
                        {count}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="gp-gift-generator-action flex flex-col justify-end gap-2">
                <button
                  type="submit"
                  disabled={!selectedRecipientId || isGenerating || requestProgress > 0}
                  aria-disabled={isGenerating || requestProgress > 0}
                  className="gp-btn gp-btn--primary min-h-13 w-full justify-center rounded-xl px-5 text-sm disabled:cursor-not-allowed"
                >
                  <svg
                    viewBox="0 0 20 20"
                    className="h-4 w-4 opacity-90"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.7}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m10 2 1.7 3.8L16 7.5l-3.2 2.7.9 4.3L10 12.3 6.3 14.5l.9-4.3L4 7.5l4.3-1.7L10 2Z" />
                  </svg>
                  {isGenerating ? "Generating…" : "Generate Gift Ideas"}
                </button>
                <p className="text-center text-[11px] leading-4 text-gp-evergreen/55">
                  Personalized using {selectedRecipient?.name ?? "this recipient"}&apos;s profile
                </p>
              </div>
          </form>

          <div ref={resultsSectionRef}>
            {runs.length > 0 && (
              <div className="mt-4 flex flex-col gap-3 border-b border-gp-evergreen/10 pb-3 text-gp-evergreen lg:flex-row lg:items-center">
                <div
                  className="flex flex-1 flex-wrap items-center gap-2"
                  role="group"
                  aria-label="Filter gift ideas"
                >
                  {giftCategoryFilters.map((filter) => {
                    const count = categoryCounts[filter.value];
                    if (filter.value !== "all" && count === 0) return null;
                    const active = categoryFilter === filter.value;
                    return (
                      <button
                        key={filter.value}
                        type="button"
                        onClick={() => setCategoryFilter(filter.value)}
                        aria-pressed={active}
                        className={`min-h-9 rounded-full border px-4 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-gold/70 ${
                          active
                            ? "border-gp-evergreen bg-gp-evergreen text-white shadow-sm"
                            : "border-gp-evergreen/12 bg-white text-gp-evergreen/75 hover:border-gp-evergreen/25 hover:bg-[#fffdf7]"
                        }`}
                      >
                        {filter.label} ({count})
                      </button>
                    );
                  })}
                </div>

                <div className="flex w-full flex-wrap items-center gap-2 lg:ml-auto lg:w-auto lg:justify-end">
                  <RunHistoryMenu
                    runs={runs}
                    activeRunId={activeRunId}
                    onSelect={setActiveRunId}
                    onRequestDelete={setPendingDeleteRunId}
                  />
                  <select
                    id="sort-option"
                    value={sortOption}
                    onChange={(event) =>
                      setSortOption(event.target.value as SortOption)
                    }
                    className="gp-input min-h-10 w-auto min-w-[9rem] rounded-full bg-white py-1.5 text-xs"
                    aria-label="Sort gift ideas"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="price-asc">Price: Low to high</option>
                    <option value="price-desc">Price: High to low</option>
                    <option value="tier">Tier</option>
                  </select>
                  <button
                    type="button"
                    onClick={openSavedIdeasModal}
                    className="gp-btn gp-btn--secondary gp-btn--sm min-h-10 rounded-full"
                  >
                    Saved ideas
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4">
              {isLoadingRuns ? (
                <PerchPalLoader
                  variant="block"
                  size="md"
                  message="PerchPal is gathering previous suggestion runs..."
                />
              ) : isGenerating ? (
                <div className="rounded-2xl border border-gp-evergreen/15 bg-white p-6 text-center text-sm text-gp-evergreen shadow-sm">
                  <div className="flex flex-col items-center gap-3">
                    <PerchPalLoader
                      variant="inline"
                      size="md"
                      message="Retrieving gifts..."
                      ariaLabel="Asking PerchPal for suggestions"
                    />
                    <div className="mt-1 h-2 w-full max-w-xs overflow-hidden rounded-full border border-black/40 bg-white shadow-inner">
                      <div
                        className="h-full rounded-full bg-gp-gold transition-[width] duration-300 ease-out"
                        style={{ width: `${Math.min(100, requestProgress)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : !activeRun ? (
                <div className="rounded-2xl border border-dashed border-gp-evergreen/30 bg-gp-cream/60 p-6 text-center text-sm text-gp-evergreen">
                  Ask PerchPal for suggestions to see curated gift ideas here.
                </div>
              ) : visibleSuggestions.length === 0 ? (
                <div className="rounded-2xl border border-gp-evergreen/20 bg-white/90 p-6 text-sm text-gp-evergreen">
                  No suggestions were found in this run.
                </div>
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gp-evergreen/60">
                    <span>
                      Generated {new Date(activeRun.created_at).toLocaleString()}{" "}
                      for {activeRun.prompt_context.recipient_name}
                      {activeRun.prompt_context.occasion
                        ? ` - ${activeRun.prompt_context.occasion}`
                        : ""}
                    </span>
                    {activeRun.prompt_context.budget_min ||
                    activeRun.prompt_context.budget_max ? (
                      <span>
                        Run budget:{" "}
                        {formatBudgetRange(
                          activeRun.prompt_context.budget_min,
                          activeRun.prompt_context.budget_max,
                        )}
                      </span>
                    ) : null}
                  </div>
                  <FirstSuggestionsTipBanner hasSuggestionsThisSession={showTipBanner} />
                  {filteredSuggestions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gp-evergreen/20 bg-white/70 p-5 text-center text-sm text-gp-evergreen/70">
                      No ideas in this run match the selected category.
                    </div>
                  ) : (
                    <div
                      className="gp-gift-suggestions-grid grid gap-4"
                      data-result-count={Math.min(filteredSuggestions.length, 4)}
                    >
                    {filteredSuggestions.map((suggestion) => {
                      const suggestionKey = getSuggestionIdentity(suggestion);
                      return (
                        <GiftSuggestionCard
                          key={suggestionKey}
                          suggestionKey={suggestionKey}
                          suggestion={suggestion}
                          onSaveGift={handleSaveGift}
                          onUnsaveGift={handleUnsaveGift}
                          isSaved={!!savedMap[suggestionKey]}
                          lastSavedId={lastSavedId}
                          lastUnsavedId={lastUnsavedId}
                          saveState={saveStates[suggestionKey]}
                          onOpenSaved={openSavedIdeasModal}
                          onDismissSave={() => handleDismissSave(suggestionKey)}
                        />
                      );
                    })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
      <p className="text-center text-xs text-gp-evergreen/70">
        Want to browse Amazon directly?{" "}
        <a
          href="https://www.amazon.com/?tag=giftperch-20"
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="font-semibold text-gp-evergreen underline underline-offset-4 transition hover:text-gp-gold"
        >
          Shop Amazon’s full catalog »
        </a>
      </p>
      {savedGiftsRecipientId ? (
        <SavedGiftIdeasModal
          recipientId={savedGiftsRecipientId}
          recipientName={savedGiftsRecipientName}
          recipientAvatarUrl={selectedRecipient?.avatar_url ?? null}
          recipientAvatarIcon={
            selectedRecipient?.avatar_icon
              ? `/icons/recipients/${selectedRecipient.avatar_icon}_icon.png`
              : null
          }
          isOpen={savedGiftsOpen}
          onClose={() => setSavedGiftsOpen(false)}
          authToken={authToken}
          onSavedGiftRemoved={handleSavedGiftRemoved}
        />
      ) : null}

      {pendingDeleteRunId && pendingDeleteRun ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-gp-cream p-5 shadow-xl">
            <p className="text-sm font-semibold text-gp-evergreen">
              Delete this run?
            </p>
            <p className="mt-2 text-sm text-gp-evergreen/80">
              This will remove {formatRunLabel(pendingDeleteRun)} from your
              recommendation history. This action can’t be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingDeleteRunId(null)}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-gp-evergreen border border-gp-evergreen/20 hover:bg-gp-cream/80 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRun}
                  disabled={isDeletingRun}
                  className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
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
