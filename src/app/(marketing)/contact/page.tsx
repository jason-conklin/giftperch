export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gp-evergreen/50">
          GiftPerch
        </p>
        <h1 className="text-3xl font-semibold text-gp-evergreen">Contact</h1>
        <p className="text-sm text-gp-evergreen/70">
          Have a question about GiftPerch, feedback, or a bug to report? I&apos;d
          love to hear from you.
        </p>
      </section>

      <section className="gp-card space-y-3">
        <h2 className="text-lg font-semibold text-gp-evergreen">Email</h2>
        <p className="text-sm text-gp-evergreen/80">
          For questions, feedback, or partnership ideas, contact me at{" "}
          <a
            href="mailto:support@giftperch.com"
            className="font-semibold text-gp-evergreen underline-offset-4 hover:underline"
          >
            support@giftperch.com
          </a>
          . I try to respond within a few days.
        </p>
      </section>
    </div>
  );
}
