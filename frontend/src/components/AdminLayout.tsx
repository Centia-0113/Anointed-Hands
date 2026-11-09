import React, { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSite } from "../context/SiteContext";

const sections: { title: string; links: { to: string; label: string; icon: string }[] }[] = [
  {
    title: "Operations",
    links: [
      { to: "/admin", label: "Overview", icon: "✨" },
      { to: "/admin/bookings", label: "Bookings", icon: "📅" },
      { to: "/admin/orders", label: "Café Orders", icon: "☕" },
      { to: "/admin/payments", label: "Payments", icon: "💳" },
      { to: "/admin/reports", label: "Concerns & Lost Items", icon: "💬" },
    ],
  },
  {
    title: "Business",
    links: [
      { to: "/admin/services", label: "Services & Menu", icon: "🏷️" },
      { to: "/admin/staff", label: "Staff", icon: "👩🏾‍💼" },
      { to: "/admin/hours", label: "Opening Hours", icon: "🗓️" },
      { to: "/admin/cafe-qr", label: "Café QR Code", icon: "📱" },
    ],
  },
  {
    title: "Website",
    links: [
      { to: "/admin/content", label: "Website Content", icon: "📝" },
      { to: "/admin/gallery", label: "Gallery", icon: "📸" },
      { to: "/admin/reviews", label: "Reviews", icon: "⭐" },
    ],
  },
  {
    title: "You",
    links: [{ to: "/admin/account", label: "Account & Password", icon: "🔒" }],
  },
];

/** Page title used at the top of every back-office page. */
export const AdminPageHeader: React.FC<{ title: string; subtitle?: string; children?: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
    <div>
      <h1 className="text-4xl md:text-5xl text-gold-300 mb-1">{title}</h1>
      {subtitle && <p className="text-blush-200">{subtitle}</p>}
    </div>
    {children}
  </div>
);

/** Back office for the admin: its own sidebar layout, separate from the public website. */
export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { site } = useSite();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
      isActive ? "bg-gradient-to-r from-blush-500 to-blush-600 text-white" : "text-blush-100 hover:bg-white/10"
    }`;

  const nav = (
    <nav className="space-y-6">
      {sections.map((s) => (
        <div key={s.title}>
          <p className="px-3 mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-gold-400/80">{s.title}</p>
          <div className="space-y-1">
            {s.links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === "/admin"} className={linkClass} onClick={() => setOpen(false)}>
                <span className="text-base w-5 text-center">{l.icon}</span>
                {l.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blush-900 to-[#2e0819] text-blush-50 lg:flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-r border-gold-500/20 bg-black/10 p-5 sticky top-0 h-screen overflow-y-auto">
        <Link to="/admin" className="block mb-8">
          <img src="/assets/images/logo-mark.png" alt="" className="h-14 w-14 mb-2 -ml-1" />
          <p className="font-elegant text-2xl font-bold text-gold-200 leading-none">{site.businessName}</p>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-blush-300 mt-1">Back Office</p>
        </Link>
        {nav}
        <div className="mt-auto pt-6 border-t border-white/10 space-y-2 text-sm">
          <p className="text-blush-200/80 truncate" title={user?.email}>{user?.email}</p>
          <a href="/" target="_blank" rel="noopener noreferrer" className="block font-bold text-gold-200 hover:underline">
            View website ↗
          </a>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="font-bold text-blush-300 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-blush-900/95 border-b border-gold-500/20">
        <Link to="/admin" className="font-elegant text-xl font-bold text-gold-200">
          {site.businessName} <span className="text-xs font-body text-blush-300 uppercase tracking-widest">Admin</span>
        </Link>
        <button onClick={() => setOpen((o) => !o)} className="p-2 rounded-lg text-gold-200 hover:bg-white/10" aria-label="Menu" aria-expanded={open}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
      {open && (
        <div className="lg:hidden px-4 py-5 bg-blush-900 border-b border-gold-500/20">
          {nav}
          <div className="mt-6 flex gap-4 text-sm">
            <a href="/" target="_blank" rel="noopener noreferrer" className="font-bold text-gold-200">View website ↗</a>
            <button onClick={() => { logout(); navigate("/login"); }} className="font-bold text-blush-300">Sign out</button>
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 py-8 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
};
