import { Link } from "react-router-dom";
import { ArrowRight, PawPrint } from "lucide-react";
import { useGaushalaData } from "../../context/DataContext.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import CowCard from "../cow/CowCard.jsx";

// Reads the same "cows" slice as /gau-mata and /adoption
// (src/context/DataContext.jsx) — admin add/edit/delete reflects here too.
export default function CowsPreview() {
  const { cows } = useGaushalaData();
  const preview = cows.slice(0, 3);

  return (
    <section className="container-page py-14 sm:py-20">
      <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <div>
          <h2 className="font-display text-2xl text-brown-800 sm:text-3xl">
            गौ माता से मिलिए
          </h2>
          <p className="mt-2 text-brown-500">
            हमारी देखभाल में रह रही कुछ गौ माताएं।
          </p>
        </div>
        <Link
          to="/gau-mata"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brown-200 px-5 py-2.5 text-sm font-medium text-brown-700 transition-colors hover:bg-cream-50"
        >
          सभी देखें
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-8">
        {preview.length === 0 ? (
          <EmptyState
            icon={PawPrint}
            title="वास्तविक गौ माता की जानकारी जल्द अपडेट की जाएगी।"
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {preview.map((cow) => (
              <CowCard key={cow.id} cow={cow} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
