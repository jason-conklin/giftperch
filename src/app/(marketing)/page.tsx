"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, RefreshCcw, ShieldCheck } from "lucide-react";
import { ThumbDownIcon, ThumbUpIcon } from "@/components/icons/ThumbIcons";
import { PerchPalLoader } from "@/components/perchpal/PerchPalLoader";

const workflowSteps = [
  {
    id: "profiles",
    title: "Set up Recipient Profiles",
    description:
      "Save interests, hobbies, and notes so every person has a gift profile you can reuse again and again.",
  },
  {
    id: "perchpal",
    title: "PerchPal will Generate Gift Ideas",
    description:
      'Select a recipient and click "Generate Gift Ideas" for personalized suggestions.',
  },
  {
    id: "history",
    title: "Smarter Ideas with Every Click",
    description:
      "Like or dislike suggestions so future gift ideas get better and more personalized.",
  },
] as const;

type WorkflowStepId = (typeof workflowSteps)[number]["id"];
type ComparisonIconKey = "profile" | "repeat" | "history" | "calendar";

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <path
        d="M12 12a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4ZM4.5 20.4a7.5 7.5 0 0 1 15 0"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5">
      <path
        d="M4.5 9.5h15v10h-15zM12 9.5v10M4.5 13h15M4 9.5h16M9.6 7.1c0 1-1 2.4-2.4 2.4S5 8.1 5 7.1c0-1.1.9-2 2-2 1.4 0 2.6 1 3.1 2.4m1.3-.4c.4-1.3 1.7-2.3 3.1-2.3 1.1 0 2 .9 2 2 0 1-1 2.4-2.2 2.4-1.4 0-2.4-1.4-2.4-2.4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <circle
        cx="12"
        cy="12"
        r="8"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
      />
      <path
        d="M12 7.5v4.8l3.1 1.9"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WorkflowStepBadge({ stepId }: { stepId: WorkflowStepId }) {
  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gp-gold/30 bg-gp-cream/60 text-gp-evergreen">
      {stepId === "profiles" ? <ProfileIcon /> : null}
      {stepId === "history" ? <ClockIcon /> : null}
      {stepId === "perchpal" ? (
        <>
          <Image
            src="/giftperch_perchpal_front.png"
            alt=""
            width={30}
            height={30}
            className="h-7 w-7 rounded-full object-contain"
            aria-hidden="true"
          />
          <span className="absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-gp-gold/40 bg-white text-gp-evergreen shadow-sm">
            <GiftIcon />
          </span>
        </>
      ) : null}
    </div>
  );
}

function ComparisonBulletIcon({ icon }: { icon: ComparisonIconKey }) {
  if (icon === "profile") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <path
          d="M12 12a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4ZM4.5 20.4a7.5 7.5 0 0 1 15 0"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (icon === "repeat") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <path
          d="M7 7h9l-2-2m2 14H7l2 2M5 16a5 5 0 0 1 0-8m14 0a5 5 0 0 1 0 8"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (icon === "history") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <circle
          cx="12"
          cy="12"
          r="8"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
        />
        <path
          d="M12 7.5v4.7l3 1.8"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <rect
        x="3.5"
        y="4.5"
        width="17"
        height="16"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
      />
      <path
        d="M8 2.8v3.4M16 2.8v3.4M3.5 9.5h17"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}

function ComparisonXIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        d="M8 8l8 8M16 8l-8 8"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}

function StepFlowArrow() {
  return (
    <svg
      viewBox="0 0 68 20"
      aria-hidden="true"
      className="h-5 w-12 text-gp-evergreen/70 drop-shadow-[0_1px_2px_rgba(15,61,62,0.22)] lg:w-14"
    >
      <path
        d="M2 10h52"
        fill="none"
        stroke="currentColor"
        strokeWidth={3.8}
        strokeLinecap="round"
        opacity={0.9}
      />
      <path
        d="m46 5 8 5-8 5"
        fill="none"
        stroke="currentColor"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const faqs = [
  {
    question: "What is GiftPerch?",
    answer:
      "GiftPerch is a gifting workspace that combines recipient profiles, gift history, occasions, and PerchPal AI suggestions.",
  },
  {
    question: "Who is GiftPerch for?",
    answer:
      "Anyone who shops for family, friends, partners, or teams and wants gifting to feel thoughtful without last-minute stress.",
  },
  {
    question: "How does PerchPal make suggestions better?",
    answer:
      "PerchPal uses the context you save, like budgets, preferences, occasions, and prior gifts, to generate more relevant ideas.",
  },
  {
    question: "Can I track spending ranges?",
    answer:
      "Yes. Recipient profiles support budget context so your suggestions stay practical for each person and occasion.",
  },
  {
    question: "Do I need a credit card to start?",
    answer: "No. You can create an account and start organizing gifts right away.",
  },
] as const;

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
      { text: "Small interactive puzzle dog toy", icon: "/icons/previews/preview-dog-toy.png" },
      { text: "Plush Rabbit Animatronic Dog Toy", icon: "/icons/previews/preview-paw.png" },
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
          From Profile to Perfect Gift
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
          <div className="relative mt-0 min-h-[140px] md:min-h-[140px]">
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
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gp-cream/80 shadow-sm">
                      <Image
                        src={idea.icon}
                        alt="Gift idea preview"
                        width={96}
                        height={96}
                        className="h-9 w-9 object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-medium text-gp-evergreen/90">
                        {idea.text}
                      </p>
                      <div className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
                        <span className="inline-flex h-8 w-8 cursor-default items-center justify-center rounded-full border border-blue-300/80 bg-blue-50 text-blue-600 transition-all duration-150 hover:-translate-y-px hover:border-blue-400/90 hover:bg-blue-100 hover:shadow-[0_2px_6px_rgba(37,99,235,0.2)]">
                          <ThumbUpIcon className="h-4 w-4 fill-none stroke-current" />
                        </span>
                        <span className="inline-flex h-8 w-8 cursor-default items-center justify-center rounded-full border border-red-300/80 bg-red-50 text-red-600 transition-all duration-150 hover:-translate-y-px hover:border-red-400/90 hover:bg-red-100 hover:shadow-[0_2px_6px_rgba(220,38,38,0.2)]">
                          <ThumbDownIcon className="h-4 w-4 fill-none stroke-current" />
                        </span>
                      </div>
                    </div>
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
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [heroMounted, setHeroMounted] = useState(false);
  const comparisonRows: ReadonlyArray<{
    icon: ComparisonIconKey;
    typical: string;
    giftperch: string;
  }> = [
    {
      icon: "profile",
      typical: "One-time prompts with no memory between searches",
      giftperch: "Saved recipient profiles with preferences",
    },
    {
      icon: "repeat",
      typical: "Repeats gift suggestions with no feedback loop",
      giftperch: "Gift history + feedback to avoid repeats",
    },
    {
      icon: "history",
      typical: "No gift history or context",
      giftperch: "Occasion context (birthday, holiday, etc.)",
    },
    {
      icon: "calendar",
      typical: "No built-in planning for upcoming occasions",
      giftperch: "Plan ahead with a calendar view",
    },
  ];

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setHeroMounted(true);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="space-y-12">
      <section className="flex min-h-[85vh] items-center justify-center">
        <div
          className={`gp-hero-anim mx-auto w-full ${
            heroMounted ? "is-mounted" : ""
          }`}
        >
          <div className="gp-hero-bob flex w-full flex-col items-center text-center">
            <Image
              src="/giftperch-home-page-no-bg.png"
              alt="GiftPerch AI-Powered Gifting Workspace"
              width={1600}
              height={760}
              className="h-auto w-full max-w-[70rem] object-contain drop-shadow-[0_18px_32px_rgba(15,61,62,0.15)]"
              priority
            />
            <div className="mt-8 w-full max-w-[44rem] sm:mt-10">
              <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <Link
                  href="/auth/signup"
                  className="gp-btn gp-btn--primary gp-btn--lg w-full sm:w-[20rem]"
                >
                  Login/Get started free
                </Link>
                <a
                  href="#product-tour"
                  className="gp-btn gp-btn--secondary gp-btn--lg w-full sm:w-[16.5rem]"
                >
                  See how it works
                </a>
              </div>
              <div className="mt-8 h-px w-full bg-gp-evergreen/10" />
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 md:flex-nowrap md:gap-x-10">
                <span className="inline-flex items-center gap-2 text-xs font-medium text-gp-evergreen/70 transition-colors hover:text-gp-evergreen/80 sm:text-sm">
                  <RefreshCcw className="h-4 w-4 shrink-0 text-gp-gold/90" aria-hidden="true" />
                  One-time setup
                </span>
                <span className="inline-flex items-center gap-2 text-xs font-medium text-gp-evergreen/70 transition-colors hover:text-gp-evergreen/80 sm:text-sm">
                  <BadgeCheck className="h-4 w-4 shrink-0 text-gp-gold/90" aria-hidden="true" />
                  No credit card required
                </span>
                <span className="inline-flex items-center gap-2 text-xs font-medium text-gp-evergreen/70 transition-colors hover:text-gp-evergreen/80 sm:text-sm">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-gp-gold/90" aria-hidden="true" />
                  Private by design
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl">
        <LandingSampleProfiles />
      </section>

      <section id="product-tour" className="space-y-5 scroll-mt-28">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gp-evergreen/50">
            Product tour
          </p>
          <h2 className="text-2xl font-semibold text-gp-evergreen">
            How GiftPerch works
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch md:gap-3">
          {workflowSteps.flatMap((step, index) => [
            <article key={`${step.id}-card`} className="gp-card h-full space-y-3 p-5">
              <p className="inline-flex w-fit items-center rounded-full border border-gp-gold/30 bg-gp-cream/45 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gp-evergreen/65">
                Step {index + 1}
              </p>
              <div className="flex items-start gap-3">
                <WorkflowStepBadge stepId={step.id} />
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gp-evergreen">{step.title}</h3>
                  <p className="text-sm text-gp-evergreen/80">{step.description}</p>
                </div>
              </div>
            </article>,
            index < workflowSteps.length - 1 ? (
              <div
                key={`${step.id}-arrow`}
                className="hidden md:flex items-center justify-center"
                aria-hidden="true"
              >
                <StepFlowArrow />
              </div>
            ) : null,
          ])}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-gp-evergreen">Why GiftPerch is different</h2>
          <p className="mt-1 text-sm text-gp-evergreen/75">
            Powered by memory and context — not guesswork.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="gp-card-soft border-gp-evergreen/15 p-5">
            <h3 className="text-lg font-semibold text-gp-evergreen">Typical gift generators:</h3>
            <ul className="mt-4 space-y-3">
              {comparisonRows.map((row) => (
                <li key={`typical-${row.typical}`} className="flex items-start gap-3 text-sm text-gp-evergreen/70">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-red-200/80 bg-red-50/90 text-red-600">
                    <ComparisonXIcon />
                  </span>
                  <span>{row.typical}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className="gp-card-soft border-gp-gold/40 bg-white/70 p-5">
            <h3 className="text-lg font-semibold text-gp-evergreen">GiftPerch offers:</h3>
            <ul className="mt-4 space-y-3">
              {comparisonRows.map((row) => (
                <li key={`giftperch-${row.giftperch}`} className="flex items-start gap-3 text-sm text-gp-evergreen/85">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gp-gold/25 bg-gp-cream/60 text-gp-evergreen">
                    <ComparisonBulletIcon icon={row.icon} />
                  </span>
                  <span>{row.giftperch}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section aria-labelledby="homepage-faq-title" className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gp-evergreen/50">
            FAQ
          </p>
          <h2 id="homepage-faq-title" className="text-2xl font-semibold text-gp-evergreen">
            Common questions
          </h2>
        </div>
        <div className="gp-card divide-y divide-gp-evergreen/10">
          {faqs.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div key={faq.question} className="py-4 first:pt-0 last:pb-0">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 text-left cursor-pointer"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                >
                  <span className="text-base font-semibold text-gp-evergreen">
                    {faq.question}
                  </span>
                  <span
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gp-evergreen/20 bg-gp-cream/70 text-lg leading-none text-gp-evergreen"
                    aria-hidden="true"
                  >
                    {isOpen ? "-" : "+"}
                  </span>
                </button>
                {isOpen ? (
                  <p id={`faq-answer-${index}`} className="mt-3 pr-9 text-sm text-gp-evergreen/80">
                    {faq.answer}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-gp-gold/50 bg-gp-gold/20 p-6 text-center sm:p-8">
        <h2 className="text-2xl font-semibold text-gp-evergreen">
          Start your gifting workspace today
        </h2>
        <p className="mt-2 text-sm text-gp-evergreen/80">
          Organize every recipient once, then let PerchPal help with better ideas
          all year.
        </p>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/auth/signup"
            className="gp-btn gp-btn--primary gp-btn--lg px-7"
          >
            Login/Get started free
          </Link>
          <a
            href="#product-tour"
            className="gp-btn gp-btn--secondary gp-btn--lg px-7"
          >
            See how it works
          </a>
        </div>
      </section>
    </div>
  );
}
