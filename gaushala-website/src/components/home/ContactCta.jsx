import { Link } from "react-router-dom";
import { Phone, ArrowRight } from "lucide-react";
import { useGaushalaData } from "../../context/DataContext.jsx";
import WhatsAppButton from "../ui/WhatsAppButton.jsx";
import { buildTelLink } from "../../utils/siteInfoHelpers.js";

// Final Home section — quick contact actions built from the same
// admin-managed siteInfo used on the Contact page and Footer. Phone link
// is hidden (falls back to a disabled-look button) until a real number is
// set, same placeholder-safety rule as everywhere else.
export default function ContactCta() {
  const { siteInfo } = useGaushalaData();
  const telLink = buildTelLink(siteInfo.phone);

  return (
    <section className="container-page py-14 sm:py-20">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 rounded-2xl bg-cream-50 p-10 text-center shadow-soft">
        <h2 className="font-display text-2xl text-brown-800 sm:text-3xl">
          हमसे जुड़ें
        </h2>
        <p className="max-w-xl text-brown-500">
          कोई सवाल है या गौ माता के बारे में जानकारी चाहिए? हमसे संपर्क करें।
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <WhatsAppButton whatsapp={siteInfo.whatsapp} />
          {telLink ? (
            <a
              href={telLink}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-brown-200 px-5 py-2.5 text-sm font-semibold text-brown-700 transition-colors hover:bg-white"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              कॉल करें
            </a>
          ) : (
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-brown-200 px-5 py-2.5 text-sm font-semibold text-brown-700 transition-colors hover:bg-white"
            >
              संपर्क पेज देखें
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
