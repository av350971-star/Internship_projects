import { Link } from "react-router-dom";
import { Home as HomeIcon } from "lucide-react";
import PageHeader from "../components/ui/PageHeader.jsx";

// Catch-all route (App.jsx: <Route path="*" ...>) so unknown URLs show a
// proper page instead of a blank screen.
export default function NotFound() {
  return (
    <div>
      <PageHeader title="पेज नहीं मिला" subtitle="404 — यह पेज उपलब्ध नहीं है।" />
      <div className="container-page flex flex-col items-center gap-4 py-16 text-center">
        <p className="max-w-md text-sm text-brown-500">
          जिस पेज को आप खोज रहे हैं वह मौजूद नहीं है या हटा दिया गया है।
        </p>
        <Link
          to="/"
          className="flex items-center gap-2 rounded-full bg-pasture-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pasture-600"
        >
          <HomeIcon className="h-4 w-4" aria-hidden="true" />
          होम पेज पर जाएं
        </Link>
      </div>
    </div>
  );
}
