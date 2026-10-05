import { Link } from "react-router-dom";
import { HandHeart, HeartHandshake, Heart, ArrowRight } from "lucide-react";

const ctas = [
  {
    id: "adoption",
    icon: HandHeart,
    title: "गौ माता को गोद लें",
    description: "किसी गौ माता की सीधी देखभाल में Adopt/Sponsor करके योगदान दें।",
    to: "/adoption",
    label: "अभी गोद लें",
  },
  {
    id: "volunteer",
    icon: HeartHandshake,
    title: "Volunteer बनें",
    description: "अपना समय और कौशल देकर गौशाला की सेवाओं में हाथ बंटाएं।",
    to: "/volunteer",
    label: "Volunteer Seva",
  },
  {
    id: "donation",
    icon: Heart,
    title: "डोनेट करें",
    description: "आपका छोटा सा सहयोग गौ माताओं के जीवन में बड़ा बदलाव ला सकता है।",
    to: "/donation",
    label: "डोनेट करें",
  },
];

// Combines the Adoption/Volunteer/Donation Home CTAs (Part 7, items 9–11)
// into one visually cohesive three-card band instead of three separate,
// near-identical full-width sections back to back.
export default function CtaBand() {
  return (
    <section className="bg-brown-900 py-14 sm:py-20">
      <div className="container-page grid gap-6 sm:grid-cols-3">
        {ctas.map(({ id, icon: Icon, title, description, to, label }) => (
          <div
            key={id}
            className="flex flex-col items-start gap-3 rounded-2xl bg-white/5 p-6 ring-1 ring-white/10"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-marigold-400">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="font-display text-lg text-white">{title}</h3>
            <p className="text-sm leading-relaxed text-cream-300/80">{description}</p>
            <Link
              to={to}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-marigold-400 hover:text-marigold-500"
            >
              {label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
