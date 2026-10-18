"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

const SIDEBAR_STORAGE_KEY = "gp_app_sidebar_collapsed";

const EMPTY_PROFILE_SUMMARY = {
  display_name: null,
  avatar_url: null,
};

export type AppEndRail = "none" | "perchpal-collapsed" | "perchpal-expanded";

type AppLayoutProps = {
  children: ReactNode;
  endRail?: AppEndRail;
};

const initialsFromText = (value: string) =>
  value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export function AppLayout({ children, endRail = "none" }: AppLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarPreferenceReady, setSidebarPreferenceReady] = useState(false);
  const { user } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [profileSummary, setProfileSummary] = useState<{
    display_name: string | null;
    avatar_url: string | null;
  }>(EMPTY_PROFILE_SUMMARY);

  useEffect(() => {
    try {
      setSidebarCollapsed(
        window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true",
      );
    } catch {
      // Keep the expanded default when storage is unavailable.
    } finally {
      setSidebarPreferenceReady(true);
    }
  }, []);

  const handleSidebarCollapsedChange = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    } catch {
      // The in-memory preference still works for this session.
    }
  };

  useEffect(() => {
    if (!user?.id) {
      setProfileSummary(EMPTY_PROFILE_SUMMARY);
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
        setProfileSummary(
          data
            ? {
                display_name: data.display_name,
                avatar_url: data.avatar_url,
              }
            : EMPTY_PROFILE_SUMMARY,
        );
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
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user?.id]);

  const accountInitials = initialsFromText(
    profileSummary.display_name || user?.email || "GP",
  );

  return (
    <div
      className={`gp-app-shell ${sidebarPreferenceReady ? "is-sidebar-ready" : ""}`}
      data-sidebar-collapsed={sidebarCollapsed ? "true" : "false"}
      data-end-rail={endRail}
    >
      <AppSidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileNavOpen}
        profile={profileSummary}
        accountInitials={accountInitials}
        userEmail={user?.email}
        onCollapsedChange={handleSidebarCollapsedChange}
        onMobileOpenChange={setMobileNavOpen}
      />
      <div className="gp-app-content">
        <div className="gp-app-content-frame">{children}</div>
      </div>
    </div>
  );
}
