"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

type PublicProfile = {
  name: string;
  relationship: string | null;
  notes: string | null;
  annual_budget: number | null;
  gift_budget_min: number | null;
  gift_budget_max: number | null;
  gender: "male" | "female" | "other" | null;
  pet_type: string | null;
};

type Props = {
  profile: PublicProfile;
  shareSlug: string;
};

export function ImportSelfProfileButton({ profile, shareSlug }: Props) {
  const { user, status } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleImport = async () => {
    if (!user?.id) {
      setFeedback("Sign in to import this profile.");
      return;
    }
    setSaving(true);
    setFeedback("");
    try {
      const { error } = await supabase.from("recipient_profiles").insert({
        user_id: user.id,
        name: profile.name,
        relationship: profile.relationship ?? "Friend",
        notes: profile.notes,
        annual_budget: profile.annual_budget,
        gift_budget_min: profile.gift_budget_min,
        gift_budget_max: profile.gift_budget_max,
        gender: profile.gender,
        pet_type: profile.pet_type,
        is_self: false,
      });
      if (error) throw error;
      setFeedback("Added! You can now customize them inside Recipients.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to add this profile right now.";
      setFeedback(message);
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading") {
    return (
      <p className="text-sm text-gp-evergreen/70">
        Checking your account status...
      </p>
    );
  }

  if (!user) {
    return (
      <div className="space-y-2">
        <Link
          href={`/auth/sign-in?redirect=/profile/${shareSlug}`}
          className="gp-primary-button inline-flex w-full items-center justify-center"
        >
          Sign in to add this profile
        </Link>
        <p className="text-xs text-gp-evergreen/70">
          You need a GiftPerch account to save this info.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="gp-primary-button w-full"
        onClick={handleImport}
        disabled={saving}
      >
        {saving ? "Adding…" : "Add to my recipients"}
      </button>
      {feedback ? (
        <p className="rounded-2xl bg-gp-cream/70 px-4 py-2 text-sm text-gp-evergreen/80">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}

