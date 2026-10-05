import { Routes, Route } from "react-router-dom";
import PublicLayout from "./components/layout/PublicLayout.jsx";
import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";
import GauMata from "./pages/GauMata.jsx";
import Services from "./pages/Services.jsx";
import Gallery from "./pages/Gallery.jsx";
import Suggestion from "./pages/Suggestion.jsx";
import Donation from "./pages/Donation.jsx";
import Contact from "./pages/Contact.jsx";
import Adoption from "./pages/Adoption.jsx";
import Volunteer from "./pages/Volunteer.jsx";
import NotFound from "./pages/NotFound.jsx";
import AdminLayout from "./admin/AdminLayout.jsx";
import AdminLogin from "./admin/pages/AdminLogin.jsx";
import ProtectedRoute from "./admin/components/ProtectedRoute.jsx";
import Dashboard from "./admin/pages/Dashboard.jsx";
import WebsiteInfo from "./admin/pages/WebsiteInfo.jsx";
import Statistics from "./admin/pages/Statistics.jsx";
import CowMata from "./admin/pages/CowMata.jsx";
import GalleryAdmin from "./admin/pages/GalleryAdmin.jsx";
import DonationAdmin from "./admin/pages/DonationAdmin.jsx";
import Reports from "./admin/pages/Reports.jsx";

// Public site: Header + page + Footer (Header/Navbar are unchanged).
//
// Admin CMS lives entirely under /admin — see src/admin/AdminLayout.jsx.
// /admin/login is public; every other /admin/* route is wrapped in
// <ProtectedRoute> (src/admin/components/ProtectedRoute.jsx), which checks
// AdminAuthContext and redirects to /admin/login when not logged in.
//
// NOTE: this is frontend/demo authentication only (see
// src/context/AdminAuthContext.jsx and src/admin/authConfig.js) — it must
// be replaced with real backend-verified login before production.
export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/gau-mata" element={<GauMata />} />
        <Route path="/services" element={<Services />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/suggestion" element={<Suggestion />} />
        <Route path="/donation" element={<Donation />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/adoption" element={<Adoption />} />
        <Route path="/volunteer" element={<Volunteer />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="/admin/login" element={<AdminLogin />} />

      <Route path="/admin" element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="website-info" element={<WebsiteInfo />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="gau-mata" element={<CowMata />} />
          <Route path="gallery" element={<GalleryAdmin />} />
          <Route path="donation" element={<DonationAdmin />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Route>
    </Routes>
  );
}
