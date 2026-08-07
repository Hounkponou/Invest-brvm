import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';

/**
 * MobileTabBar — barre d'onglets fixe en bas d'écran (pattern app mobile).
 * Affichée UNIQUEMENT sur mobile (règle CSS .mobile-tabbar). Reprend les mêmes
 * destinations que la Sidebar desktop -> navigation principale au pouce.
 */
export default function MobileTabBar() {
  const { pathname } = useLocation();
  return (
    <nav className="mobile-tabbar" aria-label="Navigation principale">
      {NAV_ITEMS.map(({ to, short, icon: Icon }) => (
        <Link key={to} to={to} className={`tab ${pathname === to ? 'active' : ''}`}>
          <Icon width={22} height={22} />
          <span>{short}</span>
        </Link>
      ))}
    </nav>
  );
}
