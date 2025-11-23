import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { Database } from "@/lib/database.types";

type SavedGiftIdea =
  Database["public"]["Tables"]["recipient_saved_gift_ideas"]["Row"];

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
  | { status: "success"; data: SavedGiftIdea[] };

export function SavedGiftIdeasModal({
  recipientId,
  recipientName,
  isOpen,
  onClose,
  authToken,
}: Props) {
  const [state, setState] = useState<FetchState>({ status: "idle" });
  const [removingId, setRemovingId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const headers = useMemo(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) h.Authorization = `Bearer ${authToken}`;
    return h;
  }, [authToken]);

  const fetchGifts = async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch(
        `/api/recipients/${recipientId}/saved-gifts`,
        { headers },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load saved gifts");
      }
      const data = (await res.json()) as { savedGifts: SavedGiftIdea[] };
      setState({ status: "success", data: data.savedGifts || [] });
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
      if (state.status === "success") {
        setState({
          status: "success",
          data: state.data.filter((gift) => gift.id !== id),
        });
      }
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
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gp-cream/50 text-gp-cream transition hover:bg-white/15"
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

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {state.status === "loading" && (
            <p className="text-sm text-gp-evergreen/70">Loading saved gifts…</p>
          )}
          {state.status === "error" && (
            <p className="text-sm text-red-700">{state.message}</p>
          )}
          {state.status === "success" && state.data.length === 0 && (
            <p className="text-sm text-gp-evergreen/70">
              No saved gift ideas yet. Save ideas from AI suggestions to see them
              here.
            </p>
          )}
          {state.status === "success" && state.data.length > 0 && (
            <div className="space-y-3">
              {state.data.map((gift) => (
                <div
                  key={gift.id}
                  className="flex flex-col gap-3 rounded-2xl border border-gp-evergreen/10 bg-white/90 p-4 shadow-sm sm:flex-row sm:items-start"
                >
                  {gift.image_url ? (
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gp-evergreen/10 bg-gp-cream">
                      <Image
                        src={gift.image_url}
                        alt={gift.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                  ) : null}

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
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-semibold text-gp-evergreen/70">
                      {gift.estimated_price_min !== null ||
                      gift.estimated_price_max !== null ? (
                        <span>
                          {formatPriceRange(
                            gift.estimated_price_min,
                            gift.estimated_price_max,
                          )}
                        </span>
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
                    <button
                      type="button"
                      onClick={() => handleRemove(gift.id)}
                      disabled={removingId === gift.id}
                      className="text-xs font-semibold text-red-600 underline-offset-4 hover:underline disabled:opacity-60"
                    >
                      {removingId === gift.id ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
