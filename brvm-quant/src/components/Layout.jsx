import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';

export default function Layout(props) {
  // Détection de la taille d'écran
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fermer le menu mobile quand on clique sur un lien (changement de page)
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [window.location.pathname]);

  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--bg-base)', color: 'var(--text-main)', overflow: 'hidden' }}>
      
      {/* OVERLAY SOMBRE : Pour fermer le menu en cliquant à côté sur mobile */}
      {isMobile && isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 40 }}
        />
      )}

      {/* SIDEBAR : Fixe sur mobile (qui glisse), ou classique sur PC */}
      <div style={{
        position: isMobile ? 'fixed' : 'relative',
        top: 0,
        left: isMobile ? (isMobileMenuOpen ? '0' : '-250px') : '0',
        height: '100vh',
        zIndex: 50,
        transition: 'left 0.3s ease',
        boxShadow: isMobile && isMobileMenuOpen ? '2px 0 10px rgba(0,0,0,0.5)' : 'none'
      }}>
        <Sidebar 
          isSidebarOpen={isMobile ? true : props.isSidebarOpen} 
          user={props.user} 
          handleLogout={props.handleLogout} 
        />
      </div>

      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', width: '100%' }}>
        
        {/* HEADER DYNAMIQUE */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {isMobile && (
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '1.8em', padding: '15px 10px 15px 15px', cursor: 'pointer' }}
            >
              ☰
            </button>
          )}
          <div style={{ flex: 1 }}>
            <TopHeader 
              isSidebarOpen={props.isSidebarOpen} setIsSidebarOpen={props.setIsSidebarOpen}
              searchQuery={props.searchQuery} setSearchQuery={props.setSearchQuery}
              globalSector={props.globalSector} setGlobalSector={props.setGlobalSector}
              resultCount={props.resultCount}
              isDarkMode={props.isDarkMode} toggleTheme={props.toggleTheme}
            />
          </div>
        </div>
        
        {/* VIEW AREA : padding réduit sur mobile */}
        <div className="view-area" style={{ padding: isMobile ? '15px' : '30px', flex: 1 }}>
          {/* On passe "isMobile" en plus dans le context pour les autres pages */}
          <Outlet context={{ ...props, isMobile }} /> 
        </div>
      </div>
    </div>
  );
}