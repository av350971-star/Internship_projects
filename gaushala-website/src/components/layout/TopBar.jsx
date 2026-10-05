import { Sparkles, Heart, Mail, Phone } from "lucide-react";
import { useGaushalaData } from "../../context/DataContext.jsx";

export default function TopBar() {
  // Phone/email come from the admin-managed "Website Information" module —
  // see src/context/DataContext.jsx. Editing them in /admin updates this
  // bar automatically, with no other component to touch.
  const { siteInfo } = useGaushalaData();

  return (
    <div className="bg-brown-800 text-cream-100 text-sm">
      <div className="container-page flex h-10 items-center justify-between gap-4">
        {/* Left: greeting */}
        <p className="flex items-center gap-1.5 font-medium whitespace-nowrap">
          <Sparkles className="h-3.5 w-3.5 text-marigold-400" aria-hidden="true" />
          <span>जय गौ माता</span>
        </p>

        {/* Center: tagline — hidden on small screens to avoid crowding */}
        <p className="hidden md:flex items-center gap-1.5 text-cream-200 whitespace-nowrap">
          <Heart className="h-3.5 w-3.5 text-marigold-400" aria-hidden="true" />
          <span>गौ सेवा ही मानव सेवा है</span>
        </p>

        {/* Right: contact details */}
        <div className="flex items-center gap-3 sm:gap-5 whitespace-nowrap">
          <a
            href={`mailto:${siteInfo.email}`}
            className="hidden sm:flex items-center gap-1.5 text-cream-200 transition-colors hover:text-white"
          >
            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{siteInfo.email}</span>
          </a>
          <a
            href={`tel:${siteInfo.phone}`}
            className="flex items-center gap-1.5 text-cream-200 transition-colors hover:text-white"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{siteInfo.phone}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
