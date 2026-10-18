import assert from "node:assert/strict";
import test from "node:test";
import { planFeedbackMigration } from "./feedbackMigration";

const run = {
  id: "run-1",
  userId: "user-1",
  recipientId: "recipient-1",
  suggestions: [{ title: "Fishing Reel Kit" }, { title: "Kayak Rack" }],
};

test("plans liked feedback conversion and disliked feedback removal", () => {
  const decisions = planFeedbackMigration(
    [
      {
        id: "feedback-1",
        userId: "user-1",
        recipientId: "recipient-1",
        suggestionId: "run-1",
        suggestionIndex: 0,
        preference: "liked",
      },
      {
        id: "feedback-2",
        userId: "user-1",
        recipientId: "recipient-1",
        suggestionId: "run-1",
        suggestionIndex: 1,
        preference: "disliked",
      },
    ],
    [run],
    [],
  );

  assert.deepEqual(decisions, [
    { feedbackId: "feedback-1", status: "convert", title: "Fishing Reel Kit" },
    { feedbackId: "feedback-2", status: "discard-disliked" },
  ]);
});

test("classifies existing titles and previously migrated feedback as duplicates", () => {
  const feedback = {
    id: "feedback-1",
    userId: "user-1",
    recipientId: "recipient-1",
    suggestionId: "run-1",
    suggestionIndex: 0,
    preference: "liked" as const,
  };

  assert.equal(
    planFeedbackMigration([feedback], [run], [
      {
        userId: "user-1",
        recipientId: "recipient-1",
        title: "  FISHING reel kit! ",
      },
    ])[0]?.status,
    "duplicate",
  );
  assert.equal(
    planFeedbackMigration([feedback], [run], [
      {
        userId: "user-1",
        recipientId: "recipient-1",
        title: "Another idea",
        sourceFeedbackId: "feedback-1",
      },
    ])[0]?.status,
    "duplicate",
  );
});

test("rejects orphaned, mismatched, and invalid liked feedback", () => {
  const base = {
    userId: "user-1",
    recipientId: "recipient-1",
    suggestionIndex: 0,
    preference: "liked" as const,
  };
  const decisions = planFeedbackMigration(
    [
      { ...base, id: "missing", suggestionId: "missing-run" },
      { ...base, id: "mismatch", suggestionId: "foreign-run" },
      { ...base, id: "bad-index", suggestionId: "run-1", suggestionIndex: 99 },
    ],
    [
      run,
      { ...run, id: "foreign-run", userId: "user-2" },
    ],
    [],
  );

  assert.deepEqual(
    decisions.map((decision) =>
      decision.status === "unconvertible" ? decision.reason : decision.status,
    ),
    ["missing-run", "ownership-mismatch", "invalid-suggestion"],
  );
});

test("uses affiliate product identity before generated title", () => {
  const productMatch = {
    provider: "awin",
    productId: "reel-1",
    merchant: "Piscifun",
    productTitle: "Carbon XCS Reel",
    imageUrl: "https://images.example.test/reel.jpg",
    price: 104.99,
    currency: "USD",
    affiliateUrl: "https://www.awin1.com/cread.php?id=1",
  };
  const feedback = {
    id: "feedback-product",
    userId: "user-1",
    recipientId: "recipient-1",
    suggestionId: "run-product",
    suggestionIndex: 0,
    preference: "liked" as const,
  };
  const productRun = {
    ...run,
    id: "run-product",
    suggestions: [{ title: "A Better Fishing Reel", productMatch }],
  };

  assert.equal(
    planFeedbackMigration([feedback], [productRun], [
      {
        userId: "user-1",
        recipientId: "recipient-1",
        title: "Premium Reel",
        productMatch,
      },
    ])[0]?.status,
    "duplicate",
  );

  assert.equal(
    planFeedbackMigration([feedback], [productRun], [
      {
        userId: "user-1",
        recipientId: "recipient-1",
        title: "A Better Fishing Reel",
        productMatch: { ...productMatch, productId: "reel-2" },
      },
    ])[0]?.status,
    "convert",
  );
});
