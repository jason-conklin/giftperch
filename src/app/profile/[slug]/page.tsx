import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ImportSelfProfileButton } from "@/components/self-profile/ImportSelfProfileButton";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  splitSharedProfilePreferences,
  type SharedSelfProfile,
} from "@/lib/selfProfileSharing";
import { getRecipientAvatarVisual } from "@/lib/recipientAvatar";

type PageParams = { slug: string };

async function fetchSelfProfile(slug: string): Promise<SharedSelfProfile | null> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("recipient_profiles")
    .select("id, name, notes, birthday, avatar_url, avatar_icon")
    .eq("self_slug", slug)
    .eq("is_self", true)
    .maybeSingle();
  if (!data) return null;

  const { data: interests } = await supabase
    .from("recipient_interests")
    .select("label, category")
    .eq("recipient_id", data.id);

  return {
    name: data.name,
    notes: data.notes,
    birthday: data.birthday,
    avatar_url: data.avatar_url,
    avatar_icon: data.avatar_icon,
    interests: interests ?? [],
  };
}

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const profile = await fetchSelfProfile(params.slug);
  if (!profile) return {};
  return {
    title: `${profile.name} · GiftPerch profile`,
    description: profile.notes ?? "GiftPerch profile shared from a friend. Import them into your recipients list.",
  };
}

export default async function PublicProfilePage({ params }: { params: PageParams }) {
  const profile = await fetchSelfProfile(params.slug);
  if (!profile) notFound();
  const { interests, avoidances } = splitSharedProfilePreferences(profile.interests);
  const avatar = getRecipientAvatarVisual({
    name: profile.name,
    avatar_url: profile.avatar_url,
    avatar_icon: profile.avatar_icon,
  });

  return (
    <div className="min-h-screen bg-gp-cream/60 px-4 py-10 text-gp-evergreen">
      <div className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-gp-evergreen/20 bg-white/95 p-6 shadow-lg sm:p-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xs font-semibold uppercase tracking-[0.3em] text-gp-evergreen/60">GiftPerch</Link>
          <Link href="/" className="text-xs font-semibold text-gp-evergreen underline-offset-4 hover:underline">What’s this?</Link>
        </div>

        <header className="flex min-w-0 items-center gap-4 border-b border-gp-evergreen/10 pb-5">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white bg-gp-cream text-xl font-semibold text-gp-evergreen shadow-sm">
            {avatar.kind === "initials" ? avatar.text : <Image src={avatar.src} alt={avatar.alt} width={64} height={64} className={avatar.kind === "image" ? "h-full w-full object-cover" : "h-full w-full object-contain p-1"} unoptimized />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gp-evergreen/60">Shared recipient profile</p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-gp-evergreen break-words">{profile.name}</h1>
            <p className="mt-1 text-sm text-gp-evergreen/70">Import their preferences, then choose your own relationship and budget.</p>
          </div>
        </header>

        {interests.length || profile.notes || avoidances.length || profile.birthday ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-xl border border-gp-evergreen/15 bg-gp-cream/50 p-4">
              <h2 className="font-display text-lg font-semibold">Interests &amp; hobbies</h2>
              {interests.length ? <div className="mt-3 flex flex-wrap gap-2">{interests.map((interest) => <span key={interest} className="rounded-lg border border-[#d29d28] bg-[#f4d47d] px-3 py-1.5 text-sm font-semibold">{interest}</span>)}</div> : <p className="mt-2 text-sm text-gp-evergreen/65">No interests shared yet.</p>}
            </section>
            {profile.birthday ? <section className="rounded-xl border border-gp-evergreen/15 bg-gp-cream/50 p-4"><h2 className="font-display text-lg font-semibold">Birthday</h2><p className="mt-2 text-sm text-gp-evergreen/75">{new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${profile.birthday}T00:00:00Z`))}</p></section> : null}
            {profile.notes ? <section className="rounded-xl border border-gp-evergreen/15 bg-gp-cream/50 p-4 sm:col-span-2"><h2 className="font-display text-lg font-semibold">Additional details</h2><p className="mt-2 whitespace-pre-line text-sm leading-6 text-gp-evergreen/80">{profile.notes}</p></section> : null}
            {avoidances.length ? <section className="rounded-xl border border-gp-evergreen/15 bg-[#fff9f5] p-4 sm:col-span-2"><h2 className="font-display text-lg font-semibold">Things to avoid</h2><div className="mt-3 flex flex-wrap gap-2">{avoidances.map((avoidance) => <span key={avoidance} className="rounded-lg bg-[#f6e8e3] px-3 py-1.5 text-sm font-semibold text-[#8b342d]">{avoidance}</span>)}</div></section> : null}
          </div>
        ) : null}

        <ImportSelfProfileButton profile={profile} shareSlug={params.slug} />
        <p className="text-xs text-gp-evergreen/60">Shared profiles include only the preferences the profile owner chose to share.</p>
      </div>
    </div>
  );
}
