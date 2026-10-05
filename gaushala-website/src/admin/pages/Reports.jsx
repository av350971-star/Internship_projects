import { useMemo, useState } from "react";
import { AlertTriangle, Eye, PawPrint, Search, Trash2 } from "lucide-react";
import { useReports } from "../../context/ReportsContext.jsx";
import AdminPageHeader from "../components/AdminPageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";
import ReportDetailsModal from "../components/ReportDetailsModal.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import ConfirmDialog from "../../components/ui/ConfirmDialog.jsx";
import { STATUS_OPTIONS, STATUS_LABELS, statusBadgeClass } from "../../data/reportStatus.js";

const filterOptions = ["All", ...STATUS_OPTIONS];

export default function Reports() {
  const { reports, updateReportStatus, deleteReport } = useReports();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reports.filter((r) => {
      const matchesFilter = filter === "All" || r.status === filter;
      const matchesSearch =
        !query ||
        r.cowName?.toLowerCase().includes(query) ||
        r.cowId?.toLowerCase().includes(query) ||
        r.id?.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [reports, filter, search]);

  return (
    <div>
      <AdminPageHeader
        title="🚨 Reports"
        subtitle="Public visitors द्वारा submit की गई गौ माता समस्या रिपोर्ट्स।"
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-pasture-500 text-white"
                  : "bg-white text-brown-600 hover:bg-cream-100"
              }`}
            >
              {f === "All" ? "All" : STATUS_LABELS[f]}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brown-300"
            aria-hidden="true"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cow name/ID या Report ID खोजें"
            aria-label="Reports खोजें"
            className="w-full rounded-full border border-brown-200 bg-white py-2 pl-10 pr-4 text-sm text-brown-800 placeholder:text-brown-300 transition-colors focus:border-pasture-400"
          />
        </div>
      </div>

      {filteredReports.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="कोई report नहीं मिली।"
          subtitle="जब visitors 'समस्या बताएं' के ज़रिए report submit करेंगे, वे यहाँ दिखेंगी।"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredReports.map((report) => (
            <AdminCard key={report.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-cream-100">
                    {report.cowPhoto ? (
                      <img
                        src={report.cowPhoto}
                        alt={report.cowName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <PawPrint className="h-5 w-5 text-brown-200" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-brown-800">
                      {report.cowName || "—"}
                    </p>
                    <p className="truncate text-xs text-brown-400">{report.id}</p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                    report.status
                  )}`}
                >
                  {STATUS_LABELS[report.status]}
                </span>
              </div>

              <p className="mt-3 line-clamp-2 text-sm text-brown-500">
                {report.description}
              </p>

              <p className="mt-2 text-xs text-brown-300">
                {new Date(report.createdAt).toLocaleString("hi-IN")}
              </p>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedReport(report)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-brown-200 py-2 text-sm text-brown-700 hover:bg-cream-50"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  View
                </button>
                <label className="sr-only" htmlFor={`status-${report.id}`}>
                  Report status
                </label>
                <select
                  id={`status-${report.id}`}
                  value={report.status}
                  onChange={(e) => updateReportStatus(report.id, e.target.value)}
                  className="rounded-full border border-brown-200 bg-white px-3 py-2 text-xs text-brown-700 focus:border-pasture-400"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setPendingDeleteId(report.id)}
                  aria-label="Report हटाएं"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      <ReportDetailsModal report={selectedReport} onClose={() => setSelectedReport(null)} />

      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        message="क्या आप इस report को delete करना चाहते हैं?"
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          deleteReport(pendingDeleteId);
          setPendingDeleteId(null);
        }}
      />
    </div>
  );
}
