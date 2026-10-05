import { Link } from "react-router-dom";
import { ArrowRight, ImageIcon } from "lucide-react";
import { useGaushalaData } from "../../context/DataContext.jsx";
import EmptyState from "../ui/EmptyState.jsx";

// Reads the same "gallery" slice as the full /gallery page
// (src/context/DataContext.jsx) — admin add/edit/delete reflects here too.
export default function GalleryPreview() {
  const { gallery } = useGaushalaData();
  const preview = gallery.slice(0, 6);

  return (
    <section className="container-page py-14 sm:py-20">
      <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <div>
          <h2 className="font-display text-2xl text-brown-800 sm:text-3xl">गैलरी</h2>
          <p className="mt-2 text-brown-500">सेवा के कुछ खूबसूरत पल।</p>
        </div>
        <Link
          to="/gallery"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brown-200 px-5 py-2.5 text-sm font-medium text-brown-700 transition-colors hover:bg-cream-50"
        >
          पूरी गैलरी देखें
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-8">
        {preview.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title="अभी गैलरी में कोई फ़ोटो उपलब्ध नहीं है।"
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {preview.map((photo) => (
              <div
                key={photo.id}
                className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-cream-100"
              >
                {photo.image ? (
                  <img
                    src={photo.image}
                    alt={photo.title || "गैलरी फ़ोटो"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-6 w-6 text-brown-200" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
