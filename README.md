# simulation-helicoide — double fente de Young à corpuscules hélicoïdaux

Simulation interactive 3D de l'expérience des fentes de Young dans laquelle
chaque **corpuscule** suit une **trajectoire hélicoïdale** portant une
**phase interne** φ = 2π·s/λ. La figure d'interférence émerge
**statistiquement, particule après particule**, sans interaction entre
corpuscules.

Objectif : banc d'essai quantitatif pour deux pistes de recherche :
1. le lien **hélice ↔ spin** (zitterbewegung) ;
2. un **décalage vers le rouge** produit par l'évolution de l'amplitude
   interne avec la distance (paramètre ε), distinct de la lumière fatiguée.

## Utilisation

Ouvrir `simulation_fentes_de_Young.html` (double-clic) dans un navigateur
récent — **Windows, Linux, macOS** — sans installation ni connexion
(bibliothèque Three.js r128 embarquée). Contrôles souris : molette = zoom,
glisser = orbite, clic droit = translation.

## Paramètres (tous réglables en direct)

| Groupe | Paramètres |
|---|---|
| Mode | hélicoïdal (interférences) / **balistique pur** (référence) |
| Particule | photon (absorbé aux arêtes) / massive (déviée aux arêtes) ; sens du spin |
| Source | débit, vitesse, ralenti, largeur du faisceau |
| Fentes | nombre (1-5), largeur a, écart d, hauteur, distance écran D |
| Hélice | λ physique, rayon r, pas et échelle visuels (rendu) |
| Diffraction | loi sinc² / gaussienne / nulle |
| Interactions | **collisions inter-corpuscules** (falsification) + rayon |
| Redshift | ε (évolution d'amplitude), λ effectif, z effectif |
| Mesures | export CSV, visibilité V, écart de frange théorique, compteurs |

## Contenu du dépôt

```
simulation_fentes_de_Young.html   simulation autonome (livrable principal)
src/gabarit.html                  squelette HTML/CSS (panneau de commandes)
src/noyau.js                      physique : hélice, phase, gâteau G(x), collisions
src/rendu.js                      scène 3D, écran-texture, traînées, éclats
src/interface.js                  commandes, profil d'intensité, export CSV
librairies/three.min.js           Three.js r128 (MIT)
librairies/OrbitControls.js       contrôles caméra (MIT)
outils/construire_standalone.py   reconstruit le HTML autonome
outils/genere_profil_reference.py génère les CSV de référence
data/profil_intensite_reference.csv          courbe théorique (ε = 0)
data/profil_intensite_redshift_exemple.csv   courbe théorique (ε = +0,3)
docs/modele_physique.md           le modèle, ses hypothèses et ses limites
docs/revue_litteraire.md          travaux antérieurs (Taylor→Bach, de Broglie,
                                  Couder, Hestenes, Zwicky) avec références
docs/plan_article_zenodo.md       plan de l'article + mode opératoire Zenodo
```

Reconstruire le HTML autonome après modification des sources :

```bash
python3 outils/construire_standalone.py
```

## Avertissement scientifique

Le simulateur implémente un **modèle phénoménologique de recherche** : le
gâteau de détection G(x) est une hypothèse posée, non dérivée (voir
`docs/modele_physique.md`, §9). Il ne s'agit pas d'une théorie physique
établie, mais d'un outil pour explorer, mesurer et falsifier — y compris
le rôle (nul) des collisions inter-corpuscules dans les franges.

## Licences

- Code : MIT (voir `LICENSE`).
- Documentation : CC BY 4.0.
- Three.js r128 : MIT (© three.js authors), embarquée intacte.

## Auteur du dépôt git

L'auteur des commits est provisoirement « Simulation Hélicoïdale
<simulation-helicoide@example.org> » — à personnaliser :
```bash
git config user.name "Votre nom"
git config user.email "vous@exemple.fr"
git commit --amend --reset-author --no-edit   # si un seul commit à corriger
```
ou réécrire l'historique complet avec `git filter-branch` / `git rebase`.
