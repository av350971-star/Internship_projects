// Central source of truth for primary navigation.
// Every entry now points at a real react-router page — no "#anchor" dead
// links. `route: true` is kept (rather than removed) so Navbar/Footer's
// existing Link/<a> branching still works if a non-route entry is ever
// added back.
export const navLinks = [
  { id: "home", label: "होम", href: "/", route: true },
  { id: "about", label: "हमारे बारे में", href: "/about", route: true },
  { id: "cows", label: "गौ माता", href: "/gau-mata", route: true },
  { id: "services", label: "सेवाएं", href: "/services", route: true },
  { id: "gallery", label: "गैलरी", href: "/gallery", route: true },
  { id: "suggestion", label: "सुझाव", href: "/suggestion", route: true },
  { id: "donation", label: "डोनेशन", href: "/donation", route: true },
  { id: "contact", label: "संपर्क करें", href: "/contact", route: true },
];

// Footer has room for a couple more useful links than the top navbar does
// (keeps the navbar itself uncluttered) — same list plus Adoption,
// Volunteer, and Admin Login.
export const footerLinks = [
  ...navLinks,
  { id: "adoption", label: "गौ माता को गोद लें", href: "/adoption", route: true },
  { id: "volunteer", label: "Volunteer Seva", href: "/volunteer", route: true },
  { id: "admin-login", label: "Admin Login", href: "/admin/login", route: true },
];
