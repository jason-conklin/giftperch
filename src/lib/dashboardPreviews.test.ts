import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRecipientPreviewGroups,
  buildSavedGiftPreviewGroups,
  buildSuggestionRunPreviewGroups,
  type DashboardRecipientPreview,
} from "./dashboardPreviews";

const recipients: DashboardRecipientPreview[] = [
  {
    id: "recipient-1",
    name: "Maya",
    avatar_url: "https://images.example.com/maya.jpg",
    avatar_icon: null,
  },
  {
    id: "recipient-2",
    name: "Dad",
    avatar_url: null,
    avatar_icon: "man",
  },
];

test("recipient previews handle empty, single, and multiple image pools", () => {
  assert.deepEqual(buildRecipientPreviewGroups([]), []);
  assert.equal(buildRecipientPreviewGroups(recipients.slice(0, 1)).length, 1);
  assert.equal(buildRecipientPreviewGroups(recipients)[0]?.images.length, 2);

  const largerPool = Array.from({ length: 5 }, (_, index) => ({
    ...recipients[1],
    id: `recipient-${index}`,
    name: `Recipient ${index}`,
  }));
  const groups = buildRecipientPreviewGroups(largerPool);
  assert.equal(groups.length, 5);
  assert.ok(groups.every((group) => group.images.length === 3));
});

test("saved gift previews preserve recipient and product association", () => {
  const groups = buildSavedGiftPreviewGroups(
    [
      {
        id: "gift-1",
        recipient_id: "recipient-2",
        title: "Travel mug",
        image_url: "https://images.example.com/mug.jpg",
        product_match: null,
        rationale: null,
        tier: null,
      },
      {
        id: "other-user-gift",
        recipient_id: "not-in-user-recipient-map",
        title: "Should not appear",
        image_url: "https://images.example.com/other.jpg",
        product_match: null,
        rationale: null,
        tier: null,
      },
    ],
    new Map(recipients.map((recipient) => [recipient.id, recipient])),
  );

  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.images[0]?.src, "/man_icon.png");
  assert.equal(groups[0]?.images[1]?.src, "https://images.example.com/mug.jpg");
});

test("saved gifts and suggestion runs use themed missing-image previews", () => {
  const recipientMap = new Map(
    recipients.map((recipient) => [recipient.id, recipient]),
  );
  const saved = buildSavedGiftPreviewGroups(
    [
      {
        id: "gift-1",
        recipient_id: "recipient-1",
        title: "Watercolor art kit",
        image_url: null,
        product_match: null,
        rationale: "For painting and sketching",
        tier: "thoughtful",
      },
    ],
    recipientMap,
  );
  const runs = buildSuggestionRunPreviewGroups(
    [
      {
        id: "run-1",
        recipient_id: "recipient-2",
        suggestions: [
          {
            title: "Noise-canceling headphones",
            image_url: null,
            short_description: "Comfortable audio for travel",
          },
        ],
      },
    ],
    recipientMap,
  );

  assert.equal(saved[0]?.images[1]?.src, "/icons/previews/preview-art.png");
  assert.equal(
    runs[0]?.images[1]?.src,
    "/icons/previews/preview-headphones.png",
  );
});

test("dashboard previews preserve merchant images and recipient associations", () => {
  const groups = buildSavedGiftPreviewGroups(
    [
      {
        id: "gift-1",
        recipient_id: "recipient-2",
        title: "Fishing multi-tool",
        image_url: null,
        rationale: "Useful at the lake",
        tier: "practical",
        product_match: {
          provider: "awin",
          productId: "piscifun-1",
          merchant: "Piscifun",
          productTitle: "Fishing multi-tool",
          imageUrl: "https://merchant.example.com/tool.jpg",
          price: 31.99,
          currency: "USD",
          affiliateUrl: "https://www.awin1.com/cread.php?awinmid=1&awinaffid=2",
        },
      },
    ],
    new Map(recipients.map((recipient) => [recipient.id, recipient])),
  );

  assert.equal(groups[0]?.images[0]?.src, "/man_icon.png");
  assert.equal(
    groups[0]?.images[1]?.src,
    "https://merchant.example.com/tool.jpg",
  );
  assert.equal(
    groups[0]?.images[1]?.fallbackSrc,
    "/icons/previews/preview-fishing.png",
  );
});

test("unknown dashboard gifts retain the generic fallback", () => {
  const saved = buildSavedGiftPreviewGroups(
    [
      {
        id: "gift-1",
        recipient_id: "recipient-1",
        title: "An unusual surprise",
        image_url: null,
        product_match: null,
        rationale: null,
        tier: null,
      },
    ],
    new Map(recipients.map((recipient) => [recipient.id, recipient])),
  );

  assert.equal(saved[0]?.images[1]?.src, "/icons/previews/preview-gift-box.png");
});

test("suggestion run previews select one image per bounded recent run", () => {
  const groups = buildSuggestionRunPreviewGroups(
    Array.from({ length: 12 }, (_, index) => ({
      id: `run-${index}`,
      recipient_id: "recipient-1",
      suggestions: [
        {
          title: `Gift ${index}`,
          image_url: `https://images.example.com/gift-${index}.jpg`,
        },
      ],
    })),
    new Map(recipients.map((recipient) => [recipient.id, recipient])),
  );

  assert.equal(groups.length, 10);
  assert.equal(groups[0]?.images[1]?.alt, "Gift 0");
  assert.equal(groups[9]?.images[1]?.alt, "Gift 9");
});
