import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, ShieldCheck } from "lucide-react";
import { useAdminAuth } from "../../context/AdminAuthContext.jsx";
import LogoMark from "../../components/ui/LogoMark.jsx";
import FormMessage from "../../components/ui/FormMessage.jsx";
import { inputClass, labelClass } from "../../components/ui/formStyles.js";

export default function AdminLogin() {
  const { isAuthenticated, login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState(null);

  // Already logged in (e.g. opened /admin/login manually while signed in) —
  // send them straight to the dashboard or wherever they were headed.
  if (isAuthenticated) {
    const redirectTo = location.state?.from?.pathname || "/admin";
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      setStatus({ type: "error", text: "कृपया email और password दोनों दर्ज करें।" });
      return;
    }

    const success = login(email, password);
    if (success) {
      const redirectTo = location.state?.from?.pathname || "/admin";
      navigate(redirectTo, { replace: true });
    } else {
      setStatus({ type: "error", text: "Invalid email या password। कृपया पुनः प्रयास करें।" });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brown-900 px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-lift sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark className="h-12 w-12" />
          <h1 className="mt-3 font-display text-2xl text-brown-800">Admin Login</h1>
          <p className="mt-1 text-sm text-brown-400">Gaushala Content Management Panel</p>
        </div>

        <FormMessage status={status} />

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="admin-email" className={labelClass}>
              Email / Username
            </label>
            <input
              id="admin-email"
              type="text"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="sarvahitamsevasamiti@gmail.com"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className={labelClass}>
              Password
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} pr-11`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Password छिपाएं" : "Password दिखाएं"}
                className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-brown-400 transition-colors hover:bg-cream-100 hover:text-brown-700"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-pasture-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pasture-600"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Login
          </button>
        </form>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-brown-300">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Demo mode — frontend-only authentication
        </p>
      </div>
    </div>
  );
}
