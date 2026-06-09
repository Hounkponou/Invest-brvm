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

  // Fermer le menu mobile automatiquement lors d'un changement de page
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--bg-base)', color: 'var(--text-main)', overflow: 'hidden' }}>
      
      {/* OVERLAY SOMBRE */}
      {isMobile && isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9998 }}
        />
      )}

      {/* SIDEBAR COULISSANTE */}
      <div style={{
        position: isMobile ? 'fixed' : 'relative',
        top: 0,
        left: 0,
        height: '100vh',
        width: '250px',
        zIndex: 9999,
        backgroundColor: 'var(--bg-panel)',
        transform: isMobile ? (isMobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        transition: 'transform 0.3s ease-in-out',
        boxShadow: isMobile && isMobileMenuOpen ? '5px 0 15px rgba(0,0,0,0.5)' : 'none'
      }}>
        <Sidebar 
          isSidebarOpen={true} 
          user={props.user} 
          handleLogout={props.handleLogout} 
        />
      </div>

      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', width: '100%' }}>
        
        {/* HEADER : On supprime le bouton d'ici, et on passe l'action au TopHeader */}
        <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--border-color)' }}>
          <TopHeader 
            isSidebarOpen={isMobile ? isMobileMenuOpen : props.isSidebarOpen} 
            setIsSidebarOpen={isMobile ? setIsMobileMenuOpen : props.setIsSidebarOpen}
            searchQuery={props.searchQuery} setSearchQuery={props.setSearchQuery}
            globalSector={props.globalSector} setGlobalSector={props.setGlobalSector}
            resultCount={props.resultCount}
            isDarkMode={props.isDarkMode} toggleTheme={props.toggleTheme}
          />
        </div>
        
        <div className="view-area" style={{ padding: isMobile ? '15px' : '30px', flex: 1 }}>
          <Outlet context={{ ...props, isMobile }} /> 
        </div>
      </div>
    </div>
  );
}