import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';

export default function Layout(props) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fermer le menu mobile quand on change de page
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--bg-base)', color: 'var(--text-main)', overflow: 'hidden' }}>
      
      {/* OVERLAY SOMBRE : Z-index massif (9998) pour tout recouvrir */}
      {isMobile && isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9998 }}
        />
      )}

      {/* SIDEBAR : transform: translateX est la méthode la plus robuste pour faire glisser un menu */}
      <div style={{
        position: isMobile ? 'fixed' : 'relative',
        top: 0,
        left: 0,
        height: '100vh',
        width: '250px',
        zIndex: 9999, // Au-dessus de l'overlay
        backgroundColor: 'var(--bg-panel)',
        transform: isMobile ? (isMobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        transition: 'transform 0.3s ease-in-out',
        boxShadow: isMobile && isMobileMenuOpen ? '5px 0 15px rgba(0,0,0,0.5)' : 'none'
      }}>
        <Sidebar 
          isSidebarOpen={true} // On force à true car le conteneur parent gère la visibilité
          user={props.user} 
          handleLogout={props.handleLogout} 
        />
      </div>

      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', width: '100%' }}>
        
        {/* HEADER DYNAMIQUE */}
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--border-color)' }}>
          {isMobile && (
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '2em', padding: '10px 15px', cursor: 'pointer', zIndex: 10 }}
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
        
        <div className="view-area" style={{ padding: isMobile ? '15px' : '30px', flex: 1 }}>
          <Outlet context={{ ...props, isMobile }} /> 
        </div>
      </div>
    </div>
  );
}