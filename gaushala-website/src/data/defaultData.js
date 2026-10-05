// Default seed data for every module the admin panel manages.
// These are intentionally PLACEHOLDERS, not real gaushala data — the admin
// is expected to replace them via /admin. Kept in one file so there is a
// single source of truth for "what does empty/fresh state look like".

export const defaultSiteInfo = {
  name: "सर्व हितम सेवा गौशाला",
  address: "ग्राम संदलपुर, खातेगांव, देवास, मध्य प्रदेश",
  phone: "6232786661",
  email: "sarvahitamsevasamiti@gmail.com",
  whatsapp: "6232786661",
  mapLink: "https://www.google.com/maps/search/?api=1&query=Sandalpur+Khategaon+Dewas+Madhya+Pradesh",
  about:
    "सर्व हितम सेवा गौशाला (ग्राम संदलपुर, खातेगांव, देवास) बेसहारा, वृद्ध एवं बीमार गौवंश की सेवा, समुचित उपचार और संरक्षण के लिए समर्पित है।",
};

// value: null means "not yet set" — the public site shows a placeholder
// instead of a misleadingly specific-looking number.
export const defaultStatistics = [
  { id: "stat_total_cows", label: "कुल गौ माता", value: null, enabled: true },
  { id: "stat_rescued", label: "रेस्क्यू की गई", value: null, enabled: true },
  { id: "stat_treatment", label: "उपचाररत", value: null, enabled: true },
  { id: "stat_volunteers", label: "सेवक सदस्य", value: null, enabled: true },
  { id: "stat_fodder", label: "आज का चारा (KG)", value: null, enabled: true },
];

export const defaultCows = [];

export const defaultGallery = [];

export const galleryCategories = [
  "गौ सेवा",
  "गौ माता",
  "गौशाला",
  "चिकित्सा सेवा",
  "भोजन/चारा",
  "Volunteers",
  "Events",
  "Other",
];

// गौ माता problem reports submitted by public visitors. Empty by default —
// see src/context/ReportsContext.jsx for the shape of a report record.
export const defaultReports = [];

export const defaultDonation = {
  upiId: "",
  qrImage: "",
  description:
    "यहाँ डोनेशन से जुड़ी जानकारी दिखेगी। कृपया Admin Panel में जाकर 'Donation Information' सेक्शन से UPI ID, QR कोड और विवरण जोड़ें।",
  suggestedAmounts: [],
};
