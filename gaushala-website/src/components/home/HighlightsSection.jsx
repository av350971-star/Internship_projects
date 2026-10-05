import { gaushalaActivities, gaushalaFacilities } from "../../data/gaushalaHighlights.js";

// Two short, non-numeric lists ("गौशाला Activities" and "Facilities" — Part
// 7 of the frontend spec). Kept compact/list-style (not full IconCard
// grids) so this section reads differently from the Services preview
// above it, rather than repeating the same card layout twice.
function HighlightList({ title, items }) {
  return (
    <div>
      <h3 className="font-display text-lg text-brown-800">{title}</h3>
      <ul className="mt-4 space-y-3">
        {items.map(({ id, icon: Icon, label }) => (
          <li key={id} className="flex items-center gap-3 text-sm text-brown-600">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pasture-50 text-pasture-600">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HighlightsSection() {
  return (
    <section className="bg-cream-50 py-14 sm:py-20">
      <div className="container-page grid gap-10 sm:grid-cols-2">
        <HighlightList title="गौशाला Activities" items={gaushalaActivities} />
        <HighlightList title="सुविधाएं (Facilities)" items={gaushalaFacilities} />
      </div>
    </section>
  );
}
