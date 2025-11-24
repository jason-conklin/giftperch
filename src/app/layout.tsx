import type { Metadata } from "next";
import "./globals.css";
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
  return (
    <html lang="en">
      <body className="bg-gp-cream text-gp-evergreen font-sans antialiased">
        <SupabaseProvider>
          <a href="#gp-main-content" className="gp-skip-link">
            Skip to main content
          </a>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
