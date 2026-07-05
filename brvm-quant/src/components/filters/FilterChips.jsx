import React from 'react';

/**
 * FilterChips — groupe de puces (toggles rapides) à sélection unique.
 * -------------------------------------------------------------------
 * Remplace les boutons-pilules réécrits à la main (Predictions, etc.)
 * par un composant unique → apparence et thème cohérents.
 *
 * Props :
 *   - options  : tableau [{ key, label }] ;
 *   - value    : clé active ;
 *   - onChange : reçoit la clé cliquée ;
 *   - className: classes additionnelles sur le conteneur.
 */
export default function FilterChips({ options = [], value, onChange, className = '' }) {
  return (
    <div className={`filter-chips ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={`filter-chip${value === opt.key ? ' active' : ''}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
