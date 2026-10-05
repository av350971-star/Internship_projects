import { X } from "lucide-react";

export default function Modal({ open, onClose, title, children, widthClass = "max-w-lg" }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-brown-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={`w-full ${widthClass} max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-lift`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-brown-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="बंद करें"
            className="flex h-8 w-8 items-center justify-center rounded-full text-brown-400 transition-colors hover:bg-cream-100 hover:text-brown-700"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
