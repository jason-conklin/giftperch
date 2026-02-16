"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { PerchPalChat } from "@/components/perchpal/PerchPalChat";

type PerchPalChatPanelProps = {
  userId?: string | null;
};

export function PerchPalChatPanel({ userId }: PerchPalChatPanelProps) {
  const storageKey = useMemo(
    () => `gp_gifts_chat_collapsed_${userId || "anon"}`,
    [userId],
  );
  const [desktopCollapsed, setDesktopCollapsed] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileOpenButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileWasOpenRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedValue = window.localStorage.getItem(storageKey);
      if (storedValue === "false") {
        setDesktopCollapsed(false);
      } else if (storedValue === "true") {
        setDesktopCollapsed(true);
      }
    } catch {
      // ignore storage failures and keep default
    } finally {
      setHydrated(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        storageKey,
        desktopCollapsed ? "true" : "false",
      );
    } catch {
      // ignore storage failures
    }
  }, [desktopCollapsed, hydrated, storageKey]);

  useEffect(() => {
    if (!mobileOpen || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen || typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      const input = document.getElementById(
        "perchpal-input-mobile",
      ) as HTMLTextAreaElement | null;
      input?.focus();
    }, 60);
    return () => window.clearTimeout(timer);
  }, [mobileOpen]);

  useEffect(() => {
    if (mobileOpen) {
      mobileWasOpenRef.current = true;
      return;
    }
    if (mobileWasOpenRef.current) {
      mobileOpenButtonRef.current?.focus();
      mobileWasOpenRef.current = false;
    }
  }, [mobileOpen]);

  return (
    <>
      <aside className="hidden lg:block">
        {desktopCollapsed ? (
          <div className="gp-card fixed right-6 top-8 z-40 flex h-56 w-20 flex-col items-center justify-between px-2 py-4">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gp-evergreen/15 bg-gp-cream/70 shadow-sm">
                <Image
                  src="/giftperch_perchpal_front.png"
                  alt="PerchPal"
                  width={36}
                  height={36}
                  className="h-9 w-9 object-contain"
                />
              </div>
              <span className="text-xs font-semibold tracking-wide text-gp-evergreen/75">
                Chat
              </span>
            </div>
            <button
              type="button"
              aria-label="Expand PerchPal chat panel"
              onClick={() => setDesktopCollapsed(false)}
              className="gp-secondary-button h-9 w-9 p-0 text-base cursor-pointer"
            >
              →
            </button>
          </div>
        ) : (
          <div className="fixed right-6 top-8 z-40 w-[24rem]">
            <div className="gp-card flex h-[calc(100vh-4rem)] min-h-[560px] max-h-[calc(100vh-4rem)] flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-gp-evergreen/10 bg-white/80 px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gp-evergreen/15 bg-gp-cream/70">
                    <Image
                      src="/giftperch_perchpal_front.png"
                      alt="PerchPal"
                      width={30}
                      height={30}
                      className="h-7 w-7 object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gp-evergreen">
                      PerchPal Chat
                    </p>
                    <p className="text-xs text-gp-evergreen/70">
                      Quick assistant
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDesktopCollapsed(true)}
                  className="gp-secondary-button px-3 py-1.5 text-xs cursor-pointer"
                >
                  Collapse
                </button>
              </div>

              <div className="min-h-0 flex-1">
                <PerchPalChat
                  showHeader={false}
                  allowExpand={false}
                  inputId="perchpal-input-desktop"
                  rootClassName="h-full min-h-0 gap-3 border-0 bg-transparent p-0 shadow-none"
                  messagesWrapperClassName="flex-1 min-h-0 overscroll-y-contain"
                />
              </div>
            </div>
          </div>
        )}
      </aside>

      <div className="lg:hidden">
        <button
          ref={mobileOpenButtonRef}
          type="button"
          onClick={() => setMobileOpen(true)}
          className="gp-primary-button fixed bottom-4 right-4 z-40 px-4 py-2.5 shadow-lg cursor-pointer"
          aria-haspopup="dialog"
          aria-expanded={mobileOpen}
          aria-controls="perchpal-mobile-sheet"
        >
          Chat with PerchPal
        </button>

        {mobileOpen ? (
          <div className="fixed inset-0 z-[90]">
            <button
              type="button"
              aria-label="Close chat"
              className="absolute inset-0 bg-black/45"
              onClick={() => setMobileOpen(false)}
            />
            <section
              id="perchpal-mobile-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="PerchPal chat"
              className="absolute inset-x-0 bottom-0 flex max-h-[90dvh] min-h-[68dvh] flex-col rounded-t-3xl border border-gp-evergreen/15 bg-gp-cream p-4 shadow-2xl"
            >
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-gp-evergreen/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gp-evergreen/15 bg-white/80">
                    <Image
                      src="/giftperch_perchpal_front.png"
                      alt="PerchPal"
                      width={26}
                      height={26}
                      className="h-6 w-6 object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gp-evergreen">
                      PerchPal Chat
                    </p>
                    <p className="text-xs text-gp-evergreen/70">
                      Ask for ideas anytime
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gp-evergreen/20 bg-white text-gp-evergreen transition hover:bg-gp-cream/80 cursor-pointer"
                  aria-label="Close chat"
                >
                  ×
                </button>
              </div>

              <div className="min-h-0 flex-1">
                <PerchPalChat
                  showHeader={false}
                  allowExpand={false}
                  inputId="perchpal-input-mobile"
                  rootClassName="h-full min-h-0 gap-3 border-0 bg-transparent p-0 shadow-none"
                  messagesWrapperClassName="flex-1 min-h-0 overscroll-y-contain"
                />
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </>
  );
}
