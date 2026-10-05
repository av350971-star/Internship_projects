import { useState } from "react";
import { Save, RotateCcw, Plus, Trash2 } from "lucide-react";
import { useGaushalaData } from "../../context/DataContext.jsx";
import AdminPageHeader from "../components/AdminPageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import FormMessage from "../../components/ui/FormMessage.jsx";
import ImageUploadField from "../../components/ui/ImageUploadField.jsx";
import ConfirmDialog from "../../components/ui/ConfirmDialog.jsx";
import { inputClass, textareaClass, labelClass } from "../../components/ui/formStyles.js";

export default function DonationAdmin() {
  const {
    donation,
    updateDonation,
    addSuggestedAmount,
    updateSuggestedAmount,
    deleteSuggestedAmount,
  } = useGaushalaData();
  const [draft, setDraft] = useState({
    upiId: donation.upiId,
    qrImage: donation.qrImage,
    description: donation.description,
  });
  const [newAmount, setNewAmount] = useState("");
  const [status, setStatus] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const handleReset = () => {
    setDraft({
      upiId: donation.upiId,
      qrImage: donation.qrImage,
      description: donation.description,
    });
    setStatus(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateDonation(draft);
    setStatus({ type: "success", text: "डोनेशन जानकारी सेव हो गई।" });
  };

  const handleAddAmount = () => {
    const trimmed = newAmount.trim();
    if (!trimmed || Number.isNaN(Number(trimmed))) return;
    addSuggestedAmount(trimmed);
    setNewAmount("");
  };

  return (
    <div>
      <AdminPageHeader
        title="Donation Information"
        subtitle="कोई वास्तविक भुगतान प्रणाली यहाँ नहीं जुड़ी है — यह केवल जानकारी है।"
      />

      <AdminCard className="max-w-2xl">
        <FormMessage status={status} />
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelClass}>UPI ID</label>
            <input
              value={draft.upiId}
              onChange={(e) => setDraft((d) => ({ ...d, upiId: e.target.value }))}
              placeholder="gaushala@upi"
              className={inputClass}
            />
          </div>

          <ImageUploadField
            label="QR Code Image"
            value={draft.qrImage}
            onChange={(val) => setDraft((d) => ({ ...d, qrImage: val }))}
          />

          <div>
            <label className={labelClass}>Donation Information / Description</label>
            <textarea
              rows={4}
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              className={textareaClass}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-full bg-pasture-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-pasture-600"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Save
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-2 rounded-full border border-brown-200 px-6 py-2.5 text-sm font-medium text-brown-700 hover:bg-cream-50"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Cancel
            </button>
          </div>
        </form>
      </AdminCard>

      <AdminCard className="mt-6 max-w-2xl">
        <h2 className="mb-4 font-display text-lg text-brown-800">Suggested Amounts</h2>

        {donation.suggestedAmounts.length === 0 ? (
          <p className="text-sm text-brown-400">अभी कोई राशि विकल्प जोड़ा नहीं गया है।</p>
        ) : (
          <div className="mb-4 flex flex-wrap gap-2">
            {donation.suggestedAmounts.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-full bg-cream-100 py-1.5 pl-4 pr-2"
              >
                <span className="text-brown-500">₹</span>
                <input
                  value={item.amount}
                  onChange={(e) => updateSuggestedAmount(item.id, e.target.value)}
                  className="w-16 bg-transparent text-sm text-brown-800 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setPendingDeleteId(item.id)}
                  aria-label="हटाएं"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            placeholder="जैसे 501"
            className={`${inputClass} max-w-[140px]`}
          />
          <button
            type="button"
            onClick={handleAddAmount}
            className="flex items-center gap-1.5 rounded-full border border-brown-200 px-4 py-2 text-sm text-brown-700 hover:bg-cream-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Amount
          </button>
        </div>
      </AdminCard>

      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        message="यह राशि विकल्प हट जाएगा।"
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          deleteSuggestedAmount(pendingDeleteId);
          setPendingDeleteId(null);
        }}
      />
    </div>
  );
}
