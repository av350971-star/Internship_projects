import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import Modal from "../ui/Modal.jsx";
import FormMessage from "../ui/FormMessage.jsx";
import ReportPhotoUpload from "./ReportPhotoUpload.jsx";
import { useReports } from "../../context/ReportsContext.jsx";
import { inputClass, textareaClass, labelClass } from "../ui/formStyles.js";

const emptyDraft = {
  description: "",
  photo: "",
  contactName: "",
  contactPhone: "",
};

// Public, login-not-required "गौ माता की समस्या बताएं" form.
// Always opened for a specific cow (from its card on the Gau Mata page) —
// the cow is attached automatically and is never manually selected here.
export default function ReportModal({ cow, open, onClose }) {
  const { addReport } = useReports();
  const [draft, setDraft] = useState(emptyDraft);
  const [status, setStatus] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const resetAndClose = () => {
    onClose();
    // Small delay so the form doesn't visibly reset mid-close animation.
    setTimeout(() => {
      setDraft(emptyDraft);
      setStatus(null);
      setSubmitted(false);
    }, 200);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!draft.description.trim()) {
      setStatus({ type: "error", text: "कृपया समस्या के बारे में जानकारी दें।" });
      return;
    }
    if (draft.contactPhone.trim() && !/^[0-9+\-\s]{7,15}$/.test(draft.contactPhone.trim())) {
      setStatus({ type: "error", text: "कृपया एक मान्य फ़ोन/WhatsApp नंबर दर्ज करें।" });
      return;
    }

    // Demo/frontend-only: writes into ReportsContext (→ localStorage).
    // A real backend would save this into a reports database, linked to
    // the cow by ID.
    addReport({
      cowId: cow?.id || "",
      cowName: cow?.name || "",
      cowPhoto: cow?.photo || "",
      description: draft.description.trim(),
      photo: draft.photo,
      contactName: draft.contactName.trim(),
      contactPhone: draft.contactPhone.trim(),
    });

    setStatus(null);
    setSubmitted(true);
  };

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title={submitted ? "धन्यवाद" : "गौ माता की समस्या बताएं"}
    >
      {submitted ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pasture-50 text-pasture-600">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="text-sm text-brown-600">
            आपकी रिपोर्ट प्राप्त हो गई है। गौ माता की समस्या की जानकारी देने के लिए धन्यवाद।
          </p>
          <button
            type="button"
            onClick={resetAndClose}
            className="mt-2 rounded-full bg-pasture-500 px-6 py-2 text-sm font-semibold text-white hover:bg-pasture-600"
          >
            ठीक है
          </button>
        </div>
      ) : (
        <>
          {cow && (
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-cream-50 p-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                {cow.photo ? (
                  <img
                    src={cow.photo}
                    alt={cow.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] text-brown-300">फोटो नहीं</span>
                )}
              </div>
              <div>
                <p className="text-xs text-brown-400">चयनित गौ माता</p>
                <p className="font-medium text-brown-800">
                  {cow.name || "नाम अनुपलब्ध"}
                </p>
              </div>
            </div>
          )}

          <FormMessage status={status} />

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="report-description" className={labelClass}>
                समस्या का विवरण <span className="text-red-500">*</span>
              </label>
              <textarea
                id="report-description"
                rows={4}
                value={draft.description}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, description: e.target.value }))
                }
                className={textareaClass}
                placeholder="कृपया गौ माता की समस्या के बारे में बताएं..."
              />
            </div>

            <ReportPhotoUpload
              value={draft.photo}
              onChange={(val) => setDraft((d) => ({ ...d, photo: val }))}
              onError={(msg) => msg && setStatus({ type: "error", text: msg })}
            />

            <div>
              <label htmlFor="report-name" className={labelClass}>
                आपका नाम (वैकल्पिक)
              </label>
              <input
                id="report-name"
                value={draft.contactName}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, contactName: e.target.value }))
                }
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="report-phone" className={labelClass}>
                फ़ोन / WhatsApp नंबर (वैकल्पिक)
              </label>
              <input
                id="report-phone"
                type="tel"
                value={draft.contactPhone}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, contactPhone: e.target.value }))
                }
                className={inputClass}
                placeholder="+91 XXXXXXXXXX"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-pasture-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pasture-600"
            >
              Submit Report
            </button>
          </form>
        </>
      )}
    </Modal>
  );
}
