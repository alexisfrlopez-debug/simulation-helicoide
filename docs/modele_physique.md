# Modèle physique du simulateur

**Objet** : ce document décrit précisément le modèle implémenté par
`simulation_fentes_de_Young.html`, en marquant ce qui est fait exprès, ce qui
est phénoménologique (hypothèse à tester) et ce qui est purement pédagogique.
Il est destiné à devenir l'annexe « méthodes » de l'article Zenodo.

## 1. Unités et échelle

Le simulateur travaille en millimètres avec une échelle **normalisée** : les
grandeurs (λ ≈ 0,15 mm, fentes millimétriques, écran à ~800 mm) reproduisent
les *rapports* de la vraie expérience (en particulier λ/d, qui fixe l'écart
des franges Δx = λ·D/d) tout en grossissant tout d'un facteur ≈ 1000 par
rapport à la lumière visible, afin que l'hélice individuelle d'un corpuscule
soit observable. Le pas et le rayon *visuels* de l'hélice sont des paramètres
de rendu ; la traversée du mur et les positions d'impact utilisent le rayon
physique r (réglable séparément).

## 2. Corpuscule : axe balistique + hélice + phase interne

Chaque corpuscule est émis du canon avec :
- un **axe balistique** (position latérale initiale aléatoire dans le
  faisceau, direction +z) ;
- une **hélice** de rayon r autour de cet axe : position réelle =
  (x_axe + r·cos φ, y_axe + r·sin φ, z) ;
- une **phase interne** φ qui avance comme 2π·s/λ, où s est le chemin
  parcouru le long de l'axe (horloge interne du corpuscule).

Le mode **balistique pur** supprime la phase (et son rôle de détection) :
c'est la référence classique — deux taches de diffraction sans franges.

## 3. Interaction avec le mur (comportement photon / massif)

Au franchissement du mur, la position testée est le point *réel* de l'hélice
(axes + offset hélicoïdal) :
- **Photon** : s'il frappe la paroi, il est **absorbé** (compteur
  « absorbées », éclat rouge sur le mur) — conformément au fait qu'un photon
  n'est pas dévié par le bord d'une fente mais capturé par le matériau ;
- **Particule massive** : le contact d'une arête produit une **diffusion
  élastique** (nouvelle direction aléatoire autour de la direction incidente) ;
  le corpuscule continue et peut atterrir n'importe où (halo diffus autour
  des taches) — les particules massives *sont* déviées par les bords.

## 4. Diffraction post-fente (enveloppe)

Au passage d'une fente, l'axe reçoit un écart angulaire aléatoire tiré d'une
loi au choix :
- `sinc²` (défaut) : la loi de Fraunhofer sinc²(π·a·θ/λ) — l'enveloppe de
  diffraction à une fente est alors reproduite *statistiquement* par les
  corpuscules ;
- `gaussienne` : σ libre ;
- `nulle` : ombre géométrique pure.

**Honnêteté du modèle** : cette loi injecte la diffraction d'une fente comme
une distribution de vitesses, ce qui est une correspondance construite
(« le corpuscule prend l'étalement que la théorie ondulatoire prédit ») ;
c'est un paramètre, pas une dérivation. C'est l'une des limites à afficher
clairement dans l'article.

## 5. Gâteau de détection (hypothèse centrale)

À l'arrivée sur l'écran, à l'abscisse x, la probabilité de détection du
corpuscule est modulée par

    G(x) = | Σᵢ exp(i·2π·Φ(Lᵢ(x))) |² / N²

où Lᵢ(x) = √(D² + (x−xᵢ)²) est le chemin virtuel fenteᵢ → point d'impact,
et Φ est la phase cumulée (voir §6). Pour N = 2, G = cos²(ΔΦ/2) : les franges
de Young. Pour N = 1, G = 1 (pas de franges — seule l'enveloppe de
diffraction) : le simulateur reproduit automatiquement ce fait.

L'histogramme mesuré = (densité d'axes sur l'écran) × G(x) : les franges
émergent **statistiquement, corpuscule après corpuscule**, sans aucune
interaction entre corpuscules — c'est le point que les expériences
« une particule à la fois » imposent (cf. `revue_litteraire.md`).

**C'est une hypothèse phénoménologique** (à la croisée de la double solution
de de Broglie et de l'auto-interférence) : la phase interne du corpuscule
« compare » les N chemins virtuels et module sa détection. Le simulateur ne
dérive pas ce gâteau d'une dynamique ; il le teste, et permet de mesurer sa
plausibilité (la fraction « non détectées » vaut en moyenne 1 − 1/N, ce que
le simulateur vérifie : ~50 % pour N = 2).

## 6. Évolution d'amplitude avec la distance (étude « redshift »)

λ(s) = λ·(1 + ε·s/S₀) avec S₀ = 1000 mm. La phase cumulée devient

    Φ(L) = ∫₀^L ds/λ(s) = (S₀/(λ·ε))·ln(1 + ε·L/S₀)   [ε → 0 : L/λ]

Conséquences visibles et mesurables : ε > 0 allonge le pas de phase avec la
distance → franges étirées, λ_effectif à l'écran affiché, et « z effectif »
simulé z_eff = ε·D/S₀. C'est l'analogue, dans l'espace des phases internes,
d'un décalage vers le rouge — mais **sans perte d'énergie du corpuscule** :
le décalage vient de l'évolution de l'amplitude interne, pas d'une friction.
C'est ce qui distingue cette hypothèse de la « lumière fatiguée » de Zwicky
(voir `revue_litteraire.md`, §4) et ce qu'il faudra confronter aux tests
observationnels (brillance de surface de Tolman, dilatation temporelle des
courbes de lumière des supernovae).

## 7. Collisions entre corpuscules (option « falsification »)

Par défaut **aucune** interaction inter-corpuscules — comme dans les
expériences réelles à particule unique. L'option « collisions » ajoute des
sphères dures élastiques (rayon réglable) entre les points réels des hélices.
Résultat attendu et observé : les collisions **dégradent** les franges
(élargissement de l'enveloppe, chute de la visibilité V), elles ne les
améliorent jamais — argument négatif utile pour l'article : le mécanisme des
franges ne peut pas être une interaction entre corpuscules (voir aussi la
réponse détaillée à cette question dans le dossier de discussion).

## 8. Mesures exportables

- bouton **Exporter CSV** : position du bin, comptage, intensité normalisée,
  théorie normalisée (les mêmes données que `data/profil_intensite_reference.csv`) ;
- **visibilité V = (I_max − I_min)/(I_max + I_min)** calculée en direct sur
  l'histogramme lissé (fenêtre centrale ±2,5·Δx_théorique) ;
- compteurs : émises, détectées, absorbées au mur, diffusées aux arêtes,
  non détectées (gâteau), collisions, durée de simulation.

## 9. Limites à déclarer dans l'article

1. le gâteau de détection G(x) est posé, pas dérivé ;
2. la divergence post-fente encode l'enveloppe de diffraction plutôt qu'elle
   ne la produit ;
3. l'échelle est normalisée (×~1000) : aucune prétention quantitative sur
   les hélices réelles (de Compton) à ce stade ;
4. le comportement « massive » aux arêtes est une diffusion paramétrique, pas
   un potentiel de bord dérivé ;
5. la statistique de l'écran est un empilement indépendant : aucun effet de
   mémoire entre corpuscules (contrairement aux gouttes marchantes de Couder).
