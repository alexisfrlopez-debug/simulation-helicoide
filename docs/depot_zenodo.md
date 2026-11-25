# Dépôt sur Zenodo — métadonnées et mode opératoire

> Note : l'API `zenodo.org` n'était pas joignable depuis l'environnement de
> préparation de ce dépôt (blocage 403 du pare-feu sur l'adresse IP de la
> sandbox). Les métadonnées ci-dessous sont prêtes à coller ; deux voies sont
> possibles, la seconde étant recommandée (DOI automatique à chaque release).

## Voie recommandée : intégration GitHub → Zenodo

1. Sur zenodo.org : s'identifier (ORCID recommandé) ; ouvrir le menu
   **Account → Settings → GitHub**, activer le dépôt
   `alexisfrlopez-debug/simulation-helicoide`.
2. Sur GitHub : créer une **release** (par ex. `v0.1-article`) et y joindre,
   en pièces jointes de la release, `article/prepublication.pdf` et
   `simulation-helicoide.zip`.
3. Zenodo archive automatiquement la release et génère un **DOI** ;
   renseigner ensuite ce DOI dans l'article (annexe A, à la place du passage
   « cite le DOI du dépôt de code lorsque celui-ci est archivé »).

## Voie directe : dépôt manuel

Sur zenodo.org → **New upload** :

- *Upload type* : Publication ; *Publication type* : Article (prépublication).
- Fichiers : `article/prepublication.pdf` + `simulation-helicoide.zip`
  (code + données + sources LaTeX).
- *License* : **CC-BY 4.0** pour les fichiers de l'article ; le code reste
  MIT dans l'archive.
- *Communities* (facultatif) : « Pierre Auger… » non — plutôt aucune, ou
  proposer « Open Science ».
- Version : 0.1 (prépublication) ; Date : 25 novembre 2025.

## Métadonnées prêtes à coller

**Titre** :
Mouvement hélicoïdal des corpuscules et figure d'interférence de Young : simulation stochastique, lien avec le spin et piste de décalage vers le rouge

**Résumé (description)** :
Chaque corpuscule suit une hélice de rayon r autour d'un axe balistique et porte une phase interne φ = 2π·s/λ. La probabilité de détection est modulée par le facteur d'interférence G(x) = |Σᵢ e^{2iπΦ(Lᵢ(x))}|²/N² construit sur les N chemins virtuels des fentes. Un simulateur interactif 3D open source (fichier HTML autonome, Windows/Linux/macOS) reproduit l'accumulation des franges corpuscule après corpuscule, sans interaction inter-corpuscules. Validations quantitatives sur runs batch : écart de frange mesuré 30,15 mm contre 30,0 mm théorique ; fraction détectée 50,21 % contre 1/N = 50 % ; modulation M = 0,994 (hélicoïdal) contre 0,004 (balistique pur) ; mono-fente : enveloppe seule ; photon absorbé au mur contre massif dévié ; collisions : dégradation systématique (M : 0,994 → 0,981) ; évolution d'amplitude ε : franges étirées comme un décalage vers le rouge sans perte d'énergie (37,4 contre 37,2 mm à z_eff = 0,24). Discussion : identification hélice ↔ zitterbewegung (spin, Hestenes 1990) et piste de décalage vers le rouge distincte de la lumière fatiguée, avec ses tests observationnels (Tolman, dilatation temporelle des SNe Ia). Modèle phénoménologique, entièrement reproductible (Node.js + Python).

**Mots-clés** :
fentes de Young ; trajectoire hélicoïdale ; dualité onde-corpuscule ; zitterbewegung ; spin ; décalage vers le rouge ; simulation stochastique ; onde-pilote

**Auteurs** : [Nom à compléter — affiliation à compléter]

**Identifiants apparentés** : code source sur GitHub :
https://github.com/alexisfrlopez-debug/simulation-helicoide

## Voie API (depuis une machine autorisée)

```bash
# 1. créer un dépôt (metadata minimales) — token dans $ZENODO
curl -H "Authorization: Bearer $ZENODO" \
     -H "Content-Type: application/json" \
     -X POST https://zenodo.org/api/deposits \
     -d @docs/zenodo_metadata.json
# 2. téléverser les fichiers (depuis l'URL bucket retournée)
# 3. publier : POST /api/deposits/<id>/actions/publish
```

Le fichier `docs/zenodo_metadata.json` contient les métadonnées au format
API. **Ne jamais commiter le jeton Zenodo.**

## Après publication

- Recopier le DOI dans `article/article.tex` (annexe A) et recompiler ;
- mettre à jour le README (badge DOI) ;
- taguer la release correspondante (`git tag v0.1-article`).
