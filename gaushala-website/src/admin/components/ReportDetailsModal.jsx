import Modal from "../../components/ui/Modal.jsx";
import { STATUS_LABELS, statusBadgeClass } from "../../data/reportStatus.js";

export default function ReportDetailsModal({ report, onClose }) {
  return (
    <Modal open={Boolean(report)} onClose={onClose} title="Report Details" widthClass="max-w-xl">
      {report && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-brown-400">{report.id}</p>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                report.status
              )}`}
            >
              {STATUS_LABELS[report.status]}
            </span>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-cream-50 p-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white">
              {report.cowPhoto && (
                <img
                  src={report.cowPhoto}
                  alt={report.cowName}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div>
              <p className="text-xs text-brown-400">गौ माता</p>
              <p className="font-medium text-brown-800">{report.cowName || "—"}</p>
              <p className="text-xs text-brown-300">Cow ID: {report.cowId || "—"}</p>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-brown-400">समस्या का विवरण</p>
            <p className="whitespace-pre-wrap text-sm text-brown-700">
              {report.description}
            </p>
          </div>

          {report.photo && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-brown-400">समस्या की फोटो</p>
              <img
                src={report.photo}
                alt="समस्या की फोटो"
                className="max-h-64 w-full rounded-xl object-cover"
              />
            </div>
          )}

          {(report.contactName || report.contactPhone) && (
            <div>
              <p className="mb-1 text-xs font-medium text-brown-400">Contact Information</p>
              {report.contactName && (
                <p className="text-sm text-brown-700">{report.contactName}</p>
              )}
              {report.contactPhone && (
                <p className="text-sm text-brown-700">{report.contactPhone}</p>
              )}
            </div>
          )}

          <p className="text-xs text-brown-300">
            {new Date(report.createdAt).toLocaleString("hi-IN")}
          </p>
        </div>
      )}
    </Modal>
  );
}
