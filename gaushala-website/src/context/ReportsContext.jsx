import { createContext, useContext, useEffect, useState } from "react";
import { loadFromStorage, saveToStorage, generateId } from "../utils/storage.js";
import { defaultReports } from "../data/defaultData.js";

// -----------------------------------------------------------------------
// Holds "गौ माता की समस्या" reports submitted by public visitors from the
// Gau Mata page (no login required) and managed by admins under
// /admin/reports. Mirrors the same demo-persistence pattern as
// DataContext.jsx — state + localStorage via src/utils/storage.js.
//
// Report shape:
// {
//   id, cowId, cowName, cowPhoto,   // cowName/cowPhoto are a SNAPSHOT taken
//                                    // at submit time, so a report still
//                                    // shows correct info even if that cow's
//                                    // record is later edited or deleted.
//   description, photo,             // problem details + optional photo
//   contactName, contactPhone,      // optional visitor contact info
//   status,                         // "New" | "Under Review" | "Resolved"
//   createdAt,                      // ISO timestamp
// }
//
// FUTURE BACKEND INTEGRATION:
// Swap addReport/updateReportStatus/deleteReport for API calls
// (e.g. POST /api/reports, PATCH /api/reports/:id, DELETE /api/reports/:id)
// and keep the same function signatures — nothing that calls
// useReports() elsewhere would need to change.
// -----------------------------------------------------------------------

const ReportsContext = createContext(null);

export function ReportsProvider({ children }) {
  const [reports, setReports] = useState(() =>
    loadFromStorage("reports", defaultReports)
  );

  useEffect(() => saveToStorage("reports", reports), [reports]);

  const addReport = (report) => {
    const newReport = {
      id: generateId("report"),
      cowId: "",
      cowName: "",
      cowPhoto: "",
      description: "",
      photo: "",
      contactName: "",
      contactPhone: "",
      status: "New",
      createdAt: new Date().toISOString(),
      ...report,
    };
    // Demo/frontend-only: this just updates React state (→ localStorage).
    // A real backend would insert this into a `reports` table linked to
    // the cow by cowId and return the created row.
    setReports((prev) => [newReport, ...prev]);
    return newReport;
  };

  const updateReportStatus = (id, status) =>
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

  const deleteReport = (id) => setReports((prev) => prev.filter((r) => r.id !== id));

  const value = { reports, addReport, updateReportStatus, deleteReport };

  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}

export function useReports() {
  const ctx = useContext(ReportsContext);
  if (!ctx) {
    throw new Error("useReports must be used inside <ReportsProvider>");
  }
  return ctx;
}
