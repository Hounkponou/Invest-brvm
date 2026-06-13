# 📈 Projet ETL BRVM (Web Scraping & Automatisation Cloud)

Ce pipeline (Extract, Transform, Load) récupère les données de la Bourse Régionale des Valeurs Mobilières (BRVM), les nettoie, et les stocke dans Supabase en temps réel.

## 🚀 Architecture
- **Extraction** : Scraping HTTP via `requests` & `pandas`.
- **Transformation** : Nettoyage regex, gestion des types, formatage ISO.
- **Chargement** : Upsert PostgreSQL hébergé sur Supabase.
- **Automatisation** : Cron Jobs exécutés sur GitHub Actions.

## ⚙️ Déploiement
1. Configurer les variables `SUPABASE_URL` et `SUPABASE_KEY` (avec la clé `service_role`) dans `.env` (local) et dans GitHub Secrets (Cloud).
2. Pousser le code vers GitHub.
3. Le workflow `.github/workflows/scraper.yml` prendra automatiquement le relais.



# 🚀 Invest Pro & BRVM-Quant

**Invest Pro** est une plateforme intégrée d'analyse financière et de gestion de portefeuille sur la **BRVM**. Elle couple un tableau de bord d'investissement haute performance avec un moteur de prédiction quantitative alimenté par IA.

---

## 📈 Écosystème

Le projet se divise en deux piliers :
1. **Invest Pro (Frontend/Backend) :** Gestion de portefeuille, Screener, et Analyse Fondamentale.
2. **BRVM-Quant (MLOps) :** Pipeline de données automatisé (Scraping/Transformation) et modèle d'apprentissage automatique (XGBoost) fournissant des signaux prédictifs à 15 jours.



---

## 🌟 Fonctionnalités principales

### Plateforme de Gestion
* **Portfolio Cloud :** Suivi en temps réel du Coût Moyen Pondéré (CMP) et performances latentes.
* **Screener Pro :** Filtrage avancé par valorisation (PER) et momentum (RSI).
* **Gestion FIFO :** Logique comptable rigoureuse pour vos positions.

### Moteur Prédictif 
* **Scoring :** Chaque action est notée sur 10 par un modèle XGBoost entraîné sur 10 ans d'historique.
* **Signaux Quantitatifs :** Prédictions de probabilité de hausse à 15 jours, avec gestion automatisée des signaux (Achat Fort / Achat Modéré).
* **Validation Continue :** Système de "Challenge" comparant en temps réel les prédictions passées à la réalité du marché pour ajuster la précision du modèle.

---

## 🛠️ Stack Technique

* **Frontend :** React.js (Vite), Tailwind CSS, Recharts.
* **Backend & Données :** Supabase (PostgreSQL), API REST.
* **Pipeline (MLOps) :** Python (XGBoost, Scikit-Learn), GitHub Actions (Robotisation), Cron Jobs.
* **Déploiement :** Vercel.

---

## ⚙️ Automatisation & MLOps

Le projet tourne en autonomie totale grâce à nos robots GitHub :
- **Extraction Quotidienne :** Scraping automatique des données de la BRVM.
- **Inférence :** Calcul nocturne des signaux de trading.
- **Challenge :** Vérification quotidienne de la performance des signaux émis.
- **Réentraînement Mensuel :** Mise à jour automatisée du modèle pour suivre les régimes de marché.



---

## 🚀 Roadmap

- [x] Pipeline MLOps & Automatisation Cloud.
- [ ] Alertes intelligentes par e-mail.
- [ ] Exportation de rapports de performance en PDF.
- [ ] Intégration de l'analyse macroéconomique.

---
*Développé pour une analyse intelligente et rigoureuse de la BRVM.*