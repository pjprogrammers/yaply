import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import ClosingCta from "@/components/home/closing-cta";
import Faq from "@/components/home/faq";
import Features from "@/components/home/features";
import Hero from "@/components/home/hero";
import Showcase from "@/components/home/showcase";
import Stages from "@/components/home/stages";
import { homeSchema } from "@/lib/structured-data";
import { SITE_HOST, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: `${SITE_URL}/` },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeSchema()) }}
      />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <Hero />
        <Features />
        <Showcase />
        <Stages siteHost={SITE_HOST} />
        <Faq />
        <ClosingCta />
      </main>
      <Footer />
    </>
  );
}
