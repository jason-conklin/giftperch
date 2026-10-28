export type RecipientAvatarIcon =
  | "babyboy"
  | "babygirl"
  | "boy"
  | "girl"
  | "man"
  | "woman"
  | "dog"
  | "cat";

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

export const RECIPIENT_AVATARS: ReadonlyArray<{
  key: RecipientAvatarIcon;
  label: string;
  src: string;
}> = [
  { key: "babyboy", label: "Baby boy", src: "/babyboy_icon.png" },
  { key: "babygirl", label: "Baby girl", src: "/babygirl_icon.png" },
  { key: "boy", label: "Boy", src: "/boy_icon.png" },
  { key: "girl", label: "Girl", src: "/girl_icon.png" },
  { key: "man", label: "Man", src: "/man_icon.png" },
  { key: "woman", label: "Woman", src: "/woman_icon.png" },
  { key: "dog", label: "Dog", src: "/dog_icon.png" },
  { key: "cat", label: "Cat", src: "/cat_icon.png" },
];
