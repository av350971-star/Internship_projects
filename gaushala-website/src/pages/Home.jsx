import Hero from "../components/sections/Hero.jsx";
import Stats from "../components/sections/Stats.jsx";
import IntroSection from "../components/home/IntroSection.jsx";
import ServicesPreview from "../components/home/ServicesPreview.jsx";
import CowsPreview from "../components/home/CowsPreview.jsx";
import HighlightsSection from "../components/home/HighlightsSection.jsx";
import GalleryPreview from "../components/home/GalleryPreview.jsx";
import CtaBand from "../components/home/CtaBand.jsx";
import ContactCta from "../components/home/ContactCta.jsx";

// Home page structure (kept in the original Hero → Stats visual style,
// just extended with the rest of the sections from the frontend spec):
// Hero, Intro, Statistics, Services preview, Gau Mata preview,
// Activities/Facilities, Gallery preview, Adoption/Volunteer/Donation CTA
// band, Contact CTA.
export default function Home() {
  return (
    <>
      <Hero />
      <div className="pt-10">
        <Stats />
      </div>
      <IntroSection />
      <ServicesPreview />
      <CowsPreview />
      <HighlightsSection />
      <GalleryPreview />
      <CtaBand />
      <ContactCta />
    </>
  );
}
