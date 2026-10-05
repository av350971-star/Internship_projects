import { PawPrint } from "lucide-react";

// Same card markup that used to live only in GauMata.jsx — pulled out so
// /gau-mata, /adoption, and the Home page's "गौ माता" preview all render
// cow records identically instead of duplicating this JSX three times.
// `actions` is optional page-specific buttons rendered under the info
// (e.g. "समस्या बताएं" on Gau Mata, "Adopt / Sponsor" on Adoption).
export default function CowCard({ cow, actions }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-soft transition-shadow hover:shadow-lift">
      <div className="flex h-48 items-center justify-center bg-cream-100">
        {cow.photo ? (
          <img
            src={cow.photo}
            alt={cow.name || "गौ माता"}
            className="h-full w-full object-cover"
          />
        ) : (
          <PawPrint className="h-10 w-10 text-brown-200" aria-hidden="true" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-lg text-brown-800">
            {cow.name || "नाम अनुपलब्ध"}
          </h3>
          {cow.status && (
            <span className="shrink-0 rounded-full bg-pasture-50 px-3 py-1 text-xs font-medium text-pasture-600">
              {cow.status}
            </span>
          )}
        </div>
        {cow.description && (
          <p className="mt-2 line-clamp-3 text-sm text-brown-500">{cow.description}</p>
        )}
        {cow.adoptionInfo && (
          <p className="mt-3 text-xs text-brown-400">{cow.adoptionInfo}</p>
        )}
        {actions && <div className="mt-4 flex flex-col gap-2">{actions}</div>}
      </div>
    </div>
  );
}
