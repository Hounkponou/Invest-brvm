# Invest Pro & BRVM-Quant — Audit du moteur prédictif & feuille de route

> Note technique rédigée pour accompagner la refonte du volet Data Science.
> Cible : améliorer la fiabilité des signaux à 15 jours sur un marché **peu liquide**
> (la BRVM), sans casser le pipeline existant.

---

## 1. Ce qui fonctionne déjà bien

Le pipeline actuel (`brvm-prediction/`) est propre et bien découpé :

- séparation claire `extraction → features → train → predict → evaluate` ;
- orchestration par `main.py --task {train,predict,evaluate}` ;
- automatisation CI/CD via GitHub Actions (train mensuel, predict quotidien, evaluate quotidien) ;
- boucle d'auto-évaluation (`evaluate.py`) qui compare la prédiction à la réalité 15 jours après — **excellente pratique**, c'est la base d'un vrai backtest « en avant » (walk-forward) et d'un suivi de dérive.

Rien de tout cela n'est jeté. Les améliorations ci-dessous se greffent dessus.

---

## 2. Faiblesses identifiées (par ordre d'impact)

### 2.1 🔴 Fuite de données par chevauchement des labels (critique)

C'est le point le plus important. La cible est construite sur un horizon glissant de 15 jours :

```python
df['future_close'] = df.groupby('symbole')['close'].shift(-HORIZON_JOURS)
df['target'] = ((future - close) / close >= 0.035)
```

Deux observations consécutives partagent donc **14 jours de futur commun**. Or `TimeSeriesSplit`
découpe naïvement : la dernière ligne du *train fold* et la première du *test fold* se recouvrent
temporellement. Le modèle « voit » indirectement le futur du test → le **ROC-AUC de validation est
optimiste** et ne se retrouve pas en production.

**Correctif** : validation croisée **purgée avec embargo** (Purged K-Fold, López de Prado).
On retire du train toute observation dont la fenêtre de label recouvre le test, plus une marge
d'« embargo » de 15 jours. Voir `core/validation.py`.

### 2.2 🟠 Probabilités non calibrées → seuils de signal fragiles

`predict.py` seuille directement `predict_proba` :

```python
np.where(proba >= 0.70, "Achat Fort", np.where(proba >= 0.55, "Achat Modéré", "Conserver"))
```

Avec `scale_pos_weight` (3 à 7) pour gérer le déséquilibre de classes, XGBoost produit des scores
**décalés** : un « 0.70 » ne veut pas dire « 70 % de chances ». Les seuils métier, et surtout le
futur *score sur 10* affiché dans l'UI, reposent donc sur une échelle non fiable.

**Correctif** : calibration **isotonique** (`CalibratedClassifierCV`) sur un pli de validation
temporel dédié. Après calibration, `proba = 0.70` signifie réellement ~70 %. Voir `core/train_enhanced.py`.

### 2.3 🟠 Jeu de features trop « momentum », aveugle à la liquidité

Les features actuelles (`dist_sma20/50`, `ratio_volume`, `per`, `rsi_14`, lags de close/rsi)
décrivent bien la tendance mais **ignorent la microstructure d'un marché illiquide**. Sur la BRVM,
beaucoup de titres ne cotent pas tous les jours, les volumes sont sporadiques et un seul gros ordre
fait bouger le prix. Un modèle qui ignore ça sur-réagit au bruit. Section 3 ci-dessous.

### 2.4 🟡 Robustesse & idempotence de l'écriture Supabase

`predict.py` fait l'upsert en une seule requête, sans retry ni validation. Un timeout réseau dans
GitHub Actions = journée de prédictions perdue. À isoler dans un script robuste (batch + backoff +
validation de schéma). Voir `scripts/upsert_predictions.py`.

### 2.5 🟡 Petits points d'hygiène

- `RandomizedSearchCV(scoring='roc_auc')` sur données déséquilibrées : préférer **PR-AUC**
  (`average_precision`), plus informatif quand la classe positive est rare.
- Pas de winsorisation : un PER aberrant (valeurs négatives, > 999) ou un ratio de volume extrême
  tire les splits. À borner.
- `requirements.txt` contient des doublons (`pandas`, `requests` listés deux fois) et des libs
  inutiles au pipeline (`dash`, `plotly`, `SQLAlchemy`). À nettoyer pour accélérer le CI.
- Aucune persistance des **noms de colonnes / ordre des features** avec le modèle : si la vue
  `full_stock_pro` change d'ordre, l'inférence casse silencieusement. Sauvegarder la liste de
  features à côté du modèle.

---

## 3. Feature engineering pour un marché illiquide (BRVM)

L'idée directrice : **mesurer explicitement la liquidité et le caractère « frais » du prix**, et
**raisonner en coupe transversale** (comparer les titres entre eux le même jour) plutôt qu'en
absolu. Toutes ces features sont implémentées dans `core/features_enhanced.py`.

### 3.1 Illiquidité & fraîcheur du prix

| Feature | Intuition métier | Formule (résumé) |
|---|---|---|
| **Ratio d'Amihud** | Impact prix par unité de volume : élevé = illiquide | moyenne mobile de `|rendement| / volume_FCFA` |
| **Zero-return ratio** (Lesmond) | Part de jours sans variation = titre qui dort | fraction de jours où `close` inchangé sur 21 j |
| **Jours depuis dernière cotation** | Détecte les titres « en sommeil » | compteur de séances sans volume |
| **Turnover** | Volume rapporté à une taille de référence | `volume / moyenne(volume, 60j)` |
| **Amplitude Corwin-Schultz** (si high/low dispo) | Proxy de spread bid-ask à partir des extrêmes | estimateur high-low sur 2 jours |

Ces variables permettent au modèle d'**escompter les signaux issus de titres illiquides** (où un
mouvement de prix est peu fiable) et de valoriser ceux issus de titres qui s'échangent vraiment.

### 3.2 Momentum & retour à la moyenne multi-horizons

- rendements passés à 5 / 10 / 21 / 63 jours (semaine, quinzaine, mois, trimestre) ;
- volatilité réalisée (écart-type des rendements) à 21 et 63 jours ;
- distance au plus-haut / plus-bas 52 semaines (les titres BRVM ont une forte composante
  « range-bound ») ;
- `rsi_14` déjà présent, complété par sa pente (momentum du momentum).

### 3.3 Features **cross-sectionnelles** (clé sur marché étroit)

Chaque jour, on classe les ~46 titres entre eux et on utilise le **rang normalisé [0,1]** plutôt que
la valeur brute :

- rang de `score_ia`, du rendement 21 j, du PER, du dividende, de l'illiquidité ;
- ces rangs sont **stationnaires** (insensibles à l'inflation des prix, aux changements de régime de
  marché) et beaucoup plus robustes que les niveaux absolus sur un si petit univers.

### 3.4 Contexte de marché & secteur

- tendance de l'indice composite / BRVM30 (déjà scrappés dans `brvm-data-public-main/data/`) :
  le titre monte-t-il *avec* ou *contre* le marché ?
- **force relative sectorielle** : rendement du titre − rendement médian de son secteur
  (`utils/brvmConfig.js` côté front en donne déjà la cartographie).
- largeur de marché (breadth) : % de titres au-dessus de leur SMA20 — proxy de régime risk-on/off.

### 3.5 Amélioration du **label** (optionnel, fort ROI)

Le seuil fixe `+3.5 % en 15 j` ignore la volatilité propre de chaque titre. Piste : **triple-barrière**
(López de Prado) — barrière haute/basse proportionnelles à la volatilité du titre, plus une barrière
de temps à 15 j. On obtient un label « le titre a-t-il atteint son objectif *ajusté du risque* avant
de toucher son stop ». Plus cohérent avec les niveaux Entrée/Objectif/Stop déjà calculés dans l'UI.
Fourni en option commentée dans `core/labeling.py`.

---

## 4. Récapitulatif des livrables de code

| Fichier | Rôle |
|---|---|
| `core/features_enhanced.py` | Nouveau feature engineering (illiquidité, cross-section, marché) |
| `core/labeling.py` | Cible triple-barrière optionnelle + poids d'échantillon |
| `core/validation.py` | Purged K-Fold + embargo (anti-fuite) |
| `core/train_enhanced.py` | Recherche d'hyperparamètres sur CV purgée + calibration isotonique |
| `scripts/upsert_predictions.py` | Écriture Supabase robuste (batch, retry, validation, score/10) |

Chaque module est **rétro-compatible** : les fichiers d'origine ne sont pas modifiés, les nouveaux
sont préfixés `_enhanced` / isolés dans `scripts/`. On bascule en changeant les imports de `main.py`
une fois la nouvelle chaîne validée.

---

## 5. Pistes d'architecture au-delà du modèle

1. **Cache & coût API Supabase.** Le front recharge tout `full_stock_pro` à chaque montée.
   Exposer une vue matérialisée `latest_market` (dernière séance uniquement) + une vue
   `predictions_live` (dernière `date_prediction`) réduit fortement le volume transféré.
2. **Feature store léger.** Écrire les features calculées dans une table Supabase plutôt que de les
   recalculer à chaque tâche → cohérence train/predict garantie (même code, même valeurs).
3. **Suivi de dérive.** La table `log_predictions` contient déjà `statut_reussite` : un job
   hebdomadaire qui calcule le taux de réussite glissant alimente à la fois l'alerte de
   ré-entraînement et le panneau *Backtest* du front.
4. **Explicabilité.** Stocker les 3 features SHAP dominantes par prédiction → l'UI peut afficher
   « pourquoi ce signal » (confiance de l'investisseur).
5. **Realtime.** Supabase Realtime sur `log_predictions` pour pousser les nouveaux signaux au front
   sans polling.

---

*Prochaines étapes livrées avec cette note : le code backend (features + validation + script
d'upsert) et le Module Prédictif React avec bascule Dark/Solar.*
