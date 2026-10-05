import { MapPin, Mail, Phone, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useGaushalaData } from "../../context/DataContext.jsx";
import { footerLinks } from "../../data/navLinks.js";
import LogoMark from "../ui/LogoMark.jsx";
import WhatsAppButton from "../ui/WhatsAppButton.jsx";
import { isPlaceholder, buildTelLink, buildMailLink } from "../../utils/siteInfoHelpers.js";

// Every field here comes from the admin-managed "Website Information"
// module (src/context/DataContext.jsx) — updating it in /admin updates
// this footer automatically. Placeholder values (e.g. "[PHONE NUMBER]")
// render as plain text instead of fake tel:/mailto: links.
export default function Footer() {
  const { siteInfo } = useGaushalaData();
  const telLink = buildTelLink(siteInfo.phone);
  const mailLink = buildMailLink(siteInfo.email);

  return (
    <footer className="bg-brown-900 text-cream-200">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand + about */}
        <div>
          <div className="flex items-center gap-3">
            <LogoMark className="h-10 w-10" />
            <span className="font-display text-lg text-white">{siteInfo.name}</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-cream-300/80">
            {siteInfo.about}
          </p>
        </div>

        {/* Quick links */}
        <div>
          <h3 className="font-display text-base text-white">त्वरित लिंक</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {footerLinks.map((link) => (
              <li key={link.id}>
                {link.route ? (
                  <Link
                    to={link.href}
                    className="text-cream-300/80 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    href={link.href}
                    className="text-cream-300/80 transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="font-display text-base text-white">संपर्क करें</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-start gap-2 text-cream-300/80">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-marigold-400" aria-hidden="true" />
              <span>{siteInfo.address}</span>
            </li>
            <li>
              {telLink ? (
                <a
                  href={telLink}
                  className="flex items-center gap-2 text-cream-300/80 transition-colors hover:text-white"
                >
                  <Phone className="h-4 w-4 shrink-0 text-marigold-400" aria-hidden="true" />
                  {siteInfo.phone}
                </a>
              ) : (
                <span className="flex items-center gap-2 text-cream-300/60">
                  <Phone className="h-4 w-4 shrink-0 text-marigold-400" aria-hidden="true" />
                  {siteInfo.phone}
                </span>
              )}
            </li>
            <li>
              {mailLink ? (
                <a
                  href={mailLink}
                  className="flex items-center gap-2 text-cream-300/80 transition-colors hover:text-white"
                >
                  <Mail className="h-4 w-4 shrink-0 text-marigold-400" aria-hidden="true" />
                  {siteInfo.email}
                </a>
              ) : (
                <span className="flex items-center gap-2 text-cream-300/60">
                  <Mail className="h-4 w-4 shrink-0 text-marigold-400" aria-hidden="true" />
                  {siteInfo.email}
                </span>
              )}
            </li>
            <li>
              <WhatsAppButton
                whatsapp={siteInfo.whatsapp}
                className="!bg-transparent !px-0 !py-0 !text-cream-300/80 hover:!text-white"
              />
            </li>
          </ul>
        </div>

        {/* Location */}
        <div>
          <h3 className="font-display text-base text-white">हमारी लोकेशन</h3>
          {!isPlaceholder(siteInfo.mapLink) ? (
            <a
              href={siteInfo.mapLink}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex items-center gap-1.5 text-sm text-marigold-400 transition-colors hover:text-marigold-500"
            >
              Google मानचित्र पर देखें
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : (
            <p className="mt-4 text-sm text-cream-300/60">
              मानचित्र लिंक अभी उपलब्ध नहीं है।
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-cream-300/60 sm:flex-row">
          <p>© {new Date().getFullYear()} {siteInfo.name} | सभी अधिकार सुरक्षित</p>
          <p>Designed with ❤️ for गौ सेवा</p>
        </div>
      </div>
    </footer>
  );
}
