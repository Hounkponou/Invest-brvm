import React from 'react';

/**
 * EmptyState — bloc « aucune donnée » sobre et cohérent (icône + titre + texte
 * + action facultative). Remplace les zones vides brutes.
 */
export default function EmptyState({ icon, title, message, action }) {
  return (
    <div className="empty-state">
      {icon && <div className="es-icon">{icon}</div>}
      {title && <h3>{title}</h3>}
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}
