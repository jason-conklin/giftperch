"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLocalFlag } from "@/hooks/useLocalFlag";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

type WelcomeOnboardingModalProps = {
  /** Route for creating the first recipient. Defaults to /recipients. */
  createRecipientHref?: string;
};

export function WelcomeOnboardingModal({
  createRecipientHref = "/recipients",
}: WelcomeOnboardingModalProps) {
  const { user, status } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const [hasRecipients, setHasRecipients] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useLocalFlag("gp_onboarding_welcome_dismissed");
  const isAuthed = status === "authenticated" && !!user?.id;

  useEffect(() => {
    if (!isAuthed || dismissed) return;
    let active = true;

    const loadCount = async () => {
      const { count, error } = await supabase
        .from("recipient_profiles")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id);
      if (error) {
        // fail safe: hide modal on error to avoid blocking the dashboard
        if (active) setHasRecipients(true);
        return;
      }
      if (active) setHasRecipients((count ?? 0) > 0);
    };

    void loadCount();
    return () => {
      active = false;
    };
  }, [dismissed, isAuthed, supabase, user]);

  const shouldShow = isAuthed && !dismissed && hasRecipients === false;
  if (!shouldShow) return null;

  const handleClose = () => setDismissed(true);
  const handlePrimary = () => {
    setDismissed(true);
    router.push(createRecipientHref);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-gp-gold/30 bg-gp-cream/95 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-gp-evergreen/60">
              Welcome
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-gp-evergreen">
              Welcome to GiftPerch 👋
            </h2>
            <div className="mt-1 h-0.5 w-16 rounded-full bg-gp-gold/70" />
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-gp-evergreen/10 bg-white/80 px-2 py-1 text-sm font-semibold text-gp-evergreen transition hover:bg-gp-cream cursor-pointer"
            aria-label="Close welcome dialog"
          >
            ×
          </button>
        </div>

        <p className="mt-4 text-sm text-gp-evergreen/80">
          Let&apos;s set up your first recipient so we can start curating thoughtful gift ideas for
          them.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={handlePrimary}
            className="w-full rounded-xl bg-gp-evergreen px-4 py-3 text-sm font-semibold text-gp-cream shadow-sm transition hover:bg-gp-evergreen/90 cursor-pointer"
          >
            Create my first recipient →
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="text-sm font-semibold text-gp-evergreen underline-offset-4 hover:underline cursor-pointer"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
