export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gp-evergreen/50">
          GiftPerch
        </p>
        <h1 className="text-3xl font-semibold text-gp-evergreen">
          Privacy Policy
        </h1>
        <p className="text-sm text-gp-evergreen/70">
          This is a plain-language overview of how GiftPerch handles your data. It is not
          formal legal advice and may be updated as the product evolves.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gp-evergreen">
          Information we collect
        </h2>
        <p className="text-sm text-gp-evergreen/80">
          We collect basic account details (like email and display name), recipient profiles
          you create, and usage signals from your interactions with GiftPerch. This helps us
          deliver and improve AI-powered gift suggestions.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gp-evergreen">
          How we use your information
        </h2>
        <p className="text-sm text-gp-evergreen/80">
          Your information powers PerchPal recommendations, keeps your account and profiles
          in sync, and lets us enhance the experience over time. We do not sell your data.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gp-evergreen">
          Third-party services
        </h2>
        <p className="text-sm text-gp-evergreen/80">
          We use Supabase for authentication, database, and storage. Amazon Associate links
          may be included with product recommendations; they help support GiftPerch when you
          click or purchase through those links.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gp-evergreen">
          Your choices
        </h2>
        <p className="text-sm text-gp-evergreen/80">
          You can delete recipient profiles and request account deletion. Removing your data
          may impact your ability to use PerchPal suggestions and other features.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gp-evergreen">
          Contact
        </h2>
        <p className="text-sm text-gp-evergreen/80">
          Questions or requests? Email{" "}
          <a
            href="mailto:support@giftperch.com"
            className="font-semibold text-gp-evergreen underline-offset-4 hover:underline"
          >
            support@giftperch.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}
