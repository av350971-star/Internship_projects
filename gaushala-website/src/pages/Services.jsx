import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import PageHeader from "../components/ui/PageHeader.jsx";
import IconCard from "../components/ui/IconCard.jsx";
import { services } from "../data/servicesData.js";

// Static content page — service descriptions only, no invented statistics
// or claims. Shares its data (src/data/servicesData.js) with the Home
// page's services preview section.
export default function Services() {
  return (
    <div>
      <PageHeader
        title="हमारी सेवाएं"
        subtitle="गौ माता की सेवा में हमारे प्रयास।"
      />
      <div className="container-page py-14">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <IconCard
              key={service.id}
              icon={service.icon}
              title={service.title}
              description={service.description}
              action={
                service.to ? (
                  <Link
                    to={service.to}
                    className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-pasture-600 hover:text-pasture-700"
                  >
                    {service.linkLabel}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                ) : undefined
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
