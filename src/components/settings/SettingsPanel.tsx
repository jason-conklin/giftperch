"use client";

import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";

type Profile = {
  display_name: string | null;
  bio: string | null;
};

type UserSettings = {
  send_weekly_digest: boolean;
  send_occasion_reminders: boolean;
  send_affiliate_reports: boolean;
};

const defaultSettings: UserSettings = {
  send_weekly_digest: true,
  send_occasion_reminders: true,
  send_affiliate_reports: false,
};

export function SettingsPanel() {
  const { status, user } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [profile, setProfile] = useState<Profile>({
    display_name: "",
    bio: "",
  });
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (status !== "authenticated" || !user?.id) return;
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      const [{ data: profileData }, { data: settingsData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, bio")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("user_settings")
          .select(
            "send_weekly_digest, send_occasion_reminders, send_affiliate_reports"
          )
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (!isMounted) return;

      if (profileData) {
        setProfile({
          display_name: profileData.display_name,
          bio: profileData.bio,
        });
      }

      if (settingsData) {
        setSettings({
          send_weekly_digest:
            settingsData.send_weekly_digest ?? defaultSettings.send_weekly_digest,
          send_occasion_reminders:
            settingsData.send_occasion_reminders ??
            defaultSettings.send_occasion_reminders,
          send_affiliate_reports:
            settingsData.send_affiliate_reports ??
            defaultSettings.send_affiliate_reports,
        });
      }

      setLoading(false);
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [status, supabase, user?.id]);

  const handleProfileSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.id) return;
    setSavingProfile(true);
    setFeedback("");

    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        display_name: profile.display_name?.trim() || null,
        bio: profile.bio?.trim() || null,
      },
      { onConflict: "id" }
    );

    if (error) {
      setFeedback(error.message);
    } else {
      setFeedback("Profile saved");
    }

    setSavingProfile(false);
  };

  const handlePreferencesSave = async () => {
    if (!user?.id) return;
    setSavingPreferences(true);
    setFeedback("");

    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        ...settings,
      },
      { onConflict: "user_id" }
    );

    if (error) {
      setFeedback(error.message);
    } else {
      setFeedback("Preferences saved");
    }

    setSavingPreferences(false);
  };

  if (loading) {
    return (
      <p className="gp-card-soft text-sm text-gp-evergreen/70">Loading settings…</p>
    );
  }

  return (
    <div className="space-y-6">
      <section className="gp-card flex flex-col gap-5">
        <header>
          <div className="gp-pill">Account profile</div>
          <p className="mt-3 text-sm text-gp-evergreen/70">
            Update how PerchPal addresses you on dashboards and shareable guides.
          </p>
        </header>
        <form className="space-y-4" onSubmit={handleProfileSave}>
          <label className="flex flex-col gap-2 text-sm font-semibold text-gp-evergreen">
            Display name
            <input
              className="gp-input"
              value={profile.display_name ?? ""}
              onChange={(event) =>
                setProfile((prev) => ({ ...prev, display_name: event.target.value }))
              }
              placeholder="PerchPal member"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-semibold text-gp-evergreen">
            Bio
            <textarea
              className="gp-input min-h-[100px] resize-none"
              value={profile.bio ?? ""}
              onChange={(event) =>
                setProfile((prev) => ({ ...prev, bio: event.target.value }))
              }
              placeholder="Sharing thoughtful finds and favorite experiences."
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-semibold text-gp-evergreen">
            Contact email
            <input
              className="gp-input"
              type="email"
              value={user?.email ?? ""}
              disabled
            />
          </label>

          <button
            type="submit"
            className="gp-primary-button w-full sm:w-auto"
            disabled={savingProfile}
          >
            {savingProfile ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>

      <section className="gp-card flex flex-col gap-4">
        <header>
          <div className="gp-pill">Notifications</div>
          <p className="mt-3 text-sm text-gp-evergreen/70">
            Choose how PerchPal keeps you in the loop.
          </p>
        </header>

        <label className="flex items-start gap-3 rounded-2xl border border-gp-evergreen/15 bg-gp-cream/70 p-4">
          <input
            type="checkbox"
            checked={settings.send_weekly_digest}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                send_weekly_digest: event.target.checked,
              }))
            }
            className="mt-1 h-4 w-4 rounded border-gp-evergreen/40 text-gp-evergreen focus:ring-gp-evergreen"
          />
          <div>
            <p className="text-sm font-semibold text-gp-evergreen">Weekly digest</p>
            <p className="text-xs text-gp-evergreen/70">
              Monday morning overview of upcoming recipients and open tasks.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 rounded-2xl border border-gp-evergreen/15 bg-gp-cream/70 p-4">
          <input
            type="checkbox"
            checked={settings.send_occasion_reminders}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                send_occasion_reminders: event.target.checked,
              }))
            }
            className="mt-1 h-4 w-4 rounded border-gp-evergreen/40 text-gp-evergreen focus:ring-gp-evergreen"
          />
          <div>
            <p className="text-sm font-semibold text-gp-evergreen">
              Occasion reminders
            </p>
            <p className="text-xs text-gp-evergreen/70">
              Day-before nudges for birthdays, anniversaries, and custom events.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 rounded-2xl border border-gp-evergreen/15 bg-gp-cream/70 p-4">
          <input
            type="checkbox"
            checked={settings.send_affiliate_reports}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                send_affiliate_reports: event.target.checked,
              }))
            }
            className="mt-1 h-4 w-4 rounded border-gp-evergreen/40 text-gp-evergreen focus:ring-gp-evergreen"
          />
          <div>
            <p className="text-sm font-semibold text-gp-evergreen">
              Affiliate performance
            </p>
            <p className="text-xs text-gp-evergreen/70">
              Weekly snapshot of clicks and conversions from shared links.
            </p>
          </div>
        </label>

        <button
          type="button"
          className="gp-secondary-button w-full sm:w-auto"
          onClick={handlePreferencesSave}
          disabled={savingPreferences}
        >
          {savingPreferences ? "Saving…" : "Save notification preferences"}
        </button>
      </section>

      {feedback ? (
        <p className="rounded-2xl bg-gp-cream/80 px-4 py-2 text-sm text-gp-evergreen/80">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
