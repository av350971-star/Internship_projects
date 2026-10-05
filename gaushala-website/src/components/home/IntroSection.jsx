import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useGaushalaData } from "../../context/DataContext.jsx";

// Short intro pulled from the same admin-managed "about" text as the full
// /about page (src/context/DataContext.jsx → siteInfo.about) — truncated
// visually via line-clamp so it stays "short" on Home without a second
// copy of the text to maintain.
export default function IntroSection() {
  const { siteInfo } = useGaushalaData();

  return (
    <section className="container-page py-14 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-display text-2xl text-brown-800 sm:text-3xl">
          {siteInfo.name}
        </h2>
        <p className="mt-4 line-clamp-4 whitespace-pre-line text-base leading-relaxed text-brown-600">
          {siteInfo.about}
        </p>
        <Link
          to="/about"
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-pasture-600 hover:text-pasture-700"
        >
          और जानें
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
