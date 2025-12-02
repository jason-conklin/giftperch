import type { GiftSuggestion } from "@/components/gifts/GiftSuggestionsPanel";

const ICON_BASE = "/icons/previews";
const FALLBACK = `${ICON_BASE}/preview-gift-box.png`;

const keywordMap: { icon: string; keywords: string[] }[] = [
  // Pets
  { icon: "preview-dog-toy.png", keywords: ["dog toy", "chew", "tug", "fetch", "dog treat"] },
  { icon: "preview-cat-toy.png", keywords: ["cat toy", "scratcher", "catnip", "feather wand"] },
  { icon: "preview-paw.png", keywords: ["dog", "puppy", "cat", "pet", "pet bed", "pet collar"] },
  // Home & Cozy
  { icon: "preview-candle.png", keywords: ["candle", "soy candle", "scented candle", "aromatherapy"] },
  { icon: "preview-blanket.png", keywords: ["blanket", "throw", "quilt", "cozy throw"] },
  { icon: "preview-plant.png", keywords: ["plant", "succulent", "bonsai", "planter"] },
  { icon: "preview-mug.png", keywords: ["mug", "coffee cup", "tea cup", "tumbler"] },
  // Tech & Office
  { icon: "preview-headphones.png", keywords: ["headphones", "earbuds", "headset", "audio"] },
  {
    icon: "preview-phone.png",
    keywords: ["phone stand", "phone case", "tablet", "laptop stand", "charging", "dock", "tech accessory"],
  },
  { icon: "preview-lamp.png", keywords: ["lamp", "desk lamp", "reading light", "light strip"] },
  // Hobbies & Creative
  { icon: "preview-art.png", keywords: ["art kit", "paint", "sketch", "marker", "craft", "watercolor"] },
  { icon: "preview-book.png", keywords: ["book", "novel", "journal", "notebook", "planner"] },
  { icon: "preview-game.png", keywords: ["board game", "puzzle", "card game", "dice", "game night"] },
  // Experiences / DIY
  { icon: "preview-ticket.png", keywords: ["ticket", "concert", "show", "experience", "escape room", "museum pass"] },
  { icon: "preview-diy.png", keywords: ["tool", "kit", "diy", "build", "maker", "workshop"] },
  // Fashion & Personal Items
  { icon: "preview-shirt.png", keywords: ["shirt", "t-shirt", "hoodie", "sweatshirt", "sweater", "clothing"] },
  { icon: "preview-shoes.png", keywords: ["shoe", "sneaker", "boots", "slippers", "running shoes"] },
  { icon: "preview-backpack.png", keywords: ["bag", "backpack", "tote", "duffel", "crossbody"] },
  // Food & Drink
  { icon: "preview-candy.png", keywords: ["chocolate", "candy", "snack box", "gourmet snacks", "treats"] },
  { icon: "preview-wine.png", keywords: ["wine", "cocktail", "whiskey", "bar set", "drink set", "glassware"] },
];

export function getGiftPreviewIcon(suggestion: GiftSuggestion): string {
  const haystack = [
    suggestion.title,
    suggestion.short_description,
    suggestion.why_it_fits,
    suggestion.price_hint,
    suggestion.price_guidance,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const { icon, keywords } of keywordMap) {
    if (keywords.some((kw) => haystack.includes(kw.toLowerCase()))) {
      return `${ICON_BASE}/${icon}`;
    }
  }

  return FALLBACK;
}
