import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar({ 
  isSidebarOpen, 
  user, 
  handleLogout 
}) {
  const location = useLocation();

  return (
    <nav className="sidebar" style={{ display: isSidebarOpen ? 'flex' : 'none', flexDirection: 'column', width: '260px', backgroundColor: 'var(--bg-panel)', borderRight: '1px solid var(--border-color)', padding: '25px 20px', zIndex: 50, transition: 'all 0.3s ease' }}>
      
      {/* 1.  NOUVEAU LOGO DESIGN */}
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--accent-blue), #00d2ff)',
          padding: '8px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          boxShadow: '0 4px 15px rgba(41, 98, 255, 0.3)'
        }}>
          {/* Icône de graphique qui monte */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
            <polyline points="16 7 22 7 22 13"></polyline>
          </svg>
        </div>
        <div style={{ fontSize: '1.5em', fontWeight: '900', letterSpacing: '0.5px', color: 'var(--text-main)' }}>
          Invest<span style={{ background: 'linear-gradient(90deg, var(--accent-blue), #00d2ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Pro</span>
        </div>
      </Link>
      
      {/* 2. MENU PRINCIPAL */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '0.75em', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', fontWeight: 'bold' }}></div>
        
        <Link to="/dashboard" className={`nav-btn ${location.pathname === '/dashboard' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', padding: '12px 15px', borderRadius: '8px', background: location.pathname === '/dashboard' ? 'var(--accent-blue)' : 'transparent', color: location.pathname === '/dashboard' ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', transition: '0.2s' }}>
          Dashboard
        </Link>
        <Link to="/screener" className={`nav-btn ${location.pathname === '/screener' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', padding: '12px 15px', borderRadius: '8px', background: location.pathname === '/screener' ? 'var(--accent-blue)' : 'transparent', color: location.pathname === '/screener' ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', transition: '0.2s' }}>
          Stock Screener
        </Link>
        {/* Accès au nouveau Module Prédictif IA (accent vert = signaux) */}
        <Link to="/predictions" className={`nav-btn ${location.pathname === '/predictions' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', padding: '12px 15px', borderRadius: '8px', background: location.pathname === '/predictions' ? 'var(--up-color)' : 'transparent', color: location.pathname === '/predictions' ? 'white' : 'var(--up-color)', border: location.pathname === '/predictions' ? 'none' : '1px solid var(--up-color)', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', transition: '0.2s' }}>
          {/* Icône éclair = signaux temps réel */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          Signaux IA
        </Link>
        <Link to="/simulator" className={`nav-btn ${location.pathname === '/simulator' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', padding: '12px 15px', borderRadius: '8px', background: location.pathname === '/simulator' ? '#9f7aea' : 'transparent', color: location.pathname === '/simulator' ? 'white' : '#9f7aea', border: location.pathname === '/simulator' ? 'none' : '1px solid #9f7aea', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', transition: '0.2s' }}>
          Backtest Lab
        </Link>
        <Link to="/portfolio" className={`nav-btn ${location.pathname === '/portfolio' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left', padding: '12px 15px', borderRadius: '8px', background: location.pathname === '/portfolio' ? 'var(--accent-blue)' : 'transparent', color: location.pathname === '/portfolio' ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', transition: '0.2s' }}>
          Portfolio Cloud
        </Link>
      </div>
      
      {/* 3. PIED DE LA SIDEBAR (Profil & Bouton Home) */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {/* Nouveau Joli Bouton Home (Discret mais clair) */}
        <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9em', fontWeight: 'bold', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-main)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          Home
        </Link>

        <div style={{ background: 'var(--bg-base)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75em', marginBottom: '8px', wordBreak: 'break-all', fontWeight: 'bold' }}>{user?.email}</div>
          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid var(--down-color)', color: 'var(--down-color)', padding: '6px', borderRadius: '6px', width: '100%', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85em', transition: 'background 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.background = 'var(--down-color)'; e.currentTarget.style.color = 'white'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--down-color)'; }}>
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}