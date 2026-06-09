// src/components/Sidebar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar({ 
  user, 
  handleLogout 
}) {
  // Hook pour connaître l'URL actuelle et colorer les liens
  const location = useLocation();

  // Fonction utilitaire pour le style actif (car style en ligne dense)
  const getNavLinkStyle = (path) => ({
    display: 'block',
    textDecoration: 'none',
    width: '100%',
    boxSizing: 'border-box',
    textAlign: 'left',
    padding: '12px',
    marginBottom: '8px',
    borderRadius: '8px',
    // Si l'URL correspond : fond bleu, sinon transparent
    background: location.pathname === path ? 'var(--accent-blue)' : 'transparent',
    // Si l'URL correspond : texte blanc, sinon gris
    color: location.pathname === path ? 'white' : 'var(--text-muted)',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'all 0.2s ease'
  });

  return (
    // Remarque : display:flex est forcé ici, Layout gère la visibilité
    <nav className="sidebar" style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: 'var(--bg-panel)', padding: '20px', boxSizing: 'border-box' }}>
      <div>
        {/* LOGO : Lien vers l'accueil */}
        <Link to="/" style={{ textDecoration: 'none', display: 'block', cursor: 'pointer', fontSize: '1.5em', fontWeight: '900', marginBottom: '30px', color: 'var(--text-main)' }}>
          INVEST <span style={{ color: 'var(--accent-blue)' }}>PRO</span>
        </Link>
        
        {/* Navigation : Remplacement des buttons par des Links */}
        <Link 
          to="/" 
          style={{ ...getNavLinkStyle('/'), color: 'var(--text-main)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
          🏠 Landing Page
        </Link>
        
        <Link 
          to="/dashboard" 
          style={getNavLinkStyle('/dashboard')}>
          📊 Dashboard
        </Link>

        <Link 
          to="/screener" 
          style={getNavLinkStyle('/screener')}>
          ⚡ Stock Screener
        </Link>

        <Link 
          to="/simulator" 
          style={{ ...getNavLinkStyle('/simulator'), background: location.pathname === '/simulator' ? '#9f7aea' : 'transparent', color: location.pathname === '/simulator' ? 'white' : '#9f7aea', border: '1px solid #9f7aea' }}>
          🧪 Backtest Lab
        </Link>

        <Link 
          to="/portfolio" 
          style={getNavLinkStyle('/portfolio')}>
          💼 Portfolio Cloud
        </Link>
      </div>
      
      {/* Bas de sidebar : Profil et déconnexion */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '20px', textAlign: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8em', marginBottom: '10px', wordBreak: 'break-all' }}>{user?.email}</div>
        <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid var(--down-color)', color: 'var(--down-color)', padding: '8px', borderRadius: '6px', width: '100%', cursor: 'pointer', fontWeight: 'bold' }}>Log Out</button>
      </div>
    </nav>
  );
}