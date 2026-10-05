import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import IconCard from "../ui/IconCard.jsx";
import { services } from "../../data/servicesData.js";

// Shows a subset of the same services list used by the full /services
// page (src/data/servicesData.js) — edit once, both places update.
export default function ServicesPreview() {
  const preview = services.slice(0, 6);

  return (
    <section className="bg-cream-50 py-14 sm:py-20">
      <div className="container-page">
        <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div>
            <h2 className="font-display text-2xl text-brown-800 sm:text-3xl">
              गौ सेवा / हमारी सेवाएं
            </h2>
            <p className="mt-2 text-brown-500">
              गौ माता की सेवा में हमारे मुख्य प्रयास।
            </p>
          </div>
          <Link
            to="/services"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brown-200 px-5 py-2.5 text-sm font-medium text-brown-700 transition-colors hover:bg-white"
          >
            सभी सेवाएं देखें
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {preview.map((service) => (
            <IconCard
              key={service.id}
              icon={service.icon}
              title={service.title}
              description={service.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
