"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { PerchPalLoader } from "@/components/perchpal/PerchPalLoader";
import { GiftPreviewImage } from "@/components/gifts/GiftPreviewImage";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  Bookmark,
  CalendarDays,
  ExternalLink,
  Gift,
  ListFilter,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  Users,
} from "lucide-react";
import {
  AFFILIATE_LINK_REL,
  getMatchedProductPresentation,
  getSafeExternalUrl,
  isExpectedAmazonAffiliateUrl,
} from "@/lib/affiliateProduct";
import {
  GIFT_HISTORY_IMAGE_FALLBACK,
  formatGiftHistoryPrice,
  formatSavedIdeaPrice,
  resolveGiftHistoryImage,
  resolveHistoryRecipientAvatar,
  sortGiftHistoryEntries,
  sortSavedIdeas,
  type GiftHistorySort,
  type SavedIdeaSort,
} from "@/lib/giftHistoryPresentation";
import { resolveGiftPreviewSource } from "@/lib/gifts/getGiftPreviewIcon";

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
  image_url: string | null;
  estimated_price_min: number | null;
  estimated_price_max: number | null;
  product_match: unknown;
  tier: string | null;
  rationale: string | null;
  created_at: string;
  suggestion_id?: string | null;
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
            URL
            <input
              type="text"
              inputMode="url"
              placeholder="https://www.amazon.com or www.amazon.com"
              value={formState.url}
              onChange={(event) =>
                onChange((prev) => ({ ...prev, url: event.target.value }))
              }
              className="gp-input bg-white"
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
            {formSaving
              ? "Saving..."
              : mode === "edit"
              ? "Update Log"
              : "Log gift"}
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAbove, setMenuAbove] = useState(false);
  const [imageSrc, setImageSrc] = useState(resolveGiftHistoryImage(gift.image_url));
  const [avatarFailed, setAvatarFailed] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const firstMenuItemRef = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null);
  const dateLabel = gift.purchased_at
    ? new Date(gift.purchased_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Date not recorded";
  const recipientAvatar = resolveHistoryRecipientAvatar(recipient);

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    requestAnimationFrame(() => firstMenuItemRef.current?.focus());
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const toggleMenu = () => {
    if (!menuOpen && triggerRef.current) {
      const bounds = triggerRef.current.getBoundingClientRect();
      setMenuAbove(window.innerHeight - bounds.bottom < 170);
    }
    setMenuOpen((open) => !open);
  };

  return (
    <article className="relative grid min-w-0 gap-3 rounded-2xl border border-gp-app-evergreen/10 bg-white/95 p-3 shadow-[0_7px_22px_rgba(15,61,62,0.045)] transition hover:border-gp-app-evergreen/16 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto] sm:items-center lg:grid-cols-[8.75rem_minmax(13rem,1.4fr)_minmax(7rem,0.45fr)_minmax(9rem,0.55fr)_auto] lg:gap-0 lg:px-4 lg:py-2.5">
      <div className="relative aspect-[5/3] overflow-hidden rounded-xl bg-gp-app-surface-warm sm:aspect-[7/5] lg:h-[5.25rem] lg:w-[8.75rem]">
        <Image
          src={imageSrc}
          alt={imageSrc === GIFT_HISTORY_IMAGE_FALLBACK ? "Gift placeholder" : gift.title}
          fill
          sizes="(min-width: 1024px) 140px, (min-width: 640px) 120px, 90vw"
          className="object-contain p-1"
          unoptimized={imageSrc.startsWith("https://")}
          onError={() => setImageSrc(GIFT_HISTORY_IMAGE_FALLBACK)}
        />
      </div>

      <div className="min-w-0 sm:pr-2 lg:px-5">
        <h2 className="line-clamp-2 font-display text-lg font-semibold leading-6 text-gp-app-evergreen">
          {gift.title}
        </h2>
        <div className="mt-2 flex min-w-0 items-center gap-2">
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gp-app-gold/45 bg-[#eef4e9] text-[11px] font-bold text-gp-app-evergreen">
            {recipientAvatar.kind === "image" && !avatarFailed ? (
              <Image
                src={recipientAvatar.src}
                alt=""
                fill
                sizes="32px"
                className="object-cover"
                unoptimized={recipientAvatar.src.startsWith("https://")}
                onError={() => setAvatarFailed(true)}
              />
            ) : recipientAvatar.kind === "image" ? (
              recipientAvatar.fallbackInitials
            ) : (
              recipientAvatar.initials
            )}
          </span>
          <p className="min-w-0 truncate text-sm text-gp-app-muted">
            For {recipient?.name ?? "Unknown recipient"}
            {recipient?.relationship ? ` (${recipient.relationship})` : ""}
          </p>
        </div>
      </div>

      <div className="border-gp-app-evergreen/8 sm:col-start-2 sm:flex sm:items-center sm:justify-between sm:gap-4 lg:col-auto lg:block lg:border-x lg:px-5">
        <p className={`font-bold text-gp-app-evergreen ${gift.price === null ? "text-xs" : "text-base"}`}>
          {formatGiftHistoryPrice(gift.price)}
        </p>
      </div>

      <div className="flex min-w-0 items-center gap-2 text-xs text-gp-app-muted sm:col-start-2 lg:col-auto lg:border-r lg:border-gp-app-evergreen/8 lg:px-5">
        <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-gp-app-evergreen/60" />
        <span>
          <span className="block text-[10px] uppercase tracking-[0.08em] text-gp-app-muted/75">
            Purchased
          </span>
          <span className="block">{dateLabel}</span>
        </span>
      </div>

      <div ref={menuRef} className="absolute right-3 top-3 sm:relative sm:right-auto sm:top-auto sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:self-center lg:col-auto lg:row-auto lg:row-span-1 lg:px-3">
        <button
          ref={triggerRef}
          type="button"
          aria-label={`Actions for ${gift.title}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={toggleMenu}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff8e6] text-gp-app-evergreen transition hover:bg-[#fff1c8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-app-gold"
        >
          <MoreHorizontal aria-hidden="true" className="h-5 w-5" />
        </button>
        {menuOpen ? (
          <div
            role="menu"
            aria-label={`Actions for ${gift.title}`}
            className={`absolute right-0 z-30 min-w-48 overflow-hidden rounded-xl border border-gp-app-evergreen/10 bg-white p-1.5 shadow-[0_14px_35px_rgba(15,61,62,0.16)] ${
              menuAbove ? "bottom-12" : "top-12"
            }`}
          >
            {gift.url ? (
              <a
                ref={firstMenuItemRef as React.RefObject<HTMLAnchorElement>}
                role="menuitem"
                href={gift.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gp-app-evergreen transition hover:bg-gp-app-surface-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-app-gold"
              >
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
                Open product link
              </a>
            ) : null}
            <button
              ref={gift.url ? undefined : firstMenuItemRef as React.RefObject<HTMLButtonElement>}
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onEdit(gift);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gp-app-evergreen transition hover:bg-gp-app-surface-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-app-gold"
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
              Edit
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onDelete(gift);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              Delete
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function SavedIdeaItem({
  idea,
  onLog,
  onRemove,
  isRemoving,
  recipientMap,
}: {
  idea: SavedIdeaAggregated;
  onLog: () => void;
  onRemove: () => void;
  isRemoving: boolean;
  recipientMap: Record<string, RecipientSummary>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAbove, setMenuAbove] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement | null>(null);
  const dateLabel = idea.created_at
    ? new Date(idea.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Date unavailable";
  const recipient = recipientMap[idea.recipient_id];
  const recipientAvatar = resolveHistoryRecipientAvatar(recipient);
  const matchedProduct = getMatchedProductPresentation(idea.product_match);
  const legacyProductUrl = getSafeExternalUrl(idea.url);
  const shoppingHref = matchedProduct?.match.affiliateUrl ?? legacyProductUrl;
  const isAffiliateLink =
    Boolean(matchedProduct) ||
    Boolean(legacyProductUrl && isExpectedAmazonAffiliateUrl(legacyProductUrl));
  const previewSource = resolveGiftPreviewSource({
    metadata: {
      title: idea.title,
      rationale: idea.rationale,
      tier: idea.tier,
    },
    imageUrl: idea.image_url,
    productMatch: idea.product_match,
  });
  const displayedPrice = formatSavedIdeaPrice(idea);

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    requestAnimationFrame(() => firstMenuItemRef.current?.focus());
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const toggleMenu = () => {
    if (!menuOpen && triggerRef.current) {
      const bounds = triggerRef.current.getBoundingClientRect();
      setMenuAbove(window.innerHeight - bounds.bottom < 150);
    }
    setMenuOpen((open) => !open);
  };

  return (
    <article className="relative grid min-w-0 gap-3 rounded-2xl border border-gp-app-evergreen/10 bg-white/95 p-3 shadow-[0_7px_22px_rgba(15,61,62,0.045)] transition hover:border-gp-app-evergreen/16 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto] sm:items-center xl:grid-cols-[8.75rem_minmax(12rem,1.25fr)_minmax(7.5rem,0.45fr)_minmax(8rem,0.45fr)_minmax(7rem,auto)_minmax(8rem,auto)_auto] xl:gap-0 xl:px-4 xl:py-2.5">
      <div className="relative aspect-[5/3] overflow-hidden rounded-xl bg-gp-app-surface-warm sm:aspect-[7/5] xl:h-[5.25rem] xl:w-[8.75rem]">
        <GiftPreviewImage
          key={previewSource.primary}
          source={previewSource}
          alt={idea.title}
          sizes="(min-width: 1024px) 140px, (min-width: 640px) 120px, 90vw"
          className="object-contain p-1"
        />
      </div>

      <div className="min-w-0 sm:pr-2 xl:px-5">
        <h2 className="line-clamp-2 font-display text-lg font-semibold leading-6 text-gp-app-evergreen">
          {idea.title}
        </h2>
        <div className="mt-2 flex min-w-0 items-center gap-2">
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gp-app-gold/45 bg-[#eef4e9] text-[11px] font-bold text-gp-app-evergreen">
            {recipientAvatar.kind === "image" && !avatarFailed ? (
              <Image
                src={recipientAvatar.src}
                alt=""
                fill
                sizes="32px"
                className="object-cover"
                unoptimized={recipientAvatar.src.startsWith("https://")}
                onError={() => setAvatarFailed(true)}
              />
            ) : recipientAvatar.kind === "image" ? (
              recipientAvatar.fallbackInitials
            ) : (
              recipientAvatar.initials
            )}
          </span>
          <p className="min-w-0 truncate text-sm text-gp-app-muted">
            For {idea.recipient_name}
            {idea.recipient_relationship
              ? ` (${idea.recipient_relationship})`
              : ""}
          </p>
        </div>
      </div>

      <div className="border-gp-app-evergreen/8 sm:col-start-2 xl:col-auto xl:border-x xl:px-5">
        <p
          className={`font-bold text-gp-app-evergreen ${displayedPrice === "Price not available" ? "text-xs" : "text-base"}`}
        >
          {displayedPrice}
        </p>
      </div>

      <div className="flex min-w-0 items-center gap-2 text-xs text-gp-app-muted sm:col-start-2 xl:col-auto xl:border-r xl:border-gp-app-evergreen/8 xl:px-5">
        <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-gp-app-evergreen/60" />
        <span>
          <span className="block text-[10px] uppercase tracking-[0.08em] text-gp-app-muted/75">
            Saved
          </span>
          <span className="block">{dateLabel}</span>
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 sm:col-start-2 xl:col-auto xl:px-4">
        {idea.tier ? (
          <span className="rounded-full bg-[#eef6ec] px-3 py-1 text-[11px] font-medium capitalize text-gp-app-evergreen">
            {idea.tier}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2 sm:col-start-2 xl:col-auto xl:px-3">
        {shoppingHref ? (
          <a
            href={shoppingHref}
            target="_blank"
            rel={isAffiliateLink ? AFFILIATE_LINK_REL : "noopener noreferrer"}
            className="gp-btn gp-btn--primary gp-btn--sm whitespace-nowrap"
          >
            View product
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        ) : (
          <span className="text-xs text-gp-app-muted">No product link</span>
        )}
      </div>

      <div ref={menuRef} className="absolute right-3 top-3 sm:relative sm:right-auto sm:top-auto sm:col-start-3 sm:row-span-3 sm:row-start-1 sm:self-center xl:col-auto xl:row-auto xl:row-span-1 xl:px-1">
        <button
          ref={triggerRef}
          type="button"
          aria-label={`Actions for ${idea.title}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={toggleMenu}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff8e6] text-gp-app-evergreen transition hover:bg-[#fff1c8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-app-gold"
        >
          <MoreHorizontal aria-hidden="true" className="h-5 w-5" />
        </button>
        {menuOpen ? (
          <div
            role="menu"
            aria-label={`Actions for ${idea.title}`}
            className={`absolute right-0 z-30 min-w-48 overflow-hidden rounded-xl border border-gp-app-evergreen/10 bg-white p-1.5 shadow-[0_14px_35px_rgba(15,61,62,0.16)] ${
              menuAbove ? "bottom-12" : "top-12"
            }`}
          >
            <button
              ref={firstMenuItemRef}
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onLog();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gp-app-evergreen transition hover:bg-gp-app-surface-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-app-gold"
            >
              <ShoppingBag aria-hidden="true" className="h-4 w-4" />
              Log this gift
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onRemove();
              }}
              disabled={isRemoving}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              {isRemoving ? "Removing..." : "Remove"}
            </button>
          </div>
        ) : null}
      </div>
    </article>
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
  const [sort, setSort] = useState<GiftHistorySort>("recent");
  const [showAddModal, setShowAddModal] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [activeGift, setActiveGift] = useState<GiftHistoryEntry | null>(null);
  const [formState, setFormState] = useState<GiftFormState>(emptyGiftForm);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [initializedFilter, setInitializedFilter] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "saved">("history");
  const [savedIdeas, setSavedIdeas] = useState<SavedIdeaAggregated[]>([]);
  const [isRemovingSaved, setIsRemovingSaved] = useState<string | null>(null);
  const [savedIdeaToDelete, setSavedIdeaToDelete] =
    useState<SavedIdeaAggregated | null>(null);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedError, setSavedError] = useState("");
  const [savedRecipientFilter, setSavedRecipientFilter] = useState("all");
  const [savedSearch, setSavedSearch] = useState("");
  const [savedSort, setSavedSort] = useState<SavedIdeaSort>("recent");
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
    const matches = savedIdeas.filter((idea) => {
      if (savedRecipientFilter !== "all" && idea.recipient_id !== savedRecipientFilter) {
        return false;
      }
      const term = savedSearch.trim().toLowerCase();
      return !term || idea.title.toLowerCase().includes(term);
    });
    return sortSavedIdeas(matches, savedSort);
  }, [savedIdeas, savedRecipientFilter, savedSearch, savedSort]);

  const filteredGifts = useMemo(() => {
    const matches = gifts.filter((gift) => {
      if (recipientFilter !== "all" && gift.recipient_id !== recipientFilter) {
        return false;
      }

      const term = search.trim().toLowerCase();
      if (term) {
        const matchTitle = gift.title.toLowerCase().includes(term);
        const matchNotes = gift.notes?.toLowerCase().includes(term) ?? false;
        if (!matchTitle && !matchNotes) return false;
      }

      return true;
    });
    return sortGiftHistoryEntries(matches, sort);
  }, [gifts, recipientFilter, search, sort]);

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
          const savedRes = await fetch(
            `/api/recipients/${recipient.id}/saved-gifts`,
            { headers },
          );

          if (!savedRes.ok) {
            const body = await savedRes.json().catch(() => ({}));
            throw new Error(body.error || "Failed to load saved gifts");
          }

          const saved = (await savedRes.json()) as {
            savedGifts: {
              id: string;
              title: string;
              product_url: string | null;
              image_url: string | null;
              estimated_price_min: number | null;
              estimated_price_max: number | null;
              product_match: unknown;
              tier: string | null;
              rationale: string | null;
              created_at: string;
              suggestion_id?: string | null;
            }[];
          };
          const mapItem = (
            item: (typeof saved.savedGifts)[number],
          ): SavedIdeaAggregated => ({
            id: item.id,
            recipient_id: recipient.id,
            recipient_name: recipient.name,
            recipient_relationship: recipient.relationship ?? null,
            title: item.title,
            url: item.product_url,
            image_url: item.image_url,
            estimated_price_min: item.estimated_price_min,
            estimated_price_max: item.estimated_price_max,
            product_match: item.product_match,
            tier: item.tier,
            rationale: item.rationale,
            created_at: item.created_at,
            suggestion_id: item.suggestion_id ?? null,
          });

          return saved.savedGifts.map((item) => mapItem(item));
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

  const handleRemoveSavedIdea = async (idea: SavedIdeaAggregated) => {
    if (!userId) return;
    setSavedError("");
    setIsRemovingSaved(idea.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const params = new URLSearchParams();
      params.set("id", idea.id);
      if (idea.suggestion_id) {
        params.set("suggestionId", idea.suggestion_id);
      }
      params.set("title", idea.title);

      const res = await fetch(
        `/api/recipients/${idea.recipient_id}/saved-gifts?${params.toString()}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Failed to remove saved idea");
      }
      setSavedIdeas((prev) => prev.filter((item) => item.id !== idea.id));
      setSavedIdeaToDelete(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to remove saved idea.";
      setSavedError(message);
    } finally {
      setIsRemovingSaved(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gp-app-gold-strong">
            Gift log &amp; saved ideas
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-gp-app-evergreen sm:text-4xl lg:text-[2.75rem]">
            Your gifting history
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gp-app-muted sm:text-base">
            Track every gift you&apos;ve given and every idea you&apos;ve saved—so
            PerchPal can avoid repeats and surface better, more personalized
            suggestions.
          </p>
        </div>
        {activeTab === "history" ? (
          <button
            type="button"
            onClick={openCreateForm}
            className="gp-btn gp-btn--primary gp-btn--md shrink-0 self-start px-5"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add gift
          </button>
        ) : null}
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex rounded-full border border-gp-app-evergreen/8 bg-white p-1 shadow-sm"
          role="tablist"
          aria-label="History views"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "history"}
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === "history"
                ? "bg-[#fff1c7] text-gp-app-evergreen shadow-sm"
                : "text-gp-app-muted hover:text-gp-app-evergreen"
            }`}
          >
            <Gift aria-hidden="true" className="h-4 w-4" />
            Gift history
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "saved"}
            onClick={() => setActiveTab("saved")}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === "saved"
                ? "bg-[#fff1c7] text-gp-app-evergreen shadow-sm"
                : "text-gp-app-muted hover:text-gp-app-evergreen"
            }`}
          >
            <Bookmark aria-hidden="true" className="h-4 w-4" />
            Saved ideas
          </button>
        </div>
      </div>

      {activeTab === "history" ? (
        <div className="rounded-2xl border border-gp-app-evergreen/8 bg-white/95 p-3 shadow-[0_7px_22px_rgba(15,61,62,0.04)]">
          <div className="grid gap-3 lg:grid-cols-[minmax(14rem,0.85fr)_minmax(18rem,1.5fr)_minmax(13rem,0.65fr)]">
            <label className="relative block min-w-0">
              <span className="sr-only">Recipient</span>
              <Users
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gp-app-evergreen/70"
              />
              <select
                value={recipientFilter}
                onChange={(event) => setRecipientFilter(event.target.value)}
                className="gp-input h-12 w-full cursor-pointer bg-white pl-10"
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

            <label className="relative block min-w-0">
              <span className="sr-only">Search gift history</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gp-app-evergreen/70"
              />
              <input
                type="text"
                placeholder="Search by gift title or notes..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="gp-input h-12 w-full bg-white pl-10"
              />
            </label>

            <label className="relative block min-w-0">
              <span className="sr-only">Sort gift history</span>
              <ListFilter
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gp-app-evergreen/70"
              />
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as GiftHistorySort)}
                className="gp-input h-12 w-full cursor-pointer bg-white pl-10"
              >
                <option value="recent">Recently added</option>
                <option value="oldest">Oldest first</option>
                <option value="price-high">Price: high to low</option>
                <option value="price-low">Price: low to high</option>
              </select>
            </label>
          </div>
        </div>
      ) : null}

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
          <div className="rounded-2xl border border-gp-app-evergreen/8 bg-white/95 p-3 shadow-[0_7px_22px_rgba(15,61,62,0.04)]">
            <div className="grid gap-3 lg:grid-cols-[minmax(14rem,0.85fr)_minmax(18rem,1.5fr)_minmax(13rem,0.65fr)]">
              <label className="relative block min-w-0">
                <span className="sr-only">Recipient</span>
                <Users
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gp-app-evergreen/70"
                />
                <select
                  value={savedRecipientFilter}
                  onChange={(event) =>
                    setSavedRecipientFilter(event.target.value)
                  }
                  className="gp-input h-12 w-full cursor-pointer bg-white pl-10"
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
              </label>

              <label className="relative block min-w-0">
                <span className="sr-only">Search saved ideas</span>
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gp-app-evergreen/70"
                />
                <input
                  type="search"
                  placeholder="Search by gift title..."
                  value={savedSearch}
                  onChange={(event) => setSavedSearch(event.target.value)}
                  className="gp-input h-12 w-full bg-white pl-10"
                />
              </label>

              <label className="relative block min-w-0">
                <span className="sr-only">Sort saved ideas</span>
                <ListFilter
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gp-app-evergreen/70"
                />
                <select
                  value={savedSort}
                  onChange={(event) =>
                    setSavedSort(event.target.value as SavedIdeaSort)
                  }
                  className="gp-input h-12 w-full cursor-pointer bg-white pl-10"
                >
                  <option value="recent">Recently saved</option>
                  <option value="oldest">Oldest saved</option>
                  <option value="price-high">Price: high to low</option>
                  <option value="price-low">Price: low to high</option>
                </select>
              </label>
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
                  ? "Save suggestions with the heart on the Gift Ideas page. They’ll show up here so you can log them once you’ve gifted them."
                  : "Choose another recipient or clear the filter to see your saved ideas."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSavedIdeas.map((idea) => (
                <SavedIdeaItem
                  key={idea.id}
                  idea={idea}
                  onLog={() => handleLogSavedIdea(idea)}
                  onRemove={() => setSavedIdeaToDelete(idea)}
                  isRemoving={isRemovingSaved === idea.id}
                  recipientMap={recipientMap}
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

      {savedIdeaToDelete ? (
        <div className="fixed inset-0 z-[205] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-gp-cream p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gp-evergreen/60">
                  Remove saved idea
                </p>
                <h2 className="text-xl font-semibold text-gp-evergreen">
                  Remove “{savedIdeaToDelete.title}”?
                </h2>
                <p className="mt-1 text-sm text-gp-evergreen/70">
                  This will remove the idea from your saved list. You can still regenerate ideas with PerchPal later.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSavedIdeaToDelete(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-semibold text-gp-evergreen/70 shadow-sm transition hover:scale-105 hover:text-gp-evergreen cursor-pointer"
                aria-label="Close remove confirmation"
              >
                ×
              </button>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="gp-secondary-button cursor-pointer"
                onClick={() => setSavedIdeaToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  savedIdeaToDelete ? handleRemoveSavedIdea(savedIdeaToDelete) : null
                }
                disabled={isRemovingSaved === savedIdeaToDelete.id}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRemovingSaved === savedIdeaToDelete.id ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
