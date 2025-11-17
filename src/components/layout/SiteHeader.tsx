'use client';

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";

type SiteHeaderProps = {
  variant?: "marketing" | "dashboard";
};

const dashboardLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/recipients", label: "Recipients" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/gifts", label: "Gift Ideas" },
  { href: "/history", label: "History" },
];

export function SiteHeader({ variant = "marketing" }: SiteHeaderProps) {
  const isMarketing = variant === "marketing";
  const { user, status } = useSupabaseSession();
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [signingOut, setSigningOut] = useState(false);

  const baseClasses =
    "flex flex-col gap-4 rounded-3xl border px-5 py-4 shadow-sm transition";
  const paletteClasses = isMarketing
    ? "border-gp-gold/40 bg-white/85"
    : "border-gp-evergreen/15 bg-white/90";

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <header className={`${baseClasses} ${paletteClasses}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/giftperch_logo_only.png"
            alt="GiftPerch logo"
            width={48}
            height={48}
            priority
            className="h-12 w-12"
          />
          <div>
            <p className="text-lg font-semibold text-gp-evergreen">
              GiftPerch
            </p>
            <p className="text-xs uppercase tracking-wide text-gp-evergreen/70">
              {isMarketing
                ? "Thoughtful gifting, reimagined with AI"
                : "PerchPal HQ"}
            </p>
          </div>
        </Link>
      </div>

      {isMarketing ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href="/features"
              className="text-gp-evergreen/80 transition hover:text-gp-evergreen"
            >
              Features
            </Link>
            <Link
              href="/about"
              className="text-gp-evergreen/80 transition hover:text-gp-evergreen"
            >
              About
            </Link>
            <Link
              href="/blog"
              className="text-gp-evergreen/80 transition hover:text-gp-evergreen"
            >
              Blog
            </Link>
          </nav>
          <div className="flex flex-wrap items-center justify-end gap-3 text-sm font-semibold">
            <Link
              href="/auth/login"
              className="rounded-full border border-gp-evergreen/40 px-4 py-2 text-gp-evergreen transition hover:border-gp-evergreen hover:bg-gp-evergreen hover:text-gp-cream"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-full bg-gp-gold px-5 py-2 text-gp-evergreen transition hover:bg-[#bda775]"
            >
              Get Started
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-wrap items-center justify-end gap-3 text-sm font-medium text-gp-evergreen">
          <nav className="flex flex-wrap items-center gap-2">
            {dashboardLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-1 transition hover:bg-gp-cream/80"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-gp-gold/60 bg-gp-gold/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gp-evergreen"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gp-evergreen text-gp-cream">
                PP
              </span>
              <span>PerchPal</span>
            </button>
            <div className="flex flex-col text-right text-xs text-gp-evergreen/80">
              <span className="font-semibold text-gp-evergreen">
                {user?.email ?? "Guest"}
              </span>
              <span className="text-[11px] uppercase tracking-wide">
                {status === "authenticated" ? "Signed in" : "Guest"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full border border-gp-evergreen/30 px-3 py-1 text-xs font-semibold text-gp-evergreen transition hover:bg-gp-evergreen hover:text-gp-cream disabled:opacity-60"
              disabled={signingOut}
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
