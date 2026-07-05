import React from 'react';

/**
 * FilterPanel — conteneur en grille responsive pour regrouper des filtres.
 * ------------------------------------------------------------------------
 * Fournit le cadre visuel commun (fond panel, bordure, grille auto-fit).
 * Utilisé par le Screener ; réutilisable partout où plusieurs filtres
 * doivent être présentés ensemble.
 */
export default function FilterPanel({ children, className = '', style }) {
  return (
    <div className={`filter-panel ${className}`} style={style}>
      {children}
    </div>
  );
}
