import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { SupabaseProvider } from "@/components/providers/SupabaseProvider";

const title = "GiftPerch";
const description =
  "GiftPerch helps you build reusable recipient profiles and lean on PerchPal, an AI gifting assistant, to find thoughtful, Amazon-ready present ideas.";

export const metadata: Metadata = {
  metadataBase: new URL("https://giftperch.com"),
  title,
  description,
  openGraph: {
    title,
    description,
    url: "https://giftperch.com",
    siteName: "GiftPerch",
    images: [
      {
        url: "/giftperch_banner.png",
        alt: "GiftPerch banner artwork",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/giftperch_banner.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const year = new Date().getFullYear();

  return (
    <html lang="en">
      <head>
        <meta
          name='impact-site-verification'
          content='5835ce5a-9ee4-4f16-a691-f56255eceaaa'
        />
      </head>
      <body className="bg-gp-cream text-gp-evergreen font-sans antialiased">
        <SupabaseProvider>
          <a href="#gp-main-content" className="gp-skip-link">
            Skip to main content
          </a>
          {children}
          <footer className="gp-global-footer border-t border-gp-cream/40 bg-gp-cream pt-16 pb-8">
            <div className="mx-auto max-w-4xl space-y-2 text-center text-sm text-gp-evergreen/70">
              <p>
                © {year} GiftPerch. Built by{" "}
                <Link
                  href="https://jasonconklin.dev"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-gp-evergreen underline-offset-4 hover:underline"
                >
                  Jason Conklin
                </Link>
                .
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-xs uppercase tracking-wide">
                <Link href="/privacy" className="hover:text-gp-evergreen">
                  Privacy
                </Link>
                <Link href="/terms" className="hover:text-gp-evergreen">
                  Terms
                </Link>
                <Link href="/contact" className="hover:text-gp-evergreen">
                  Contact
                </Link>
              </div>
              <p className="text-xs text-gp-evergreen/70">
                As an Amazon Associate, I earn from qualifying purchases.
              </p>
              <Link
                href="/recommended-amazon-gifts"
                className="text-xs text-gp-evergreen/70 hover:text-gp-evergreen hover:underline"
              >
                Curated Amazon gift ideas
              </Link>
            </div>
          </footer>
        </SupabaseProvider>
      </body>
    </html>
  );
}
