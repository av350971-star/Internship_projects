import { useState } from "react";
import { PawPrint, MessageCircleWarning } from "lucide-react";
import { useGaushalaData } from "../context/DataContext.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import ReportModal from "../components/report/ReportModal.jsx";
import CowCard from "../components/cow/CowCard.jsx";

// Reads directly from the "cows" slice of DataContext — every add/edit/
// delete made in /admin → Gau Mata shows up here immediately. The same
// cow record also powers /adoption and the Home page preview via the
// shared <CowCard> component.
export default function GauMata() {
  const { cows } = useGaushalaData();
  const [reportingCow, setReportingCow] = useState(null);

  return (
    <div>
      <PageHeader
        title="गौ माता"
        subtitle="हमारी देखभाल में रह रही गौ माताओं से मिलिए।"
      />
      <div className="container-page py-14">
        {cows.length === 0 ? (
          <EmptyState
            icon={PawPrint}
            title="वास्तविक गौ माता की जानकारी जल्द अपडेट की जाएगी।"
            subtitle="Admin Panel में 'गौ माता' सेक्शन से रिकॉर्ड जोड़ें।"
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cows.map((cow) => (
              <CowCard
                key={cow.id}
                cow={cow}
                actions={
                  <button
                    type="button"
                    onClick={() => setReportingCow(cow)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-full border border-marigold-500/40 py-2 text-sm font-medium text-marigold-500 transition-colors hover:bg-marigold-400/10"
                  >
                    <MessageCircleWarning className="h-4 w-4" aria-hidden="true" />
                    समस्या बताएं
                  </button>
                }
              />
            ))}
          </div>
        )}
      </div>

      <ReportModal
        cow={reportingCow}
        open={Boolean(reportingCow)}
        onClose={() => setReportingCow(null)}
      />
    </div>
  );
}
