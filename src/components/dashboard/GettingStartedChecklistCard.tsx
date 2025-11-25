"use client";

import Link from "next/link";

type GettingStartedChecklistCardProps = {
  hasRecipient: boolean;
  hasGenerated: boolean;
  hasSavedOrLiked: boolean;
};

const steps = [
  {
    key: "recipient",
    title: "Create a recipient profile",
    description: "Add the people you shop for so PerchPal can tailor suggestions.",
    actionHref: "/recipients",
    actionLabel: "Add recipient →",
  },
  {
    key: "generate",
    title: "Generate your first gift ideas",
    description: "Ask PerchPal to suggest thoughtful gifts for a recipient.",
    actionHref: "/gifts",
    actionLabel: "Open Gift Ideas →",
  },
  {
    key: "save-like",
    title: "Save or like a gift idea",
    description: "Use Like, Dislike, or Save so PerchPal learns your preferences.",
    actionHref: "/gifts",
    actionLabel: "Browse suggestions →",
  },
];

export function GettingStartedChecklistCard({
  hasRecipient,
  hasGenerated,
  hasSavedOrLiked,
}: GettingStartedChecklistCardProps) {
  const completionMap: Record<string, boolean> = {
    recipient: hasRecipient,
    generate: hasGenerated,
    "save-like": hasSavedOrLiked,
  };

  const allDone = hasRecipient && hasGenerated && hasSavedOrLiked;
  if (allDone) return null;

  return (
    <article className="gp-card flex flex-col gap-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-gp-evergreen/60">
          Getting started
        </p>
        <h3 className="text-lg font-semibold text-gp-evergreen">
          Getting started with GiftPerch
        </h3>
      </div>

      <div className="divide-y divide-gp-evergreen/10 rounded-2xl border border-gp-evergreen/10 bg-gp-cream/70">
        {steps.map((step) => {
          const completed = completionMap[step.key];
          return (
            <div
              key={step.key}
              className="flex items-start gap-3 px-4 py-3"
              aria-live="polite"
            >
              <span
                className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full ${
                  completed
                    ? "bg-gp-gold text-gp-evergreen"
                    : "border border-gp-evergreen/30 bg-white"
                }`}
                aria-hidden="true"
              >
                {completed ? (
                  <svg
                    className="h-4 w-4 text-gp-evergreen"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M16.25 5.75L8.5 13.5 5 10"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span className="h-2 w-2 rounded-full bg-gp-evergreen/30" />
                )}
              </span>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold text-gp-evergreen">
                  {step.title}
                </p>
                <p className="text-sm text-gp-evergreen/70">
                  {step.description}
                </p>
                {!completed ? (
                  <Link
                    href={step.actionHref}
                    className="text-sm font-semibold text-gp-evergreen underline-offset-4 hover:underline"
                  >
                    {step.actionLabel}
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
