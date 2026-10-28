import {
  RECIPIENT_AVATAR_OPTIONS,
  type RecipientAvatarIcon,
} from "@/lib/recipientAvatar";

export type { RecipientAvatarIcon };

export const RECIPIENT_RELATIONSHIPS = [
  "Mother",
  "Father",
  "Sister",
  "Brother",
  "Cousin",
  "Aunt",
  "Uncle",
  "Daughter",
  "Son",
  "Boyfriend",
  "Girlfriend",
  "Fiance",
  "Spouse",
  "Friend",
  "Coworker",
  "Grandparent",
  "Pet",
] as const;

export const RECIPIENT_PET_TYPES = [
  "Dog",
  "Cat",
  "Bird",
  "Small animal",
  "Other",
] as const;

export const SUGGESTED_RECIPIENT_INTERESTS = [
  "Outdoors",
  "Fishing",
  "Cooking",
  "Reading",
  "Coffee",
  "Gardening",
  "Gaming",
  "Sports",
  "Travel",
  "Music",
  "Art",
  "Jewelry",
  "Technology",
  "Fitness",
  "Pets",
  "Home decor",
] as const;

export const RECIPIENT_AVATARS = RECIPIENT_AVATAR_OPTIONS;
