import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import ClosingCta from "@/components/home/closing-cta";
import Faq from "@/components/home/faq";
import Features from "@/components/home/features";
import Hero from "@/components/home/hero";
import Showcase from "@/components/home/showcase";
import Stages from "@/components/home/stages";
import { faqs } from "@/data/faqs";
import { games } from "@/data/games";

const siteUrl = "https://yaply.eu.org";

export const metadata: Metadata = {
  alternates: { canonical: `${siteUrl}/` },
};

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: `${siteUrl}/`,
      name: "Yaply",
      alternateName: ["Yaply Games", "Yaply browser games"],
      description:
        "Free multiplayer browser games for game night, played with one link or room code.",
      inLanguage: "en",
      publisher: { "@id": `${siteUrl}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Yaply",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/icon.svg`,
        width: 64,
        height: 64,
      },
    },
    {
      "@type": "ItemList",
      "@id": `${siteUrl}/#games`,
      name: "Yaply browser games",
      itemListElement: games.map((game, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: game.name,
        url: game.url ?? `${siteUrl}/games/${game.slug}`,
        description: game.description,
      })),
    },
    {
      "@type": "FAQPage",
      "@id": `${siteUrl}/#faq`,
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <Hero />
        <Features />
        <Showcase />
        <Stages />
        <Faq />
        <ClosingCta />
      </main>
      <Footer />
    </>
  );
}
