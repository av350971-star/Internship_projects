import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogIn, Heart } from "lucide-react";
import LogoMark from "../ui/LogoMark.jsx";
import { navLinks } from "../../data/navLinks.js";
import { useGaushalaData } from "../../context/DataContext.jsx";

export default function Navbar() {
  // Brand name comes from the admin-managed "Website Information" module.
  const { siteInfo } = useGaushalaData();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Links with a real page (route: true) are "active" when the current
  // URL matches; anchor-only links (no page yet) never claim active state.
  const isLinkActive = (link) =>
    link.route && location.pathname === link.href;

  // Add a soft shadow once the page has scrolled past the top bar,
  // so the sticky navbar reads as "lifted" above the page content.
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close the mobile menu automatically if the viewport grows back to desktop size.
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const closeMobileMenu = () => setIsMenuOpen(false);

  return (
    <header
      className={`sticky top-0 z-50 bg-white/95 backdrop-blur transition-shadow duration-300 ${
        isScrolled ? "shadow-soft" : ""
      }`}
    >
      <div className="container-page">
        <div className="flex h-20 items-center justify-between gap-6">
          {/* Brand lockup */}
          <Link to="/" onClick={closeMobileMenu} className="flex items-center gap-3 shrink-0">
            <LogoMark />
            <span className="flex flex-col leading-tight">
              <span className="font-display text-xl sm:text-[1.4rem] text-brown-800">
                {siteInfo.name}
              </span>
              {!siteInfo.name?.includes("गौशाला") && (
                <span className="text-xs sm:text-sm text-brown-400 tracking-wide">
                  गौशाला
                </span>
              )}
            </span>
          </Link>

          {/* Desktop navigation */}
          <nav
            aria-label="मुख्य नेविगेशन"
            className="hidden lg:flex items-center gap-1"
          >
            {navLinks.map((link) => {
              const isActive = isLinkActive(link);
              const linkClass = `relative px-3.5 py-2 text-[0.95rem] rounded-full transition-colors duration-200 ${
                isActive
                  ? "text-brown-800 bg-cream-100 font-semibold"
                  : "text-brown-500 hover:text-brown-800 hover:bg-cream-50"
              }`;
              return link.route ? (
                <Link
                  key={link.id}
                  to={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={linkClass}
                >
                  {link.label}
                </Link>
              ) : (
                <a key={link.id} href={link.href} className={linkClass}>
                  {link.label}
                </a>
              );
            })}
          </nav>

          {/* Desktop actions */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <Link
              to="/admin/login"
              className="flex items-center gap-1.5 rounded-full border border-brown-200 px-4 py-2 text-sm font-medium text-brown-700 transition-colors duration-200 hover:border-brown-300 hover:bg-cream-50"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              लॉगिन
            </Link>
            <Link
              to="/donation"
              className="flex items-center gap-1.5 rounded-full bg-pasture-500 px-5 py-2 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:bg-pasture-600 hover:shadow-lift"
            >
              <Heart className="h-4 w-4" aria-hidden="true" />
              डोनेट करें
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav"
            aria-label={isMenuOpen ? "मेनू बंद करें" : "मेनू खोलें"}
            className="lg:hidden flex h-10 w-10 items-center justify-center rounded-full text-brown-700 transition-colors hover:bg-cream-100"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile navigation panel */}
      <div
        id="mobile-nav"
        className={`lg:hidden overflow-hidden border-t border-cream-200 bg-white transition-[max-height,opacity] duration-300 ease-in-out ${
          isMenuOpen ? "max-h-[28rem] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav aria-label="मोबाइल नेविगेशन" className="container-page py-3 flex flex-col gap-1">
          {navLinks.map((link) => {
            const isActive = isLinkActive(link);
            const linkClass = `rounded-xl px-4 py-2.5 text-[0.95rem] transition-colors duration-200 ${
              isActive
                ? "bg-cream-100 text-brown-800 font-semibold"
                : "text-brown-500 hover:bg-cream-50 hover:text-brown-800"
            }`;
            return link.route ? (
              <Link
                key={link.id}
                to={link.href}
                onClick={closeMobileMenu}
                aria-current={isActive ? "page" : undefined}
                className={linkClass}
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.id}
                href={link.href}
                onClick={closeMobileMenu}
                className={linkClass}
              >
                {link.label}
              </a>
            );
          })}

          <div className="mt-2 flex gap-3 border-t border-cream-200 pt-3">
            <Link
              to="/admin/login"
              onClick={closeMobileMenu}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-brown-200 px-4 py-2.5 text-sm font-medium text-brown-700 transition-colors hover:bg-cream-50"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              लॉगिन
            </Link>
            <Link
              to="/donation"
              onClick={closeMobileMenu}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-pasture-500 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-pasture-600"
            >
              <Heart className="h-4 w-4" aria-hidden="true" />
              डोनेट करें
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
