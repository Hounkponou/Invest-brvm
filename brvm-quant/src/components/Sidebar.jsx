import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';

export default function Sidebar({ isSidebarOpen, setIsSidebarOpen, user, handleLogout }) {
  const location = useLocation();

  // Sur mobile, refermer le tiroir après une navigation (ergonomie tactile).
  const closeOnMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) setIsSidebarOpen?.(false);
  };

  return (
    <nav
      className={`sidebar ${isSidebarOpen ? 'is-open' : 'is-closed'}`}
      style={{ flexDirection: 'column', width: '260px', backgroundColor: 'var(--bg-panel)', borderRight: '1px solid var(--border-color)', padding: '22px 16px', zIndex: 50, transition: 'transform 0.28s ease' }}
    >
      {/* Logo — plein indigo, sobre */}
      <Link to="/" onClick={closeOnMobile} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 11, padding: '4px 8px', marginBottom: 28 }}>
        <div style={{ background: 'var(--accent-blue)', width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center', color: '#fff' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
          </svg>
        </div>
        <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text-main)' }}>
          Invest<span style={{ color: 'var(--accent-blue)' }}>Pro</span>
        </span>
      </Link>

      {/* Menu principal — items uniformes + icônes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              onClick={closeOnMobile}
              className={`nav-btn ${active ? 'active' : ''}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', borderRadius: 9,
                textDecoration: 'none', fontWeight: 600, fontSize: '0.94rem', transition: '0.15s',
                background: active ? 'var(--accent-blue)' : 'transparent',
                color: active ? '#fff' : 'var(--text-muted)',
              }}
            >
              <Icon width={18} height={18} />
              {label}
            </Link>
          );
        })}
      </div>

      {/* Pied : accueil, profil, déconnexion */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Link to="/" onClick={closeOnMobile} style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9, fontSize: '0.9rem', fontWeight: 600, padding: '0 8px' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          Accueil
        </Link>

        <div style={{ background: 'var(--bg-base)', padding: 12, borderRadius: 9, border: '1px solid var(--border-color)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 8, wordBreak: 'break-all', fontWeight: 600 }}>{user?.email}</div>
          <button
            onClick={handleLogout}
            style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--down-color)', padding: 7, borderRadius: 7, width: '100%', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'background 0.15s' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--down-bg)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </nav>
  );
}
