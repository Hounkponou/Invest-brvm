# 🚀 Invest Pro & BRVM-Quant

**Invest Pro** est une plateforme intégrée d'analyse financière et de gestion de portefeuille dédiée à la **Bourse Régionale des Valeurs Mobilières (BRVM)**. Elle couple un tableau de bord d'investissement moderne (mobile-first, thème Dark & Solar) avec un pipeline **MLOps** automatisé qui produit des signaux de probabilité de hausse à **15 jours** via un modèle **XGBoost** calibré.

---

## 📈 Écosystème

Le projet repose sur deux piliers, entièrement pilotés par les données Supabase :

1. **Invest Pro (Application web)** — gestion de portefeuille, screener, analyse fondamentale & technique, et visualisation des signaux prédictifs.
2. **BRVM-Quant (MLOps)** — collecte des données, ingénierie de variables adaptée à un marché illiquide, entraînement/calibration du modèle, inférence quotidienne et évaluation continue.

### Structure du dépôt

| Dossier | Rôle |
|---|---|
| `brvm-quant/` | Application web **React (Vite) + Tailwind CSS + Recharts** |
| `brvm-prediction/` | Pipeline **MLOps Python** (extraction → features → train → predict → evaluate) |
| `.github/workflows/` | **GitHub Actions** : scraping, inférence, challenge, réentraînement |
| `REBUS/` | Fichiers archivés / mis de côté (code mort, sauvegardes) |

---

## 🌟 Fonctionnalités principales

### Plateforme de gestion (Invest Pro)
* **Portfolio Cloud** — suivi temps réel du Coût Moyen Pondéré (CMP) et des plus/moins-values latentes.
* **Screener Pro** — filtrage par valorisation (PER), momentum (RSI) et fourchette de prix.
* **Backtest Lab** — simulation de stratégies (Value / Momentum / Rente) avec preuve de concept sur 3 ans.
* **Signaux de trading ATR** — points d'entrée, objectif et stop-loss dynamiques basés sur la volatilité.

### Moteur prédictif (Signaux IA)
* **Scoring sur 10** — probabilité calibrée de hausse à 15 jours, vulgarisée en jauge et badges.
* **Force du signal** — « Achat Fort » (≥ 70 %) / « Achat Modéré » (≥ 55 %).
* **Challenge (backtest)** — confronte en continu les prédictions arrivées à terme à la réalité du marché (taux de réussite cumulé, écart moyen, résultats mensuels).

### Expérience & cohérence UI
* **Thème Dark & Solar** — une **source de vérité unique** (`styles/theme.css`, attribut `data-theme`, hook `useTheme`) pilote toute l'application via des variables CSS ; basculement instantané, sans re-render.
* **Composants de filtres réutilisables** (`components/filters/`) — `FilterSelect`, `FilterInput`, `FilterChips`, `FilterPanel` : même apparence des filtres sur toutes les pages.
* **Mobile-first & responsive** — grilles adaptatives, sidebar repliable.

---

## 🛠️ Stack technique

* **Frontend** — React.js (Vite), Tailwind CSS v4 (tokens `@theme`), Recharts, React Router, `@supabase/supabase-js`.
* **Backend & Données** — Supabase (PostgreSQL) : vue `full_stock_pro`, tables `log_predictions` et `user_portfolios`.
* **MLOps** — Python : XGBoost, scikit-learn, pandas, `supabase-py`. Orchestration via GitHub Actions (cron).
* **Déploiement** — Vercel (frontend) + GitHub Actions (jobs planifiés).

---

## 🧠 Pipeline MLOps (`brvm-prediction`)

Orchestrateur unique avec un moteur commutable :

```bash
python main.py --task {train,predict,evaluate} [--engine {enhanced,legacy}]
# --engine enhanced (défaut) : chaîne robuste. --engine legacy : ancienne chaîne (repli).
```

### Ingénierie de variables adaptée à la BRVM (marché illiquide)
* **Liquidité** — ratio d'**Amihud**, **zero-return ratio** (Lesmond), part de jours sans transaction, turnover relatif.
* **Momentum multi-horizons** — rendements 5/10/21/63 j, volatilité réalisée, distance aux extrêmes 52 semaines.
* **Coupe transversale** — rangs normalisés du jour (comparer les titres entre eux), essentiel sur un univers étroit (~47 titres).
* **Contexte de marché** — largeur de marché, force relative au marché et au secteur.

### Robustesse & rigueur statistique
* **Validation croisée purgée + embargo** (`PurgedKFold`) — purge exprimée en **séances** (données de panel), supprime la fuite due aux labels chevauchants à 15 jours.
* **Calibration isotone out-of-fold** — un score de 0,70 signifie vraiment ~70 % ; calibrateur cohérent avec le modèle déployé.
* **Anti-fuite « look-ahead »** — winsorisation calée sur le train uniquement.
* **Imputation sans fuite** — médiane en coupe transversale puis médiane du train, pour récupérer les lignes autrefois perdues (titres à historique court).
* **Extraction anti-timeout** — téléchargement **titre par titre** paginé, avec retries/backoff (évite le `statement_timeout` Supabase sur la vue).
* **Upsert idempotent** — écriture par lots, retries, échec rapide sur erreurs de schéma, et **repli gracieux** si les colonnes optionnelles sont absentes.
* **Artefacts ancrés au projet** — modèle, calibrateur et ordre des features toujours lus/écrits dans `brvm-prediction/models/`, quel que soit le répertoire de lancement.

### Nouvelle société cotée ?
Prise en compte **automatique** de bout en bout (extraction dynamique de l'univers, features par titre, prédiction, écriture). Seul geste manuel : ajouter le sigle → secteur dans `brvm-quant/src/utils/brvmConfig.js`.

---

## ⚙️ Automatisation (GitHub Actions)

| Workflow | Planification (UTC) | Rôle |
|---|---|---|
| `scraper.yml` | quotidien | Scraping des cours BRVM → `full_stock_pro` |
| `daily_predict.yml` | 18:00, lun–ven | Inférence calibrée → `log_predictions` |
| `daily_evaluate.yml` | 18:30, lun–ven | Challenge : confronte les prédictions échues à la réalité |
| `monthly_train.yml` | 02:00 le 1er du mois | Réentraînement + commit des artefacts modèle |

---

## 🚀 Installation & déploiement

### 1. Variables d'environnement
Créer un `.env` (local) **et** configurer les **GitHub Secrets** (cloud) :
```
SUPABASE_URL=...
SUPABASE_KEY=...   # clé service_role pour le pipeline
```

### 2. Base de données (une seule fois)
La table `log_predictions` doit posséder la contrainte d'unicité `(date_prediction, symbole)`. Colonnes optionnelles enrichies (le pipeline s'en passe grâce au repli gracieux, mais elles sont recommandées) :
```sql
alter table public.log_predictions
  add column if not exists score_sur_10   integer,
  add column if not exists horizon_jours  integer,
  add column if not exists modele_version text;
```

### 3. Pipeline MLOps
```bash
cd brvm-prediction
pip install -r requirements.txt
python main.py --task train      # entraîne + calibre le modèle
python main.py --task predict    # génère les signaux du jour
python main.py --task evaluate   # met à jour le Challenge
```

### 4. Application web
```bash
cd brvm-quant
npm install
npm run dev      # développement
npm run build    # build de production (Vercel)
```

---

## 🗺️ Roadmap

- [x] Pipeline MLOps & automatisation cloud (GitHub Actions).
- [x] Moteur prédictif enhanced (features BRVM, CV purgée, calibration).
- [x] Module prédictif UI + thème Dark/Solar unifié + filtres réutilisables.
- [ ] Secteur dynamique (lu depuis la base plutôt que codé en dur).
- [ ] Alertes intelligentes par e-mail.
- [ ] Exportation de rapports de performance en PDF.
- [ ] Intégration de l'analyse macroéconomique.

---
*Développé pour une analyse intelligente et rigoureuse de la BRVM.*
