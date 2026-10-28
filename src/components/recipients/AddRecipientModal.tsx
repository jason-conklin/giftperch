"use client";

import Image from "next/image";
import {
  Ban,
  CalendarDays,
  Camera,
  Check,
  Heart,
  Plus,
  Tag,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { APP_GOLD_ACTION } from "@/components/ui/appActionStyles";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";
import { getRecipientInitialAvatarStyle } from "@/lib/recipientAvatar";
import {
  buildRecipientPreferenceChanges,
  normalizePreferenceLabel,
  parseRecipientPreferenceList,
  preferenceKey,
  validateRecipientBudgets,
} from "@/lib/recipientRecommendationContext";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import type { RecipientInterest, RecipientProfile } from "./RecipientsManager";
import styles from "./RecipientProfileModal.module.css";
import {
  RECIPIENT_AVATARS,
  RECIPIENT_PET_TYPES,
  RECIPIENT_RELATIONSHIPS,
  SUGGESTED_RECIPIENT_INTERESTS,
  type RecipientAvatarIcon,
} from "./recipientFormOptions";

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
  avatarIcon: RecipientAvatarIcon | "";
  interests: string[];
  avoidances: string;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  relationship: "",
  customRelationship: "",
  petType: "",
  gender: "",
  birthday: "",
  annualBudget: "",
  budgetMin: "",
  budgetMax: "",
  notes: "",
  avatarUrl: "",
  avatarIcon: "",
  interests: [],
  avoidances: "",
};

type Props = {
  onClose: () => void;
  onProfilePersisted: (recipient: RecipientProfile) => void;
  onInterestsPersisted: (
    recipientId: string,
    interests: RecipientInterest[],
  ) => void;
  onComplete: () => void;
};

function initials(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "GP";
}

export function AddRecipientModal({
  onClose,
  onProfilePersisted,
  onInterestsPersisted,
  onComplete,
}: Props) {
  const { user } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [customInterest, setCustomInterest] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingRecipient, setPendingRecipient] =
    useState<RecipientProfile | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(EMPTY_DRAFT);
  const dirtyRef = useRef(dirty);
  const pendingRef = useRef(pendingRecipient);
  const onCloseRef = useRef(onClose);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const selectedKeys = useMemo(
    () => new Set(draft.interests.map(preferenceKey)),
    [draft.interests],
  );
  const interestChoices = useMemo(() => {
    const choices = new Map<string, string>();
    [...SUGGESTED_RECIPIENT_INTERESTS, ...draft.interests].forEach((label) => {
      const normalized = normalizePreferenceLabel(label);
      if (normalized) choices.set(preferenceKey(normalized), normalized);
    });
    return [...choices.values()];
  }, [draft.interests]);
  const selectedAvatar = RECIPIENT_AVATARS.find(
    (item) => item.key === draft.avatarIcon,
  );

  useEffect(() => {
    dirtyRef.current = dirty;
    pendingRef.current = pendingRecipient;
    onCloseRef.current = onClose;
  }, [dirty, onClose, pendingRecipient]);

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (
          (!dirtyRef.current && !pendingRef.current) ||
          window.confirm("Discard your unsaved recipient changes?")
        ) {
          onCloseRef.current();
        }
      }
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable.at(-1)!;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, []);

  function requestClose() {
    if (
      (!dirty && !pendingRecipient) ||
      window.confirm("Discard your unsaved recipient changes?")
    ) {
      onClose();
    }
  }

  function toggleInterest(label: string) {
    const normalized = normalizePreferenceLabel(label);
    const key = preferenceKey(normalized);
    setDraft((current) => ({
      ...current,
      interests: selectedKeys.has(key)
        ? current.interests.filter((item) => preferenceKey(item) !== key)
        : [...current.interests, normalized],
    }));
  }

  function addCustomInterest() {
    const normalized = normalizePreferenceLabel(customInterest);
    if (!normalized) return;
    if (!selectedKeys.has(preferenceKey(normalized))) {
      setDraft((current) => ({
        ...current,
        interests: [...current.interests, normalized],
      }));
    }
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
      const fileName = `${user.id}/new-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("recipient-avatars")
        .upload(fileName, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage
        .from("recipient-avatars")
        .getPublicUrl(fileName);
      setDraft((current) => ({
        ...current,
        avatarUrl: data.publicUrl,
        avatarIcon: "",
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to upload photo.");
    } finally {
      setUploading(false);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError("");
    if (!user?.id) return setError("You must be signed in to save a recipient.");
    const name = draft.name.trim();
    if (!name) return setError("Name is required.");
    const relationship = draft.relationship === "Other"
      ? draft.customRelationship.trim()
      : draft.relationship.trim();
    if (draft.relationship === "Other" && !relationship) {
      return setError("Enter the custom relationship.");
    }
    if (draft.relationship === "Pet" && !draft.petType.trim()) {
      return setError("Choose a pet type.");
    }
    const budgets = validateRecipientBudgets({
      minimum: draft.budgetMin,
      maximum: draft.budgetMax,
      annual: draft.annualBudget,
    });
    if (budgets.error) return setError(budgets.error);
    if (draft.notes.length > 2000) {
      return setError("Additional details must be 2,000 characters or fewer.");
    }

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

    setSaving(true);
    let stage: "profile" | "preferences" = "profile";
    try {
      let profile = pendingRecipient;
      if (profile) {
        const { data, error: updateError } = await supabase
          .from("recipient_profiles")
          .update(payload)
          .eq("id", profile.id)
          .eq("user_id", user.id)
          .select()
          .single();
        if (updateError) throw updateError;
        profile = data as RecipientProfile;
      } else {
        const { data, error: insertError } = await supabase
          .from("recipient_profiles")
          .insert({ ...payload, user_id: user.id, is_self: false })
          .select()
          .single();
        if (insertError) throw insertError;
        profile = data as RecipientProfile;
      }
      setPendingRecipient(profile);
      onProfilePersisted(profile);
      stage = "preferences";

      const { data: existingRows, error: existingError } = await supabase
        .from("recipient_interests")
        .select("*")
        .eq("recipient_id", profile.id);
      if (existingError) throw existingError;
      const existing = (existingRows ?? []) as RecipientInterest[];
      const changes = buildRecipientPreferenceChanges(
        existing,
        draft.interests,
        parseRecipientPreferenceList(draft.avoidances),
      );
      if (changes.deleteIds.length) {
        const { error: deleteError } = await supabase
          .from("recipient_interests")
          .delete()
          .eq("recipient_id", profile.id)
          .in("id", changes.deleteIds);
        if (deleteError) throw deleteError;
      }
      let inserted: RecipientInterest[] = [];
      if (changes.inserts.length) {
        const { data, error: preferenceError } = await supabase
          .from("recipient_interests")
          .insert(changes.inserts.map((entry) => ({
            recipient_id: profile.id,
            ...entry,
          })))
          .select();
        if (preferenceError) throw preferenceError;
        inserted = (data ?? []) as RecipientInterest[];
      }
      const retained = existing.filter(
        (item) => !changes.deleteIds.includes(item.id),
      );
      onInterestsPersisted(profile.id, [...retained, ...inserted]);
      onComplete();
    } catch (caught) {
      const reason = caught instanceof Error ? caught.message : "Unknown error";
      if (stage === "preferences") {
        setError(`The recipient profile was saved, but preferences could not be saved. Review the form and retry without creating a duplicate. ${reason}`);
      } else if (pendingRecipient) {
        setError(`The recipient already exists, but the latest profile changes could not be saved. Retry without creating a duplicate. ${reason}`);
      } else {
        setError(`Unable to create the recipient. ${reason}`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <div ref={dialogRef} className={`${styles.dialog} ${styles.createDialog}`} role="dialog" aria-modal="true" aria-labelledby="add-recipient-title">
        <header className={styles.header}>
          <div><p>NEW RECIPIENT</p><h1 id="add-recipient-title">Add a recipient profile</h1></div>
          <button ref={closeRef} type="button" onClick={requestClose} aria-label="Close recipient form"><X aria-hidden="true" /></button>
        </header>
        <form className={styles.createForm} onSubmit={save}>
          <div className={`${styles.body} ${styles.createBody}`}>
            {error ? <p role="alert" className={styles.error}>{error}</p> : null}
            <div className={styles.columns}>
              <div className={styles.column}>
                <section className={styles.section}>
                  <div className={styles.sectionTitle}><span><UserRound aria-hidden="true" /></span><h3>Basic information</h3></div>
                  <div className={styles.createAvatarRow}>
                    <span className={styles.createAvatar} style={draft.avatarUrl || selectedAvatar ? undefined : getRecipientInitialAvatarStyle(draft.gender)}>
                      {draft.avatarUrl ? <Image src={draft.avatarUrl} alt={`${draft.name || "Recipient"} avatar`} width={72} height={72} unoptimized /> : selectedAvatar ? <Image src={selectedAvatar.src} alt={selectedAvatar.label} width={58} height={58} unoptimized className={styles.preset} /> : initials(draft.name)}
                    </span>
                    <div className={styles.createAvatarActions}>
                      <input ref={uploadRef} type="file" accept="image/*" hidden onChange={(event) => void uploadAvatar(event.target.files?.[0])} />
                      <button type="button" className={APP_GOLD_ACTION} onClick={() => uploadRef.current?.click()} disabled={uploading}><Camera aria-hidden="true" />{uploading ? "Uploading..." : "Upload photo"}</button>
                      {(draft.avatarUrl || draft.avatarIcon) ? <button type="button" className={styles.removeAvatar} onClick={() => setDraft((current) => ({ ...current, avatarUrl: "", avatarIcon: "" }))}>Remove avatar</button> : null}
                    </div>
                  </div>
                  <div className={styles.fields}>
                    <label className={styles.full}>Name *<input autoFocus required maxLength={80} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
                    <label>Relationship<select value={draft.relationship} onChange={(event) => setDraft({ ...draft, relationship: event.target.value, customRelationship: event.target.value === "Other" ? draft.customRelationship : "", petType: event.target.value === "Pet" ? draft.petType : "" })}><option value="">Not set</option>{RECIPIENT_RELATIONSHIPS.map((item) => <option key={item}>{item}</option>)}<option>Other</option></select></label>
                    <label>Gender<select value={draft.gender} onChange={(event) => setDraft({ ...draft, gender: event.target.value })}><option value="">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></label>
                    {draft.relationship === "Other" ? <label className={styles.full}>Custom relationship<input value={draft.customRelationship} onChange={(event) => setDraft({ ...draft, customRelationship: event.target.value })} /></label> : null}
                    {draft.relationship === "Pet" ? <label className={styles.full}>Pet type<select value={draft.petType} onChange={(event) => setDraft({ ...draft, petType: event.target.value })}><option value="">Select pet type</option>{RECIPIENT_PET_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label> : null}
                    <label className={styles.full}>Birthday<input type="date" value={draft.birthday} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setDraft({ ...draft, birthday: event.target.value })} /></label>
                    <div className={`${styles.full} ${styles.avatarChoices}`}><span>Preset avatar</span>{RECIPIENT_AVATARS.map((item) => <button key={item.key} type="button" aria-pressed={draft.avatarIcon === item.key} title={item.label} onClick={() => setDraft({ ...draft, avatarIcon: draft.avatarIcon === item.key ? "" : item.key, avatarUrl: "" })}><Image src={item.src} alt="" width={34} height={34} unoptimized /></button>)}</div>
                  </div>
                </section>
                <section className={styles.section}>
                  <div className={styles.sectionTitle}><span><Tag aria-hidden="true" /></span><h3>Budget preferences</h3></div>
                  <div className={styles.fields}>
                    <label>Minimum per gift<div className={styles.money}><span>$</span><input type="number" min="0" step="1" value={draft.budgetMin} onChange={(event) => setDraft({ ...draft, budgetMin: event.target.value })} /></div></label>
                    <label>Maximum per gift<div className={styles.money}><span>$</span><input type="number" min="0" step="1" value={draft.budgetMax} onChange={(event) => setDraft({ ...draft, budgetMax: event.target.value })} /></div></label>
                    <label className={styles.full}>Annual budget<div className={styles.money}><span>$</span><input type="number" min="0" step="1" value={draft.annualBudget} onChange={(event) => setDraft({ ...draft, annualBudget: event.target.value })} /></div></label>
                  </div>
                </section>
              </div>
              <div className={styles.column}>
                <section className={styles.section}>
                  <div className={styles.sectionTitle}><span><Heart aria-hidden="true" /></span><div><h3>Interests &amp; hobbies</h3><p>Select a few interests to improve gift recommendations.</p></div></div>
                  <div className={styles.addInterest}><input value={customInterest} maxLength={80} placeholder="Add an interest" onChange={(event) => setCustomInterest(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustomInterest(); } }} /><button type="button" className={APP_GOLD_ACTION} onClick={addCustomInterest}><Plus aria-hidden="true" />Add</button></div>
                  <div className={styles.chips}>{interestChoices.map((label) => { const selected = selectedKeys.has(preferenceKey(label)); return <button key={preferenceKey(label)} type="button" aria-pressed={selected} className={selected ? styles.selectedChip : styles.chip} onClick={() => toggleInterest(label)}>{label}{selected ? <Check aria-hidden="true" /> : null}</button>; })}</div>
                </section>
                <section className={styles.section}>
                  <div className={styles.sectionTitle}><span><CalendarDays aria-hidden="true" /></span><div><h3>Additional details</h3><p>Describe their personality, preferences, or anything else that may help PerchPal.</p></div></div>
                  <label className={styles.textarea}><span className="sr-only">Additional details</span><textarea rows={5} maxLength={2000} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /><small>{draft.notes.length}/2000</small></label>
                </section>
                <section className={styles.section}>
                  <div className={styles.sectionTitle}><span><Ban aria-hidden="true" /></span><div><h3>Things to avoid <small>(optional)</small></h3><p>Add unsuitable categories, disliked items, or gifts they already own.</p></div></div>
                  <label className={styles.textarea}><span className="sr-only">Things to avoid</span><textarea rows={3} maxLength={500} placeholder="e.g. clothing, gift cards, duplicate mugs" value={draft.avoidances} onChange={(event) => setDraft({ ...draft, avoidances: event.target.value })} /><small>{draft.avoidances.length}/500</small></label>
                </section>
              </div>
            </div>
            <footer className={`${styles.footer} ${styles.createFooter}`}><button type="submit" className={`${APP_GOLD_ACTION} ${styles.createAction}`} disabled={saving}>{saving ? "Creating..." : pendingRecipient ? "Retry Preferences" : "Create Recipient"}</button></footer>
          </div>
        </form>
      </div>
    </div>
  );
}
