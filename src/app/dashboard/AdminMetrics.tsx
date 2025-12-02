"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

type Metrics = {
  users: number;
  recipientProfiles: number;
  giftSuggestions: number;
  wishlistItems: number;
};

const ADMIN_EMAILS = new Set(["giftperch@gmail.com"]);

export function AdminMetrics() {
  const { user, status } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (status !== "authenticated" || !user?.email) return;
      if (!ADMIN_EMAILS.has(user.email.toLowerCase())) return;

      try {
        setLoading(true);
        setError(null);

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        const res = await fetch("/api/admin/metrics", {
          credentials: "include",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "x-user-email": user.email.toLowerCase(),
          },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load metrics");
        }

        const json = (await res.json()) as Metrics;
        setMetrics(json);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load metrics";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [status, user?.email, supabase]);

  if (status !== "authenticated" || !user?.email) return null;
  if (!ADMIN_EMAILS.has(user.email.toLowerCase())) return null;

  return (
    <section className="gp-card-soft border border-gp-evergreen/15 bg-white/90 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gp-evergreen/60">
            Admin analytics
          </p>
          <h2 className="text-lg font-semibold text-gp-evergreen">GiftPerch metrics</h2>
        </div>
        <Image
          src="/giftperch_favicon.png"
          alt="GiftPerch"
          width={32}
          height={32}
          className="h-8 w-8 rounded-full border border-gp-evergreen/10 bg-gp-cream object-cover"
        />
      </div>

      {loading ? (
        <p className="text-sm text-gp-evergreen/70">Loading metrics...</p>
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : metrics ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat label="Registered users" value={metrics.users} />
          <Stat label="Recipient profiles" value={metrics.recipientProfiles} />
          <Stat label="Gift suggestions Runs" value={metrics.giftSuggestions} />
          <Stat label="Wishlist items" value={metrics.wishlistItems} />
        </div>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gp-evergreen/10 bg-gp-cream/80 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-gp-evergreen/60">{label}</p>
      <p className="text-2xl font-semibold text-gp-evergreen">{value}</p>
      <p className="text-[11px] text-gp-evergreen/60">Updated live from Supabase</p>
    </div>
  );
}
