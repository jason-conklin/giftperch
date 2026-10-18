"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Clock3,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, type RefObject } from "react";

type ProfileSummary = {
  display_name: string | null;
  avatar_url: string | null;
};

type AppSidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  profile: ProfileSummary;
  accountInitials: string;
  userEmail?: string | null;
  onCollapsedChange: (collapsed: boolean) => void;
  onMobileOpenChange: (open: boolean) => void;
};

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Recipients", href: "/recipients", icon: Users },
  { label: "Gift Ideas", href: "/gifts", icon: Sparkles },
  { label: "Occasions", href: "/occasions", icon: CalendarDays },
  { label: "History", href: "/history", icon: Clock3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function ProfileAvatar({
  profile,
  initials,
  size = "md",
}: {
  profile: ProfileSummary;
  initials: string;
  size?: "sm" | "md";
}) {
  const dimensions = size === "sm" ? "h-10 w-10" : "h-11 w-11";

  return (
    <span
      className={`flex ${dimensions} shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/25 bg-gp-app-ivory text-sm font-semibold text-gp-app-evergreen`}
    >
      {profile.avatar_url ? (
        <Image
          src={profile.avatar_url}
          alt="Account avatar"
          width={44}
          height={44}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        initials
      )}
    </span>
  );
}

function MobileDrawer({
  open,
  pathname,
  profile,
  accountInitials,
  userEmail,
  triggerRef,
  onOpenChange,
}: {
  open: boolean;
  pathname: string;
  profile: ProfileSummary;
  accountInitials: string;
  userEmail?: string | null;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onOpenChange: (open: boolean) => void;
}) {
  const drawerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        triggerRef.current?.focus();
        wasOpenRef.current = false;
      }
      return;
    }

    wasOpenRef.current = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const drawer = drawerRef.current;
    drawer?.querySelector<HTMLElement>(focusableSelector)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
        return;
      }
      if (event.key !== "Tab" || !drawer) return;

      const focusable = Array.from(
        drawer.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => !element.hasAttribute("disabled"));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onOpenChange, open, triggerRef]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] md:hidden">
      <button
        type="button"
        aria-label="Close navigation"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={() => onOpenChange(false)}
      />
      <aside
        ref={drawerRef}
        id="gp-mobile-navigation"
        role="dialog"
        aria-modal="true"
        aria-label="GiftPerch navigation"
        className="gp-app-mobile-drawer absolute inset-y-0 left-0 flex w-[min(86vw,20rem)] flex-col"
      >
        <div className="flex items-center justify-between border-b border-white/12 px-5 py-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-app-gold"
            onClick={() => onOpenChange(false)}
          >
            <Image
              src="/giftperch_logo_background.png"
              alt="GiftPerch"
              width={48}
              height={48}
              className="h-11 w-11 rounded-full border border-white/20 object-cover"
              priority
            />
            <span className="font-display text-xl font-semibold text-white">
              GiftPerch
            </span>
          </Link>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => onOpenChange(false)}
            className="gp-app-icon-button border-white/20 bg-white/10 text-white hover:bg-white/15"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Primary" className="flex-1 space-y-1.5 px-3 py-5">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => onOpenChange(false)}
                className={`gp-app-nav-link ${active ? "is-active" : ""}`}
              >
                <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/12 p-3">
          <Link
            href="/settings"
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-3 rounded-xl px-2 py-2 text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-app-gold"
          >
            <ProfileAvatar
              profile={profile}
              initials={accountInitials}
              size="sm"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {profile.display_name || userEmail || "Manage account"}
              </span>
              <span className="block text-xs text-white/65">View profile</span>
            </span>
          </Link>
        </div>
      </aside>
    </div>
  );
}

export function AppSidebar({
  collapsed,
  mobileOpen,
  profile,
  accountInitials,
  userEmail,
  onCollapsedChange,
  onMobileOpenChange,
}: AppSidebarProps) {
  const pathname = usePathname();
  const mobileTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!mobileOpen) return;

    const desktopQuery = window.matchMedia("(min-width: 768px)");
    const closeAtDesktop = () => {
      if (desktopQuery.matches) onMobileOpenChange(false);
    };

    closeAtDesktop();
    desktopQuery.addEventListener("change", closeAtDesktop);
    return () => desktopQuery.removeEventListener("change", closeAtDesktop);
  }, [mobileOpen, onMobileOpenChange]);

  return (
    <>
      <aside
        id="gp-desktop-sidebar"
        aria-label="GiftPerch navigation"
        className="gp-app-sidebar fixed inset-y-0 left-0 z-50 hidden flex-col md:flex"
      >
        <div className="flex h-[5.25rem] items-center border-b border-white/12 px-3">
          <Link
            href="/dashboard"
            aria-label="Go to dashboard"
            className={`flex min-w-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-app-gold ${collapsed ? "mx-auto" : "gap-3"}`}
          >
            <Image
              src="/giftperch_logo_background.png"
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 rounded-full border border-white/20 object-cover"
              priority
            />
            {!collapsed ? (
              <span className="font-display truncate text-xl font-semibold text-white">
                GiftPerch
              </span>
            ) : null}
          </Link>
        </div>

        <nav aria-label="Primary" className="flex-1 space-y-1.5 px-2.5 py-5">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={collapsed ? item.label : undefined}
                title={collapsed ? item.label : undefined}
                className={`gp-app-nav-link ${collapsed ? "is-collapsed" : ""} ${active ? "is-active" : ""}`}
              >
                <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-white/12 p-2.5">
          <Link
            href="/settings"
            aria-label={collapsed ? "View profile and settings" : undefined}
            title={collapsed ? "View profile" : undefined}
            className={`flex items-center rounded-xl py-2 text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-app-gold ${collapsed ? "justify-center px-1" : "gap-3 px-2"}`}
          >
            <ProfileAvatar profile={profile} initials={accountInitials} />
            {!collapsed ? (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {profile.display_name || userEmail || "Manage account"}
                </span>
                <span className="block truncate text-xs text-white/65">
                  View profile
                </span>
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            aria-controls="gp-desktop-sidebar"
            onClick={() => onCollapsedChange(!collapsed)}
            className={`gp-app-sidebar-toggle ${collapsed ? "justify-center" : "justify-between"}`}
          >
            {!collapsed ? <span>Collapse sidebar</span> : null}
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" className="h-5 w-5" />
            ) : (
              <PanelLeftClose aria-hidden="true" className="h-5 w-5" />
            )}
          </button>
        </div>
      </aside>

      <header className="gp-app-mobile-header sticky top-0 z-50 flex items-center justify-between px-4 py-3 md:hidden">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gp-app-gold"
        >
          <Image
            src="/giftperch_logo_background.png"
            alt="GiftPerch"
            width={42}
            height={42}
            className="h-10 w-10 rounded-full border border-white/20 object-cover"
            priority
          />
          <span className="font-display text-xl font-semibold text-white">
            GiftPerch
          </span>
        </Link>
        <button
          ref={mobileTriggerRef}
          type="button"
          aria-label="Open navigation"
          aria-expanded={mobileOpen}
          aria-controls="gp-mobile-navigation"
          onClick={() => onMobileOpenChange(true)}
          className="gp-app-icon-button border-white/20 bg-white/10 text-white hover:bg-white/15"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>
      </header>

      <MobileDrawer
        open={mobileOpen}
        pathname={pathname}
        profile={profile}
        accountInitials={accountInitials}
        userEmail={userEmail}
        triggerRef={mobileTriggerRef}
        onOpenChange={onMobileOpenChange}
      />
    </>
  );
}
