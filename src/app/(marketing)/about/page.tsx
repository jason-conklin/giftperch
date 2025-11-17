import Link from "next/link";

export default function AboutPage() {
  return (
    <section className="space-y-10">
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-wide text-gp-evergreen/60">
          About
        </p>
        <h1 className="text-4xl font-semibold text-gp-evergreen">
          The story behind GiftPerch
        </h1>
        <p className="text-base text-gp-evergreen/80">
          GiftPerch was born out of a simple, universal pain: forgetting what you
          gifted last year, scrambling for ideas, and buying something generic
          because you ran out of time. Jason Conklin set out to build a warmer,
          smarter alternative.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gp-evergreen">
          The problem
        </h2>
        <p className="text-base text-gp-evergreen/80">
          Most wishlists feel transactional and forgetful of context. You juggle
          notes on your phone, Amazon carts, and a foggy memory of past gifts.
          That stress steals the joy out of being thoughtful.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gp-evergreen">
          The idea
        </h2>
        <p className="text-base text-gp-evergreen/80">
          GiftPerch treats gifting like a relationship. Build reusable recipient
          profiles, store traditions, budgets, and inside jokes, and let PerchPal
          bring AI intuition without losing the human touch. It is an assistant,
          not a replacement for thoughtfulness.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-gp-evergreen">
          The vision
        </h2>
        <p className="text-base text-gp-evergreen/80">
          GiftPerch is a foundation for shared gifting spaces--families, couples,
          friend groups, even corporate gifting teams. Privacy and control stay
          with you while PerchPal surfaces better ideas, faster. Over time,
          expect collaborative planning, expert-curated drops, and corporate
          tools.
        </p>
      </section>

      <div className="rounded-3xl border border-gp-evergreen/20 bg-white/90 p-6 text-sm text-gp-evergreen/80">
        GiftPerch is being crafted by Jason Conklin as a thoughtful, human-centered
        alternative to noisy, generic gift lists. Want to see the product in
        action?{" "}
        <Link
          href="/"
          className="font-semibold text-gp-evergreen underline-offset-4 hover:underline"
        >
          Visit the home page
        </Link>{" "}
        or{" "}
        <Link
          href="/features"
          className="font-semibold text-gp-evergreen underline-offset-4 hover:underline"
        >
          explore why GiftPerch stands out
        </Link>
        .
      </div>
    </section>
  );
}
