import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';

// On utilise (props) pour tout attraper d'un coup
export default function Layout(props) {
  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--bg-base)', color: 'var(--text-main)', overflow: 'hidden' }}>
      
      <Sidebar 
        isSidebarOpen={props.isSidebarOpen} 
        user={props.user} 
        handleLogout={props.handleLogout} 
      />

      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <TopHeader 
          isSidebarOpen={props.isSidebarOpen} setIsSidebarOpen={props.setIsSidebarOpen}
          searchQuery={props.searchQuery} setSearchQuery={props.setSearchQuery}
          globalSector={props.globalSector} setGlobalSector={props.setGlobalSector}
          resultCount={props.resultCount}
          isDarkMode={props.isDarkMode} toggleTheme={props.toggleTheme}
        />
        
        <div className="view-area" style={{ padding: '30px', flex: 1 }}>
          {/* MAGIE : On transfère toutes les props reçues aux pages (Dashboard, Screener, etc.) */}
          <Outlet context={props} /> 
        </div>
      </div>
    </div>
  );
}