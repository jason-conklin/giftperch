import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSharedProfileImportPayload,
  buildSharedProfilePreferenceInserts,
  excludeExistingSharedProfilePreferences,
  splitSharedProfilePreferences,
} from "./selfProfileSharing";

const profile = {
  name: "Alex Morgan",
  notes: "Likes practical, cozy gifts.",
  birthday: "1990-04-12",
  avatar_url: "https://images.example/alex.jpg",
  avatar_icon: null,
  interests: [
    { label: "Coffee", category: "interest" },
    { label: "  Coffee ", category: "interest" },
    { label: "Duplicate mugs", category: "avoid" },
  ],
};

test("shared profile imports retain recipient preferences but not profile-owner budgets", () => {
  const payload = buildSharedProfileImportPayload(profile, {
    relationship: "Friend",
    petType: null,
    annualBudget: 240,
    giftBudgetMin: 25,
    giftBudgetMax: 60,
  });

  assert.deepEqual(payload, {
    name: "Alex Morgan",
    relationship: "Friend",
    pet_type: null,
    notes: "Likes practical, cozy gifts.",
    birthday: "1990-04-12",
    avatar_url: "https://images.example/alex.jpg",
    avatar_icon: null,
    annual_budget: 240,
    gift_budget_min: 25,
    gift_budget_max: 60,
    is_self: false,
  });
});

test("shared profile preferences preserve avoids separately from positive interests", () => {
  assert.deepEqual(splitSharedProfilePreferences(profile.interests), {
    interests: ["Coffee"],
    avoidances: ["Duplicate mugs"],
  });

  assert.deepEqual(buildSharedProfilePreferenceInserts("recipient-1", profile.interests), [
    { recipient_id: "recipient-1", label: "Coffee", category: "interest" },
    { recipient_id: "recipient-1", label: "Duplicate mugs", category: "avoid" },
  ]);
});

test("a retry only inserts shared preferences that are not already persisted", () => {
  const rows = buildSharedProfilePreferenceInserts("recipient-1", profile.interests);
  assert.deepEqual(
    excludeExistingSharedProfilePreferences(rows, [
      { label: "Coffee", category: "interest" },
    ]),
    [{ recipient_id: "recipient-1", label: "Duplicate mugs", category: "avoid" }],
  );
});
