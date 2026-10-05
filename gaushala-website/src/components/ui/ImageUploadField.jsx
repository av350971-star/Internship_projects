import { ImagePlus, Trash2 } from "lucide-react";

// Frontend-only image handling: converts the chosen file to a base64 data
// URL via FileReader and stores that string directly in context/localStorage.
// FUTURE BACKEND INTEGRATION: replace the FileReader step with an upload to
// real file/object storage, and store the returned URL instead of base64.
export default function ImageUploadField({ label, value, onChange }) {
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-brown-700">
          {label}
        </label>
      )}
      <div className="flex items-center gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-brown-100 bg-cream-50">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-6 w-6 text-brown-300" aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="cursor-pointer rounded-full border border-brown-200 px-4 py-1.5 text-sm font-medium text-brown-700 transition-colors hover:bg-cream-50">
            {value ? "बदलें" : "अपलोड करें"}
            <input
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="hidden"
            />
          </label>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              हटाएं
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
