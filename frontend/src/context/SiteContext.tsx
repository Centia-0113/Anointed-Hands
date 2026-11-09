import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { SiteSettings, WeeklyHours } from "../types";
import { siteApi } from "../services/api";

/** Shown until the API responds (and if it can't be reached). */
export const DEFAULT_SITE: SiteSettings = {
  businessName: "Anointed Hands",
  tagline: "Salon & Café",
  phone: "",
  email: "",
  address: "",
  whatsApp: "",
  instagram: "",
  facebook: "",
  heroTitle: "Welcome to Anointed Hands",
  heroSubtitle: "Premium salon and café services in one elegant space.",
  aboutText: "",
  announcement: "",
  bankName: "",
  accountName: "",
  accountNumber: "",
  branchCode: "",
  scanToPayUrl: "",
  depositPercent: 10,
  depositHours: 24,
  cancellationPolicy: "",
  hours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    isOpen: day !== 0,
    opens: day === 6 ? "10:00" : "09:00",
    closes: day === 6 ? "17:00" : "18:00",
  })),
};

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "09:00" → "9AM", "17:30" → "5:30PM" */
export const formatTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return m ? `${hour}:${String(m).padStart(2, "0")}${suffix}` : `${hour}${suffix}`;
};

/** Groups consecutive days with the same hours: "Mon – Fri: 9AM – 6PM", "Sun: Closed". Week starts Monday. */
export const summariseHours = (hours: WeeklyHours[]): { days: string; time: string }[] => {
  const order = [1, 2, 3, 4, 5, 6, 0].map((d) => hours.find((h) => h.day === d)!).filter(Boolean);
  const label = (h: WeeklyHours) => (h.isOpen ? `${formatTime(h.opens)} – ${formatTime(h.closes)}` : "Closed");
  const groups: { from: number; to: number; time: string }[] = [];
  order.forEach((h) => {
    const time = label(h);
    const last = groups[groups.length - 1];
    if (last && last.time === time) last.to = h.day;
    else groups.push({ from: h.day, to: h.day, time });
  });
  const short = (d: number) => DAY_NAMES[d].slice(0, 3);
  return groups.map((g) => ({ days: g.from === g.to ? short(g.from) : `${short(g.from)} – ${short(g.to)}`, time: g.time }));
};

interface SiteContextValue {
  site: SiteSettings;
  loaded: boolean;
  /** Replace the cached settings after the admin saves (so the whole site updates instantly). */
  setSite: (s: SiteSettings) => void;
  refresh: () => Promise<void>;
}

const SiteContext = createContext<SiteContextValue>({
  site: DEFAULT_SITE,
  loaded: false,
  setSite: () => undefined,
  refresh: async () => undefined,
});

export const SiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [site, setSite] = useState<SiteSettings>(DEFAULT_SITE);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setSite(await siteApi.get());
    } catch {
      /* keep defaults */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Keep the browser tab title in sync with the business name
  useEffect(() => {
    document.title = `${site.businessName}${site.tagline ? ` – ${site.tagline}` : ""}`;
  }, [site.businessName, site.tagline]);

  return <SiteContext.Provider value={{ site, loaded, setSite, refresh }}>{children}</SiteContext.Provider>;
};

export const useSite = () => useContext(SiteContext);
