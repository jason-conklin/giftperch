"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PerchPalLoader } from "@/components/perchpal/PerchPalLoader";

const steps = [
  {
    title: "Capture recipient profiles",
    description:
      "Build a reusable Gift CRM with interests, budgets, occasions, and preferences.",
  },
  {
    title: "Ask PerchPal for Gift Ideas",
    description:
      "Give PerchPal a vibe, budget, or occasion and get curated suggestions with rationale.",
  },
  {
    title: "Track every gift",
    description:
      "Log past gifts, wishlists, and affiliate-ready ideas so you never scramble last minute.",
  },
];

const SAMPLE_PROFILES = [
  {
    id: "maya",
    name: "Maya",
    relationship: "Sister",
    avatarSrc: "/woman_icon.png",
    description:
      "Loves scented candles, nature hikes, and makeup. Appreciates small, meaningful things.",
    ideasLabel: "Gift ideas for Maya",
    ideas: [
      { text: "Essential oils candle set", icon: "/icons/previews/preview-candle.png" },
      { text: "Lightweight Hiking Backpack", icon: "/icons/previews/preview-backpack.png" },
      { text: "Clean Beauty Essentials Kit", icon: "/icons/previews/preview-makeup.png" },
    ],
  },
  {
    id: "mocha",
    name: "Mocha",
    relationship: "Pet (Dog)",
    avatarSrc: "/dog_icon.png",
    description:
      "Small dog, loves squeaky animatronic toys, cozy blankets, and chicken jerky treats.",
    ideasLabel: "Gift ideas for Mocha",
    ideas: [
      { text: "Interactive treat puzzle toy", icon: "/icons/previews/preview-dog-toy.png" },
      { text: "Plush “heartbeat” cuddle buddy", icon: "/icons/previews/preview-paw.png" },
      { text: "Automatic ball launcher for indoor fetch", icon: "/icons/previews/preview-sports.png" },
    ],
  },
  {
    id: "dad",
    name: "Dad",
    relationship: "Father",
    avatarSrc: "/man_icon.png",
    description:
      "Weekend griller, football watcher, and fan of practical gadgets that actually get used.",
    ideasLabel: "Gift ideas for Dad",
    ideas: [
      { text: "Personalized grill tool set", icon: "/icons/previews/preview-diy.png" },
      { text: "Cozy game-day throw blanket", icon: "/icons/previews/preview-blanket.png" },
      { text: "Father/Son Game day tickets", icon: "/icons/previews/preview-ticket.png" },
    ],
  },
] as const;

function LandingSampleProfiles() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const firstCycleRef = useRef(true);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isHovered) {
      clearTimer();
      return;
    }
    const delay = firstCycleRef.current ? 3000 : 6000;
    clearTimer();
    timerRef.current = setTimeout(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % SAMPLE_PROFILES.length;
        firstCycleRef.current = false;
        return next;
      });
    }, delay);
    return () => clearTimer();
  }, [activeIndex, clearTimer, isHovered]);

  return (
    <div
      className="gp-card p-5 sm:p-7"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="space-y-4">
        <p className="text-lg font-semibold text-gp-evergreen">
          Create & Save Recipient Profiles
        </p>

        <div className="rounded-2xl border border-gp-evergreen/20 bg-gp-cream/60 p-4">
          <p className="text-xs uppercase tracking-wide text-gp-evergreen/70">
            Sample profile
          </p>
          <div className="relative mt-3 min-h-[110px]">
            {SAMPLE_PROFILES.map((profile, index) => (
              <div
                key={profile.id}
                className={`flex items-start gap-3 transition-opacity duration-500 ${
                  activeIndex === index
                    ? "opacity-100"
                    : "pointer-events-none opacity-0"
                } absolute inset-0`}
              >
                <Image
                  src={profile.avatarSrc}
                  alt={`${profile.name} avatar`}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full border border-gp-evergreen/20 bg-white object-cover"
                />
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-gp-evergreen">
                    {profile.name}
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gp-evergreen/60">
                    {profile.relationship}
                  </p>
                  <p className="text-sm text-gp-evergreen/80">
                    {profile.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-gp-gold/50 bg-gp-cream/40 p-5">
          <PerchPalLoader
            variant="inline"
            size="lg"
            message="PerchPal is fetching gift ideas..."
          />
        </div>

        <div className="rounded-2xl border border-gp-evergreen/15 bg-white p-4">
          <p className="text-sm uppercase tracking-wide text-gp-evergreen/70">
            {SAMPLE_PROFILES[activeIndex].ideasLabel}
          </p>
          <div className="relative mt-0 min-h-[130px] md:min-h-[130px]">
            {SAMPLE_PROFILES.map((profile, index) => (
              <div
                key={`${profile.id}-ideas`}
                className={`space-y-2 transition-opacity duration-500 ${
                  activeIndex === index
                    ? "opacity-100"
                    : "pointer-events-none opacity-0"
                } absolute inset-0`}
              >
                {profile.ideas.map((idea) => (
                  <div key={idea.text} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gp-cream/80 shadow-sm">
                      <Image
                        src={idea.icon}
                        alt="Gift idea preview"
                        width={80}
                        height={80}
                        className="h-8 w-8 object-cover"
                        unoptimized
                      />
                    </div>
                    <p className="text-sm text-gp-evergreen">{idea.text}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketingHome() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-16 px-4 py-10 sm:px-6 lg:px-8">
      <section className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="space-y-9">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border border-gp-gold/60 bg-gp-gold/20 px-3 py-1 text-center text-xs font-medium uppercase tracking-wide text-gp-evergreen">
            <span className="whitespace-nowrap">Introducing PerchPal,</span>
            <span className="whitespace-nowrap">Your AI gifting assistant</span>
          </div>
          <div className="flex items-center gap-4">
            <Image
              src="/giftperch_logo_only.png"
              alt="GiftPerch"
              width={96}
              height={96}
              className="h-28 w-28"
              priority
            />
            <p className="text-5xl font-bold tracking-wide text-gp-evergreen">
              GiftPerch
            </p>
          </div>
          <h1 className="mt-1 text-4xl font-semibold leading-tight text-gp-evergreen">
            Thoughtful gifting, reimagined with AI
          </h1>
          <p className="text-base text-gp-evergreen/80">
            Create living recipient profiles, maintain your wishlist identity,
            and lean on PerchPal—the AI gifting copilot that surfaces
            Amazon/affiliate-ready suggestions with genuine context.
          </p>
          <div className="mt-20 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/auth/signup"
              className="rounded-full bg-gp-gold px-14 py-4 text-center text-base font-semibold text-gp-evergreen transition hover:bg-[#bda775]"
            >
              Sign Up / Login
            </Link>
            <Link
              href="/about"
              className="rounded-full bg-gp-evergreen px-10 py-4 text-center text-base font-semibold text-gp-cream transition hover:bg-gp-evergreen/90"
            >
              More Info ➞
            </Link>
          </div>
        </div>
        <div className="mt-6 lg:mt-2">
          <LandingSampleProfiles />
        </div>
      </section>

      <section className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gp-evergreen/50">
            Product tour
          </p>
          <h2 className="text-2xl font-semibold text-gp-evergreen">
            How GiftPerch works
          </h2>
          <p className="text-base text-gp-evergreen/80">
            From profiles to personalized ideas
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.title} className="gp-card h-full space-y-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-gp-evergreen/60">
                Step
              </p>
              <h3 className="text-lg font-semibold text-gp-evergreen">
                {step.title}
              </h3>
              <p className="text-sm text-gp-evergreen/80">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8 mb-4 md:hidden">
        <div className="flex items-center gap-3 rounded-2xl border border-gp-gold/40 bg-gp-cream/95 px-4 py-3 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-gp-cream">
            <Image
              src="/giftperch_favicon.png"
              alt="GiftPerch app icon"
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gp-evergreen">
              Mobile app coming soon!
            </p>
            <p className="mt-0.5 text-xs text-gp-evergreen/80">
              Optimized for phones today. Native app experience planned as GiftPerch
              grows.
            </p>
          </div>
        </div>
      </div>

      <section className="gp-card border-dashed border-gp-gold/50 bg-gp-cream/70 text-center text-sm text-gp-evergreen/80">
        Coming soon: success stories and favorite gift combinations from real
        GiftPerch families, couples, and teams.
        <br />
        Want updates?{" "}
        <Link
          href="/blog"
          className="font-semibold text-gp-evergreen underline-offset-4 hover:underline"
        >
          Visit the GiftPerch Journal
        </Link>
        .
      </section>
    </div>
  );
}
