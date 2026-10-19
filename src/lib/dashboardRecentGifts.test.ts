import assert from "node:assert/strict";
import test from "node:test";
import {
  prepareRecentGiftCards,
  type RecentGiftRecipient,
  type RecentSavedGift,
} from "./dashboardRecentGifts";

const recipients = new Map<string, RecentGiftRecipient>([
  [
    "recipient-1",
    {
      id: "recipient-1",
      name: "Maya Stone",
      avatar_url: "https://images.example.com/maya.jpg",
      avatar_icon: null,
    },
  ],
  [
    "recipient-2",
    {
      id: "recipient-2",
      name: "Dad",
      avatar_url: null,
      avatar_icon: "man",
    },
  ],
]);

const gift = (
  overrides: Partial<RecentSavedGift> = {},
): RecentSavedGift => ({
  id: "gift-1",
  recipient_id: "recipient-1",
  title: "Travel mug",
  estimated_price_min: 25,
  estimated_price_max: 35,
  image_url: "https://images.example.com/mug.jpg",
  product_match: null,
  rationale: "Useful for morning coffee on the commute.",
  tier: "thoughtful",
  created_at: "2026-10-18T12:00:00Z",
  ...overrides,
});

test("prepares empty and single-item collections", () => {
  assert.deepEqual(prepareRecentGiftCards([], recipients), []);
  const cards = prepareRecentGiftCards([gift()], recipients);
  assert.equal(cards.length, 1);
  assert.equal(cards[0]?.recipientName, "Maya Stone");
  assert.equal(cards[0]?.recipientAvatar.kind, "image");
});

test("keeps recipient and gift associations scoped by recipient id", () => {
  const cards = prepareRecentGiftCards(
    [
      gift(),
      gift({ id: "gift-2", recipient_id: "recipient-2" }),
      gift({ id: "gift-3", recipient_id: "unknown" }),
    ],
    recipients,
  );

  assert.equal(cards[0]?.recipientName, "Maya Stone");
  assert.equal(cards[1]?.recipientName, "Dad");
  assert.equal(cards[1]?.recipientAvatar.kind, "image");
  assert.equal(cards[2]?.recipientName, null);
  assert.deepEqual(cards[2]?.recipientAvatar, {
    kind: "initials",
    initials: "GP",
  });
});

test("deduplicates equivalent gifts only within the same recipient", () => {
  const cards = prepareRecentGiftCards(
    [
      gift(),
      gift({ id: "duplicate", title: "Travel  mug!" }),
      gift({ id: "other-recipient", recipient_id: "recipient-2" }),
    ],
    recipients,
  );

  assert.deepEqual(
    cards.map((card) => card.id),
    ["gift-1", "other-recipient"],
  );
});

test("uses local image and avatar fallbacks without fabricating recipients", () => {
  const cards = prepareRecentGiftCards(
    [
      gift({
        recipient_id: "unknown",
        image_url: null,
        estimated_price_min: null,
        estimated_price_max: null,
      }),
    ],
    recipients,
  );

  assert.equal(cards[0]?.imageSource.primary, "/icons/previews/preview-mug.png");
  assert.equal(cards[0]?.imageSource.fallback, "/icons/previews/preview-mug.png");
  assert.equal(cards[0]?.price, "Saved idea");
  assert.equal(cards[0]?.recipientName, null);
});
