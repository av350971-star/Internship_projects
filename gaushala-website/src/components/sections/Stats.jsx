import { PawPrint } from "lucide-react";
import { useGaushalaData } from "../../context/DataContext.jsx";
import EmptyState from "../ui/EmptyState.jsx";

// Values come from the admin-managed "Statistics" module. A stat with
// value === null hasn't been filled in yet, so it renders a placeholder
// dash instead of a misleadingly specific-looking number.
export default function Stats() {
  const { statistics } = useGaushalaData();
  const visible = statistics.filter((s) => s.enabled);

  return (
    <section className="container-page -mt-10 relative z-10">
      {visible.length === 0 ? (
        <EmptyState
          icon={PawPrint}
          title="अभी कोई सांख्यिकी उपलब्ध नहीं है।"
          subtitle="Admin Panel में 'Statistics' सेक्शन से आंकड़े जोड़ें।"
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {visible.map((stat) => (
            <div
              key={stat.id}
              className="flex flex-col items-center gap-2 rounded-2xl bg-white px-4 py-6 text-center shadow-lift"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-pasture-50 text-pasture-600">
                <PawPrint className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="font-display text-2xl font-bold text-brown-800">
                {stat.value ?? "—"}
              </p>
              <p className="text-xs text-brown-400 sm:text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
