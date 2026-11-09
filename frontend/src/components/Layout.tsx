import React, { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { summariseHours, useSite } from "../context/SiteContext";

const LOGO_URL = "/assets/images/logo.png";

/** Public navigation: what clients can explore. Booking is a separate call-to-action. */
const exploreLinks = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/gallery", label: "Gallery" },
  { to: "/cafe", label: "Café" },
  { to: "/reviews", label: "Reviews" },
  { to: "/help", label: "Help" },
];

/** Turns "@name" / "name" / full URL into a link for a social profile. */
const socialUrl = (value: string, base: string) =>
  /^https?:\/\//i.test(value) ? value : `${base}${value.replace(/^@/, "")}`;

const AnnouncementBar: React.FC = () => {
  const { site } = useSite();
  const [hidden, setHidden] = useState(false);
  if (!site.announcement || hidden) return null;
  return (
    <div className="relative bg-gradient-to-r from-blush-700 via-blush-600 to-blush-700 text-white text-sm text-center px-10 py-2">
      <span className="text-gold-200 mr-1">✨</span>
      {site.announcement}
      <button onClick={() => setHidden(true)} aria-label="Dismiss announcement" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white">
        ×
      </button>
    </div>
  );
};

export const Header: React.FC = () => {
  const { site } = useSite();
  const [logoOk, setLogoOk] = useState(true);
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isClient = !user || user.role === "Customer";
  // Staff accounts go to their own area; clients see their bookings
  const accountLink = !user
    ? { to: "/login", label: "Sign In" }
    : user.role === "Admin"
    ? { to: "/admin", label: "Back Office" }
    : user.role === "Stylist"
    ? { to: "/staff", label: "My Schedule" }
    : { to: "/account", label: "My Bookings" };

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate("/");
  };

  const navClass = ({ isActive }: { isActive: boolean }) => (isActive ? "nav-link-active" : "nav-link");

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gold-200">
      <div className="h-1 w-full bg-gradient-to-r from-gold-300 via-gold-500 to-gold-300" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 shrink-0" onClick={() => setOpen(false)}>
          {logoOk ? (
            <img src={LOGO_URL} alt={site.businessName} className="h-11 w-11 rounded-full object-cover ring-2 ring-gold-400" onError={() => setLogoOk(false)} />
          ) : (
            <span className="h-11 w-11 rounded-full flex items-center justify-center font-elegant text-xl font-bold text-white bg-gradient-to-br from-blush-500 to-blush-700 ring-2 ring-gold-400">
              {site.businessName
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </span>
          )}
          <span className="font-elegant text-2xl font-bold text-blush-800 leading-none">
            {site.businessName}
            {site.tagline && (
              <span className="block text-xs font-body font-bold tracking-[0.3em] uppercase text-gold-600 mt-1">{site.tagline}</span>
            )}
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-0.5">
          {exploreLinks.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === "/"} className={navClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <NavLink to={accountLink.to} className={navClass}>
            {accountLink.label}
          </NavLink>
          {user && (
            <button onClick={handleLogout} className="nav-link" title={`Signed in as ${user.email}`}>
              Sign Out
            </button>
          )}
          {isClient && (
            <Link to="/booking" className="btn-primary text-sm px-5 py-2">
              Book Now
            </Link>
          )}
        </div>

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
          {isClient && (
            <Link to="/booking" className="btn-primary mb-2" onClick={() => setOpen(false)}>
              Book Now
            </Link>
          )}
          {[...exploreLinks, accountLink].map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === "/"} className={navClass} onClick={() => setOpen(false)}>
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
  const { site } = useSite();
  const hours = summariseHours(site.hours);
  const socials = [
    site.instagram && { label: "Instagram", href: socialUrl(site.instagram, "https://instagram.com/") },
    site.facebook && { label: "Facebook", href: socialUrl(site.facebook, "https://facebook.com/") },
    site.whatsApp && { label: "WhatsApp", href: `https://wa.me/${site.whatsApp.replace(/\D/g, "")}` },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <footer className="bg-blush-900 text-blush-100 pt-12 pb-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <h3 className="text-2xl mb-3 text-gold-300">{site.businessName}</h3>
            <p className="text-blush-200 text-sm leading-relaxed">{site.aboutText || site.tagline}</p>
          </div>
          <div>
            <h3 className="text-xl mb-3 text-gold-300">Hours</h3>
            {hours.map((h) => (
              <p key={h.days} className="text-blush-200 text-sm">
                {h.days}: {h.time}
              </p>
            ))}
            <p className="text-blush-300 text-xs mt-2">Special openings are shown when booking.</p>
          </div>
          <div>
            <h3 className="text-xl mb-3 text-gold-300">Explore</h3>
            <ul className="space-y-1 text-sm">
              {[
                { to: "/services", label: "Services & prices" },
                { to: "/booking", label: "Book an appointment" },
                { to: "/gallery", label: "Our work" },
                { to: "/reviews", label: "Client reviews" },
                { to: "/help", label: "Concerns & lost property" },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-blush-200 hover:text-gold-200">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xl mb-3 text-gold-300">Contact</h3>
            {site.address && <p className="text-blush-200 text-sm mb-1">{site.address}</p>}
            {site.phone && (
              <a href={`tel:${site.phone.replace(/\s/g, "")}`} className="block text-blush-200 text-sm hover:text-gold-200">
                {site.phone}
              </a>
            )}
            {site.email && (
              <a href={`mailto:${site.email}`} className="block text-blush-200 text-sm hover:text-gold-200 break-all">
                {site.email}
              </a>
            )}
            {socials.length > 0 && (
              <p className="mt-3 text-sm space-x-3">
                {socials.map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="text-gold-300 hover:underline">
                    {s.label}
                  </a>
                ))}
              </p>
            )}
          </div>
        </div>
        <div className="h-px my-8 bg-gradient-to-r from-transparent via-gold-500 to-transparent" />
        <p className="text-center text-blush-300 text-sm">
          © {new Date().getFullYear()} {site.businessName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

/** Layout for the public website and client/staff pages. */
export const PublicLayout: React.FC = () => (
  <div className="flex flex-col min-h-screen">
    <AnnouncementBar />
    <Header />
    <main className="flex-1">
      <Outlet />
    </main>
    <Footer />
  </div>
);
