import { useState } from "react";
import { NavLink, Link, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Info,
  BarChart3,
  PawPrint,
  ImageIcon,
  Heart,
  AlertTriangle,
  Menu,
  X,
  ExternalLink,
  LogOut,
} from "lucide-react";
import LogoMark from "../components/ui/LogoMark.jsx";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";
import { useReports } from "../context/ReportsContext.jsx";

const adminLinks = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/website-info", label: "Website Information", icon: Info },
  { to: "/admin/statistics", label: "Statistics", icon: BarChart3 },
  { to: "/admin/gau-mata", label: "गौ माता", icon: PawPrint },
  { to: "/admin/gallery", label: "Gallery", icon: ImageIcon },
  { to: "/admin/donation", label: "Donation Information", icon: Heart },
  { to: "/admin/reports", label: "Reports", icon: AlertTriangle },
];

// Login is enforced one level up by <ProtectedRoute> (see
// src/admin/components/ProtectedRoute.jsx + App.jsx) — by the time this
// layout renders, the visitor is already authenticated.
export default function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { logout } = useAdminAuth();
  const { reports } = useReports();
  const navigate = useNavigate();

  const newReportsCount = reports.filter((r) => r.status === "New").length;

  const handleLogout = () => {
    logout();
    navigate("/admin/login", { replace: true });
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <LogoMark className="h-10 w-10" />
        <div className="leading-tight">
          <p className="font-display text-base text-white">Admin Panel</p>
          <p className="text-xs text-cream-300/70">Gaushala CMS</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {adminLinks.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setIsSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-pasture-500 text-white font-medium"
                  : "text-cream-200/80 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <span className="flex items-center gap-3">
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </span>
            {to === "/admin/reports" && newReportsCount > 0 && (
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-marigold-500 px-1.5 text-[11px] font-semibold text-white">
                {newReportsCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm text-cream-200/80 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          वेबसाइट देखें
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm text-cream-200/80 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-cream-100">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 bg-brown-900 lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div
            className="absolute inset-0 bg-brown-950/50"
            onClick={() => setIsSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-brown-900 shadow-lift">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-4 border-b border-brown-100 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="मेनू खोलें"
              className="flex h-9 w-9 items-center justify-center rounded-full text-brown-700 hover:bg-cream-100 lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <p className="text-sm font-medium text-brown-700">Admin Content Management</p>
          </div>
          <p className="hidden rounded-full bg-marigold-400/15 px-3 py-1 text-xs text-marigold-500 sm:block">
            Demo mode — frontend-only authentication
          </p>
        </header>

        {isSidebarOpen && (
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="मेनू बंद करें"
            className="fixed right-4 top-4 z-[100] flex h-9 w-9 items-center justify-center rounded-full bg-white text-brown-700 shadow-lift lg:hidden"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
