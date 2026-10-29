"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { APP_GOLD_ACTION } from "@/components/ui/appActionStyles";
import {
  RECIPIENT_PET_TYPES,
  RECIPIENT_RELATIONSHIPS,
} from "@/components/recipients/recipientFormOptions";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { validateRecipientBudgets } from "@/lib/recipientRecommendationContext";
import {
  buildSharedProfileImportPayload,
  buildSharedProfilePreferenceInserts,
  excludeExistingSharedProfilePreferences,
  type SharedSelfProfile,
} from "@/lib/selfProfileSharing";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

type Props = { profile: SharedSelfProfile; shareSlug: string };

type ImportForm = {
  relationship: string;
  customRelationship: string;
  petType: string;
  annualBudget: string;
  giftBudgetMin: string;
  giftBudgetMax: string;
};

const EMPTY_FORM: ImportForm = {
  relationship: "",
  customRelationship: "",
  petType: "",
  annualBudget: "",
  giftBudgetMin: "",
  giftBudgetMax: "",
};

export function ImportSelfProfileButton({ profile, shareSlug }: Props) {
  const { user, status } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [form, setForm] = useState<ImportForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [importedRecipientId, setImportedRecipientId] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleImport = async () => {
    if (!user?.id) return setFeedback("Sign in to import this profile.");
    const relationship = form.relationship === "Other"
      ? form.customRelationship.trim()
      : form.relationship.trim();
    if (form.relationship === "Other" && !relationship) {
      return setFeedback("Enter the relationship before adding this recipient.");
    }
    if (form.relationship === "Pet" && !form.petType) {
      return setFeedback("Choose a pet type before adding this recipient.");
    }
    const budgets = validateRecipientBudgets({
      annual: form.annualBudget,
      minimum: form.giftBudgetMin,
      maximum: form.giftBudgetMax,
    });
    if (budgets.error) return setFeedback(budgets.error);

    setSaving(true);
    setFeedback("");
    try {
      let recipientId = importedRecipientId;
      if (!recipientId) {
        const { data, error } = await supabase
          .from("recipient_profiles")
          .insert({
            ...buildSharedProfileImportPayload(profile, {
              relationship: relationship || null,
              petType: form.relationship === "Pet" ? form.petType : null,
              annualBudget: budgets.annual,
              giftBudgetMin: budgets.minimum,
              giftBudgetMax: budgets.maximum,
            }),
            user_id: user.id,
          })
          .select("id")
          .single();
        if (error) throw error;
        recipientId = data.id;
        setImportedRecipientId(recipientId);
      }
      if (!recipientId) throw new Error("Unable to resolve the imported recipient.");

      const preferenceRows = buildSharedProfilePreferenceInserts(
        recipientId,
        profile.interests,
      );
      if (preferenceRows.length) {
        const { data: existingPreferences, error: existingError } = await supabase
          .from("recipient_interests")
          .select("label, category")
          .eq("recipient_id", recipientId);
        if (existingError) throw existingError;
        const missingRows = excludeExistingSharedProfilePreferences(
          preferenceRows,
          existingPreferences ?? [],
        );
        const { error } = missingRows.length
          ? await supabase.from("recipient_interests").insert(missingRows)
          : { error: null };
        if (error) {
          setFeedback("Profile added, but its preferences could not be saved. Try again to finish importing them.");
          return;
        }
      }
      setFeedback("Added! You can now customize them inside Recipients.");
      setCompleted(true);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Unable to add this profile right now.");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading") {
    return <p className="text-sm text-gp-evergreen/70">Checking your account status...</p>;
  }
  if (!user) {
    return (
      <div className="space-y-2">
        <Link href={`/auth/sign-in?redirect=/profile/${shareSlug}`} className={`${APP_GOLD_ACTION} w-full`}>
          Sign in to add this profile
        </Link>
        <p className="text-xs text-gp-evergreen/70">You need a GiftPerch account to save this info.</p>
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-gp-evergreen/15 bg-gp-cream/55 p-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-gp-evergreen">Add to your recipients</h2>
        <p className="mt-1 text-sm text-gp-evergreen/70">Choose your relationship and spending preferences. Their shared interests and details will come with the profile.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-gp-evergreen">Relationship
          <select className="gp-input" value={form.relationship} onChange={(event) => setForm((current) => ({ ...current, relationship: event.target.value, customRelationship: event.target.value === "Other" ? current.customRelationship : "", petType: event.target.value === "Pet" ? current.petType : "" }))}>
            <option value="">Not set</option>
            {RECIPIENT_RELATIONSHIPS.map((item) => <option key={item}>{item}</option>)}
            <option>Other</option>
          </select>
        </label>
        {form.relationship === "Other" ? <label className="flex flex-col gap-1.5 text-sm font-semibold text-gp-evergreen">Custom relationship<input className="gp-input" value={form.customRelationship} onChange={(event) => setForm((current) => ({ ...current, customRelationship: event.target.value }))} /></label> : null}
        {form.relationship === "Pet" ? <label className="flex flex-col gap-1.5 text-sm font-semibold text-gp-evergreen">Pet type<select className="gp-input" value={form.petType} onChange={(event) => setForm((current) => ({ ...current, petType: event.target.value }))}><option value="">Select pet type</option>{RECIPIENT_PET_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-gp-evergreen">Minimum per gift<input className="gp-input" type="number" min="0" value={form.giftBudgetMin} onChange={(event) => setForm((current) => ({ ...current, giftBudgetMin: event.target.value }))} /></label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-gp-evergreen">Maximum per gift<input className="gp-input" type="number" min="0" value={form.giftBudgetMax} onChange={(event) => setForm((current) => ({ ...current, giftBudgetMax: event.target.value }))} /></label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-gp-evergreen">Annual budget<input className="gp-input" type="number" min="0" value={form.annualBudget} onChange={(event) => setForm((current) => ({ ...current, annualBudget: event.target.value }))} /></label>
      </div>
      <button type="button" className={`${APP_GOLD_ACTION} w-full sm:w-auto`} onClick={() => void handleImport()} disabled={saving || completed}>
        {saving ? "Adding..." : completed ? "Added to your recipients" : importedRecipientId ? "Finish importing preferences" : "Add to my recipients"}
      </button>
      {feedback ? <p role="status" className="rounded-lg bg-white/80 px-3 py-2 text-sm text-gp-evergreen/80">{feedback}</p> : null}
    </section>
  );
}
