import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import PageHeader from "../components/ui/PageHeader.jsx";
import FormMessage from "../components/ui/FormMessage.jsx";
import { inputClass, textareaClass, labelClass } from "../components/ui/formStyles.js";
import { useSubmissionStore } from "../utils/useSubmissionStore.js";

const emptyDraft = { name: "", phone: "", message: "" };

// Public, login-not-required suggestion form. Frontend/demo-only —
// persisted to localStorage via useSubmissionStore("suggestions") (same
// pattern as Reports/Adoption/Volunteer). No admin review module was
// requested for this yet; swap the store for a real API call when a
// backend exists.
export default function Suggestion() {
  const { add } = useSubmissionStore("suggestions");
  const [draft, setDraft] = useState(emptyDraft);
  const [status, setStatus] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!draft.message.trim()) {
      setStatus({ type: "error", text: "कृपया अपना सुझाव लिखें।" });
      return;
    }
    if (draft.phone.trim() && !/^[0-9+\-\s]{7,15}$/.test(draft.phone.trim())) {
      setStatus({ type: "error", text: "कृपया एक मान्य फ़ोन/WhatsApp नंबर दर्ज करें।" });
      return;
    }

    add({
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      message: draft.message.trim(),
    });

    setStatus(null);
    setSubmitted(true);
    setDraft(emptyDraft);
  };

  return (
    <div>
      <PageHeader
        title="सुझाव दें"
        subtitle="आपके सुझाव गौशाला को बेहतर बनाने में हमारी मदद करते हैं।"
      />
      <div className="container-page py-14">
        <div className="mx-auto max-w-xl rounded-2xl bg-cream-50 p-8 shadow-soft">
          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pasture-50 text-pasture-600">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="text-sm text-brown-600">
                आपका सुझाव प्राप्त हो गया है। धन्यवाद!
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-2 rounded-full bg-pasture-500 px-6 py-2 text-sm font-semibold text-white hover:bg-pasture-600"
              >
                एक और सुझाव दें
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <FormMessage status={status} />

              <div>
                <label htmlFor="suggestion-name" className={labelClass}>
                  आपका नाम (वैकल्पिक)
                </label>
                <input
                  id="suggestion-name"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="suggestion-phone" className={labelClass}>
                  फ़ोन / WhatsApp नंबर (वैकल्पिक)
                </label>
                <input
                  id="suggestion-phone"
                  type="tel"
                  value={draft.phone}
                  onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                  className={inputClass}
                  placeholder="+91 XXXXXXXXXX"
                />
              </div>

              <div>
                <label htmlFor="suggestion-message" className={labelClass}>
                  आपका सुझाव <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="suggestion-message"
                  rows={5}
                  value={draft.message}
                  onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
                  className={textareaClass}
                  placeholder="गौशाला को बेहतर बनाने के लिए आपका सुझाव..."
                />
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-pasture-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pasture-600"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                सुझाव भेजें
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
