import { MapPin, Mail, Phone, ExternalLink } from "lucide-react";
import { useGaushalaData } from "../context/DataContext.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import WhatsAppButton from "../components/ui/WhatsAppButton.jsx";
import {
  buildTelLink,
  buildMailLink,
} from "../utils/siteInfoHelpers.js";

// All contact details come from the admin-managed "Website Information"
// module (/admin/website-info → src/context/DataContext.jsx). Any field
// still holding its default "[PLACEHOLDER]" value renders as plain text
// instead of a fake, non-working tel:/mailto: link.
export default function Contact() {
  const { siteInfo } = useGaushalaData();

  const rows = [
    { icon: MapPin, label: "पता", value: siteInfo.address },
    {
      icon: Phone,
      label: "फ़ोन",
      value: siteInfo.phone,
      href: buildTelLink(siteInfo.phone),
    },
    {
      icon: Mail,
      label: "ईमेल",
      value: siteInfo.email,
      href: buildMailLink(siteInfo.email),
    },
  ];

  return (
    <div>
      <PageHeader title="संपर्क करें" subtitle="हमसे जुड़ें — हम आपकी सहायता के लिए यहाँ हैं।" />
      <div className="container-page py-14">
        <div className="mx-auto max-w-2xl divide-y divide-cream-200 rounded-2xl bg-cream-50 shadow-soft">
          {rows.map(({ icon: Icon, label, value, href }) => (
            <div key={label} className="flex items-center gap-4 px-6 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pasture-50 text-pasture-600">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs text-brown-400">{label}</p>
                {href ? (
                  <a href={href} className="font-medium text-brown-800 hover:text-pasture-600">
                    {value}
                  </a>
                ) : (
                  <p className="font-medium text-brown-800">{value}</p>
                )}
              </div>
            </div>
          ))}

          {siteInfo.mapLink && (
            <div className="px-6 py-4">
              <a
                href={siteInfo.mapLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-sm font-medium text-pasture-600 hover:text-pasture-700"
              >
                Google मानचित्र पर देखें
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          )}
        </div>

        <div className="mx-auto mt-8 flex max-w-2xl justify-center">
          <WhatsAppButton
            whatsapp={siteInfo.whatsapp}
            message="नमस्ते, मुझे गौशाला के बारे में जानकारी चाहिए।"
          />
        </div>
      </div>
    </div>
  );
}
