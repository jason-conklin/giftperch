"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
} from "react";
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
  const [desktopSidebarExpanded, setDesktopSidebarExpanded] = useState(false);
  const currentYear = new Date().getFullYear();
  const { user, status } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`profile-updates-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          setProfileSummary({
            display_name:
              (payload.new as { display_name: string | null })?.display_name ??
              null,
            avatar_url:
              (payload.new as { avatar_url: string | null })?.avatar_url ?? null,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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

  const handleSidebarBlur = (event: FocusEvent<HTMLElement>) => {
    const next = event.relatedTarget as Node | null;
    if (!event.currentTarget.contains(next)) {
      setDesktopSidebarExpanded(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gp-cream/80 text-gp-evergreen">
      <aside
        ref={sidebarRef}
        tabIndex={0}
        aria-expanded={desktopSidebarExpanded}
        onFocusCapture={() => setDesktopSidebarExpanded(true)}
        onBlurCapture={handleSidebarBlur}
        onMouseEnter={() => setDesktopSidebarExpanded(true)}
        onMouseLeave={() => {
          const activeElement =
            typeof document !== "undefined" ? document.activeElement : null;
          if (activeElement && sidebarRef.current?.contains(activeElement)) {
            return;
          }
          setDesktopSidebarExpanded(false);
        }}
        className={`fixed left-0 top-0 bottom-0 z-40 hidden overflow-hidden border-r border-gp-evergreen/15 bg-gradient-to-b from-gp-evergreen to-[#0b2d2d] text-gp-cream transition-all duration-200 ease-out md:flex ${
          desktopSidebarExpanded ? "w-64" : "w-4"
        }`}
      >
        {!desktopSidebarExpanded ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-24 w-1 rounded-full bg-gp-cream/40" />
          </div>
        ) : (
          <div className="flex h-full w-full flex-col shadow-md shadow-black/5">
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
                <p className="text-base font-semibold leading-tight">
                  GiftPerch
                </p>
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
          </div>
        )}
      </aside>

      <div className="flex min-h-screen flex-col pl-6 sm:pl-8 lg:pl-10">
        <div className="md:hidden">
          <div className="flex items-center justify-between border-b border-gp-evergreen/10 bg-white/90 px-4 py-3 text-gp-evergreen shadow-sm">
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
            <nav className="space-y-1 border-b border-gp-evergreen/10 bg-white px-4 py-4 text-sm text-gp-evergreen">
              {navItems.map((item) => renderLink(item, "mobile"))}
            </nav>
          ) : null}
        </div>

        <main
          id="gp-main-content"
          role="main"
          className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
