import { AlertTriangle } from "lucide-react";
import Modal from "./Modal.jsx";

export default function ConfirmDialog({
  open,
  title = "क्या आप सुनिश्चित हैं?",
  message,
  confirmLabel = "हटाएं",
  cancelLabel = "रद्द करें",
  onConfirm,
  onCancel,
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} widthClass="max-w-sm">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-500">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        {message && <p className="text-sm text-brown-500">{message}</p>}
        <div className="mt-2 flex w-full gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-brown-200 px-4 py-2 text-sm font-medium text-brown-700 transition-colors hover:bg-cream-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
