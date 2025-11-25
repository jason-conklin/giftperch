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
    <div className="rounded-2xl border border-gp-gold/20 bg-gp-cream/90 px-4 py-3 text-sm text-gp-evergreen/80 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-gp-evergreen">
          Tip: Use Like, Dislike, and Save so PerchPal can learn your preferences.
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-full border border-gp-evergreen/20 bg-white px-3 py-1 text-xs font-semibold text-gp-evergreen transition hover:bg-gp-cream cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
