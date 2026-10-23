export type ProductTourIdea = {
  id: string;
  title: string;
  description: string;
  price: string;
  imageSrc: string;
};

export type ProductTourProfile = {
  id: "maya" | "mocha" | "dad";
  name: string;
  relationship: string;
  avatarSrc: string;
  description: string;
  interests: readonly string[];
  occasion: string;
  occasionDate: string;
  notes: string;
  ideasLabel: string;
  ideas: readonly ProductTourIdea[];
};

export const PRODUCT_TOUR_PROFILES: readonly ProductTourProfile[] = [
  {
    id: "maya",
    name: "Maya",
    relationship: "Sister",
    avatarSrc: "/icons/avatars/maya.png",
    description:
      "Loves scented candles, nature hikes, skincare, and makeup. Enjoys cozy evenings and little everyday luxuries.",
    interests: ["Candles", "Hiking", "Beauty", "Self-Care"],
    occasion: "Birthday",
    occasionDate: "May 18",
    notes: "Thoughtful and practical gifts",
    ideasLabel: "Gift ideas for Maya",
    ideas: [
      { id: "candle", title: "Amber & Vanilla Candle", description: "A warm, soothing scent for cozy evenings at home.", price: "$28.00", imageSrc: "/product-tour-previews/maya-candle.png" },
      { id: "backpack", title: "Everyday Trail Backpack", description: "A lightweight daypack for her next adventure.", price: "$54.00", imageSrc: "/product-tour-previews/maya-backpack.png" },
      { id: "skincare", title: "Daily Glow Skincare Set", description: "A refreshing trio for her daily skincare routine.", price: "$42.00", imageSrc: "/product-tour-previews/maya-skincare.png" },
      { id: "tumbler", title: "Insulated Adventure Tumbler", description: "Keeps drinks at the right temperature on the go.", price: "$35.00", imageSrc: "/product-tour-previews/maya-cup.png" },
      { id: "makeup", title: "Essential Makeup Brush Set", description: "Soft everyday brushes with a travel pouch.", price: "$32.00", imageSrc: "/product-tour-previews/maya-makeup.png" },
      { id: "blanket", title: "Cozy Knit Throw Blanket", description: "A soft, textured throw for relaxing evenings.", price: "$48.00", imageSrc: "/product-tour-previews/maya-blanket.png" },
    ],
  },
  {
    id: "mocha",
    name: "Mocha",
    relationship: "Pet (Dog)",
    avatarSrc: "/icons/avatars/mocha.png",
    description:
      "Mocha is a playful, affectionate dog who loves squeaky toys, treats, long walks, and cozy naps.",
    interests: ["Toys", "Treats", "Walks", "Comfort"],
    occasion: "Gotcha day",
    occasionDate: "June 12",
    notes: "Small-dog friendly picks",
    ideasLabel: "Gift ideas for Mocha",
    ideas: [
      { id: "balls", title: "Squeaky Fetch Ball Set", description: "Colorful squeaky balls for endless games of fetch.", price: "$14.99", imageSrc: "/product-tour-previews/mocha-balls.png" },
      { id: "bed", title: "Plush Donut Dog Bed", description: "An extra-soft bed for curling up after playtime.", price: "$39.99", imageSrc: "/product-tour-previews/mocha-bed.png" },
      { id: "puzzle", title: "Interactive Treat Puzzle", description: "A fun puzzle with hidden treats to discover.", price: "$22.95", imageSrc: "/product-tour-previews/mocha-puzzle.png" },
      { id: "harness", title: "Adventure Dog Harness", description: "A comfortable, adjustable harness for daily walks.", price: "$29.99", imageSrc: "/product-tour-previews/mocha-harness.png" },
      { id: "treats", title: "Gourmet Dog Treats", description: "Crunchy biscuits for rewarding a very good dog.", price: "$16.00", imageSrc: "/product-tour-previews/mocha-treats.png" },
      { id: "bottle", title: "Portable Dog Water Bottle", description: "A travel bottle with a built-in drinking bowl.", price: "$19.99", imageSrc: "/product-tour-previews/mocha-bottle.png" },
    ],
  },
  {
    id: "dad",
    name: "Dad",
    relationship: "Father",
    avatarSrc: "/icons/avatars/dad.png",
    description:
      "Loves grilling, good coffee, fishing, and listening to music. Enjoys practical gadgets and time outdoors.",
    interests: ["Grilling", "Coffee", "Fishing", "Music"],
    occasion: "Birthday",
    occasionDate: "November 4",
    notes: "Useful gifts he can enjoy every day",
    ideasLabel: "Gift ideas for Dad",
    ideas: [
      { id: "thermometer", title: "Digital Meat Thermometer", description: "An instant-read thermometer for perfectly cooked meals.", price: "$24.99", imageSrc: "/product-tour-previews/dad-meat-thermo.png" },
      { id: "coffee", title: "Premium Coffee Sampler", description: "A selection of rich, freshly roasted coffees.", price: "$34.00", imageSrc: "/product-tour-previews/dad-coffee.png" },
      { id: "speaker", title: "Portable Bluetooth Speaker", description: "A compact wireless speaker for music anywhere.", price: "$49.99", imageSrc: "/product-tour-previews/dad-speaker.png" },
      { id: "fishing", title: "Fishing Tackle Organizer", description: "Keeps fishing lures and accessories organized.", price: "$29.95", imageSrc: "/product-tour-previews/dad-fishing.png" },
      { id: "wallet", title: "Classic Leather Wallet", description: "A timeless wallet with a slim, practical design.", price: "$39.00", imageSrc: "/product-tour-previews/dad-wallet.png" },
      { id: "grill-set", title: "BBQ Grilling Tool Set", description: "Durable grilling essentials for backyard cookouts.", price: "$44.99", imageSrc: "/product-tour-previews/dad-grill-set.png" },
    ],
  },
];

export const PRODUCT_TOUR_IDEA_COUNT = 6;
