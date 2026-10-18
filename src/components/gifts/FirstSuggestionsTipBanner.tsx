"use client";

import { useLocalFlag } from "@/hooks/useLocalFlag";

type FirstSuggestionsTipBannerProps = {
  hasSuggestionsThisSession: boolean;
};

export function FirstSuggestionsTipBanner({
  hasSuggestionsThisSession,
}: FirstSuggestionsTipBannerProps) {
  const [dismissed, setDismissed] = useLocalFlag("gp_onboarding_tip_dismissed");
  const visible = hasSuggestionsThisSession && !dismissed;
  if (!visible) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gp-gold/20 bg-[#fffaf0] px-3 py-2 text-gp-evergreen/75">
        <p className="text-xs font-medium">
          Tip: Use the heart to keep promising ideas in your saved collection.
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-full px-2 py-1 text-xs font-semibold text-gp-evergreen transition hover:bg-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-gold/60"
        >
          Got it
        </button>
    </div>
  );
}
