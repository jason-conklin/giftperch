"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useEffect, useMemo, useRef, useState } from "react";

type Profile = {
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
};

type UserSettings = {
  send_weekly_digest: boolean;
  send_occasion_reminders: boolean;
  send_affiliate_reports: boolean;
};

type SelfProfileRow = {
  id: string;
  name: string;
  relationship: string | null;
  notes: string | null;
  annual_budget: number | null;
  gift_budget_min: number | null;
  gift_budget_max: number | null;
  self_slug: string | null;
};

type SelfProfile = {
  id: string;
  name: string;
  relationship: string | null;
  notes: string | null;
  annual_budget: number | null;
  gift_budget_min: number | null;
  gift_budget_max: number | null;
  self_slug: string | null;
};

type SelfProfileFormState = {
  name: string;
  notes: string;
  annualBudget: string;
  giftBudgetMin: string;
  giftBudgetMax: string;
};

const defaultSettings: UserSettings = {
  send_weekly_digest: true,
  send_occasion_reminders: true,
  send_affiliate_reports: false,
};

const emptySelfProfileForm: SelfProfileFormState = {
  name: "",
  notes: "",
  annualBudget: "",
  giftBudgetMin: "",
  giftBudgetMax: "",
};

const amountOrNull = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return numeric;
};

const generateShareSlug = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  }
  return Math.random().toString(36).slice(2, 12);
};

const SELF_PROFILE_COLUMNS =
  "id, name, relationship, notes, annual_budget, gift_budget_min, gift_budget_max, self_slug";

const USER_AVATAR_BUCKET = "avatars";

export function SettingsPanel() {
  const { status, user } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const isAffiliateAllowed = useMemo(() => {
    const allowedEmails = ["jasonconklin64@gmail.com", "giftperch@gmail.com"];
    const email = user?.email?.toLowerCase();
    return email ? allowedEmails.includes(email) : false;
  }, [user?.email]);

  const [profile, setProfile] = useState<Profile>({
    display_name: "",
    bio: "",
    avatar_url: "",
  });
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [profileFeedback, setProfileFeedback] = useState("");
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [selfProfile, setSelfProfile] = useState<SelfProfile | null>(null);
  const [selfProfileForm, setSelfProfileForm] = useState<SelfProfileFormState>(
    emptySelfProfileForm
  );
  const [selfFormOpen, setSelfFormOpen] = useState(false);
  const [selfSaving, setSelfSaving] = useState(false);
  const [selfFeedback, setSelfFeedback] = useState("");
  const [shareOrigin, setShareOrigin] = useState("");
  const [regeneratingSlug, setRegeneratingSlug] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !user?.id) return;
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      const [
        { data: profileData },
        { data: settingsData },
        { data: selfData },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, bio, avatar_url")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("user_settings")
          .select(
            "send_weekly_digest, send_occasion_reminders, send_affiliate_reports"
          )
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("recipient_profiles")
          .select(SELF_PROFILE_COLUMNS)
          .eq("user_id", user.id)
          .eq("is_self", true)
          .maybeSingle(),
      ]);

      if (!isMounted) return;

      if (profileData) {
        setProfile({
          display_name: profileData.display_name,
          bio: profileData.bio,
          avatar_url: profileData.avatar_url ?? "",
        });
      }

      if (settingsData) {
        setSettings({
          send_weekly_digest:
            settingsData.send_weekly_digest ?? defaultSettings.send_weekly_digest,
          send_occasion_reminders:
            settingsData.send_occasion_reminders ??
            defaultSettings.send_occasion_reminders,
          send_affiliate_reports: isAffiliateAllowed
            ? settingsData.send_affiliate_reports ?? defaultSettings.send_affiliate_reports
            : false,
        });
      }

      if (selfData) {
        const normalized: SelfProfile = {
          id: selfData.id,
          name: selfData.name,
          relationship: selfData.relationship,
          notes: selfData.notes,
          annual_budget: selfData.annual_budget,
          gift_budget_min: selfData.gift_budget_min,
          gift_budget_max: selfData.gift_budget_max,
          self_slug: selfData.self_slug,
        };
        setSelfProfile(normalized);
        setSelfProfileForm({
          name: normalized.name ?? "",
          notes: normalized.notes ?? "",
          annualBudget: normalized.annual_budget
            ? String(normalized.annual_budget)
            : "",
          giftBudgetMin: normalized.gift_budget_min
            ? String(normalized.gift_budget_min)
            : "",
          giftBudgetMax: normalized.gift_budget_max
            ? String(normalized.gift_budget_max)
            : "",
        });
        setSelfFormOpen(true);
      } else {
        setSelfProfile(null);
        setSelfProfileForm(emptySelfProfileForm);
        setSelfFormOpen(false);
      }

      setLoading(false);
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [status, supabase, user?.id, isAffiliateAllowed]);

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;
    setAvatarUploading(true);
    setFeedback("");

    try {
      const fileExt = file.name.split(".").pop() ?? "png";
      const path = `user-${user.id}-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage
        .from(USER_AVATAR_BUCKET)
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
        });
      if (error) throw error;
      const {
        data: { publicUrl },
      } = supabase.storage.from(USER_AVATAR_BUCKET).getPublicUrl(path);
      await supabase
        .from("profiles")
        .upsert({ id: user.id, avatar_url: publicUrl }, { onConflict: "id" });
      setProfile((prev) => ({ ...prev, avatar_url: publicUrl }));
      setFeedback("Avatar updated");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to upload avatar.";
      setFeedback(message);
    } finally {
      setAvatarUploading(false);
      if (event.target) event.target.value = "";
    }
  };

  const handleAvatarRemove = async () => {
    if (!user?.id) return;
    setAvatarUploading(true);
    setFeedback("");
    try {
      await supabase
        .from("profiles")
        .upsert({ id: user.id, avatar_url: null }, { onConflict: "id" });
      setProfile((prev) => ({ ...prev, avatar_url: "" }));
      setFeedback("Avatar removed");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to remove avatar.";
      setFeedback(message);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleProfileSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.id) return;
    setSavingProfile(true);
    setFeedback("");
    setProfileFeedback("");

    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        display_name: profile.display_name?.trim() || null,
        bio: profile.bio?.trim() || null,
        avatar_url: profile.avatar_url || null,
      },
      { onConflict: "id" }
    );

    if (error) {
      setProfileFeedback(error.message);
      setFeedback(error.message);
    } else {
      setProfileFeedback("Profile updated");
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
        send_affiliate_reports: isAffiliateAllowed
          ? settings.send_affiliate_reports
          : false,
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

  const mapSelfProfileRow = (row: SelfProfileRow): SelfProfile => ({
    id: row.id,
    name: row.name,
    relationship: row.relationship,
    notes: row.notes,
    annual_budget: row.annual_budget,
    gift_budget_min: row.gift_budget_min,
    gift_budget_max: row.gift_budget_max,
    self_slug: row.self_slug,
  });

  const handleSelfProfileSave = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!user?.id) {
      setSelfFeedback("Sign in to save your GiftPerch profile.");
      return;
    }
    const name = selfProfileForm.name.trim();
    if (!name) {
      setSelfFeedback("Name is required.");
      return;
    }
    const min = amountOrNull(selfProfileForm.giftBudgetMin);
    const max = amountOrNull(selfProfileForm.giftBudgetMax);
    if (min !== null && max !== null && min > max) {
      setSelfFeedback("Per-gift minimum cannot exceed the maximum.");
      return;
    }

    setSelfSaving(true);
    setSelfFeedback("");

    const payload = {
      name,
      relationship: "Me",
      notes: selfProfileForm.notes.trim() || null,
      annual_budget: amountOrNull(selfProfileForm.annualBudget),
      gift_budget_min: min,
      gift_budget_max: max,
      is_self: true,
      self_slug: selfProfile?.self_slug ?? generateShareSlug(),
    };

    try {
      if (selfProfile) {
        const { data, error } = await supabase
          .from("recipient_profiles")
          .update(payload)
          .eq("id", selfProfile.id)
          .eq("user_id", user.id)
          .select(SELF_PROFILE_COLUMNS)
          .single();
        if (error) throw error;
        const next = mapSelfProfileRow(data);
        setSelfProfile(next);
        setSelfProfileForm({
          name: next.name ?? "",
          notes: next.notes ?? "",
          annualBudget: next.annual_budget ? String(next.annual_budget) : "",
          giftBudgetMin: next.gift_budget_min ? String(next.gift_budget_min) : "",
          giftBudgetMax: next.gift_budget_max ? String(next.gift_budget_max) : "",
        });
        setSelfFeedback("Profile updated.");
      } else {
        const { data, error } = await supabase
          .from("recipient_profiles")
          .insert({
            ...payload,
            user_id: user.id,
          })
          .select(SELF_PROFILE_COLUMNS)
          .single();
        if (error) throw error;
        const next = mapSelfProfileRow(data);
        setSelfProfile(next);
        setSelfProfileForm({
          name: next.name ?? "",
          notes: next.notes ?? "",
          annualBudget: next.annual_budget ? String(next.annual_budget) : "",
          giftBudgetMin: next.gift_budget_min ? String(next.gift_budget_min) : "",
          giftBudgetMax: next.gift_budget_max ? String(next.gift_budget_max) : "",
        });
        setSelfFormOpen(true);
        setSelfFeedback("Profile created.");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to save your profile.";
      setSelfFeedback(message);
    } finally {
      setSelfSaving(false);
    }
  };

  const handleRegenerateSlug = async () => {
    if (!user?.id || !selfProfile?.id) return;
    setRegeneratingSlug(true);
    setSelfFeedback("");
    const newSlug = generateShareSlug();
    try {
      const { data, error } = await supabase
        .from("recipient_profiles")
        .update({ self_slug: newSlug })
        .eq("id", selfProfile.id)
        .eq("user_id", user.id)
        .select(SELF_PROFILE_COLUMNS)
        .single();
      if (error) throw error;
      const next = mapSelfProfileRow(data);
      setSelfProfile(next);
      setSelfFeedback("Link refreshed.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to refresh the link.";
      setSelfFeedback(message);
    } finally {
      setRegeneratingSlug(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!selfProfile?.self_slug) return;
    const base = shareOrigin || (typeof window !== "undefined" ? window.location.origin : "");
    const shareUrl = `${base}/profile/${selfProfile.self_slug}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setSelfFeedback("Share link copied.");
    } catch {
      setSelfFeedback("Unable to copy link. Copy it manually.");
    }
  };

  const resolvedOrigin =
    shareOrigin || (typeof window !== "undefined" ? window.location.origin : "");
  const shareUrl = selfProfile?.self_slug ? `${resolvedOrigin}/profile/${selfProfile.self_slug}` : "";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim() !== "DELETE") return;
    setIsDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch("/api/user/delete", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to delete account");
      await supabase.auth.signOut();
      router.push("/auth/signup");
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error("Delete account failed", err);
      alert("Something went wrong deleting your account.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <p className="gp-card-soft text-sm text-gp-evergreen/70">Loading settings</p>
    );
  }

  return (
    <div className="space-y-6">
      <section className="gp-card flex flex-col gap-5">
        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-gp-evergreen/60">
                Account Profile
          </p>
          <p className="mt-3 text-sm text-gp-evergreen/70">
            Update how PerchPal addresses you on dashboards and shareable guides.
          </p>
        </header>
        <form className="space-y-4" onSubmit={handleProfileSave}>
          <div className="flex flex-col gap-3 rounded-2xl border border-gp-evergreen/15 bg-gp-cream/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-gp-evergreen/20 bg-white text-lg font-semibold text-gp-evergreen">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt="Profile avatar"
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  (profile.display_name || user?.email || "GP")
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gp-evergreen">
                  Profile photo
                </p>
                <p className="text-xs text-gp-evergreen/60">
                  Optional avatar used in the sidebar and sharing flows.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <button
                type="button"
                className="gp-secondary-button cursor-pointer"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
              >
                {avatarUploading ? "Uploading..." : "Upload avatar"}
              </button>
              {profile.avatar_url ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-red-600 cursor-pointer"
                  onClick={handleAvatarRemove}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>

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
          className="gp-primary-button w-full sm:w-auto cursor-pointer disabled:cursor-not-allowed"
          disabled={savingProfile}
        >
          {savingProfile ? "Saving..." : "Save profile"}
        </button>
        {profileFeedback ? (
          <p className="text-sm font-semibold text-gp-evergreen/70">
            {profileFeedback}
          </p>
        ) : null}
        </form>
      </section>

      <section className="gp-card flex flex-col gap-4">
        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-gp-evergreen/60">
              Your recipient profile
          </p>
          <p className="mt-3 text-sm text-gp-evergreen/70">
            Share a recipient profile of yourself so friends can import you directly
            into their recipients list. Totally optional, but very handy.
          </p>
        </header>

        {!selfFormOpen ? (
          <div className="rounded-2xl border border-dashed border-gp-evergreen/30 bg-gp-cream/60 p-5 text-sm text-gp-evergreen/80">
            <p>
              Let PerchPal know your style, budgets, and interests. When you share
              the link, people can add you to their GiftPerch recipients with a single click.
            </p>
            <button
              type="button"
              className="gp-primary-button mt-4 w-full sm:w-auto cursor-pointer"
              onClick={() => setSelfFormOpen(true)}
            >
              Set up my recipient profile
            </button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSelfProfileSave}>
            <label className="flex flex-col gap-2 text-sm font-semibold text-gp-evergreen">
              Name*
              <input
                className="gp-input"
                value={selfProfileForm.name}
                onChange={(event) =>
                  setSelfProfileForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder="Jason Conklin"
                required
              />
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="flex flex-col gap-2 text-sm font-semibold text-gp-evergreen">
                Yearly budget (optional)
                <input
                  className="gp-input"
                  type="number"
                  min="0"
                  value={selfProfileForm.annualBudget}
                  onChange={(event) =>
                    setSelfProfileForm((prev) => ({
                      ...prev,
                      annualBudget: event.target.value,
                    }))
                  }
                  placeholder="400"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold text-gp-evergreen">
                Per-gift min
                <input
                  className="gp-input"
                  type="number"
                  min="0"
                  value={selfProfileForm.giftBudgetMin}
                  onChange={(event) =>
                    setSelfProfileForm((prev) => ({
                      ...prev,
                      giftBudgetMin: event.target.value,
                    }))
                  }
                  placeholder="25"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold text-gp-evergreen">
                Per-gift max
                <input
                  className="gp-input"
                  type="number"
                  min="0"
                  value={selfProfileForm.giftBudgetMax}
                  onChange={(event) =>
                    setSelfProfileForm((prev) => ({
                      ...prev,
                      giftBudgetMax: event.target.value,
                    }))
                  }
                  placeholder="75"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2 text-sm font-semibold text-gp-evergreen">
              Notes for friends
              <textarea
                className="gp-input min-h-[120px] resize-none"
                value={selfProfileForm.notes}
                onChange={(event) =>
                  setSelfProfileForm((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
                placeholder="Likes: cozy reading, experiences. Dislikes: clutter or gag gifts."
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="gp-primary-button cursor-pointer disabled:cursor-not-allowed"
                disabled={selfSaving}
              >
                {selfProfile ? "Update profile" : "Create profile"}
              </button>
              <button
                type="button"
                className="gp-secondary-button cursor-pointer"
                onClick={() => setSelfFormOpen(false)}
              >
                {selfProfile ? "Hide form" : "Skip for now"}
              </button>
            </div>

            {selfProfile ? (
              <div className="space-y-2 rounded-2xl border border-gp-evergreen/15 bg-white/90 p-4 text-sm text-gp-evergreen">
                <p className="text-xs font-semibold uppercase tracking-wide text-gp-evergreen/60">
                  Share link
                </p>
                {shareUrl ? (
                  <>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        className="gp-input flex-1"
                        readOnly
                        value={shareUrl}
                      />
                      <button
                        type="button"
                        className="gp-secondary-button shrink-0"
                        onClick={handleCopyShareLink}
                      >
                        Copy link
                      </button>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-semibold text-gp-evergreen underline-offset-4 hover:underline"
                      onClick={handleRegenerateSlug}
                      disabled={regeneratingSlug}
                    >
                      {regeneratingSlug ? "Refreshing..." : "Refresh link"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="gp-secondary-button"
                    onClick={handleRegenerateSlug}
                    disabled={regeneratingSlug}
                  >
                    {regeneratingSlug ? "Generating..." : "Generate link"}
                  </button>
                )}
              </div>
            ) : null}
          </form>
        )}

        {selfFeedback ? (
          <p className="rounded-2xl bg-gp-cream/80 px-4 py-2 text-sm text-gp-evergreen/80">
            {selfFeedback}
          </p>
        ) : null}
      </section>

      <section className="gp-card flex flex-col gap-3">
        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-gp-evergreen/60">
            Optional extras
          </p>
          <p className="mt-3 text-sm text-gp-evergreen/70">
            Wishlists live off to the side. Use them only if you want a personal
            registry for friends and family.
          </p>
        </header>
        <Link
          href="/wishlist"
          className="inline-flex w-full items-center justify-center rounded-full bg-gp-evergreen px-5 py-2 text-sm font-semibold text-gp-cream transition hover:bg-[#0c3132] sm:w-auto"
        >
          Open my wishlists
        </Link>
      </section>

      <section className="gp-card flex flex-col gap-4">
        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-gp-evergreen/60">
            Notifications
          </p>
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

        {isAffiliateAllowed ? (
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
                Affiliate performance (Admin Option)
              </p>
              <p className="text-xs text-gp-evergreen/70">
                Weekly snapshot of clicks and conversions from shared links. Only available for jasonconklin64@gmail.com and giftperch@gmail.com.
              </p>
            </div>
          </label>
        ) : null}

        <button
          type="button"
          className="w-full sm:w-auto rounded-full bg-gp-evergreen px-5 py-2 text-sm font-semibold text-gp-cream transition hover:bg-[#0c3132] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={handlePreferencesSave}
          disabled={savingPreferences}
        >
          {savingPreferences ? "Saving..." : "Save notification preferences"}
        </button>
      </section>

      {feedback ? (
        <p className="rounded-2xl bg-gp-cream/80 px-4 py-2 text-sm text-gp-evergreen/80">
          {feedback}
        </p>
      ) : null}

      <div className="mt-12 border-t border-gp-evergreen/10 pt-8 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            className="rounded-full bg-gp-gold px-5 py-2 text-sm font-semibold text-gp-evergreen transition hover:bg-[#bda775] w-full sm:w-auto cursor-pointer"
            onClick={handleLogout}
          >
            Log Out
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl px-4 py-2 w-full sm:w-auto cursor-pointer"
          >
            Delete Account
          </button>
        </div>
      </div>

      {showDeleteConfirm ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-gp-cream p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-gp-evergreen">
              Delete your GiftPerch account?
            </h2>
            <div className="space-y-2 text-sm text-gp-evergreen/80">
              <p>
                This will permanently delete your account, recipient profiles, wishlists,
                occasions, gift history, and settings.
              </p>
              <p className="font-semibold text-red-700">
                This action cannot be undone.
              </p>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="delete-confirm-input"
                className="text-xs font-semibold uppercase tracking-wide text-gp-evergreen/70"
              >
                To confirm, type DELETE in all caps:
              </label>
              <input
                id="delete-confirm-input"
                type="text"
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value)}
                placeholder="DELETE"
                className="w-full rounded-2xl border border-gp-evergreen/30 bg-white px-3 py-2 text-sm text-gp-evergreen focus:border-gp-evergreen focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="gp-secondary-button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || deleteConfirmText.trim() !== "DELETE"}
                onClick={handleDeleteAccount}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl px-4 py-2 disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

