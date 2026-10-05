import { useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE_MB = 5;

// Same frontend-only pattern as src/components/ui/ImageUploadField.jsx
// (FileReader → base64 data URL, no real upload), plus file type/size
// validation since this upload is public-facing.
//
// FUTURE BACKEND INTEGRATION: replace the FileReader step with a real
// upload to file/object storage and store the returned URL instead of
// base64.
export default function ReportPhotoUpload({ value, onChange, onError }) {
  const [localError, setLocalError] = useState("");

  const setError = (msg) => {
    setLocalError(msg);
    onError?.(msg);
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("कृपया JPG, PNG या WebP image अपलोड करें।");
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`Image का साइज़ ${MAX_FILE_SIZE_MB}MB से कम होना चाहिए।`);
      return;
    }

    setError("");
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-brown-700">
        समस्या की फोटो (वैकल्पिक)
      </label>
      <div className="flex items-center gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-brown-100 bg-cream-50">
          {value ? (
            <img
              src={value}
              alt="समस्या की फोटो प्रीव्यू"
              className="h-full w-full object-cover"
            />
          ) : (
            <ImagePlus className="h-6 w-6 text-brown-300" aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="cursor-pointer rounded-full border border-brown-200 px-4 py-1.5 text-sm font-medium text-brown-700 transition-colors hover:bg-cream-50">
            {value ? "फोटो बदलें" : "फोटो अपलोड करें"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFile}
              className="hidden"
              aria-label="समस्या की फोटो अपलोड करें"
            />
          </label>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setError("");
              }}
              className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              हटाएं
            </button>
          )}
        </div>
      </div>
      {localError && (
        <p role="alert" className="mt-1.5 text-xs text-red-500">
          {localError}
        </p>
      )}
    </div>
  );
}
