"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  BookOpen,
  CalendarDays,
  FileText,
  Gift,
  Heart,
  MessageCircleQuestion,
  Minus,
  NotebookText,
  Plus,
  RefreshCcw,
  ShieldCheck,
  ShoppingCart,
  UserRound,
  UsersRound,
} from "lucide-react";
import { PerchPalLoader } from "@/components/perchpal/PerchPalLoader";
import { GiftPerchHeroIntro } from "@/components/marketing/GiftPerchHeroIntro";
import { ProductTourGiftCarousel } from "@/components/marketing/ProductTourGiftCarousel";
import { getProductTourEntryPath } from "@/components/marketing/productTourNavigation";
import {
  canAutoRotateProductTourProfile,
  normalizeProductTourProfileIndex,
} from "@/components/marketing/productTourRotation";
import { PRODUCT_TOUR_PROFILES } from "@/components/marketing/productTourDemoData";
import { useSupabaseSession } from "@/lib/hooks/useSupabaseSession";

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
      "Save the ideas you love and keep track of past gifts to make future suggestions more thoughtful.",
  },
] as const;

type WorkflowStepId = (typeof workflowSteps)[number]["id"];
type WorkflowStep = (typeof workflowSteps)[number];

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
  const isPerchPal = stepId === "perchpal";

  return (
    <div
      className={`relative flex h-12 w-12 shrink-0 items-center justify-center text-gp-evergreen ${
        isPerchPal
          ? ""
          : "rounded-full border border-gp-gold/30 bg-gp-cream/60"
      }`}
    >
      {stepId === "profiles" ? <ProfileIcon /> : null}
      {stepId === "history" ? <ClockIcon /> : null}
      {stepId === "perchpal" ? (
        <Image
          src="/giftperch_perchpal_front.png"
          alt="PerchPal"
          width={56}
          height={56}
          className="h-12 w-12 rounded-full border border-gp-evergreen/10 bg-gp-cream/80 object-contain shadow-sm"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}

const differenceBenefits = [
  {
    title: "Made personal",
    description: "Tailored to their interests and history.",
    icon: UserRound,
  },
  {
    title: "Real products",
    description: "Actual items with prices and links.",
    icon: ShoppingCart,
  },
  {
    title: "Stay organized",
    description: "Save ideas and remember occasions.",
    icon: CalendarDays,
  },
] as const;

const differenceProducts = [
  {
    recipient: "Mom",
    occasion: "Birthday",
    avatarSrc: "/icons/avatars/mom.png",
    name: "Amber & Vanilla Candle",
    price: "$28.00",
    imageSrc: "/product-tour-previews/maya-candle.png",
    imageAlt: "Amber & Vanilla Candle illustrative preview",
    imagePending: false,
    className: "gp-difference-product-card--mom",
  },
  {
    recipient: "Sofi",
    occasion: "Just Because",
    avatarSrc: "/icons/avatars/sofi.png",
    name: "Cozy Cat Tree",
    price: "$89.99",
    imageSrc: "/cat_icon.png",
    imageAlt: "Temporary cat tree preview placeholder",
    imagePending: true,
    className: "gp-difference-product-card--sofi",
  },
  {
    recipient: "Nick",
    occasion: "Father's Day",
    avatarSrc: "/icons/avatars/nick.png",
    name: "Everyday Trail Backpack",
    price: "$54.00",
    imageSrc: "/product-tour-previews/maya-backpack.png",
    imageAlt: "Everyday Trail Backpack illustrative preview",
    imagePending: false,
    className: "gp-difference-product-card--nick",
  },
] as const;

function DifferenceProductCard({
  product,
  productEntryPath,
}: {
  product: (typeof differenceProducts)[number];
  productEntryPath: string;
}) {
  return (
    <article className={`gp-difference-product-card ${product.className}`}>
      <div className="gp-difference-product-recipient">
        <Image
          src={product.avatarSrc}
          alt=""
          width={32}
          height={32}
          className="gp-difference-product-avatar"
        />
        <span>
          <strong>For {product.recipient}</strong>
          <small>{product.occasion}</small>
        </span>
        <Heart className="gp-difference-product-heart" aria-hidden="true" />
      </div>
      <div className="gp-difference-product-image">
        <Image
          src={product.imageSrc}
          alt={product.imageAlt}
          fill
          sizes="(max-width: 640px) 42vw, (max-width: 980px) 26vw, 12vw"
          className={product.imagePending ? "gp-difference-product-image--pending" : ""}
          draggable={false}
        />
        {product.imagePending ? (
          <span className="gp-difference-product-pending">Preview image pending</span>
        ) : null}
      </div>
      <div className="gp-difference-product-details">
        <h4>{product.name}</h4>
        <p>{product.price}</p>
      </div>
      <Link href={productEntryPath} className="gp-difference-product-cta">
        View Product
      </Link>
    </article>
  );
}

const faqs = [
  {
    question: "How do I use GiftPerch to get gift ideas?",
    answer:
      "Simply choose a recipient, set an occasion or budget if you want, and click “Generate Gift Ideas.” GiftPerch uses the profile and past context you’ve saved to suggest ideas that actually fit the person.",
  },
  {
    question: "What does a recipient profile actually include?",
    answer:
      "Profiles can include interests, notes, past gifts, budgets, and important occasions. It’s a single place to store everything you know about someone so you don’t have to rethink it every time you shop.",
  },
  {
    question: "Will I keep seeing the same gift ideas?",
    answer:
      "No. GiftPerch uses your saved ideas and gift history to help reduce repeats. As you save suggestions, future ideas stay fresh and better matched to each person.",
  },
  {
    question: "How does GiftPerch help me plan ahead for special occasions?",
    answer:
      "GiftPerch helps you stay ahead of birthdays, holidays, and special moments by keeping everything organized in one place. With saved recipient profiles, past gifts, and occasion context, you can plan earlier and generate ideas that are ready when you need them.",
  },
  {
    question: "Is it free to use?",
    answer:
      "Yes, completely free. You can create an account and start building recipient profiles and generating ideas right away.",
  },
] as const;

function ProductTourProfileSlice({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="gp-tour-profile">
      <p className="gp-tour-panel-label">
        Sample profile
      </p>
      <div className="gp-tour-profile-stage">
        {PRODUCT_TOUR_PROFILES.map((profile, index) => (
          <div
            key={profile.id}
            aria-hidden={activeIndex === index ? undefined : true}
            className={`gp-tour-profile-slide ${
              activeIndex === index
                ? "gp-tour-profile-slide--active"
                : "gp-tour-profile-slide--hidden"
            }`}
          >
            <div className="gp-tour-profile-main">
              <Image
                src={profile.avatarSrc}
                alt={`${profile.name} avatar`}
                width={88}
                height={88}
                className="gp-tour-profile-avatar"
              />
              <div className="gp-tour-profile-copy">
                <h4>{profile.name}</h4>
                <p className="gp-tour-relationship">{profile.relationship}</p>
                <p className="gp-tour-description">{profile.description}</p>
                <div className="gp-tour-interest-list" aria-label={`${profile.name}'s interests`}>
                  {profile.interests.map((interest) => (
                    <span key={interest}>{interest}</span>
                  ))}
                </div>
              </div>
            </div>
            <dl className="gp-tour-profile-details">
              <div>
                <dt><CalendarDays aria-hidden="true" /> Occasion</dt>
                <dd>{profile.occasion} · {profile.occasionDate}</dd>
              </div>
              <div>
                <dt><NotebookText aria-hidden="true" /> Notes</dt>
                <dd>{profile.notes}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductTourLoaderSlice() {
  const [demoProgress, setDemoProgress] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frameId = window.requestAnimationFrame(() => setDemoProgress(72));
      return () => window.cancelAnimationFrame(frameId);
    }

    const intervalId = window.setInterval(() => {
      setDemoProgress((prev) => {
        if (prev >= 94) {
          return 0;
        }

        if (prev < 65) {
          return prev + 6;
        }

        if (prev < 85) {
          return prev + 3;
        }

        return prev + 1;
      });
    }, 220);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="gp-tour-loader">
      <PerchPalLoader
        variant="inline"
        size="lg"
        message="PerchPal is fetching personalized gift ideas..."
      />
      <div
        className="gp-tour-progress-track"
        role="progressbar"
        aria-label="PerchPal gift idea progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(demoProgress)}
      >
        <div
          className="gp-tour-progress-value"
          style={{ width: `${Math.min(100, demoProgress)}%` }}
        />
      </div>
    </div>
  );
}

function ProductTourIdeasSlice({
  activeIndex,
  savedIdeas,
  onToggleSaved,
  productEntryPath,
}: {
  activeIndex: number;
  savedIdeas: ReadonlySet<string>;
  onToggleSaved: (ideaKey: string) => void;
  productEntryPath: string;
}) {
  const profile = PRODUCT_TOUR_PROFILES[activeIndex];

  return (
    <div className="gp-tour-ideas">
      <div className="gp-tour-ideas-stage">
        <ProductTourGiftCarousel
          key={profile.id}
          profile={profile}
          savedIdeas={savedIdeas}
          onToggleSaved={onToggleSaved}
          productEntryPath={productEntryPath}
        />
      </div>
    </div>
  );
}

function ProductTourTimeline({
  steps,
  activeStep,
  onSelectStep,
}: {
  steps: readonly WorkflowStep[];
  activeStep: number;
  onSelectStep: (stepIndex: number) => void;
}) {
  const timelineRef = useRef<HTMLOListElement | null>(null);
  const connectorRef = useRef<HTMLSpanElement | null>(null);
  const stepBadgeRefs = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    const timelineEl = timelineRef.current;
    const connectorEl = connectorRef.current;

    if (!timelineEl || !connectorEl || steps.length < 2) return;

    let frameId: number | null = null;

    const updateConnector = () => {
      const firstBadge = stepBadgeRefs.current[0];
      const lastBadge = stepBadgeRefs.current[steps.length - 1];
      if (!firstBadge || !lastBadge) return;

      const timelineRect = timelineEl.getBoundingClientRect();
      const firstRect = firstBadge.getBoundingClientRect();
      const lastRect = lastBadge.getBoundingClientRect();

      const top = firstRect.top + firstRect.height / 2 - timelineRect.top;
      const bottom = lastRect.top + lastRect.height / 2 - timelineRect.top;
      const height = Math.max(0, bottom - top);

      connectorEl.style.top = `${top.toFixed(1)}px`;
      connectorEl.style.height = `${height.toFixed(1)}px`;
    };

    const queueConnectorUpdate = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      frameId = window.requestAnimationFrame(updateConnector);
    };

    queueConnectorUpdate();
    window.addEventListener("resize", queueConnectorUpdate);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(queueConnectorUpdate);
      resizeObserver.observe(timelineEl);
      stepBadgeRefs.current.forEach((badgeEl) => {
        if (badgeEl) {
          resizeObserver?.observe(badgeEl);
        }
      });
    }

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("resize", queueConnectorUpdate);
      resizeObserver?.disconnect();
    };
  }, [activeStep, steps.length]);

  return (
    <ol
      ref={timelineRef}
      className="gp-tour-timeline"
    >
      {steps.length > 1 ? (
        <span
          ref={connectorRef}
          className="gp-tour-timeline-line"
          style={{ top: "1.25rem", height: "calc(100% - 2.5rem)" }}
          aria-hidden="true"
        />
      ) : null}
      {steps.map((step, index) => {
        const isActive = index === activeStep;
        return (
          <li key={`${step.id}-timeline`} className="gp-tour-step-item">
            <button
              type="button"
              onClick={() => onSelectStep(index)}
              aria-current={isActive ? "step" : undefined}
              className={`gp-tour-step ${isActive ? "gp-tour-step--active" : ""}`}
            >
              <span
                ref={(element) => {
                  stepBadgeRefs.current[index] = element;
                }}
                className="gp-tour-step-number"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <span className="gp-tour-step-card">
                <span className="gp-tour-step-icon" aria-hidden="true">
                  <WorkflowStepBadge stepId={step.id} />
                </span>
                <span className="gp-tour-step-copy">
                  <span className="gp-tour-step-label">Step {index + 1}</span>
                  <span className="gp-tour-step-title">{step.title}</span>
                  <span className="gp-tour-step-description">{step.description}</span>
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function LandingSampleProfiles({ steps }: { steps: readonly WorkflowStep[] }) {
  const { status } = useSupabaseSession();
  const [activeIndex, setActiveIndex] = useState(0);
  const [manualPauseUntil, setManualPauseUntil] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [savedIdeas, setSavedIdeas] = useState<Set<string>>(() => new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const firstCycleRef = useRef(true);
  const stepCount = steps.length > 0 ? steps.length : 1;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const now = Date.now();
    if (!canAutoRotateProductTourProfile({
      manualPauseUntil,
      now,
      prefersReducedMotion,
    })) {
      clearTimer();
      if (prefersReducedMotion) return;

      const resumeTimer = setTimeout(
        () => setManualPauseUntil(0),
        manualPauseUntil - now,
      );
      return () => clearTimeout(resumeTimer);
    }

    const delay = firstCycleRef.current ? 3000 : 6000;
    clearTimer();
    timerRef.current = setTimeout(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % PRODUCT_TOUR_PROFILES.length;
        firstCycleRef.current = false;
        return next;
      });
    }, delay);
    return () => clearTimer();
  }, [activeIndex, clearTimer, manualPauseUntil, prefersReducedMotion]);

  const activeStep = activeIndex % stepCount;

  const handleStepSelect = useCallback((stepIndex: number) => {
    const normalizedIndex = normalizeProductTourProfileIndex(
      stepIndex,
      PRODUCT_TOUR_PROFILES.length,
    );
    setActiveIndex(normalizedIndex);
    firstCycleRef.current = false;
    setManualPauseUntil(Date.now() + 8000);
  }, []);

  const handleToggleSaved = useCallback((ideaKey: string) => {
    setSavedIdeas((current) => {
      const next = new Set(current);
      if (next.has(ideaKey)) {
        next.delete(ideaKey);
      } else {
        next.add(ideaKey);
      }
      return next;
    });
  }, []);

  const productEntryPath = getProductTourEntryPath(status);

  return (
    <div className="gp-tour-layout">
      <div className="gp-tour-timeline-column">
        <ProductTourTimeline
          steps={steps}
          activeStep={activeStep}
          onSelectStep={handleStepSelect}
        />
      </div>

      <div className="gp-tour-demo-column">
        <div className="gp-tour-demo">
          <header className="gp-tour-demo-header">
            <div>
              <p className="gp-tour-demo-title">From Profile to Perfect Gift</p>
              <p className="gp-tour-demo-eyebrow">A quick walkthrough</p>
            </div>
            <div className="gp-tour-recipient-tabs" aria-label="Choose a sample recipient">
              {PRODUCT_TOUR_PROFILES.map((profile, index) => (
                <button
                  key={`${profile.id}-tab`}
                  type="button"
                  className={activeIndex === index ? "gp-tour-recipient-tab gp-tour-recipient-tab--active" : "gp-tour-recipient-tab"}
                  aria-pressed={activeIndex === index}
                  onClick={() => handleStepSelect(index)}
                >
                  <Image
                    src={profile.avatarSrc}
                    alt=""
                    width={36}
                    height={36}
                    className="gp-tour-recipient-tab-avatar"
                  />
                  <span>{profile.name}</span>
                </button>
              ))}
            </div>
          </header>

          <div className="gp-tour-demo-content">
            <div
              className={`gp-tour-demo-section ${activeStep === 0 ? "gp-tour-demo-section--active" : ""}`}
            >
              <ProductTourProfileSlice activeIndex={activeIndex} />
            </div>
            <div
              className={`gp-tour-demo-section ${activeStep === 1 ? "gp-tour-demo-section--active" : ""}`}
            >
              <ProductTourLoaderSlice />
            </div>
            <div
              className={`gp-tour-demo-section ${activeStep === 2 ? "gp-tour-demo-section--active" : ""}`}
            >
              <ProductTourIdeasSlice
                activeIndex={activeIndex}
                savedIdeas={savedIdeas}
                onToggleSaved={handleToggleSaved}
                productEntryPath={productEntryPath}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketingHome() {
  const { status } = useSupabaseSession();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const productEntryPath = getProductTourEntryPath(status);
  const handleProductTourLinkClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const productTourSection = document.getElementById("product-tour");
      if (!productTourSection) return;

      event.preventDefault();
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      productTourSection.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
      window.history.replaceState(null, "", "#product-tour");
    },
    [],
  );
  return (
    <div className="gp-landing-page">
      <section className="gp-landing-hero-stage gp-landing-scenic-hero">
        <div className="gp-landing-scenic-hero-inner">
          <div className="flex w-full flex-col items-center text-center">
            <GiftPerchHeroIntro />
            <div className="gp-landing-hero-cta w-full max-w-[44rem]">
              <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <Link
                  href="/auth/signup"
                  className="gp-btn gp-btn--primary gp-btn--lg w-full sm:w-[clamp(15.5rem,32vw,20rem)]"
                >
                  Start your gifting workspace
                </Link>
                <a
                  href="#product-tour"
                  onClick={handleProductTourLinkClick}
                  className="gp-btn gp-btn--secondary gp-btn--lg w-full sm:w-[clamp(13.25rem,27vw,16.5rem)]"
                >
                  See how it works
                </a>
              </div>
              <div className="gp-landing-hero-trust gp-landing-hero-benefits">
                <span className="gp-landing-hero-benefit">
                  <RefreshCcw className="gp-landing-hero-benefit-icon" aria-hidden="true" />
                  One-time setup
                </span>
                <span className="gp-landing-hero-benefit">
                  <BadgeCheck className="gp-landing-hero-benefit-icon" aria-hidden="true" />
                  Completely free to use
                </span>
                <span className="gp-landing-hero-benefit">
                  <ShieldCheck className="gp-landing-hero-benefit-icon" aria-hidden="true" />
                  Secure data storage
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="product-tour"
        aria-labelledby="product-tour-title"
        className="gp-landing-section gp-landing-section--product gp-tour-section scroll-mt-28"
      >
        <Image
          src="/tour-left-side.png"
          alt=""
          width={887}
          height={1774}
          sizes="(min-width: 1440px) 26vw, (min-width: 1180px) 24vw, 0px"
          className="gp-tour-decoration gp-tour-decoration--left"
          aria-hidden="true"
        />
        <Image
          src="/tour-right-side.png"
          alt=""
          width={820}
          height={1918}
          sizes="(min-width: 1440px) 21vw, (min-width: 1180px) 19vw, 0px"
          className="gp-tour-decoration gp-tour-decoration--right"
          aria-hidden="true"
        />

        <div className="gp-landing-section-inner gp-landing-section-inner--wide gp-tour-inner">
          <header className="gp-tour-heading">
            <div className="gp-tour-heading-ornament" aria-hidden="true">
              <span />
              <BookOpen />
              <span />
            </div>
            <p className="gp-tour-heading-eyebrow">Product tour</p>
            <h2 id="product-tour-title">How GiftPerch works</h2>
            <p className="gp-tour-heading-subtitle">
              From people you care about to thoughtful gift ideas — in just a few clicks.
            </p>
          </header>
          <LandingSampleProfiles steps={workflowSteps} />
        </div>
      </section>

      <section
        aria-labelledby="giftperch-difference-title"
        className="gp-landing-section gp-landing-section--comparison"
      >
        <Image
          src="/left-presents.png"
          alt=""
          width={1402}
          height={1122}
          sizes="(min-width: 1440px) 28vw, (min-width: 1100px) 24vw, 0px"
          className="gp-comparison-presents gp-comparison-presents--left"
          aria-hidden="true"
        />
        <Image
          src="/right-presents.png"
          alt=""
          width={1402}
          height={1122}
          sizes="(min-width: 1440px) 28vw, (min-width: 1100px) 24vw, 0px"
          className="gp-comparison-presents gp-comparison-presents--right"
          aria-hidden="true"
        />

        <div className="gp-landing-section-inner gp-comparison-inner">
          <header className="gp-comparison-heading">
            <div className="gp-comparison-ornament" aria-hidden="true">
              <span />
              <Gift />
              <span />
            </div>
            <h2 id="giftperch-difference-title">Why GiftPerch is different</h2>
            <p>Same question. A completely different experience.</p>
          </header>

          <div className="gp-difference-grid">
            <article className="gp-difference-panel gp-difference-panel--typical">
              <header className="gp-difference-panel-heading">
                <span className="gp-difference-panel-mark gp-difference-panel-mark--typical" aria-hidden="true">
                  <FileText />
                </span>
                <div>
                  <h3>Typical gift generators</h3>
                  <p>Generic suggestions. No memory. No real products.</p>
                </div>
              </header>
              <div className="gp-difference-chat gp-difference-chat--prompt">
                <span className="gp-difference-chat-icon" aria-hidden="true"><UserRound /></span>
                <p>I need a birthday gift for my mom.<br />She loves cooking and gardening.</p>
              </div>
              <div className="gp-difference-chat gp-difference-chat--response">
                <span className="gp-difference-chat-icon" aria-hidden="true"><Gift /></span>
                <div>
                  <p>Here are some gift ideas for your mom:</p>
                  <ol>
                    <li>A cookbook</li>
                    <li>A set of gardening tools</li>
                    <li>A scented candle</li>
                    <li>A cozy blanket</li>
                    <li>A nice water bottle</li>
                  </ol>
                  <p className="gp-difference-chat-note">These are thoughtful options, but they&apos;re just text suggestions. You&apos;ll still need to search for real products and prices on your own.</p>
                </div>
              </div>
            </article>
            <article className="gp-difference-panel gp-difference-panel--giftperch">
              <header className="gp-difference-panel-heading">
                <span className="gp-difference-panel-mark gp-difference-panel-mark--giftperch" aria-hidden="true">
                  <Image src="/giftperch_logo_only.png" alt="" width={48} height={48} />
                </span>
                <div>
                  <h3>GiftPerch offers</h3>
                  <p>Personalized ideas, <strong>real products, all in one place.</strong></p>
                </div>
              </header>
              <div className="gp-difference-offer-body">
                <ul className="gp-difference-benefits">
                  {differenceBenefits.map((benefit) => {
                    const Icon = benefit.icon;
                    return (
                      <li key={benefit.title}>
                        <span className="gp-difference-benefit-icon" aria-hidden="true"><Icon /></span>
                        <span><strong>{benefit.title}</strong><small>{benefit.description}</small></span>
                      </li>
                    );
                  })}
                </ul>
                <div className="gp-difference-product-stack" aria-label="Illustrative product examples">
                  {differenceProducts.map((product) => (
                    <DifferenceProductCard key={product.recipient} product={product} productEntryPath={productEntryPath} />
                  ))}
                </div>
              </div>
              <p className="gp-difference-disclosure">Illustrative examples</p>
            </article>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="homepage-faq-title"
        className="gp-landing-section gp-landing-section--faq gp-faq-section"
      >
        <div className="gp-landing-section-inner gp-faq-inner">
          <header className="gp-faq-heading">
            <div className="gp-faq-ornament" aria-hidden="true">
              <span />
              <MessageCircleQuestion />
              <span />
            </div>
            <p className="gp-faq-eyebrow">FAQ</p>
            <h2 id="homepage-faq-title">Questions, answered clearly</h2>
            <p className="gp-faq-subtitle">
              Everything you need to know before you start organizing smarter,
              more personal gifts.
            </p>
          </header>

          <div className="gp-faq-layout">
            <aside className="gp-faq-help" aria-label="GiftPerch benefits">
              <p className="gp-faq-help-eyebrow">Still have questions?</p>
              <h3>Here to make gifting easier.</h3>
              <span className="gp-faq-help-divider" aria-hidden="true" />
              <ul className="gp-faq-help-list">
                <li>
                  <span className="gp-faq-help-icon" aria-hidden="true">
                    <Gift />
                  </span>
                  <span>
                    <strong>Simple to use</strong>
                    <small>Get started in minutes.</small>
                  </span>
                </li>
                <li>
                  <span className="gp-faq-help-icon" aria-hidden="true">
                    <Heart />
                  </span>
                  <span>
                    <strong>Built for real life</strong>
                    <small>Birthdays, holidays, and everything in between.</small>
                  </span>
                </li>
                <li>
                  <span className="gp-faq-help-icon" aria-hidden="true">
                    <UsersRound />
                  </span>
                  <span>
                    <strong>A more thoughtful you</strong>
                    <small>Keep track and give gifts that truly fit.</small>
                  </span>
                </li>
              </ul>
            </aside>

            <div className="gp-faq-list">
              {faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <article
                    key={faq.question}
                    className={`gp-faq-card ${isOpen ? "gp-faq-card--open" : ""}`}
                  >
                    <button
                      type="button"
                      id={`faq-question-${index}`}
                      className="gp-faq-trigger"
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${index}`}
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    >
                      <span className="gp-faq-number" aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="gp-faq-question">
                        {faq.question}
                      </span>
                      <span className="gp-faq-toggle" aria-hidden="true">
                        {isOpen ? (
                          <Minus />
                        ) : (
                          <Plus />
                        )}
                      </span>
                    </button>
                    <div
                      id={`faq-answer-${index}`}
                      role="region"
                      aria-labelledby={`faq-question-${index}`}
                      aria-hidden={!isOpen}
                      className={`gp-faq-answer ${isOpen ? "gp-faq-answer--open" : ""}`}
                    >
                      <div>
                        <p>{faq.answer}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="gp-landing-section gp-landing-section--final-cta">
        <div className="gp-landing-section-inner gp-landing-section-inner--cta text-center">
          <h2 className="text-2xl font-semibold text-gp-cream">
            Start your gifting workspace today
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-gp-cream/80">
            Organize every recipient once, then let PerchPal help with better ideas
            all year.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/signup"
              className="gp-btn gp-btn--gold gp-btn--lg px-7"
            >
              Start your gifting workspace
            </Link>
            <a
              href="#product-tour"
              onClick={handleProductTourLinkClick}
              className="gp-btn gp-btn--secondary gp-btn--lg px-7"
            >
              See how it works
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
