// Shared status constants for the गौ माता problem-report feature, used by
// both the public report form (default "New") and the Admin Reports module.

export const STATUS_OPTIONS = ["New", "Under Review", "Resolved"];

export const STATUS_LABELS = {
  New: "नई",
  "Under Review": "समीक्षा में",
  Resolved: "समाधान हो गया",
};

export function statusBadgeClass(status) {
  switch (status) {
    case "New":
      return "bg-marigold-400/15 text-marigold-500";
    case "Under Review":
      return "bg-brown-100 text-brown-600";
    case "Resolved":
      return "bg-pasture-50 text-pasture-600";
    default:
      return "bg-brown-100 text-brown-600";
  }
}
