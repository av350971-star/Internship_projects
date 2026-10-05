import { useState } from "react";
import { Plus, Pencil, Trash2, ImageIcon } from "lucide-react";
import { useGaushalaData } from "../../context/DataContext.jsx";
import { galleryCategories } from "../../data/defaultData.js";
import AdminPageHeader from "../components/AdminPageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import ConfirmDialog from "../../components/ui/ConfirmDialog.jsx";
import Modal from "../../components/ui/Modal.jsx";
import ImageUploadField from "../../components/ui/ImageUploadField.jsx";
import FormMessage from "../../components/ui/FormMessage.jsx";
import { inputClass, textareaClass, labelClass } from "../../components/ui/formStyles.js";

const emptyPhoto = { image: "", title: "", description: "", category: galleryCategories[0] };

export default function GalleryAdmin() {
  const { gallery, addPhoto, updatePhoto, deletePhoto } = useGaushalaData();
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [draft, setDraft] = useState(emptyPhoto);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [status, setStatus] = useState(null);

  const openAdd = () => {
    setDraft(emptyPhoto);
    setEditingPhoto({});
    setStatus(null);
  };
  const openEdit = (photo) => {
    setDraft(photo);
    setEditingPhoto(photo);
    setStatus(null);
  };
  const closeModal = () => setEditingPhoto(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!draft.image) {
      setStatus({ type: "error", text: "कृपया एक फ़ोटो अपलोड करें।" });
      return;
    }
    if (editingPhoto?.id) {
      updatePhoto(editingPhoto.id, draft);
    } else {
      addPhoto(draft);
    }
    closeModal();
  };

  return (
    <div>
      <AdminPageHeader
        title="Gallery"
        subtitle="ये फ़ोटो सार्वजनिक 'गैलरी' पेज पर दिखती हैं।"
        action={
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-2 rounded-full bg-pasture-500 px-5 py-2 text-sm font-semibold text-white hover:bg-pasture-600"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Photo
          </button>
        }
      />

      {gallery.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="अभी गैलरी में कोई फ़ोटो उपलब्ध नहीं है।"
          subtitle="'Add Photo' पर क्लिक करके शुरू करें। मौजूदा Unsplash तस्वीरें केवल डेमो के लिए हैं।"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.map((photo) => (
            <AdminCard key={photo.id} className="flex flex-col">
              <div className="mb-3 flex h-36 items-center justify-center overflow-hidden rounded-xl bg-cream-100">
                {photo.image ? (
                  <img src={photo.image} alt={photo.title} className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-brown-200" aria-hidden="true" />
                )}
              </div>
              <p className="font-medium text-brown-800">{photo.title || "—"}</p>
              <span className="mt-1 w-fit rounded-full bg-cream-100 px-2.5 py-0.5 text-xs text-brown-500">
                {photo.category}
              </span>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(photo)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-brown-200 py-2 text-sm text-brown-700 hover:bg-cream-50"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDeleteId(photo.id)}
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
        open={Boolean(editingPhoto)}
        onClose={closeModal}
        title={editingPhoto?.id ? "Edit Photo" : "Add Photo"}
      >
        <FormMessage status={status} />
        <form onSubmit={handleSubmit} className="space-y-4">
          <ImageUploadField
            label="Photo"
            value={draft.image}
            onChange={(val) => setDraft((d) => ({ ...d, image: val }))}
          />
          <div>
            <label className={labelClass}>Title</label>
            <input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
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
            <label className={labelClass}>Category</label>
            <input
              list="gallery-categories"
              value={draft.category}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
              className={inputClass}
              placeholder="श्रेणी चुनें या नई बनाएं"
            />
            <datalist id="gallery-categories">
              {galleryCategories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
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
        message="यह फ़ोटो हमेशा के लिए हट जाएगी।"
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          deletePhoto(pendingDeleteId);
          setPendingDeleteId(null);
        }}
      />
    </div>
  );
}
