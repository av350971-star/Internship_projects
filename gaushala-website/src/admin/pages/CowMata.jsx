import { useState } from "react";
import { Plus, Pencil, Trash2, PawPrint } from "lucide-react";
import { useGaushalaData } from "../../context/DataContext.jsx";
import AdminPageHeader from "../components/AdminPageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import ConfirmDialog from "../../components/ui/ConfirmDialog.jsx";
import Modal from "../../components/ui/Modal.jsx";
import ImageUploadField from "../../components/ui/ImageUploadField.jsx";
import FormMessage from "../../components/ui/FormMessage.jsx";
import { inputClass, textareaClass, labelClass } from "../../components/ui/formStyles.js";

const emptyCow = {
  name: "",
  photo: "",
  description: "",
  status: "स्वस्थ",
  adoptionInfo: "",
};

const statusOptions = ["स्वस्थ", "उपचाररत", "रेस्क्यू की गई"];

export default function CowMata() {
  const { cows, addCow, updateCow, deleteCow } = useGaushalaData();
  const [editingCow, setEditingCow] = useState(null); // null = closed, {} = new, object = edit
  const [draft, setDraft] = useState(emptyCow);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [status, setStatus] = useState(null);

  const openAdd = () => {
    setDraft(emptyCow);
    setEditingCow({});
    setStatus(null);
  };

  const openEdit = (cow) => {
    setDraft(cow);
    setEditingCow(cow);
    setStatus(null);
  };

  const closeModal = () => setEditingCow(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!draft.name?.trim()) {
      setStatus({ type: "error", text: "कृपया गाय का नाम/ID दर्ज करें।" });
      return;
    }
    if (editingCow?.id) {
      updateCow(editingCow.id, draft);
    } else {
      addCow(draft);
    }
    closeModal();
  };

  return (
    <div>
      <AdminPageHeader
        title="गौ माता"
        subtitle="ये रिकॉर्ड सार्वजनिक 'गौ माता' पेज पर दिखते हैं।"
        action={
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-2 rounded-full bg-pasture-500 px-5 py-2 text-sm font-semibold text-white hover:bg-pasture-600"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Cow
          </button>
        }
      />

      {cows.length === 0 ? (
        <EmptyState
          icon={PawPrint}
          title="अभी कोई cow record available नहीं है।"
          subtitle="'Add Cow' पर क्लिक करके पहला रिकॉर्ड जोड़ें।"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cows.map((cow) => (
            <AdminCard key={cow.id} className="flex flex-col">
              <div className="mb-3 flex h-32 items-center justify-center overflow-hidden rounded-xl bg-cream-100">
                {cow.photo ? (
                  <img src={cow.photo} alt={cow.name} className="h-full w-full object-cover" />
                ) : (
                  <PawPrint className="h-8 w-8 text-brown-200" aria-hidden="true" />
                )}
              </div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-brown-800">{cow.name || "—"}</h3>
                <span className="shrink-0 rounded-full bg-pasture-50 px-2.5 py-1 text-xs text-pasture-600">
                  {cow.status}
                </span>
              </div>
              {cow.description && (
                <p className="mt-1.5 line-clamp-2 text-sm text-brown-400">
                  {cow.description}
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(cow)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-brown-200 py-2 text-sm text-brown-700 hover:bg-cream-50"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDeleteId(cow.id)}
                  aria-label="हटाएं"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(editingCow)}
        onClose={closeModal}
        title={editingCow?.id ? "Edit Cow" : "Add Cow"}
      >
        <FormMessage status={status} />
        <form onSubmit={handleSubmit} className="space-y-4">
          <ImageUploadField
            label="Photo"
            value={draft.photo}
            onChange={(val) => setDraft((d) => ({ ...d, photo: val }))}
          />
          <div>
            <label className={labelClass}>Cow Name / ID <span className="text-red-500">*</span></label>
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              className={textareaClass}
            />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select
              value={draft.status}
              onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
              className={inputClass}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Adoption Information</label>
            <input
              value={draft.adoptionInfo}
              onChange={(e) => setDraft((d) => ({ ...d, adoptionInfo: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 rounded-full bg-pasture-500 py-2.5 text-sm font-semibold text-white hover:bg-pasture-600"
            >
              Save
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 rounded-full border border-brown-200 py-2.5 text-sm font-medium text-brown-700 hover:bg-cream-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        message="यह गौ माता का रिकॉर्ड हमेशा के लिए हट जाएगा।"
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          deleteCow(pendingDeleteId);
          setPendingDeleteId(null);
        }}
      />
    </div>
  );
}
