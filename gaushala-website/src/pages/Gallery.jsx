import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { useGaushalaData } from "../context/DataContext.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import { galleryCategories } from "../data/defaultData.js";

// Reads directly from the "gallery" slice of DataContext — every add/edit/
// delete made in /admin → Gallery shows up here immediately.
export default function Gallery() {
  const { gallery } = useGaushalaData();
  const [activeCategory, setActiveCategory] = useState("सभी");

  const categoriesInUse = ["सभी", ...galleryCategories];
  const visiblePhotos =
    activeCategory === "सभी"
      ? gallery
      : gallery.filter((photo) => photo.category === activeCategory);

  return (
    <div>
      <PageHeader title="गैलरी" subtitle="सेवा के कुछ खूबसूरत पल।" />
      <div className="container-page py-14">
        {gallery.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {categoriesInUse.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-pasture-500 text-white"
                    : "bg-cream-100 text-brown-600 hover:bg-cream-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {gallery.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title="अभी गैलरी में कोई फ़ोटो उपलब्ध नहीं है।"
            subtitle="Admin Panel में 'Gallery' सेक्शन से फ़ोटो जोड़ें।"
          />
        ) : visiblePhotos.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title="इस श्रेणी में अभी कोई फ़ोटो नहीं है।"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePhotos.map((photo) => (
              <figure
                key={photo.id}
                className="overflow-hidden rounded-2xl bg-white shadow-soft"
              >
                <div className="flex h-56 items-center justify-center bg-cream-100">
                  {photo.image ? (
                    <img
                      src={photo.image}
                      alt={photo.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-brown-200" aria-hidden="true" />
                  )}
                </div>
                {(photo.title || photo.description) && (
                  <figcaption className="p-4">
                    {photo.title && (
                      <p className="font-medium text-brown-800">{photo.title}</p>
                    )}
                    {photo.description && (
                      <p className="mt-1 text-sm text-brown-500">
                        {photo.description}
                      </p>
                    )}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
