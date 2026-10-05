import { useState } from "react";
import { Save, RotateCcw } from "lucide-react";
import { useGaushalaData } from "../../context/DataContext.jsx";
import AdminPageHeader from "../components/AdminPageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import FormMessage from "../../components/ui/FormMessage.jsx";
import { labelClass, inputClass, textareaClass } from "../../components/ui/formStyles.js";

const fields = [
  { key: "name", label: "गौशाला का नाम", required: true },
  { key: "address", label: "Address", required: true },
  { key: "phone", label: "Phone", required: true },
  { key: "email", label: "Email", required: true, type: "email" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "mapLink", label: "Google Maps Link" },
];

export default function WebsiteInfo() {
  const { siteInfo, updateSiteInfo } = useGaushalaData();
  const [draft, setDraft] = useState(siteInfo);
  const [status, setStatus] = useState(null);

  const handleChange = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

  const handleReset = () => {
    setDraft(siteInfo);
    setStatus(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const missing = fields.filter((f) => f.required && !draft[f.key]?.trim());
    if (missing.length > 0) {
      setStatus({ type: "error", text: "कृपया सभी आवश्यक फ़ील्ड भरें।" });
      return;
    }
    updateSiteInfo(draft);
    setStatus({ type: "success", text: "जानकारी सफलतापूर्वक सेव हो गई।" });
  };

  return (
    <div>
      <AdminPageHeader
        title="Website Information"
        subtitle="यह जानकारी Home, About, Contact और Footer में अपने आप दिखेगी।"
      />
      <AdminCard className="max-w-3xl">
        <FormMessage status={status} />
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.key}>
                <label className={labelClass}>
                  {field.label}
                  {field.required && <span className="text-red-500"> *</span>}
                </label>
                <input
                  type={field.type || "text"}
                  value={draft[field.key] ?? ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className={inputClass}
                />
              </div>
            ))}
          </div>

          <div>
            <label className={labelClass}>About Us Text</label>
            <textarea
              rows={5}
              value={draft.about ?? ""}
              onChange={(e) => handleChange("about", e.target.value)}
              className={textareaClass}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-full bg-pasture-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pasture-600"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Save
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-2 rounded-full border border-brown-200 px-6 py-2.5 text-sm font-medium text-brown-700 transition-colors hover:bg-cream-50"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Cancel
            </button>
          </div>
        </form>
      </AdminCard>
    </div>
  );
}
