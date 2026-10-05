import { QrCode, Copy, Info } from "lucide-react";
import { useState } from "react";
import { useGaushalaData } from "../context/DataContext.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";

// Info-only donation page — intentionally NOT wired to any real payment
// gateway or verification. UPI ID / QR / amounts all come from the
// admin-managed "Donation Information" module.
export default function Donation() {
  const { donation } = useGaushalaData();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!donation.upiId) return;
    navigator.clipboard?.writeText(donation.upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <PageHeader title="डोनेशन करें" subtitle="आपका छोटा सा सहयोग बड़ा बदलाव ला सकता है।" />
      <div className="container-page py-14">
        <div className="mx-auto flex max-w-3xl items-start gap-2 rounded-xl bg-marigold-400/10 px-4 py-3 text-sm text-brown-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-marigold-500" aria-hidden="true" />
          <p>
            यह एक डेमो पेज है — यहाँ अभी कोई वास्तविक भुगतान प्रणाली (payment
            gateway) जुड़ी हुई नहीं है।
          </p>
        </div>

        <div className="mx-auto mt-8 grid max-w-3xl gap-6 sm:grid-cols-2">
          {/* QR + UPI */}
          <div className="rounded-2xl bg-cream-50 p-6 text-center shadow-soft">
            <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-xl bg-white shadow-soft">
              {donation.qrImage ? (
                <img
                  src={donation.qrImage}
                  alt="Donation QR code"
                  className="h-full w-full rounded-xl object-cover"
                />
              ) : (
                <QrCode className="h-10 w-10 text-brown-200" aria-hidden="true" />
              )}
            </div>
            <p className="mt-4 text-sm text-brown-500">UPI ID</p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <p className="font-medium text-brown-800">
                {donation.upiId || "अभी उपलब्ध नहीं है"}
              </p>
              {donation.upiId && (
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label="UPI ID कॉपी करें"
                  className="text-brown-400 hover:text-brown-700"
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
            {copied && <p className="mt-1 text-xs text-pasture-600">कॉपी हो गया</p>}
          </div>

          {/* Description + suggested amounts */}
          <div className="rounded-2xl bg-cream-50 p-6 shadow-soft">
            <p className="text-sm leading-relaxed text-brown-600">
              {donation.description}
            </p>

            {donation.suggestedAmounts.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-medium text-brown-700">
                  सुझाए गए राशि विकल्प
                </p>
                <div className="flex flex-wrap gap-2">
                  {donation.suggestedAmounts.map((item) => (
                    <span
                      key={item.id}
                      className="rounded-full bg-pasture-500 px-4 py-1.5 text-sm font-semibold text-white"
                    >
                      ₹{item.amount}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
