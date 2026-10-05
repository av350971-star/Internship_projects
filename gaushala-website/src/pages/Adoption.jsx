import { useState } from "react";
import { HandHeart, PawPrint } from "lucide-react";
import { useGaushalaData } from "../context/DataContext.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import CowCard from "../components/cow/CowCard.jsx";
import AdoptionModal from "../components/adoption/AdoptionModal.jsx";

// Reuses the same "cows" data as /gau-mata (src/context/DataContext.jsx)
// and the shared <CowCard> — adding/editing/deleting a cow in
// /admin → गौ माता updates this page too, automatically.
export default function Adoption() {
  const { cows } = useGaushalaData();
  const [modalCowId, setModalCowId] = useState(undefined); // undefined = closed
  const isOpen = modalCowId !== undefined;

  return (
    <div>
      <PageHeader
        title="गौ माता को गोद लें"
        subtitle="Adoption / Sponsorship के ज़रिए किसी गौ माता की सीधी देखभाल में सहयोग करें।"
      />

      <div className="container-page py-14">
        {/* Explanation */}
        <div className="mx-auto max-w-3xl rounded-2xl bg-cream-50 p-8 shadow-soft">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pasture-50 text-pasture-600">
              <HandHeart className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-lg text-brown-800">
                Adoption / Sponsorship का उद्देश्य
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-brown-600">
                गौ माता को गोद लेना (Adopt) या sponsor करना एक तरीका है जिससे आप
                किसी एक गौ माता के चारे, चिकित्सा और देखभाल की ज़िम्मेदारी में
                सीधा योगदान दे सकते हैं। यह एक frontend/demo पूछताछ फ़ॉर्म है —
                submit करने के बाद हमारी टीम आपसे संपर्क करके आगे की प्रक्रिया
                बताएगी। अभी कोई वास्तविक भुगतान (payment) इससे नहीं जुड़ा है।
              </p>
            </div>
          </div>

          {cows.length > 0 && (
            <button
              type="button"
              onClick={() => setModalCowId(null)}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-pasture-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pasture-600 sm:w-auto sm:px-8"
            >
              <HandHeart className="h-4 w-4" aria-hidden="true" />
              सामान्य Adoption पूछताछ भेजें
            </button>
          )}
        </div>

        {/* Available cows */}
        <div className="mx-auto mt-12 max-w-6xl">
          <h2 className="mb-6 font-display text-xl text-brown-800">
            उपलब्ध गौ माताएं
          </h2>

          {cows.length === 0 ? (
            <EmptyState
              icon={PawPrint}
              title="वास्तविक गौ माता की जानकारी जल्द अपडेट की जाएगी।"
              subtitle="Admin Panel में 'गौ माता' सेक्शन से रिकॉर्ड जोड़े जाने पर वे यहाँ दिखेंगी।"
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cows.map((cow) => (
                <CowCard
                  key={cow.id}
                  cow={cow}
                  actions={
                    <button
                      type="button"
                      onClick={() => setModalCowId(cow.id)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-full bg-pasture-500 py-2 text-sm font-medium text-white transition-colors hover:bg-pasture-600"
                    >
                      <HandHeart className="h-4 w-4" aria-hidden="true" />
                      Adopt / Sponsor करें
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AdoptionModal
        cows={cows}
        initialCowId={modalCowId || ""}
        open={isOpen}
        onClose={() => setModalCowId(undefined)}
      />
    </div>
  );
}
