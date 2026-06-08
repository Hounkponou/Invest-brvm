export const getValColor = (status) => { 
  if (!status) return 'var(--text-muted)'; 
  if (status.includes('Forte Sous')) return 'var(--up-color)'; 
  if (status.includes('Sous-éval')) return '#48bb78'; 
  if (status.includes('Juste')) return 'var(--warn-color)'; 
  if (status.includes('Suréval')) return 'var(--down-color)'; 
  return 'var(--text-muted)'; 
};

export const getRsiColor = (status) => { 
  if (!status) return 'var(--text-muted)'; 
  if (status.includes('Survendu')) return 'var(--up-color)'; 
  if (status.includes('Suracheté')) return 'var(--down-color)'; 
  return 'var(--text-muted)'; 
};