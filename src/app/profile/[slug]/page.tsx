import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { ImportSelfProfileButton } from "@/components/self-profile/ImportSelfProfileButton";

type SelfProfilePublic = {
  name: string;
  relationship: string | null;
  notes: string | null;
  annual_budget: number | null;
  gift_budget_min: number | null;
  gift_budget_max: number | null;
  gender: "male" | "female" | "other" | null;
  pet_type: string | null;
};

type PageParams = {
  slug: string;
};

async function fetchSelfProfile(slug: string) {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("recipient_profiles")
    .select(
      "name, relationship, notes, annual_budget, gift_budget_min, gift_budget_max, gender, pet_type",
    )
    .eq("self_slug", slug)
    .eq("is_self", true)
    .maybeSingle();

  if (!data) return null;
  return data as SelfProfilePublic;
}

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const profile = await fetchSelfProfile(params.slug);
  if (!profile) return {};
  return {
    title: `${profile.name} · GiftPerch profile`,
    description:
      profile.notes ??
      "GiftPerch profile shared from a friend. Import them into your recipients list.",
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: PageParams;
}) {
  const profile = await fetchSelfProfile(params.slug);
  if (!profile) {
    notFound();
  }

  const budgetDetails = [];
  if (profile.gift_budget_min || profile.gift_budget_max) {
    const min = profile.gift_budget_min
      ? `$${Math.round(profile.gift_budget_min)}`
      : null;
    const max = profile.gift_budget_max
      ? `$${Math.round(profile.gift_budget_max)}`
      : null;
    budgetDetails.push(
      min && max ? `${min}–${max} per gift` : min ? `From ${min}` : `Up to ${max}`,
    );
  }
  if (profile.annual_budget) {
    budgetDetails.push(`~$${Math.round(profile.annual_budget)} / year`);
  }

  return (
    <div className="min-h-screen bg-gp-cream/60 px-4 py-10 text-gp-evergreen">
      <div className="mx-auto max-w-2xl space-y-6 rounded-3xl border border-gp-evergreen/20 bg-white/95 p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <Link
            href="/landing"
            className="text-xs font-semibold uppercase tracking-[0.3em] text-gp-evergreen/60"
          >
            GiftPerch
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-gp-evergreen underline-offset-4 hover:underline"
          >
            What’s this?
          </Link>
        </div>

        <header className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-gp-evergreen/60">
            Shared profile
          </p>
          <h1 className="text-3xl font-semibold text-gp-evergreen">
            {profile.name}
          </h1>
          <p className="text-sm text-gp-evergreen/70">
            {profile.relationship ?? "This is me"}
          </p>
          {budgetDetails.length ? (
            <p className="text-sm text-gp-evergreen/70">
              {budgetDetails.join(" • ")}
            </p>
          ) : null}
        </header>

        {profile.notes ? (
          <div className="space-y-2 rounded-2xl border border-gp-evergreen/15 bg-gp-cream/70 p-4 text-sm text-gp-evergreen">
            <p className="text-xs font-semibold uppercase tracking-wide text-gp-evergreen/60">
              What to know
            </p>
            <p className="whitespace-pre-line">{profile.notes}</p>
          </div>
        ) : null}

        <ImportSelfProfileButton profile={profile} shareSlug={params.slug} />

        <p className="text-xs text-gp-evergreen/60">
          Powered by GiftPerch. Friends create a “This is me” profile and share the
          link so you can remember their likes and budgets without endless texts.
        </p>
      </div>
    </div>
  );
}

