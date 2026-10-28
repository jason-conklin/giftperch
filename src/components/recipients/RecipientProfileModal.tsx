"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Ban,
  Bookmark,
  CalendarDays,
  Camera,
  Check,
  Clock3,
  Heart,
  Pencil,
  Plus,
  Save,
  Tag,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { APP_EVERGREEN_ACTION, APP_GOLD_ACTION } from "@/components/ui/appActionStyles";
import { SavedGiftIdeasModal } from "./SavedGiftIdeasModal";
import type { RecipientInterest, RecipientProfile } from "./RecipientsManager";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import {
  buildRecipientPreferenceChanges,
  normalizePreferenceLabel,
  parseRecipientPreferenceList,
  preferenceKey,
  splitRecipientRecommendationPreferences,
  validateRecipientBudgets,
} from "@/lib/recipientRecommendationContext";
import styles from "./RecipientProfileModal.module.css";

type Tab = "profile" | "saved";
type AvatarIcon = "babyboy" | "babygirl" | "boy" | "girl" | "man" | "woman" | "dog" | "cat";
type Draft = {
  name: string;
  relationship: string;
  customRelationship: string;
  petType: string;
  gender: string;
  birthday: string;
  annualBudget: string;
  budgetMin: string;
  budgetMax: string;
  notes: string;
  avatarUrl: string;
  avatarIcon: AvatarIcon | "";
  interests: string[];
  avoidances: string;
};

const RELATIONSHIPS = ["Mother", "Father", "Sister", "Brother", "Cousin", "Aunt", "Uncle", "Daughter", "Son", "Boyfriend", "Girlfriend", "Fiance", "Spouse", "Friend", "Coworker", "Grandparent", "Pet"];
const SUGGESTED_INTERESTS = ["Outdoors", "Fishing", "Cooking", "Reading", "Coffee", "Gardening", "Gaming", "Sports", "Travel", "Music", "Art", "Jewelry", "Technology", "Fitness", "Pets", "Home decor"];
const AVATARS: Array<{ key: AvatarIcon; label: string; src: string }> = [
  { key: "babyboy", label: "Baby boy", src: "/babyboy_icon.png" },
  { key: "babygirl", label: "Baby girl", src: "/babygirl_icon.png" },
  { key: "boy", label: "Boy", src: "/boy_icon.png" },
  { key: "girl", label: "Girl", src: "/girl_icon.png" },
  { key: "man", label: "Man", src: "/man_icon.png" },
  { key: "woman", label: "Woman", src: "/woman_icon.png" },
  { key: "dog", label: "Dog", src: "/dog_icon.png" },
  { key: "cat", label: "Cat", src: "/cat_icon.png" },
];

type Props = {
  recipient: RecipientProfile;
  interests: RecipientInterest[];
  savedCount: number | null;
  authToken: string | null;
  initialTab?: Tab;
  initialEditing?: boolean;
  onClose: () => void;
  onRecipientUpdated: (recipient: RecipientProfile) => void;
  onInterestsUpdated: (recipientId: string, interests: RecipientInterest[]) => void;
  onSavedGiftRemoved: (recipientId: string) => void;
};

function numberText(value: number | null) {
  return value === null ? "" : String(value);
}

function relationshipDraft(recipient: RecipientProfile) {
  const value = recipient.relationship?.trim() ?? "";
  const standard = RELATIONSHIPS.some((item) => item.toLowerCase() === value.toLowerCase());
  return { relationship: standard ? RELATIONSHIPS.find((item) => item.toLowerCase() === value.toLowerCase()) ?? value : value ? "Other" : "", customRelationship: standard ? "" : value };
}

function makeDraft(recipient: RecipientProfile, entries: RecipientInterest[]): Draft {
  const preferences = splitRecipientRecommendationPreferences(entries);
  return {
    name: recipient.name,
    ...relationshipDraft(recipient),
    petType: recipient.pet_type ?? "",
    gender: recipient.gender ?? "",
    birthday: recipient.birthday ?? "",
    annualBudget: numberText(recipient.annual_budget),
    budgetMin: numberText(recipient.gift_budget_min),
    budgetMax: numberText(recipient.gift_budget_max),
    notes: recipient.notes ?? "",
    avatarUrl: recipient.avatar_url ?? "",
    avatarIcon: (recipient.avatar_icon as AvatarIcon | null) ?? "",
    interests: preferences.positive.map((item) => item.label),
    avoidances: preferences.avoidances.join(", "),
  };
}

function initials(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "GP";
}

export function RecipientProfileModal({
  recipient,
  interests,
  savedCount,
  authToken,
  initialTab = "profile",
  initialEditing = false,
  onClose,
  onRecipientUpdated,
  onInterestsUpdated,
  onSavedGiftRemoved,
}: Props) {
  const { user } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [editing, setEditing] = useState(initialEditing);
  const [draft, setDraft] = useState(() => makeDraft(recipient, interests));
  const [baseline, setBaseline] = useState(() => makeDraft(recipient, interests));
  const [customInterest, setCustomInterest] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(baseline);
  const dirtyRef = useRef(dirty);
  const onCloseRef = useRef(onClose);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  dirtyRef.current = dirty;
  onCloseRef.current = onClose;

  const currentInterests = useMemo(
    () => interests.filter((item) => item.recipient_id === recipient.id),
    [interests, recipient.id],
  );
  const selectedKeys = useMemo(
    () => new Set(draft.interests.map(preferenceKey)),
    [draft.interests],
  );
  const interestChoices = useMemo(() => {
    const map = new Map<string, string>();
    [...SUGGESTED_INTERESTS, ...draft.interests].forEach((label) => {
      const normalized = normalizePreferenceLabel(label);
      if (normalized) map.set(preferenceKey(normalized), normalized);
    });
    return [...map.values()];
  }, [draft.interests]);

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (
          !dirtyRef.current ||
          window.confirm("Discard your unsaved recipient changes?")
        ) {
          onCloseRef.current();
        }
      }
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable.at(-1)!;
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, []);

  function confirmDiscard() {
    return !dirty || window.confirm("Discard your unsaved recipient changes?");
  }
  function requestClose() {
    if (confirmDiscard()) onClose();
  }
  function changeTab(next: Tab) {
    if (next === tab || !confirmDiscard()) return;
    if (editing) cancelEditing();
    setTab(next);
  }
  function cancelEditing() {
    setDraft(baseline);
    setCustomInterest("");
    setError("");
    setMessage("");
    setEditing(false);
  }
  function toggleInterest(label: string) {
    const normalized = normalizePreferenceLabel(label);
    const key = preferenceKey(normalized);
    setDraft((current) => ({ ...current, interests: selectedKeys.has(key) ? current.interests.filter((item) => preferenceKey(item) !== key) : [...current.interests, normalized] }));
  }
  function addCustomInterest() {
    const normalized = normalizePreferenceLabel(customInterest);
    if (!normalized) return;
    if (!selectedKeys.has(preferenceKey(normalized))) setDraft((current) => ({ ...current, interests: [...current.interests, normalized] }));
    setCustomInterest("");
  }

  async function uploadAvatar(file: File | undefined) {
    if (!file || !user?.id) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setError("Choose an image smaller than 5 MB.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${user.id}/${recipient.id}-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("recipient-avatars").upload(fileName, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("recipient-avatars").getPublicUrl(fileName);
      setDraft((current) => ({ ...current, avatarUrl: data.publicUrl, avatarIcon: "" }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to upload photo.");
    } finally {
      setUploading(false);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }

  async function save() {
    if (!user?.id || saving) return;
    setError("");
    setMessage("");
    const name = draft.name.trim();
    if (!name) return setError("Name is required.");
    const relationship = draft.relationship === "Other" ? draft.customRelationship.trim() : draft.relationship.trim();
    if (draft.relationship === "Other" && !relationship) return setError("Enter the custom relationship.");
    if (draft.relationship === "Pet" && !draft.petType.trim()) return setError("Choose a pet type.");
    const budgets = validateRecipientBudgets({
      minimum: draft.budgetMin,
      maximum: draft.budgetMax,
      annual: draft.annualBudget,
    });
    if (budgets.error) return setError(budgets.error);
    if (draft.notes.length > 2000) return setError("Additional details must be 2,000 characters or fewer.");

    setSaving(true);
    try {
      const payload = {
        name,
        relationship: relationship || null,
        pet_type: draft.relationship === "Pet" ? draft.petType.trim() || null : null,
        gender: draft.gender || null,
        birthday: draft.birthday || null,
        annual_budget: budgets.annual,
        gift_budget_min: budgets.minimum,
        gift_budget_max: budgets.maximum,
        notes: draft.notes.trim() || null,
        avatar_url: draft.avatarUrl || null,
        avatar_icon: draft.avatarIcon || null,
      };
      const changes = buildRecipientPreferenceChanges(
        currentInterests,
        draft.interests,
        parseRecipientPreferenceList(draft.avoidances),
      );
      const inserts = changes.inserts.map((entry) => ({
        recipient_id: recipient.id,
        ...entry,
      }));

      const { data: updated, error: profileError } = await supabase.from("recipient_profiles").update(payload).eq("id", recipient.id).eq("user_id", user.id).select().single();
      if (profileError) throw profileError;
      if (changes.deleteIds.length) {
        const { error: deleteError } = await supabase
          .from("recipient_interests")
          .delete()
          .eq("recipient_id", recipient.id)
          .in("id", changes.deleteIds);
        if (deleteError) throw deleteError;
      }
      let inserted: RecipientInterest[] = [];
      if (inserts.length) {
        const { data, error: insertError } = await supabase.from("recipient_interests").insert(inserts).select();
        if (insertError) throw insertError;
        inserted = (data ?? []) as RecipientInterest[];
      }
      const retained = currentInterests.filter(
        (item) => !changes.deleteIds.includes(item.id),
      );
      const nextInterests = [...retained, ...inserted];
      const nextDraft = makeDraft(updated as RecipientProfile, nextInterests);
      onRecipientUpdated(updated as RecipientProfile);
      onInterestsUpdated(recipient.id, nextInterests);
      setDraft(nextDraft);
      setBaseline(nextDraft);
      setEditing(false);
      setMessage("Profile changes saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save profile changes.");
    } finally {
      setSaving(false);
    }
  }

  const avatar = draft.avatarUrl
    ? { src: draft.avatarUrl, alt: `${draft.name || recipient.name} avatar`, custom: true }
    : AVATARS.find((item) => item.key === draft.avatarIcon)
      ? { src: AVATARS.find((item) => item.key === draft.avatarIcon)!.src, alt: AVATARS.find((item) => item.key === draft.avatarIcon)!.label, custom: false }
      : null;
  const summary = recipient.notes?.trim() || (draft.interests.length ? `Enjoys ${draft.interests.slice(0, 3).join(", ")}.` : "Add interests and details to improve personalized recommendations.");

  return (
    <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <div ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="recipient-profile-title">
        <header className={styles.header}>
          <div><p>RECIPIENT PROFILE</p><h1 id="recipient-profile-title">{recipient.name}</h1></div>
          <button ref={closeRef} type="button" onClick={requestClose} aria-label="Close recipient profile"><X aria-hidden="true" /></button>
        </header>
        <div className={styles.intro}>
          <div className={styles.avatarWrap}>
            <span className={styles.avatar}>{avatar ? <Image src={avatar.src} alt={avatar.alt} width={108} height={108} unoptimized className={avatar.custom ? undefined : styles.preset} /> : initials(draft.name)}</span>
            {editing ? <><input ref={uploadRef} type="file" accept="image/*" hidden onChange={(event) => void uploadAvatar(event.target.files?.[0])} /><button type="button" className={styles.camera} onClick={() => uploadRef.current?.click()} disabled={uploading} aria-label="Upload recipient photo"><Camera aria-hidden="true" /></button></> : null}
          </div>
          <div className={styles.identity}><h2>{draft.name || recipient.name}</h2><p>{draft.relationship === "Other" ? draft.customRelationship : draft.relationship || "Relationship TBD"}</p><span>{summary}</span></div>
          <nav className={styles.tabs} aria-label="Recipient profile sections">
            <button type="button" aria-current={tab === "profile" ? "page" : undefined} onClick={() => changeTab("profile")}><UserRound aria-hidden="true" />Profile</button>
            <button type="button" aria-current={tab === "saved" ? "page" : undefined} onClick={() => changeTab("saved")}><Bookmark aria-hidden="true" />Saved Gifts{savedCount !== null ? ` (${savedCount})` : ""}</button>
            <Link aria-label="Gift History" href={`/history?recipient=${encodeURIComponent(recipient.id)}`} onClick={(event) => { if (!confirmDiscard()) event.preventDefault(); }}><Clock3 aria-hidden="true" /><span className={styles.desktopHistoryLabel}>Gift History</span><span className={styles.mobileHistoryLabel}>History</span></Link>
          </nav>
          {tab === "profile" ? editing ? <button type="button" className={`${APP_GOLD_ACTION} ${styles.topAction}`} onClick={() => void save()} disabled={saving}><Save aria-hidden="true" />{saving ? "Saving..." : "Save Changes"}</button> : <button type="button" className={`${APP_GOLD_ACTION} ${styles.topAction}`} onClick={() => { setMessage(""); setEditing(true); }}><Pencil aria-hidden="true" />Edit Profile</button> : null}
        </div>

        {tab === "saved" ? (
          <SavedGiftIdeasModal recipientId={recipient.id} recipientName={recipient.name} recipientAvatarUrl={recipient.avatar_url} recipientAvatarIcon={recipient.avatar_icon} isOpen onClose={() => changeTab("profile")} authToken={authToken} presentation="embedded" onSavedGiftRemoved={(recipientId) => onSavedGiftRemoved(recipientId)} />
        ) : (
          <div className={styles.body}>
            {(error || message) && <p role={error ? "alert" : "status"} className={error ? styles.error : styles.message}>{error || message}</p>}
            <div className={styles.columns}>
              <div className={styles.column}>
                <section className={styles.section}>
                  <div className={styles.sectionTitle}><span><UserRound aria-hidden="true" /></span><h3>Basic information</h3></div>
                  {editing ? <div className={styles.fields}>
                    <label className={styles.full}>Name *<input maxLength={80} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
                    <label>Relationship<select value={draft.relationship} onChange={(event) => setDraft({ ...draft, relationship: event.target.value, customRelationship: event.target.value === "Other" ? draft.customRelationship : "", petType: event.target.value === "Pet" ? draft.petType : "" })}><option value="">Not set</option>{RELATIONSHIPS.map((item) => <option key={item}>{item}</option>)}<option>Other</option></select></label>
                    <label>Gender<select value={draft.gender} onChange={(event) => setDraft({ ...draft, gender: event.target.value })}><option value="">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></label>
                    {draft.relationship === "Other" && <label className={styles.full}>Custom relationship<input value={draft.customRelationship} onChange={(event) => setDraft({ ...draft, customRelationship: event.target.value })} /></label>}
                    {draft.relationship === "Pet" && <label className={styles.full}>Pet type<select value={draft.petType} onChange={(event) => setDraft({ ...draft, petType: event.target.value })}><option value="">Select pet type</option>{["Dog", "Cat", "Bird", "Small animal", "Other"].map((item) => <option key={item}>{item}</option>)}</select></label>}
                    <label className={styles.full}>Birthday<input type="date" value={draft.birthday} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setDraft({ ...draft, birthday: event.target.value })} /></label>
                    <div className={`${styles.full} ${styles.avatarChoices}`}><span>Avatar</span>{AVATARS.map((item) => <button key={item.key} type="button" aria-pressed={draft.avatarIcon === item.key} title={item.label} onClick={() => setDraft({ ...draft, avatarIcon: item.key, avatarUrl: "" })}><Image src={item.src} alt="" width={34} height={34} unoptimized /></button>)}</div>
                  </div> : <dl className={styles.readGrid}><div><dt>Name</dt><dd>{recipient.name}</dd></div><div><dt>Relationship</dt><dd>{recipient.relationship || "Not set"}</dd></div><div><dt>Gender</dt><dd>{recipient.gender ? recipient.gender[0].toUpperCase() + recipient.gender.slice(1) : "Not set"}</dd></div><div><dt>Birthday</dt><dd>{recipient.birthday ? new Date(`${recipient.birthday}T12:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "Not set"}</dd></div></dl>}
                </section>
                <section className={styles.section}>
                  <div className={styles.sectionTitle}><span><Tag aria-hidden="true" /></span><h3>Budget preferences</h3></div>
                  {editing ? <div className={styles.fields}><label>Minimum per gift<div className={styles.money}><span>$</span><input type="number" min="0" step="1" value={draft.budgetMin} onChange={(event) => setDraft({ ...draft, budgetMin: event.target.value })} /></div></label><label>Maximum per gift<div className={styles.money}><span>$</span><input type="number" min="0" step="1" value={draft.budgetMax} onChange={(event) => setDraft({ ...draft, budgetMax: event.target.value })} /></div></label><label className={styles.full}>Annual budget<div className={styles.money}><span>$</span><input type="number" min="0" step="1" value={draft.annualBudget} onChange={(event) => setDraft({ ...draft, annualBudget: event.target.value })} /></div></label></div> : <dl className={styles.readGrid}><div><dt>Typical per-gift range</dt><dd>{recipient.gift_budget_min === null && recipient.gift_budget_max === null ? "Not set" : `${recipient.gift_budget_min === null ? "$0" : `$${recipient.gift_budget_min}`}–${recipient.gift_budget_max === null ? "No maximum" : `$${recipient.gift_budget_max}`}`}</dd></div><div><dt>Annual budget</dt><dd>{recipient.annual_budget === null ? "Not set" : `$${recipient.annual_budget}`}</dd></div></dl>}
                </section>
              </div>
              <div className={styles.column}>
                <section className={styles.section}>
                  <div className={styles.sectionTitle}><span><Heart aria-hidden="true" /></span><div><h3>Interests &amp; hobbies</h3><p>Help PerchPal focus on genuinely relevant gifts.</p></div></div>
                  {editing && <div className={styles.addInterest}><input value={customInterest} maxLength={80} placeholder="Add an interest" onChange={(event) => setCustomInterest(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustomInterest(); } }} /><button type="button" className={APP_GOLD_ACTION} onClick={addCustomInterest}><Plus aria-hidden="true" />Add</button></div>}
                  <div className={styles.chips}>{interestChoices.map((label) => { const selected = selectedKeys.has(preferenceKey(label)); if (!editing && !selected) return null; return <button key={preferenceKey(label)} type="button" disabled={!editing} aria-pressed={selected} className={selected ? styles.selectedChip : styles.chip} onClick={() => toggleInterest(label)}>{label}{selected && <Check aria-hidden="true" />}</button>; })}{!editing && !draft.interests.length && <p className={styles.emptyText}>No interests saved yet.</p>}</div>
                </section>
                <section className={styles.section}>
                  <div className={styles.sectionTitle}><span><CalendarDays aria-hidden="true" /></span><div><h3>Additional details</h3><p>Favorite activities, styles, items they own, and other useful context.</p></div></div>
                  {editing ? <label className={styles.textarea}><span className="sr-only">Additional details</span><textarea rows={5} maxLength={2000} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /><small>{draft.notes.length}/2000</small></label> : <p className={styles.detailText}>{recipient.notes?.trim() || "No additional details saved yet."}</p>}
                </section>
                <section className={styles.section}>
                  <div className={styles.sectionTitle}><span><Ban aria-hidden="true" /></span><div><h3>Things to avoid <small>(optional)</small></h3><p>Unsuitable categories, disliked items, or gifts they already own.</p></div></div>
                  {editing ? <label className={styles.textarea}><span className="sr-only">Things to avoid</span><textarea rows={3} maxLength={500} placeholder="e.g. clothing, gift cards, duplicate mugs" value={draft.avoidances} onChange={(event) => setDraft({ ...draft, avoidances: event.target.value })} /><small>{draft.avoidances.length}/500</small></label> : <div className={styles.avoidList}>{parseRecipientPreferenceList(draft.avoidances).map((item) => <span key={preferenceKey(item)}>{item}</span>)}{!parseRecipientPreferenceList(draft.avoidances).length && <p className={styles.emptyText}>Nothing listed.</p>}</div>}
                </section>
              </div>
            </div>
            <footer className={styles.footer}>{editing ? <button type="button" className={styles.cancel} onClick={cancelEditing}>Cancel Editing</button> : <Link className={APP_EVERGREEN_ACTION} href={`/gifts?recipientId=${encodeURIComponent(recipient.id)}`}>Get Gift Ideas</Link>}</footer>
          </div>
        )}
      </div>
    </div>
  );
}
