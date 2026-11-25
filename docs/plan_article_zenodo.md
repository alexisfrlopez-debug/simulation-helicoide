# Plan de l'article Zenodo

## Titre proposé

- **FR** : « Mouvement hélicoïdal des corpuscules et figure d'interférence
  de Young : simulation stochastique, lien avec le spin et piste de
  décalage vers le rouge »
- **EN** : « Helical corpuscular motion and Young's interference pattern:
  a stochastic simulation, the spin connection, and a redshift lead »

## Résumé (150 mots, à affiner)

Nous présentons un modèle phénoménologique dans lequel chaque corpuscule
décrit une hélice de rayon r autour d'un axe balistique, portant une phase
interne φ = 2π·s/λ. La probabilité de détection à l'abscisse x est modulée
par le gâteau G(x) = |Σᵢ e^{iΦᵢ(x)}|²/N² construit sur les N chemins
virtuels des fentes. Un simulateur interactif 3D (fourni, open source)
reproduit l'accumulation des franges corpuscule après corpuscule — sans
aucune interaction inter-corpuscules —, la diffraction d'une fente
(N = 1), le comportement différent photon/massive aux arêtes, et un
paramètre d'évolution d'amplitude ε dont la phase cumulée Φ(L) =
(S₀/λε)·ln(1+εL/S₀) étire les franges comme un décalage vers le rouge. Nous
discutons : (1) l'identification hélice ↔ zitterbewegung/spin ; (2) les
tests observationnels que la variante « redshift d'amplitude » doit passer.

## Plan

1. **Introduction** — le fait cardinal : Taylor 1909 → Bach 2013
   (franges construites particule par particule) ; pourquoi cela exclut
   tout mécanisme par interaction inter-corpuscules.
2. **Le modèle** — reprendre `docs/modele_physique.md` §2-§6, avec la
   définition du gâteau G(x) comme hypothèse centrale, clairement posée.
3. **Résultats du simulateur**
   - franges : positions des maxima = λ·D/d ; visibilité V mesurée ;
   - N = 1 : enveloppe seule ; N = 3-5 : structure multi-fentes ;
   - mode balistique pur : pas de franges (référence) ;
   - collisions activées : dégradation de V (résultat négatif attendu,
     à présenter comme falsification) ;
   - photon vs massive : absorption aux arêtes vs halo de diffusion ;
   - ε ≠ 0 : étirement des franges, λ_effectif, z_effectif.
   Figures : captures du simulateur + courbes CSV exportées (les mêmes
   données que `data/profil_intensite_reference.csv` et
   `profil_intensite_redshift_exemple.csv`).
4. **Lien spin / zitterbewegung** — Hestenes 1990 ; identification du
   rayon d'hélice au rayon de zitterbewegung ħ/2mc ; ce que le simulateur
   montre (phase interne en statistique) et ce qu'il ne montre pas (Dirac).
5. **Piste redshift d'amplitude** — comparaison à Zwicky 1929 ; tests de
   Tolman, dilatation temporelle SNe Ia, absence de flou ; prédictions
   distinctives de la variante « phase glissante sans perte d'énergie » ;
   programme de tests.
6. **Limites** — reprendre `docs/modele_physique.md` §9 (gâteau posé,
   enveloppe injectée, échelle normalisée, diffusion paramétrique, pas de
   mémoire inter-corpuscules).
7. **Conclusions.**
   - Annexe reproductibilité : ce dépôt git, DOI du code, script de build.

## Dépôt sur Zenodo — mode opératoire

1. Créer un compte Zenodo (zenodo.org) — s'authentifier via ORCID.
2. **Recommandé** : héberger le code sur GitHub et activer l'intégration
   GitHub→Zenodo (menu Zenodo « GitHub ») : chaque release du dépôt reçoit
   un DOI automatique — l'article cite alors le DOI du code.
3. Déposer l'article : type « Article », licence CC-BY 4.0 ; joindre le
   PDF, les figures, et l'archive du simulateur (le zip de ce dépôt).
4. Métadonnées : mots-clés (double slit, helical motion, zitterbewegung,
   spin, redshift, pilot-wave, stochastic simulation), langue FR ou EN
   (l'anglais élargit l'audience), date, auteur(s) et affiliation(s).

## Licences du dépôt

- code du simulateur : **MIT** (fichier `LICENSE`) ;
- documentation et futur article : **CC BY 4.0** recommandée sur Zenodo.

## Chantiers restants (à faire avant soumission)

- [ ] collecter des statistiques longues (V vs ε, V vs rayon de collision)
      via l'export CSV du simulateur ;
- [ ] passer Inspire/Google Scholar (termes du §5 de `revue_litteraire.md`)
      pour vérifier l'absence de doublon ;
- [ ] rédiger §4-§5 avec les formules exactes du simulateur ;
- [ ] rédiger l'avertissement « modèle phénoménologique, pas une théorie
      physique établie » en tête de l'article.
