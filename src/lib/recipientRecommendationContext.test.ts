import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRecipientPreferenceChanges,
  normalizePreferenceLabel,
  parseRecipientPreferenceList,
  splitRecipientRecommendationPreferences,
  validateRecipientBudgets,
} from "./recipientRecommendationContext";

test("normalizes whitespace and separates avoidances from positive interests", () => {
  assert.equal(normalizePreferenceLabel("  Cozy   reading  "), "Cozy reading");
  assert.deepEqual(
    splitRecipientRecommendationPreferences([
      { label: " Fishing ", category: "interest" },
      { label: "fishing", category: "vibe" },
      { label: " gift   cards ", category: "avoid" },
      { label: "Gift Cards", category: "avoid" },
      { label: " ", category: "avoid" },
    ]),
    {
      positive: [{ label: "Fishing", category: "interest" }],
      avoidances: ["gift cards"],
    },
  );
});

test("legacy categories remain positive and are not reinterpreted", () => {
  assert.deepEqual(
    splitRecipientRecommendationPreferences([
      { label: "Minimalist", category: "vibe" },
      { label: "Practical", category: "personality" },
      { label: "Legacy brand", category: "brand" },
    ]).positive.map((entry) => entry.label),
    ["Minimalist", "Practical", "Legacy brand"],
  );
});

test("preference changes preserve categories, prevent duplicates, and isolate avoidances", () => {
  assert.deepEqual(
    buildRecipientPreferenceChanges(
      [
        { id: "fishing", label: "Fishing", category: "vibe" },
        { id: "duplicate", label: " fishing ", category: "interest" },
        { id: "old-avoid", label: "Gift cards", category: "avoid" },
        { id: "removed", label: "Gaming", category: "interest" },
      ],
      ["Fishing", "Reading", " reading "],
      ["Gift cards", "Clothing"],
    ),
    {
      deleteIds: ["duplicate", "removed"],
      inserts: [
        { label: "Reading", category: "interest" },
        { label: "Clothing", category: "avoid" },
      ],
    },
  );
  assert.deepEqual(parseRecipientPreferenceList(" clothing, Gift cards\nclothing "), [
    "clothing",
    "Gift cards",
  ]);
});

test("budget validation accepts optional values and rejects invalid ranges", () => {
  assert.deepEqual(
    validateRecipientBudgets({ minimum: "20", maximum: "60", annual: "" }),
    { minimum: 20, maximum: 60, annual: null, error: null },
  );
  assert.equal(
    validateRecipientBudgets({ minimum: "80", maximum: "40", annual: "" })
      .error,
    "Per-gift minimum cannot be greater than the maximum.",
  );
  assert.equal(
    validateRecipientBudgets({ minimum: "-1", maximum: "40", annual: "" })
      .error,
    "Budgets must be zero or positive numbers.",
  );
});
