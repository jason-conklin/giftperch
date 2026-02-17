import MarketingHome from "./(marketing)/page";
import MarketingLayout from "./(marketing)/layout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GiftPerch - AI Gifting Workspace",
};

/**
 * The primary marketing experience also lives at the root URL
 * so that https://giftperch.com immediately showcases the public landing page.
 */
export default function Home() {
  return (
    <MarketingLayout>
      <MarketingHome />
    </MarketingLayout>
  );
}
