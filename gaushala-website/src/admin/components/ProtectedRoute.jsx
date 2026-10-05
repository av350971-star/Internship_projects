import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";

// Guards every /admin/* route (except /admin/login itself). Renders the
// nested admin routes only when logged in; otherwise redirects to
// /admin/login and remembers where the visitor was trying to go so
// AdminLogin can send them back there after a successful login.
//
// This also covers the "browser back / direct URL after logout" case:
// isAuthenticated comes straight from AdminAuthContext, so once it flips
// to false there is no cached admin UI left to navigate back into.
export default function ProtectedRoute() {
  const { isAuthenticated } = useAdminAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
