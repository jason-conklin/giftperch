"use client";

import { useLocalFlag } from "@/hooks/useLocalFlag";
import { Sparkles } from "lucide-react";

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
    <div className="flex flex-col gap-3 rounded-xl border border-gp-gold/25 bg-[#fffaf0] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gp-gold/20 text-gp-evergreen">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-gp-evergreen">
            Ready for your first personalized list?
          </p>
          <p className="text-xs text-gp-evergreen/65">
            Choose a recipient and occasion below to get started.
          </p>
        </div>
      </div>
      <button
        type="button"
        className="gp-btn gp-btn--secondary gp-btn--sm shrink-0"
        onClick={onScrollToForm}
      >
        Start here
      </button>
    </div>
  );
}
