"use client";

import { useLocalFlag } from "@/hooks/useLocalFlag";

type FirstGenerationGuideBannerProps = {
  hasRecipients: boolean;
  onScrollToForm?: () => void;
};

export function FirstGenerationGuideBanner({
  hasRecipients,
  onScrollToForm,
}: FirstGenerationGuideBannerProps) {
  const [dismissed] = useLocalFlag("gp_onboarding_first_generation_done");
  const visible = hasRecipients && !dismissed;
  if (!visible) return null;

  return (
    <div className="rounded-2xl border border-gp-gold/30 bg-gp-cream/90 px-4 py-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-1 h-8 w-8 shrink-0 rounded-full bg-gp-gold/20 text-gp-evergreen flex items-center justify-center text-lg">
          ✨
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold text-gp-evergreen">
            Great! Let&apos;s find some ideas.
          </p>
          <p className="text-sm text-gp-evergreen/80">
            Choose an occasion and budget, then ask PerchPal to generate personalized suggestions.
          </p>
          <button
            type="button"
            className="mt-2 inline-flex items-center justify-center rounded-full bg-gp-evergreen px-4 py-2 text-sm font-semibold text-gp-cream shadow-sm transition hover:bg-gp-evergreen/90 cursor-pointer"
            onClick={onScrollToForm}
          >
            Generate my first ideas →
          </button>
        </div>
      </div>
    </div>
  );
}
