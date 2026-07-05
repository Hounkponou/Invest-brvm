# rebus/ — fichiers mis de côté

Fichiers déplacés hors du code actif (build vérifié OK après retrait).
La structure miroir permet de restaurer un fichier à son emplacement d'origine.

## Déplacés le 2026-07-05 (nettoyage code mort)

| Fichier (emplacement d'origine) | Raison |
|---|---|
| `brvm-quant/src/App__.jsx` | Ancienne sauvegarde de App.jsx, jamais importée |
| `brvm-quant/src/App.css` | Feuille de style jamais importée (thème géré par `styles/theme.css`) |
| `brvm-quant/src/components/prediction/ThemeToggle.jsx` | Orphelin depuis l'intégration de la page Predictions dans le Layout (le thème est désormais géré par le TopHeader global) |
| `brvm-quant/src/assets/react.svg` | Asset par défaut de Vite, non référencé |
| `brvm-quant/src/assets/vite.svg` | Asset par défaut de Vite, non référencé |

Également : suppression des fichiers `.DS_Store` (déchet macOS, régénéré automatiquement).

## Restauration
```bash
# Exemple : remettre App.css à sa place
mv rebus/brvm-quant/src/App.css brvm-quant/src/App.css
```
