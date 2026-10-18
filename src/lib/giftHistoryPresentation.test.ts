import assert from "node:assert/strict";
import test from "node:test";
import {
  GIFT_HISTORY_IMAGE_FALLBACK,
  formatGiftHistoryPrice,
  resolveGiftHistoryImage,
  resolveHistoryRecipientAvatar,
  sortGiftHistoryEntries,
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
