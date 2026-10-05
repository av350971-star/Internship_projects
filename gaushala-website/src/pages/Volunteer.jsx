import { useState } from "react";
import { CheckCircle2, HeartHandshake, Send } from "lucide-react";
import PageHeader from "../components/ui/PageHeader.jsx";
import FormMessage from "../components/ui/FormMessage.jsx";
import IconCard from "../components/ui/IconCard.jsx";
import {
  inputClass,
  textareaClass,
  labelClass,
  selectClass,
} from "../components/ui/formStyles.js";
import { volunteerSevaTypes } from "../data/volunteerSevaTypes.js";
import { useSubmissionStore } from "../utils/useSubmissionStore.js";

const emptyDraft = {
  name: "",
  phone: "",
  email: "",
  area: "",
  sevaInterest: volunteerSevaTypes[0],
  message: "",
};

// Public, login-not-required volunteer application. Frontend/demo-only —
// persisted via useSubmissionStore("volunteers"); no admin review module
// was requested for this yet, same as Suggestions/Adoption requests.
export default function Volunteer() {
  const { add } = useSubmissionStore("volunteers");
  const [draft, setDraft] = useState(emptyDraft);
  const [status, setStatus] = useState(null);
  const [submitted, setSubmitted] = useState(false);

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
    if (!draft.message.trim()) {
      setStatus({ type: "error", text: "कृपया एक संक्षिप्त संदेश लिखें।" });
      return;
    }

    add({ ...draft, name: draft.name.trim(), phone: draft.phone.trim() });
    setStatus(null);
    setSubmitted(true);
    setDraft(emptyDraft);
  };

  return (
    <div>
      <PageHeader
        title="Volunteer Seva"
        subtitle="गौशाला की सेवा में स्वयंसेवक के रूप में जुड़ें।"
      />

      <div className="container-page py-14">
        {/* Info */}
        <div className="mx-auto max-w-3xl rounded-2xl bg-cream-50 p-8 shadow-soft">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pasture-50 text-pasture-600">
              <HeartHandshake className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="text-sm leading-relaxed text-brown-600">
              Volunteer बनकर आप गौशाला की दैनिक सेवाओं में अपना समय एवं कौशल दे
              सकते हैं — चाहे वह चारा-पानी की व्यवस्था हो, सफाई हो, चिकित्सा
              सहायता हो या जागरूकता से जुड़े कार्यक्रम। नीचे फ़ॉर्म भरें, हमारी
              टीम आपसे संपर्क करेगी।
            </p>
          </div>
        </div>

        {/* Types of seva */}
        <div className="mx-auto mt-12 max-w-5xl">
          <h2 className="mb-6 font-display text-xl text-brown-800">
            सेवा के प्रकार
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {volunteerSevaTypes.map((type) => (
              <IconCard key={type} icon={HeartHandshake} title={type} />
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="mx-auto mt-12 max-w-xl rounded-2xl bg-cream-50 p-8 shadow-soft">
          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pasture-50 text-pasture-600">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="text-sm text-brown-600">
                आपका volunteer आवेदन प्राप्त हो गया है। हमारी टीम जल्द ही आपसे
                संपर्क करेगी।
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-2 rounded-full bg-pasture-500 px-6 py-2 text-sm font-semibold text-white hover:bg-pasture-600"
              >
                ठीक है
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <FormMessage status={status} />

              <div>
                <label htmlFor="vol-name" className={labelClass}>
                  आपका नाम <span className="text-red-500">*</span>
                </label>
                <input
                  id="vol-name"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="vol-phone" className={labelClass}>
                  फ़ोन / WhatsApp नंबर <span className="text-red-500">*</span>
                </label>
                <input
                  id="vol-phone"
                  type="tel"
                  value={draft.phone}
                  onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                  className={inputClass}
                  placeholder="+91 XXXXXXXXXX"
                />
              </div>

              <div>
                <label htmlFor="vol-email" className={labelClass}>
                  ईमेल (वैकल्पिक)
                </label>
                <input
                  id="vol-email"
                  type="email"
                  value={draft.email}
                  onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="vol-area" className={labelClass}>
                  Area / City (वैकल्पिक)
                </label>
                <input
                  id="vol-area"
                  value={draft.area}
                  onChange={(e) => setDraft((d) => ({ ...d, area: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="vol-interest" className={labelClass}>
                  सेवा में रुचि <span className="text-red-500">*</span>
                </label>
                <select
                  id="vol-interest"
                  value={draft.sevaInterest}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, sevaInterest: e.target.value }))
                  }
                  className={selectClass}
                >
                  {volunteerSevaTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="vol-message" className={labelClass}>
                  संदेश <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="vol-message"
                  rows={4}
                  value={draft.message}
                  onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
                  className={textareaClass}
                  placeholder="आप किस तरह मदद करना चाहेंगे..."
                />
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-pasture-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pasture-600"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                आवेदन भेजें
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
