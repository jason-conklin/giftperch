import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { Database } from "@/lib/database.types";

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

type Props = {
  recipientId: string;
  recipientName: string;
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
  isOpen,
  onClose,
  authToken,
}: Props) {
  const [state, setState] = useState<FetchState>({ status: "idle" });
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removingFeedbackId, setRemovingFeedbackId] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<"saved" | "liked" | "disliked">(
    "saved",
  );
  const dialogRef = useRef<HTMLDivElement>(null);

  const headers = useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) h.Authorization = `Bearer ${authToken}`;
    return h;
  }, [authToken]);

  const fetchGifts = async () => {
    setState({ status: "loading" });
    try {
      const [savedRes, feedbackRes] = await Promise.all([
        fetch(`/api/recipients/${recipientId}/saved-gifts`, { headers }),
        fetch(`/api/recipients/${recipientId}/feedback/summary`, { headers }),
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
      fetchGifts();
    } else {
      setState({ status: "idle" });
      setActiveTab("saved");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, recipientId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      const res = await fetch(
        `/api/recipients/${recipientId}/saved-gifts?id=${encodeURIComponent(
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
    setRemovingFeedbackId(id);
    try {
      const res = await fetch(
        `/api/recipients/${recipientId}/feedback?id=${encodeURIComponent(id)}`,
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
    const bySuggestion: Record<string, boolean> = {};
    const merged: CombinedGift[] = [];
    state.saved.forEach((gift) => {
      const key = gift.suggestion_id ?? gift.title;
      if (!bySuggestion[key]) {
        bySuggestion[key] = true;
        merged.push(gift);
      }
    });
    state.liked.forEach((gift) => {
      const key = gift.suggestion_id ?? gift.title;
      if (!bySuggestion[key]) {
        bySuggestion[key] = true;
        merged.push(gift);
      }
    });
    return {
      savedTab: merged,
      liked: state.liked,
      disliked: state.disliked,
    };
  }, [state]);

  const activeList =
    activeTab === "saved" ? savedTab : activeTab === "liked" ? liked : disliked;

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
            <h2 className="text-xl font-semibold text-gp-cream">
              Saved ideas for {recipientName}
            </h2>
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
          <div className="inline-flex w-full rounded-full bg-gp-cream/80 p-1 text-sm font-semibold text-gp-evergreen shadow-sm">
            {(["saved", "liked", "disliked"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 rounded-full px-3 py-2 transition ${
                  activeTab === tab
                    ? "bg-white shadow-sm"
                    : "hover:bg-gp-cream"
                }`}
              >
                {tab === "saved"
                  ? "Saved"
                  : tab === "liked"
                  ? "Liked"
                  : "Disliked"}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
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
                return (
                  <div
                    key={gift.id}
                    className="flex flex-col gap-3 rounded-2xl border border-gp-evergreen/10 bg-white/90 p-4 shadow-sm sm:flex-row sm:items-start"
                  >
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gp-evergreen/10 bg-gp-cream">
                      <Image
                        src={FALLBACK_IMAGE}
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
const FALLBACK_IMAGE = "/gift_placeholder_img.png";
