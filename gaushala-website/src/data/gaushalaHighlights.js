import { Sun, Droplets, Stethoscope, Sparkles, Warehouse, ShieldCheck, Bed, Wheat } from "lucide-react";

// Short, non-numeric, non-claim-making lists for the Home page's
// "गौशाला Activities" and "Facilities" sections (Part 7 of the frontend
// spec). Intentionally generic/descriptive — no invented counts or stats.
export const gaushalaActivities = [
  { id: "feeding", icon: Sun, label: "प्रतिदिन चारा एवं जल व्यवस्था" },
  { id: "checkup", icon: Stethoscope, label: "नियमित स्वास्थ्य जांच" },
  { id: "cleaning", icon: Sparkles, label: "स्वच्छता एवं सफाई सेवा" },
  { id: "care", icon: Bed, label: "देखभाल एवं विश्राम व्यवस्था" },
];

export const gaushalaFacilities = [
  { id: "shelter", icon: Warehouse, label: "सुरक्षित आश्रय स्थल" },
  { id: "fodder-store", icon: Wheat, label: "चारा भंडारण" },
  { id: "water", icon: Droplets, label: "जल व्यवस्था" },
  { id: "first-aid", icon: ShieldCheck, label: "प्राथमिक चिकित्सा सुविधा" },
];
