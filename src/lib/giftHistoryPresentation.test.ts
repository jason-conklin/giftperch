import assert from "node:assert/strict";
import test from "node:test";
import {
  GIFT_HISTORY_IMAGE_FALLBACK,
  formatGiftHistoryPrice,
  formatSavedIdeaPrice,
  resolveGiftHistoryImage,
  resolveHistoryRecipientAvatar,
  sortGiftHistoryEntries,
  sortSavedIdeas,
} from "./giftHistoryPresentation";

test("formats recorded and missing gift prices without inventing values", () => {
  assert.equal(formatGiftHistoryPrice(129.99), "$129.99");
  assert.equal(formatGiftHistoryPrice(0), "$0.00");
  assert.equal(formatGiftHistoryPrice(null), "Price not recorded");
});

test("resolves custom, preset, and initials recipient avatars", () => {
  assert.deepEqual(
    resolveHistoryRecipientAvatar({
      name: "Maya Stone",
      avatar_url: "https://images.example.com/maya.jpg",
      avatar_icon: null,
    }),
    {
      kind: "image",
      src: "https://images.example.com/maya.jpg",
      fallbackInitials: "MS",
    },
  );
  assert.equal(
    resolveHistoryRecipientAvatar({
      name: "Dad",
      avatar_url: null,
      avatar_icon: "man",
    }).kind,
    "image",
  );
  assert.deepEqual(resolveHistoryRecipientAvatar(undefined), {
    kind: "initials",
    initials: "GP",
  });
});

test("rejects unsafe product images and uses the local fallback", () => {
  assert.equal(
    resolveGiftHistoryImage("https://images.example.com/gift.jpg"),
    "https://images.example.com/gift.jpg",
  );
  assert.equal(
    resolveGiftHistoryImage("javascript:alert(1)"),
    GIFT_HISTORY_IMAGE_FALLBACK,
  );
  assert.equal(resolveGiftHistoryImage(null), GIFT_HISTORY_IMAGE_FALLBACK);
});

test("sorts gift history while keeping missing prices last", () => {
  const gifts = [
    {
      id: "old",
      purchased_at: "2026-01-01T12:00:00Z",
      created_at: "2026-01-01T12:00:00Z",
      price: 20,
    },
    {
      id: "new",
      purchased_at: "2026-10-01T12:00:00Z",
      created_at: "2026-10-01T12:00:00Z",
      price: 50,
    },
    {
      id: "missing",
      purchased_at: null,
      created_at: "2026-05-01T12:00:00Z",
      price: null,
    },
  ];

  assert.deepEqual(
    sortGiftHistoryEntries(gifts, "recent").map((gift) => gift.id),
    ["new", "missing", "old"],
  );
  assert.deepEqual(
    sortGiftHistoryEntries(gifts, "price-high").map((gift) => gift.id),
    ["new", "old", "missing"],
  );
  assert.deepEqual(
    sortGiftHistoryEntries(gifts, "price-low").map((gift) => gift.id),
    ["old", "new", "missing"],
  );
});

test("formats saved idea product prices, ranges, and missing values", () => {
  const base = { created_at: "2026-10-18T12:00:00Z" };
  assert.equal(
    formatSavedIdeaPrice({
      ...base,
      estimated_price_min: null,
      estimated_price_max: null,
      product_match: {
        provider: "amazon",
        productId: "B000TEST",
        merchant: "Amazon",
        productTitle: "Test gift",
        imageUrl: null,
        price: 42,
        currency: "USD",
        affiliateUrl: "https://www.amazon.com/dp/B000TEST?tag=giftperch-20",
      },
    }),
    "$42.00 USD",
  );
  assert.equal(
    formatSavedIdeaPrice({
      ...base,
      estimated_price_min: 25,
      estimated_price_max: 75,
      product_match: null,
    }),
    "$25.00–$75.00",
  );
  assert.equal(
    formatSavedIdeaPrice({
      ...base,
      estimated_price_min: null,
      estimated_price_max: null,
      product_match: null,
    }),
    "Price not available",
  );
});

test("sorts saved ideas and keeps missing prices last", () => {
  const ideas = [
    {
      id: "older",
      created_at: "2026-01-01T12:00:00Z",
      estimated_price_min: 20,
      estimated_price_max: 30,
      product_match: null,
    },
    {
      id: "newer",
      created_at: "2026-10-01T12:00:00Z",
      estimated_price_min: 50,
      estimated_price_max: 60,
      product_match: null,
    },
    {
      id: "missing",
      created_at: "2026-05-01T12:00:00Z",
      estimated_price_min: null,
      estimated_price_max: null,
      product_match: null,
    },
  ];

  assert.deepEqual(
    sortSavedIdeas(ideas, "recent").map((idea) => idea.id),
    ["newer", "missing", "older"],
  );
  assert.deepEqual(
    sortSavedIdeas(ideas, "price-low").map((idea) => idea.id),
    ["older", "newer", "missing"],
  );
});
