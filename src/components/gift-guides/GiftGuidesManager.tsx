"use client";

import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";

type GiftGuide = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  tags: string[] | null;
  updated_at: string;
};

const statusLabels: Record<string, string> = {
  draft: "Drafting",
  review: "In review",
  published: "Published",
};

const statusOrder = ["draft", "review", "published"] as const;

const exampleGuides = [
  {
    title: "Cozy homebody gifts",
    description:
      "Weighted throws, slow-coffee rituals, and analog hobbies you can duplicate and personalize.",
  },
  {
    title: "Gifts for busy professionals",
    description:
      "Rejuvenating experiences, smart travel staples, and restorative tech for hectic calendars.",
  },
  {
    title: "Adventurous host essentials",
    description:
      "Design-forward serveware, mixology kits, and memory keepers for the friend who loves gathering people.",
  },
] as const;

export function GiftGuidesManager() {
  const { status, user } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [guides, setGuides] = useState<GiftGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTags, setFormTags] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !user?.id) return;
    let isMounted = true;
    const loadGuides = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("gift_guides")
        .select("id, title, description, status, tags, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        setError(error.message);
        setGuides([]);
      } else {
        setGuides((data ?? []) as GiftGuide[]);
      }
      setLoading(false);
    };

    loadGuides();
    return () => {
      isMounted = false;
    };
  }, [status, supabase, user?.id]);

  const handleCreateGuide = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.id || !formTitle.trim()) return;
    setSaving(true);
    setError("");

    const tags =
      formTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean) ?? [];

    const { error } = await supabase.from("gift_guides").insert({
      user_id: user.id,
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      tags: tags.length ? tags : null,
    });

    if (error) {
      setError(error.message);
    } else {
      setFormTitle("");
      setFormDescription("");
      setFormTags("");
      const { data } = await supabase
        .from("gift_guides")
        .select("id, title, description, status, tags, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      setGuides((data ?? []) as GiftGuide[]);
    }

    setSaving(false);
  };

  const advanceStatus = async (guide: GiftGuide) => {
    if (!user?.id) return;
    const currentIndex = statusOrder.findIndex((value) => value === guide.status);
    const nextStatus =
      statusOrder[(currentIndex + 1) % statusOrder.length] ?? "draft";
    const { error } = await supabase
      .from("gift_guides")
      .update({ status: nextStatus })
      .eq("id", guide.id)
      .eq("user_id", user.id);

    if (error) {
      setError(error.message);
      return;
    }

    setGuides((prev) =>
      prev.map((existing) =>
        existing.id === guide.id ? { ...existing, status: nextStatus } : existing
      )
    );
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="gp-card-soft text-sm text-gp-evergreen/80">
          <p className="font-semibold">Curate, duplicate, and share</p>
          <p className="mt-1 text-base text-gp-evergreen/80">
            Gift Guides bundle themed ideas you can duplicate, tweak, and send to
            the people you shop for seasonal collections, team gifts, wedding
            parties, and more.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {exampleGuides.map((guide) => (
            <article key={guide.title} className="gp-card-soft flex flex-col gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gp-evergreen/60">
                  Example guide
                </p>
                <h3 className="text-lg font-semibold text-gp-evergreen">
                  {guide.title}
                </h3>
              </div>
              <p className="text-sm text-gp-evergreen/80">{guide.description}</p>
              <button className="gp-secondary-button text-sm" disabled>
                View guide (coming soon)
              </button>
            </article>
          ))}
        </div>
      </section>

      <form className="gp-card space-y-4" onSubmit={handleCreateGuide}>
        <header>
          <div className="gp-pill">New guide</div>
          <p className="mt-2 text-sm text-gp-evergreen/70">
            Create a workspace for a recipient, pillar page, or seasonal roundup.
          </p>
        </header>
        <label className="flex flex-col gap-2 text-sm font-semibold text-gp-evergreen">
          Guide title
          <input
            className="gp-input"
            value={formTitle}
            onChange={(event) => setFormTitle(event.target.value)}
            placeholder="Cozy creatives"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-gp-evergreen">
          Description
          <textarea
            className="gp-input min-h-[90px] resize-none"
            value={formDescription}
            onChange={(event) => setFormDescription(event.target.value)}
            placeholder="Gift ideas for the people who always have paint on their hands and a zine in progress."
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-gp-evergreen">
          Tags (comma separated)
          <input
            className="gp-input"
            value={formTags}
            onChange={(event) => setFormTags(event.target.value)}
            placeholder="home, cozy, creative"
          />
        </label>
        <button type="submit" className="gp-primary-button w-full" disabled={saving}>
          {saving ? "Creating..." : "Create guide"}
        </button>
        {error ? (
          <p className="rounded-2xl bg-red-50 px-4 py-2 text-xs text-red-700">
            {error}
          </p>
        ) : null}
      </form>

      <section className="grid gap-5 md:grid-cols-2">
        {loading ? (
          <p className="text-sm text-gp-evergreen/70">Loading guides...</p>
        ) : guides.length === 0 ? (
          <div className="gp-card-soft text-sm text-gp-evergreen/70">
            No guides yet. Create one above to start planning.
          </div>
        ) : (
          guides.map((guide) => (
            <article key={guide.id} className="gp-card flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gp-evergreen/60">
                    {statusLabels[guide.status] ?? guide.status}
                  </p>
                  <h2 className="text-lg font-semibold text-gp-evergreen">
                    {guide.title}
                  </h2>
                </div>
                <span className="gp-pill">Guide</span>
              </div>
              {guide.description ? (
                <p className="text-sm text-gp-evergreen/80">{guide.description}</p>
              ) : null}
              {guide.tags?.length ? (
                <div className="flex flex-wrap gap-2">
                  {guide.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-gp-evergreen/20 bg-gp-cream/70 px-3 py-1 text-xs font-semibold text-gp-evergreen"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="flex flex-col gap-2 sm:flex-row">
                <button className="gp-primary-button flex-1">Open guide</button>
                <button
                  type="button"
                  className="gp-secondary-button flex-1"
                  onClick={() => advanceStatus(guide)}
                >
                  Advance status
                </button>
              </div>
              <p className="text-right text-[11px] uppercase tracking-wide text-gp-evergreen/50">
                Updated{" "}
                {new Date(guide.updated_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </article>
          ))
        )}
      </section>
    </div>
  );
}




