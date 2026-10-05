import { MessageCircle } from "lucide-react";
import { buildWhatsAppLink } from "../../utils/siteInfoHelpers.js";

// Reused wherever a "WhatsApp पर संपर्क करें" CTA is needed (Contact page,
// Home contact CTA, ...). Builds the wa.me link from the admin-managed
// WhatsApp number (src/context/DataContext.jsx → siteInfo.whatsapp); if
// that's still the default placeholder, renders a disabled-looking button
// instead of a fake/dead link.
export default function WhatsAppButton({ whatsapp, message, className = "" }) {
  const link = buildWhatsAppLink(whatsapp, message);

  if (!link) {
    return (
      <span
        aria-disabled="true"
        title="WhatsApp नंबर अभी उपलब्ध नहीं है"
        className={`inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-brown-100 px-5 py-2.5 text-sm font-semibold text-brown-300 ${className}`}
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        WhatsApp पर संपर्क करें
      </span>
    );
  }

  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-2 rounded-full bg-pasture-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pasture-600 ${className}`}
    >
      <MessageCircle className="h-4 w-4" aria-hidden="true" />
      WhatsApp पर संपर्क करें
    </a>
  );
}
