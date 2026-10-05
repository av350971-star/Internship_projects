import { Link } from "react-router-dom";
import { Heart, PawPrint } from "lucide-react";
import { useGaushalaData } from "../../context/DataContext.jsx";

// High-quality Unsplash photo (free to use, Unsplash License) of an Indian
// cow in a shed at dusk — sets the "peaceful gaushala" mood for the hero.
// Source: https://unsplash.com/photos/lyFPwxqut5E (Ronak Naik)
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1633786902074-19d9c2bf1212?q=80&w=1920&auto=format&fit=crop";

export default function Hero() {
  // The floating stat card used to show a hardcoded "500+ गौ माताओं की
  // सेवा" claim — replaced with the real, admin-managed cow count so the
  // hero never presents fake data as real. It's hidden entirely until
  // there's at least one real record to report.
  const { siteInfo, cows } = useGaushalaData();

  return (
    <section
      id="home"
      className="relative isolate flex min-h-[560px] items-center overflow-hidden lg:h-[600px] lg:min-h-0"
    >
      {/* Background image with a slow, subtle zoom */}
      <div
        className="absolute inset-0 -z-20 animate-hero-zoom bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        role="img"
        aria-label="गौशाला में शांतिपूर्वक विश्राम करती गौ माता"
      />

      {/* Dark gradient overlay — keeps left-side text readable while the
          image stays visible toward the right. */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brown-950/90 via-brown-950/60 to-brown-950/20" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-brown-950/70 via-transparent to-transparent" />

      <div className="container-page relative w-full py-16 lg:py-0">
        <div className="max-w-2xl">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm text-cream-50 backdrop-blur-sm animate-fade-in-up"
          >
            <span aria-hidden="true">🐄</span>
            <span>{siteInfo?.name ? `${siteInfo.name} में आपका स्वागत है` : "सर्व हितम सेवा गौशाला में आपका स्वागत है"}</span>
          </div>

          {/* Heading */}
          <h1
            className="mt-5 font-display text-5xl font-bold leading-[1.1] text-white sm:text-6xl lg:text-7xl animate-fade-in-up [animation-delay:120ms]"
          >
            गौ सेवा ही
            <br />
            मानव सेवा है
          </h1>

          {/* Supporting copy */}
          <p
            className="mt-6 max-w-xl text-base leading-relaxed text-cream-100/90 sm:text-lg animate-fade-in-up [animation-delay:220ms]"
          >
            आइए, गौ माता की सेवा में अपना योगदान दें और बेसहारा एवं जरूरतमंद गौ
            माताओं के जीवन को बेहतर बनाने में हमारी सहायता करें।
          </p>

          {/* CTAs */}
          <div
            className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center animate-fade-in-up [animation-delay:320ms]"
          >
            <Link
              to="/donation"
              className="flex items-center justify-center gap-2 rounded-full bg-pasture-500 px-7 py-3.5 text-base font-semibold text-white shadow-lift transition-all duration-200 hover:-translate-y-0.5 hover:bg-pasture-600"
            >
              <Heart className="h-5 w-5" aria-hidden="true" />
              डोनेट करें
            </Link>
            <Link
              to="/adoption"
              className="flex items-center justify-center gap-2 rounded-full border border-white/40 bg-white/10 px-7 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20"
            >
              <PawPrint className="h-5 w-5" aria-hidden="true" />
              गौ माता को गोद लें
            </Link>
          </div>
        </div>
      </div>

      {/* Floating stat card — only shown once there's a real cow count to
          report (never a placeholder/fake figure). */}
      {cows.length > 0 && (
        <div className="absolute bottom-6 right-4 z-10 hidden sm:flex animate-float sm:right-6 lg:right-10 lg:bottom-10">
          <div className="flex items-center gap-3 rounded-2xl bg-white/95 px-5 py-4 shadow-lift backdrop-blur-sm">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pasture-50">
              <Heart className="h-5 w-5 text-pasture-600" aria-hidden="true" />
            </span>
            <p className="text-sm font-semibold text-brown-800 sm:text-base">
              {cows.length}+ गौ माताओं की सेवा
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
