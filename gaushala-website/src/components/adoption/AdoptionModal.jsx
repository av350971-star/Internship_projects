import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import Modal from "../ui/Modal.jsx";
import FormMessage from "../ui/FormMessage.jsx";
import { inputClass, textareaClass, labelClass, selectClass } from "../ui/formStyles.js";
import { useSubmissionStore } from "../../utils/useSubmissionStore.js";

const emptyDraft = { name: "", phone: "", cowId: "", message: "" };

// Public, login-not-required "Adopt / Sponsor" inquiry form. Unlike the
// Gau Mata problem report (which always locks to one cow), this form's
// "Selected Cow" is a real dropdown — it can be opened generally (no cow
// preselected) or from a specific cow's card (preselected, still
// changeable). Frontend/demo-only, persisted via useSubmissionStore.
export default function AdoptionModal({ cows, initialCowId, open, onClose }) {
  const { add } = useSubmissionStore("adoptionRequests");
  const [draft, setDraft] = useState(emptyDraft);
  const [status, setStatus] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // Sync the preselected cow whenever the modal is (re)opened for a
  // different cow, without clobbering the rest of an in-progress draft.
  useEffect(() => {
    if (open) {
      setDraft((d) => ({ ...d, cowId: initialCowId || d.cowId }));
    }
  }, [open, initialCowId]);

  const resetAndClose = () => {
    onClose();
    setTimeout(() => {
      setDraft(emptyDraft);
      setStatus(null);
      setSubmitted(false);
    }, 200);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!draft.name.trim()) {
      setStatus({ type: "error", text: "कृपया अपना नाम दर्ज करें।" });
      return;
    }
    if (!draft.phone.trim() || !/^[0-9+\-\s]{7,15}$/.test(draft.phone.trim())) {
      setStatus({ type: "error", text: "कृपया एक मान्य फ़ोन/WhatsApp नंबर दर्ज करें।" });
      return;
    }

    const selectedCow = cows.find((c) => c.id === draft.cowId);

    add({
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      cowId: draft.cowId,
      cowName: selectedCow?.name || "",
      message: draft.message.trim(),
    });

    setStatus(null);
    setSubmitted(true);
  };

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title={submitted ? "धन्यवाद" : "गौ माता को गोद लें / Sponsor करें"}
    >
      {submitted ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pasture-50 text-pasture-600">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="text-sm text-brown-600">
            आपकी adoption/sponsorship request प्राप्त हो गई है। हमारी टीम जल्द ही
            आपसे संपर्क करेगी।
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
          <FormMessage status={status} />
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="adopt-name" className={labelClass}>
                आपका नाम <span className="text-red-500">*</span>
              </label>
              <input
                id="adopt-name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="adopt-phone" className={labelClass}>
                फ़ोन / WhatsApp नंबर <span className="text-red-500">*</span>
              </label>
              <input
                id="adopt-phone"
                type="tel"
                value={draft.phone}
                onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                className={inputClass}
                placeholder="+91 XXXXXXXXXX"
              />
            </div>

            <div>
              <label htmlFor="adopt-cow" className={labelClass}>
                गौ माता चुनें
              </label>
              <select
                id="adopt-cow"
                value={draft.cowId}
                onChange={(e) => setDraft((d) => ({ ...d, cowId: e.target.value }))}
                className={selectClass}
              >
                <option value="">कोई विशेष गौ माता नहीं / सामान्य पूछताछ</option>
                {cows.map((cow) => (
                  <option key={cow.id} value={cow.id}>
                    {cow.name || cow.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="adopt-message" className={labelClass}>
                संदेश (वैकल्पिक)
              </label>
              <textarea
                id="adopt-message"
                rows={3}
                value={draft.message}
                onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
                className={textareaClass}
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-pasture-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pasture-600"
            >
              Request Submit करें
            </button>
          </form>
        </>
      )}
    </Modal>
  );
}
