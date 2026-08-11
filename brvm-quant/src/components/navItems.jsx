import React from 'react';

/* Icônes de navigation (ligne SVG, monochrome via currentColor) — partagées
   par la Sidebar (desktop) et la barre d'onglets (mobile). */
const I = (children) => (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" {...p}>{children}</svg>
);

export const NavIcons = {
  dashboard: I(<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>),
  screener: I(<><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" /><circle cx="8" cy="18" r="2" fill="currentColor" stroke="none" /></>),
  signals: I(<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />),
  backtest: I(<><path d="M3 3v18h18" /><path d="M7 14l3-4 3 3 4-6" /></>),
  portfolio: I(<><path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2" /><path d="M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3" /><path d="M16 12h5v3h-5a1.5 1.5 0 0 1 0-3z" /></>),
};

// to = route ; label = libellé sidebar ; short = libellé onglet mobile (court)
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Tableau de bord', short: 'Marché', icon: NavIcons.dashboard },
  { to: '/analyse', label: 'Analyse', short: 'Analyse', icon: NavIcons.screener },
  { to: '/simulator', label: 'Backtest Lab', short: 'Backtest', icon: NavIcons.backtest },
  { to: '/portfolio', label: 'Portefeuille', short: 'Portef.', icon: NavIcons.portfolio },
];
