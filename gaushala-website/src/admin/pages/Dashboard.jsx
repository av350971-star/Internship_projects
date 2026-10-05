import { PawPrint, ImageIcon, BarChart3, Heart, AlertTriangle } from "lucide-react";
import { useGaushalaData } from "../../context/DataContext.jsx";
import { useReports } from "../../context/ReportsContext.jsx";
import AdminPageHeader from "../components/AdminPageHeader.jsx";
import AdminCard from "../components/AdminCard.jsx";

export default function Dashboard() {
  const { cows, gallery, statistics, donation } = useGaushalaData();
  const { reports } = useReports();

  const donationStatus =
    donation.upiId || donation.qrImage ? "जानकारी जोड़ी गई" : "अभी अधूरी है";

  const newReportsCount = reports.filter((r) => r.status === "New").length;

  const cards = [
    {
      label: "Total Cow Records",
      value: cows.length,
      icon: PawPrint,
    },
    {
      label: "Gallery Photos",
      value: gallery.length,
      icon: ImageIcon,
    },
    {
      label: "Statistics",
      value: statistics.filter((s) => s.enabled).length,
      icon: BarChart3,
    },
    {
      label: "Donation Information Status",
      value: donationStatus,
      icon: Heart,
      isText: true,
    },
  ];

  const reportCards = [
    { label: "Total Reports", value: reports.length },
    { label: "New Reports", value: reports.filter((r) => r.status === "New").length },
    {
      label: "Under Review",
      value: reports.filter((r) => r.status === "Under Review").length,
    },
    { label: "Resolved", value: reports.filter((r) => r.status === "Resolved").length },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        subtitle="वेबसाइट के कंटेंट का एक संक्षिप्त सारांश।"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, isText }) => (
          <AdminCard key={label} className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pasture-50 text-pasture-600">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p
                className={`font-display text-brown-800 ${
                  isText ? "text-base" : "text-2xl font-bold"
                }`}
              >
                {value}
              </p>
              <p className="text-xs text-brown-400 sm:text-sm">{label}</p>
            </div>
          </AdminCard>
        ))}
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-marigold-500" aria-hidden="true" />
          <h2 className="font-display text-lg text-brown-800">
            गौ माता समस्या Reports
          </h2>
          {newReportsCount > 0 && (
            <span className="rounded-full bg-marigold-400/15 px-3 py-1 text-xs font-semibold text-marigold-500">
              🚨 New Reports: {newReportsCount}
            </span>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reportCards.map(({ label, value }) => (
            <AdminCard key={label}>
              <p className="font-display text-2xl font-bold text-brown-800">{value}</p>
              <p className="text-xs text-brown-400 sm:text-sm">{label}</p>
            </AdminCard>
          ))}
        </div>
      </div>
    </div>
  );
}
