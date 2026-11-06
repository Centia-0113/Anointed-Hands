import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface HeaderProps {
  logoUrl?: string;
  title?: string;
}

const links = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/gallery", label: "Gallery" },
  { to: "/cafe", label: "Café" },
  { to: "/reviews", label: "Reviews" },
  { to: "/help", label: "Help" },
  { to: "/booking", label: "Book Now" },
];

export const Header: React.FC<HeaderProps> = ({
  logoUrl = "/assets/images/logo.png",
  title = "Anointed Hands",
}) => {
  const [logoOk, setLogoOk] = useState(true);
  const [open, setOpen] = useState(false);
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  // Account links depend on who is signed in; Admin only appears for admins
  const accountLinks = !user
    ? [{ to: "/login", label: "Sign In" }]
    : isAdmin
    ? [{ to: "/admin", label: "Admin" }]
    : user.role === "Stylist"
    ? [{ to: "/staff", label: "My Schedule" }]
    : [{ to: "/account", label: "My Bookings" }];
  const allLinks = [...links, ...accountLinks];

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate("/");
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "nav-link-active" : "nav-link";

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gold-200">
      <div className="h-1 w-full bg-gradient-to-r from-gold-300 via-gold-500 to-gold-300" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          {logoUrl && logoOk ? (
            <img
              src={logoUrl}
              alt={title}
              className="h-11 w-11 rounded-full object-cover ring-2 ring-gold-400"
              onError={() => setLogoOk(false)}
            />
          ) : (
            <span className="h-11 w-11 rounded-full flex items-center justify-center font-elegant text-xl font-bold text-white bg-gradient-to-br from-blush-500 to-blush-700 ring-2 ring-gold-400">
              AH
            </span>
          )}
          <span className="font-elegant text-2xl font-bold text-blush-800 leading-none">
            {title}
            <span className="block text-xs font-body font-bold tracking-[0.3em] uppercase text-gold-600 mt-1">
              Salon &amp; Café
            </span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-0.5">
          {allLinks.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === "/"} className={navClass}>
              {l.label}
            </NavLink>
          ))}
          {user && (
            <button onClick={handleLogout} className="nav-link" title={`Signed in as ${user.email}`}>
              Sign Out
            </button>
          )}
        </nav>

        <button
          type="button"
          className="lg:hidden p-2 rounded-lg text-blush-700 hover:bg-blush-100"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <nav className="lg:hidden border-t border-blush-100 px-4 py-3 flex flex-col gap-1 bg-white">
          {allLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={navClass}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}
          {user && (
            <button onClick={handleLogout} className="nav-link text-left">
              Sign Out ({user.name.split(" ")[0]})
            </button>
          )}
        </nav>
      )}
    </header>
  );
};

export const Footer: React.FC = () => {
  return (
    <footer className="bg-blush-900 text-blush-100 pt-12 pb-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <h3 className="text-2xl mb-3 text-gold-300">Anointed Hands</h3>
            <p className="text-blush-200 text-sm leading-relaxed">
              Premium salon and café services for your beauty and wellness needs.
            </p>
          </div>
          <div>
            <h3 className="text-xl mb-3 text-gold-300">Hours</h3>
            <p className="text-blush-200 text-sm">Mon – Fri: 9AM – 6PM</p>
            <p className="text-blush-200 text-sm">Sat: 10AM – 5PM</p>
            <p className="text-blush-200 text-sm">Sun: Closed (special openings announced)</p>
          </div>
          <div>
            <h3 className="text-xl mb-3 text-gold-300">Contact</h3>
            <p className="text-blush-200 text-sm">contact@anoitedhandsalon.com</p>
            <p className="text-blush-200 text-sm">+27 31 000 0000</p>
            <p className="mt-3 text-sm space-x-3">
              <Link to="/help" className="text-gold-300 hover:underline">Concerns &amp; lost property</Link>
              <Link to="/reviews" className="text-gold-300 hover:underline">Reviews</Link>
            </p>
          </div>
        </div>
        <div className="h-px my-8 bg-gradient-to-r from-transparent via-gold-500 to-transparent" />
        <p className="text-center text-blush-300 text-sm">
          © {new Date().getFullYear()} Anointed Hands. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
