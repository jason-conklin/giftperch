"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useEffect, useMemo, useRef, useState } from "react";
import { Ban, Camera, Check, Heart, Plus, Tag, UserRound } from "lucide-react";
import { APP_GOLD_ACTION } from "@/components/ui/appActionStyles";
import {
  RECIPIENT_AVATARS,
  SUGGESTED_RECIPIENT_INTERESTS,
  type RecipientAvatarIcon,
} from "@/components/recipients/recipientFormOptions";
import styles from "@/components/recipients/RecipientProfileModal.module.css";
import {
  buildRecipientPreferenceChanges,
  normalizePreferenceLabel,
  parseRecipientPreferenceList,
  preferenceKey,
  splitRecipientRecommendationPreferences,
} from "@/lib/recipientRecommendationContext";
import { getRecipientInitials } from "@/lib/recipientAvatar";

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
  notes: string | null;
  birthday: string | null;
  avatar_url: string | null;
  avatar_icon: string | null;
  self_slug: string | null;
};

type SelfProfile = {
  id: string;
  name: string;
  notes: string | null;
  birthday: string | null;
  avatar_url: string | null;
  avatar_icon: string | null;
  self_slug: string | null;
};

type SelfProfileFormState = {
  name: string;
  notes: string;
  birthday: string;
  avatarUrl: string;
  avatarIcon: RecipientAvatarIcon | "";
  interests: string[];
  avoidances: string;
};

type SelfInterestRow = {
  id: string;
  recipient_id: string;
  label: string;
  category: string | null;
};

const defaultSettings: UserSettings = {
  send_weekly_digest: true,
  send_occasion_reminders: true,
  send_affiliate_reports: false,
};

const emptySelfProfileForm: SelfProfileFormState = {
  name: "",
  notes: "",
  birthday: "",
  avatarUrl: "",
  avatarIcon: "",
  interests: [],
  avoidances: "",
};

const generateShareSlug = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  }
  return Math.random().toString(36).slice(2, 12);
};

const SELF_PROFILE_COLUMNS =
  "id, name, notes, birthday, avatar_url, avatar_icon, self_slug";

const USER_AVATAR_BUCKET = "avatars";
const RECIPIENT_AVATAR_BUCKET = "recipient-avatars";

export function SettingsPanel() {
  const { status, user } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const isAffiliateAllowed = useMemo(() => {
    const allowedEmails = ["giftperch@gmail.com", "jasonconklin64@gmail.com"];
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
  const selfAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [selfProfile, setSelfProfile] = useState<SelfProfile | null>(null);
  const [selfProfileForm, setSelfProfileForm] = useState<SelfProfileFormState>(
    emptySelfProfileForm
  );
  const [selfInterests, setSelfInterests] = useState<SelfInterestRow[]>([]);
  const [customSelfInterest, setCustomSelfInterest] = useState("");
  const [selfFormOpen, setSelfFormOpen] = useState(false);
  const [selfSaving, setSelfSaving] = useState(false);
  const [selfAvatarUploading, setSelfAvatarUploading] = useState(false);
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

      const selfInterestRows = selfData
        ? await supabase
            .from("recipient_interests")
            .select("id, recipient_id, label, category")
            .eq("recipient_id", selfData.id)
        : { data: [], error: null };

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
          notes: selfData.notes,
          birthday: selfData.birthday,
          avatar_url: selfData.avatar_url,
          avatar_icon: selfData.avatar_icon,
          self_slug: selfData.self_slug,
        };
        const preferenceRows = (selfInterestRows.data ?? []) as SelfInterestRow[];
        const preferences = splitRecipientRecommendationPreferences(preferenceRows);
        setSelfProfile(normalized);
        setSelfProfileForm({
          name: normalized.name ?? "",
          notes: normalized.notes ?? "",
          birthday: normalized.birthday ?? "",
          avatarUrl: normalized.avatar_url ?? "",
          avatarIcon: (normalized.avatar_icon as RecipientAvatarIcon | null) ?? "",
          interests: preferences.positive.map((entry) => entry.label),
          avoidances: preferences.avoidances.join(", "),
        });
        setSelfInterests(preferenceRows);
        setSelfFormOpen(true);
        if (selfInterestRows.error) {
          setSelfFeedback("Your preferences could not be loaded. Refresh before making changes.");
        }
      } else {
        setSelfProfile(null);
        setSelfProfileForm(emptySelfProfileForm);
        setSelfInterests([]);
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
    notes: row.notes,
    birthday: row.birthday,
    avatar_url: row.avatar_url,
    avatar_icon: row.avatar_icon,
    self_slug: row.self_slug,
  });

  const selfInterestChoices = useMemo(() => {
    const choices = new Map<string, string>();
    [...SUGGESTED_RECIPIENT_INTERESTS, ...selfProfileForm.interests].forEach((label) => {
      const normalized = normalizePreferenceLabel(label);
      if (normalized) choices.set(preferenceKey(normalized), normalized);
    });
    return [...choices.values()];
  }, [selfProfileForm.interests]);

  const selectedSelfInterestKeys = useMemo(
    () => new Set(selfProfileForm.interests.map(preferenceKey)),
    [selfProfileForm.interests],
  );

  const toggleSelfInterest = (label: string) => {
    const normalized = normalizePreferenceLabel(label);
    const key = preferenceKey(normalized);
    setSelfProfileForm((current) => ({
      ...current,
      interests: selectedSelfInterestKeys.has(key)
        ? current.interests.filter((item) => preferenceKey(item) !== key)
        : [...current.interests, normalized],
    }));
  };

  const addCustomSelfInterest = () => {
    const normalized = normalizePreferenceLabel(customSelfInterest);
    if (!normalized) return;
    if (!selectedSelfInterestKeys.has(preferenceKey(normalized))) {
      setSelfProfileForm((current) => ({
        ...current,
        interests: [...current.interests, normalized],
      }));
    }
    setCustomSelfInterest("");
  };

  const handleSelfAvatarUpload = async (file: File | undefined) => {
    if (!file || !user?.id) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setSelfFeedback("Choose an image smaller than 5 MB.");
      return;
    }
    setSelfAvatarUploading(true);
    setSelfFeedback("");
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${user.id}/self-${Date.now()}.${extension}`;
      const { error } = await supabase.storage
        .from(RECIPIENT_AVATAR_BUCKET)
        .upload(fileName, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage
        .from(RECIPIENT_AVATAR_BUCKET)
        .getPublicUrl(fileName);
      setSelfProfileForm((current) => ({
        ...current,
        avatarUrl: data.publicUrl,
        avatarIcon: "",
      }));
    } catch (error) {
      setSelfFeedback(error instanceof Error ? error.message : "Unable to upload photo.");
    } finally {
      setSelfAvatarUploading(false);
      if (selfAvatarInputRef.current) selfAvatarInputRef.current.value = "";
    }
  };

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
    if (name.length > 80) {
      setSelfFeedback("Name must be 80 characters or fewer.");
      return;
    }
    if (selfProfileForm.notes.length > 2000) {
      setSelfFeedback("Additional details must be 2,000 characters or fewer.");
      return;
    }

    setSelfSaving(true);
    setSelfFeedback("");

    const payload = {
      name,
      relationship: null,
      pet_type: null,
      notes: selfProfileForm.notes.trim() || null,
      birthday: selfProfileForm.birthday || null,
      avatar_url: selfProfileForm.avatarUrl || null,
      avatar_icon: selfProfileForm.avatarIcon || null,
      is_self: true,
      self_slug: selfProfile?.self_slug ?? generateShareSlug(),
    };

    try {
      let next: SelfProfile;
      if (selfProfile) {
        const { data, error } = await supabase
          .from("recipient_profiles")
          .update(payload)
          .eq("id", selfProfile.id)
          .eq("user_id", user.id)
          .select(SELF_PROFILE_COLUMNS)
          .single();
        if (error) throw error;
        next = mapSelfProfileRow(data);
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
        next = mapSelfProfileRow(data);
      }

      // Keep the new profile identity so a preference retry updates it instead of duplicating it.
      setSelfProfile(next);
      const changes = buildRecipientPreferenceChanges(
        selfInterests,
        selfProfileForm.interests,
        parseRecipientPreferenceList(selfProfileForm.avoidances),
      );
      if (changes.deleteIds.length) {
        const { error } = await supabase
          .from("recipient_interests")
          .delete()
          .eq("recipient_id", next.id)
          .in("id", changes.deleteIds);
        if (error) throw error;
      }
      if (changes.inserts.length) {
        const { error } = await supabase
          .from("recipient_interests")
          .insert(changes.inserts.map((entry) => ({ recipient_id: next.id, ...entry })));
        if (error) throw error;
      }
      const { data: refreshedPreferences, error: preferenceError } = await supabase
        .from("recipient_interests")
        .select("id, recipient_id, label, category")
        .eq("recipient_id", next.id);
      if (preferenceError) throw preferenceError;

      const preferences = splitRecipientRecommendationPreferences(
        (refreshedPreferences ?? []) as SelfInterestRow[],
      );
      setSelfProfile(next);
      setSelfInterests((refreshedPreferences ?? []) as SelfInterestRow[]);
      setSelfProfileForm((current) => ({
        ...current,
        name: next.name,
        notes: next.notes ?? "",
        birthday: next.birthday ?? "",
        avatarUrl: next.avatar_url ?? "",
        avatarIcon: (next.avatar_icon as RecipientAvatarIcon | null) ?? "",
        interests: preferences.positive.map((entry) => entry.label),
        avoidances: preferences.avoidances.join(", "),
      }));
      setSelfFormOpen(true);
      setSelfFeedback(selfProfile ? "Profile updated." : "Profile created.");
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
  const selectedSelfAvatar = RECIPIENT_AVATARS.find(
    (avatar) => avatar.key === selfProfileForm.avatarIcon,
  );

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
            Update account information and how PerchPal addresses you.
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

      <section className="gp-card space-y-5">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gp-evergreen/60">Your recipient profile</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-gp-evergreen">Share the details that make gifts feel personal</h2>
          <p className="mt-2 text-sm leading-6 text-gp-evergreen/70">Friends and family can import this profile into their own recipient list. They choose their relationship to you and their gift budget; you share only your preferences.</p>
        </header>

        {!selfFormOpen ? (
          <div className="rounded-xl border border-dashed border-gp-evergreen/30 bg-gp-cream/60 p-5 text-sm text-gp-evergreen/80">
            <p>Add the interests, helpful details, and things you would rather avoid so people can give with more confidence.</p>
            <button type="button" className={`${APP_GOLD_ACTION} mt-4`} onClick={() => setSelfFormOpen(true)}>Set up my recipient profile</button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSelfProfileSave}>
            <div className={styles.columns}>
              <div className={styles.column}>
                <section className={styles.section}>
                  <div className={styles.sectionTitle}><span><UserRound aria-hidden="true" /></span><div><h3>Basic information</h3><p>Only your name and optional birthday are shared.</p></div></div>
                  <div className={styles.createAvatarRow}>
                    <span className={styles.createAvatar}>{selfProfileForm.avatarUrl ? <Image src={selfProfileForm.avatarUrl} alt={`${selfProfileForm.name || "Profile"} avatar`} width={72} height={72} unoptimized /> : selectedSelfAvatar ? <Image src={selectedSelfAvatar.src} alt={selectedSelfAvatar.label} width={58} height={58} unoptimized className={styles.preset} /> : getRecipientInitials(selfProfileForm.name)}</span>
                    <div className={styles.createAvatarActions}>
                      <input ref={selfAvatarInputRef} type="file" accept="image/*" hidden onChange={(event) => void handleSelfAvatarUpload(event.target.files?.[0])} />
                      <button type="button" className={APP_GOLD_ACTION} onClick={() => selfAvatarInputRef.current?.click()} disabled={selfAvatarUploading}><Camera aria-hidden="true" />{selfAvatarUploading ? "Uploading..." : "Upload photo"}</button>
                      {(selfProfileForm.avatarUrl || selfProfileForm.avatarIcon) ? <button type="button" className={styles.removeAvatar} onClick={() => setSelfProfileForm((current) => ({ ...current, avatarUrl: "", avatarIcon: "" }))}>Remove avatar</button> : null}
                    </div>
                  </div>
                  <div className={styles.fields}>
                    <label className={styles.full}>Name *<input autoFocus required maxLength={80} value={selfProfileForm.name} onChange={(event) => setSelfProfileForm((current) => ({ ...current, name: event.target.value }))} placeholder="Your name" /></label>
                    <label className={styles.full}>Birthday <small>(optional)</small><input type="date" value={selfProfileForm.birthday} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setSelfProfileForm((current) => ({ ...current, birthday: event.target.value }))} /></label>
                    <div className={`${styles.full} ${styles.avatarChoices}`}><span>Preset avatar</span>{RECIPIENT_AVATARS.map((avatar) => <button key={avatar.key} type="button" aria-pressed={selfProfileForm.avatarIcon === avatar.key} title={avatar.label} onClick={() => setSelfProfileForm((current) => ({ ...current, avatarIcon: current.avatarIcon === avatar.key ? "" : avatar.key, avatarUrl: "" }))}><Image src={avatar.src} alt="" width={34} height={34} unoptimized /></button>)}</div>
                  </div>
                </section>
              </div>
              <div className={styles.column}>
                <section className={styles.section}>
                  <div className={styles.sectionTitle}><span><Heart aria-hidden="true" /></span><div><h3>Interests &amp; hobbies</h3><p>Select a few interests to help people choose a gift you will enjoy.</p></div></div>
                  <div className={styles.addInterest}><input value={customSelfInterest} maxLength={80} placeholder="Add an interest" onChange={(event) => setCustomSelfInterest(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustomSelfInterest(); } }} /><button type="button" className={APP_GOLD_ACTION} onClick={addCustomSelfInterest}><Plus aria-hidden="true" />Add</button></div>
                  <div className={styles.chips}>{selfInterestChoices.map((label) => { const selected = selectedSelfInterestKeys.has(preferenceKey(label)); return <button key={preferenceKey(label)} type="button" aria-pressed={selected} className={selected ? styles.selectedChip : styles.chip} onClick={() => toggleSelfInterest(label)}>{label}{selected ? <Check aria-hidden="true" /> : null}</button>; })}</div>
                </section>
                <section className={styles.section}>
                  <div className={styles.sectionTitle}><span><Tag aria-hidden="true" /></span><div><h3>Additional details</h3><p>Describe your personality, preferences, or anything else that may help PerchPal.</p></div></div>
                  <label className={styles.textarea}><span className="sr-only">Additional details</span><textarea rows={5} maxLength={2000} value={selfProfileForm.notes} onChange={(event) => setSelfProfileForm((current) => ({ ...current, notes: event.target.value }))} /><small>{selfProfileForm.notes.length}/2000</small></label>
                </section>
                <section className={styles.section}>
                  <div className={styles.sectionTitle}><span><Ban aria-hidden="true" /></span><div><h3>Things to avoid <small>(optional)</small></h3><p>Add unsuitable categories, disliked items, or gifts you already own.</p></div></div>
                  <label className={styles.textarea}><span className="sr-only">Things to avoid</span><textarea rows={3} maxLength={500} placeholder="e.g. clothing, gift cards, duplicate mugs" value={selfProfileForm.avoidances} onChange={(event) => setSelfProfileForm((current) => ({ ...current, avoidances: event.target.value }))} /><small>{selfProfileForm.avoidances.length}/500</small></label>
                </section>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 border-t border-gp-evergreen/10 pt-4">
              <button type="submit" className={APP_GOLD_ACTION} disabled={selfSaving}>{selfSaving ? "Saving..." : selfProfile ? "Update profile" : "Create profile"}</button>
              <button type="button" className="gp-secondary-button cursor-pointer" onClick={() => setSelfFormOpen(false)}>{selfProfile ? "Hide form" : "Skip for now"}</button>
            </div>
            {selfProfile ? <div className="space-y-2 rounded-xl border border-gp-evergreen/15 bg-white/90 p-4 text-sm text-gp-evergreen"><p className="text-xs font-semibold uppercase tracking-wide text-gp-evergreen/60">Share link</p>{shareUrl ? <><div className="flex flex-col gap-2 sm:flex-row"><input className="gp-input flex-1" readOnly value={shareUrl} /><button type="button" className="gp-secondary-button shrink-0" onClick={handleCopyShareLink}>Copy link</button></div><button type="button" className="text-xs font-semibold text-gp-evergreen underline-offset-4 hover:underline" onClick={handleRegenerateSlug} disabled={regeneratingSlug}>{regeneratingSlug ? "Refreshing..." : "Refresh link"}</button></> : <button type="button" className="gp-secondary-button" onClick={handleRegenerateSlug} disabled={regeneratingSlug}>{regeneratingSlug ? "Generating..." : "Generate link"}</button>}</div> : null}
          </form>
        )}
        {selfFeedback ? <p role="status" className="rounded-lg bg-gp-cream/80 px-4 py-2 text-sm text-gp-evergreen/80">{selfFeedback}</p> : null}
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
                Weekly snapshot of clicks and conversions from shared links. (This option is only visible for jasonconklin64@gmail.com and giftperch@gmail.com)
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
                This will permanently delete your account, recipient profiles, occasions,
                saved gifts, gift history, and settings.
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

