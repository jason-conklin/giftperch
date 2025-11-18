"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

type AppLayoutProps = {
  children: ReactNode;
};

type NavItem = {
  label: string;
  href: string;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Recipients", href: "/recipients" },
  { label: "Gift Ideas", href: "/gifts" },
  { label: "History", href: "/history" },
  { label: "Occasions", href: "/occasions" },
  { label: "Gift Guides", href: "/gift-guides" },
  { label: "Settings", href: "/settings" },
];

const initialsFromText = (value: string) =>
  value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const { user, status } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [profileSummary, setProfileSummary] = useState<{
    display_name: string | null;
    avatar_url: string | null;
  }>({ display_name: null, avatar_url: null });

  useEffect(() => {
    if (!user?.id) {
      setProfileSummary({ display_name: null, avatar_url: null });
      return;
    }
    let active = true;
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        if (data) {
          setProfileSummary({
            display_name: data.display_name,
            avatar_url: data.avatar_url,
          });
        } else {
          setProfileSummary({ display_name: null, avatar_url: null });
        }
      });
    return () => {
      active = false;
    };
  }, [supabase, user?.id]);

  const accountInitials = initialsFromText(
    profileSummary.display_name || user?.email || "GP"
  );

  const renderLink = (item: NavItem, variant: "desktop" | "mobile") => {
    const active =
      pathname === item.href || pathname.startsWith(`${item.href}/`);
    const baseClasses =
      "flex items-center rounded-full px-4 py-2 text-sm font-semibold transition";
    const desktopStates = active
      ? "bg-gp-cream text-gp-evergreen shadow-sm"
      : "text-gp-cream/80 hover:bg-white/10 hover:text-gp-cream";
    const mobileStates = active
      ? "bg-gp-evergreen text-gp-cream"
      : "text-gp-evergreen hover:bg-gp-cream/70";

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`${baseClasses} ${
          variant === "desktop" ? desktopStates : mobileStates
        }`}
        onClick={
          variant === "mobile" ? () => setMobileNavOpen(false) : undefined
        }
      >
        {item.label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gp-cream/80 text-gp-evergreen">
      <div className="flex min-h-screen">
        <aside className="hidden min-h-screen w-72 flex-col border-r border-gp-evergreen/15 bg-gradient-to-b from-gp-evergreen to-[#0b2d2d] text-gp-cream md:flex">
          <div className="flex items-center gap-4 border-b border-white/10 px-6 py-7">
            <Link
              href="/dashboard"
              aria-label="Go to dashboard"
              className="inline-flex"
            >
              <Image
                src="/giftperch_logo_background.png"
                alt="GiftPerch logo"
                width={56}
                height={56}
                className="h-14 w-14 rounded-full border border-white/20 object-cover transition hover:scale-[1.02]"
                priority
              />
            </Link>
            <div>
              <p className="text-base font-semibold leading-tight">GiftPerch</p>
              <p className="text-[13px] uppercase tracking-wide text-gp-cream/70">
                PerchPal HQ
              </p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6 text-sm">
            {navItems.map((item) => renderLink(item, "desktop"))}
          </nav>
          {status === "authenticated" ? (
            <div className="border-t border-white/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-gp-cream/80 text-sm font-semibold text-gp-evergreen">
                  {profileSummary.avatar_url ? (
                    <Image
                      src={profileSummary.avatar_url}
                      alt="Account avatar"
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    accountInitials
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {profileSummary.display_name || user?.email || "Signed in"}
                  </p>
                  <Link
                    href="/settings"
                    className="text-xs text-gp-cream/70 underline-offset-4 hover:underline"
                  >
                    Manage account
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
          <div className="border-t border-white/10 px-6 py-4 text-xs text-gp-cream/70">
            &copy; {currentYear} GiftPerch
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-gp-evergreen/10 bg-white/90 px-4 py-3 text-gp-evergreen shadow-sm md:hidden">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                aria-label="Go to dashboard"
                className="inline-flex"
              >
                <Image
                  src="/giftperch_logo_background.png"
                  alt="GiftPerch logo"
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full border border-gp-evergreen/20 object-cover transition hover:scale-[1.02]"
                  priority
                />
              </Link>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gp-evergreen/60">
                  PerchPal HQ
                </p>
                <p className="text-sm font-semibold">Your gifting workspace</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Toggle navigation"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((open) => !open)}
              className="gp-secondary-button px-3 py-1 text-xs font-semibold"
            >
              {mobileNavOpen ? "Close" : "Menu"}
            </button>
          </div>
          {mobileNavOpen ? (
            <nav className="space-y-1 border-b border-gp-evergreen/10 bg-white px-4 py-4 text-sm text-gp-evergreen md:hidden">
              {navItems.map((item) => renderLink(item, "mobile"))}
            </nav>
          ) : null}
          <main
            id="gp-main-content"
            role="main"
            className="flex flex-1 flex-col bg-gp-cream/40"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
