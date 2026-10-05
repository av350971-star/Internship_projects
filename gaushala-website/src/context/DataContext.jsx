import { createContext, useContext, useEffect, useState } from "react";
import { loadFromStorage, saveToStorage, generateId } from "../utils/storage.js";
import {
  defaultSiteInfo,
  defaultStatistics,
  defaultCows,
  defaultGallery,
  defaultDonation,
} from "../data/defaultData.js";

// -----------------------------------------------------------------------
// This context is the SINGLE SOURCE OF TRUTH for every piece of content the
// admin panel manages. Both the public website and /admin read from and
// write to this same context — there is no duplicated hardcoded data.
//
// FUTURE BACKEND INTEGRATION:
// Every action below (updateSiteInfo, addCow, deleteCow, ...) currently
// just updates React state and mirrors it to localStorage via
// `src/utils/storage.js`. To connect a real backend, this is the only file
// that needs to change: swap the state updates for API calls (e.g.
// `await api.updateSiteInfo(payload)`), and keep the same function
// signatures so no component using `useGaushalaData()` has to change.
// -----------------------------------------------------------------------

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [siteInfo, setSiteInfo] = useState(() => {
    const loaded = loadFromStorage("siteInfo", defaultSiteInfo);
    if (!loaded) return defaultSiteInfo;

    const isDummy = (val, dummyKeywords = []) => {
      if (!val) return true;
      const str = String(val).trim();
      return str.startsWith("[") || dummyKeywords.some((k) => str.includes(k));
    };

    return {
      name: isDummy(loaded.name, ["[सर्व हितम सेवा]", "[GAUSHALA NAME]", "श्री गौ सेवा धाम"])
        ? defaultSiteInfo.name
        : loaded.name,
      address: isDummy(loaded.address, ["GAUSHALA ADDRESS"])
        ? defaultSiteInfo.address
        : loaded.address,
      phone: isDummy(loaded.phone, ["PHONE NUMBER"])
        ? defaultSiteInfo.phone
        : loaded.phone,
      email: isDummy(loaded.email, ["EMAIL"])
        ? defaultSiteInfo.email
        : loaded.email,
      whatsapp: isDummy(loaded.whatsapp, ["WHATSAPP NUMBER"])
        ? defaultSiteInfo.whatsapp
        : loaded.whatsapp,
      mapLink: !loaded.mapLink || isDummy(loaded.mapLink)
        ? defaultSiteInfo.mapLink
        : loaded.mapLink,
      about:
        !loaded.about ||
        loaded.about.includes("यहाँ गौशाला के बारे में जानकारी दिखेगी") ||
        loaded.about.includes("Admin Panel")
          ? defaultSiteInfo.about
          : loaded.about,
    };
  });
  const [statistics, setStatistics] = useState(() =>
    loadFromStorage("statistics", defaultStatistics)
  );
  const [cows, setCows] = useState(() => loadFromStorage("cows", defaultCows));
  const [gallery, setGallery] = useState(() =>
    loadFromStorage("gallery", defaultGallery)
  );
  const [donation, setDonation] = useState(() =>
    loadFromStorage("donation", defaultDonation)
  );

  useEffect(() => saveToStorage("siteInfo", siteInfo), [siteInfo]);
  useEffect(() => saveToStorage("statistics", statistics), [statistics]);
  useEffect(() => saveToStorage("cows", cows), [cows]);
  useEffect(() => saveToStorage("gallery", gallery), [gallery]);
  useEffect(() => saveToStorage("donation", donation), [donation]);

  // ---------- Website Information ----------
  const updateSiteInfo = (patch) => setSiteInfo((prev) => ({ ...prev, ...patch }));

  // ---------- Statistics ----------
  const addStatistic = (stat) =>
    setStatistics((prev) => [
      ...prev,
      { id: generateId("stat"), enabled: true, value: null, label: "", ...stat },
    ]);
  const updateStatistic = (id, patch) =>
    setStatistics((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  const deleteStatistic = (id) =>
    setStatistics((prev) => prev.filter((s) => s.id !== id));

  // ---------- Gau Mata / Cows ----------
  const addCow = (cow) =>
    setCows((prev) => [
      ...prev,
      {
        id: generateId("cow"),
        name: "",
        photo: "",
        description: "",
        status: "स्वस्थ",
        adoptionInfo: "",
        ...cow,
      },
    ]);
  const updateCow = (id, patch) =>
    setCows((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const deleteCow = (id) => setCows((prev) => prev.filter((c) => c.id !== id));

  // ---------- Gallery ----------
  const addPhoto = (photo) =>
    setGallery((prev) => [
      ...prev,
      {
        id: generateId("photo"),
        image: "",
        title: "",
        description: "",
        category: "Other",
        ...photo,
      },
    ]);
  const updatePhoto = (id, patch) =>
    setGallery((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const deletePhoto = (id) =>
    setGallery((prev) => prev.filter((p) => p.id !== id));

  // ---------- Donation ----------
  const updateDonation = (patch) =>
    setDonation((prev) => ({ ...prev, ...patch }));
  const addSuggestedAmount = (amount) =>
    setDonation((prev) => ({
      ...prev,
      suggestedAmounts: [
        ...prev.suggestedAmounts,
        { id: generateId("amt"), amount },
      ],
    }));
  const updateSuggestedAmount = (id, amount) =>
    setDonation((prev) => ({
      ...prev,
      suggestedAmounts: prev.suggestedAmounts.map((a) =>
        a.id === id ? { ...a, amount } : a
      ),
    }));
  const deleteSuggestedAmount = (id) =>
    setDonation((prev) => ({
      ...prev,
      suggestedAmounts: prev.suggestedAmounts.filter((a) => a.id !== id),
    }));

  const value = {
    siteInfo,
    updateSiteInfo,
    statistics,
    addStatistic,
    updateStatistic,
    deleteStatistic,
    cows,
    addCow,
    updateCow,
    deleteCow,
    gallery,
    addPhoto,
    updatePhoto,
    deletePhoto,
    donation,
    updateDonation,
    addSuggestedAmount,
    updateSuggestedAmount,
    deleteSuggestedAmount,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useGaushalaData() {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error("useGaushalaData must be used inside <DataProvider>");
  }
  return ctx;
}
