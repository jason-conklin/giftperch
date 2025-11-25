"use client";

import Link from "next/link";
import { useState } from "react";

type GettingStartedCardProps = {
  recipientCount: number;
};

const steps = [
  {
    number: "1",
    title: "Create a recipient profile",
    description: "Add the people you shop for so PerchPal can tailor suggestions.",
    href: "/recipients",
    cta: "Add recipient →",
  },
  {
    number: "2",
    title: "Generate your first gift ideas",
    description: "Pick a recipient, occasion, and budget to see AI-powered ideas.",
    href: "/gifts",
    cta: "Open Gift Ideas →",
  },
  {
    number: "3",
    title: "Save or like a gift idea",
    description: "Use Like, Dislike, or Save so PerchPal learns your preferences.",
    href: "/gifts",
    cta: "Browse suggestions →",
  },
];

export function GettingStartedCard({ recipientCount }: GettingStartedCardProps) {
  const [showCard, setShowCard] = useState(true);

  if (!showCard || recipientCount > 0) return null;

  return (
    <article className="bg-white rounded-3xl shadow-sm border border-gp-cream/60 px-5 py-4 sm:px-6 sm:py-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gp-evergreen/60">
            Getting started
          </p>
          <h3 className="text-lg sm:text-xl font-semibold text-gp-evergreen">
            Getting started with GiftPerch
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setShowCard(false)}
          className="text-sm text-gp-evergreen/60 hover:text-gp-evergreen focus:outline-none"
          aria-label="Dismiss onboarding card"
        >
          ×
        </button>
      </div>

      <div className="mt-3 divide-y divide-gp-cream/70">
        {steps.map((step) => (
          <div
            key={step.number}
            className="flex items-start gap-3 py-3 first:pt-2 last:pb-0"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gp-gold/60 bg-gp-cream/70 text-xs font-semibold text-gp-evergreen">
              {step.number}
            </span>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold text-gp-evergreen">
                {step.title}
              </p>
              <p className="text-sm text-gp-evergreen/75">{step.description}</p>
              <Link
                href={step.href}
                className="mt-1 inline-flex text-sm font-medium text-gp-evergreen underline decoration-gp-evergreen/40 underline-offset-4 hover:text-gp-evergreen/80"
              >
                {step.cta}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
