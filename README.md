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

# Projet Invest Pro 🚀

**Invest Pro** est une application web de pointe dédiée à l'analyse financière et à la gestion de portefeuille sur la **BRVM** (Bourse Régionale des Valeurs Mobilières).

Conçue pour les investisseurs exigeants, notre plateforme combine l'analyse fondamentale et technique pour transformer les données brutes du marché en décisions d'investissement éclairées.

## 🌟 Fonctionnalités principales

* **Analyse de Marché & Scoring IA :** Accédez à des insights en temps réel. Chaque action est évaluée par un algorithme propriétaire fournissant une note globale sur 10, basée sur des indicateurs fondamentaux et techniques.
* **Backtest Lab :** Testez vos stratégies d'investissement sur 3 ans de données historiques. Vérifiez la rentabilité de vos idées (Plus-values + Dividendes) avant de passer à l'action.
* **Portfolio Cloud :** Gérez vos actifs en toute sécurité. Suivez votre **Coût Moyen Pondéré (CMP)**, calculez vos performances latentes et recevez des recommandations automatiques (🔥 Renforcer, ✅ Conserver, 🚨 Vendre) basées sur notre scoring IA.
* **Gestion de Positions Précise :** Ajoutez ou vendez vos positions de manière flexible. Notre système utilise une logique FIFO (First In, First Out) pour une gestion comptable rigoureuse.
* **Screener Pro :** Filtrez les opportunités selon vos critères de valorisation (Sous-évaluées/Surévaluées) et vos indicateurs de momentum (RSI).

## 🛠️ Stack Technique

* **Frontend :** React.js avec Vite.
* **Backend & Base de données :** Supabase (PostgreSQL & Authentification).
* **Visualisation :** Recharts.
* **Déploiement :** Vercel

## 🚀 Prochaines étapes

* [ ] Intégration d'alertes personnalisées par e-mail.
* [ ] Ajout de nouveaux marchés financiers.
* [ ] Exportation de rapports de performance en PDF.
* [ ] Analyse prévisionnelle des actions

---
*Développé pour une analyse intelligente de la BRVM.*