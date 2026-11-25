# Expériences documentées jouables — fiche technique

Le simulateur embarque un module **« Expériences documentées »** (première
section du panneau) qui permet de **rejouer des expériences publiées** avec
leurs données réelles (λ, fentes, distance, nombre de fentes) et de comparer
l'interfrange **mesuré dans la simulation** à la **théorie λL/d** et à la
**valeur documentée**.

## Les quatre expériences embarquées

| # | Particule | Référence | λ | a | d | L | N | Δx = λL/d | Δx documenté |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Photon (laser He–Ne) | OpenStax College Physics, ch. 27 (2016) | 633 nm | 16 µm¹ | 80 µm | 3,0 m | 2 | 23,7 mm | 23,7 mm (réponse de l'exercice) |
| 2 | Électron | Bach, Pope, Liou & Batelaan, New J. Phys. **15**, 033018 (2013) | 50 pm² | 50 nm | 280 nm | 1,0 m | 2 | 178,6 µm | — (valeur observée agrandie non publiée) |
| 3 | Fullerène C₆₀ | Arndt, Nairz, Petschinka & Zeilinger, Nature **401**, 680 (1999) | 2,5 pm | 50 nm | 100 nm | 1,2 m | 8 (réseau)³ | 30,0 µm | 30 µm (Nairz et al. 2003) |
| 4 | Neutron froid | Zeilinger, Gähler, Shull, Treimer & Mampe, Rev. Mod. Phys. **60**, 1067 (1988) | 2 nm | 20 µm⁴ | 100 µm | 5,0 m | 2 | 100 µm | ≈ 100 µm (interfrange observé) |

¹ largeur de fente non fournie par l'exercice — fixée à d/5 pour l'enveloppe
(sans effet sur Δx). ² λ déduit de 600 eV. ³ réseau SiN de période 100 nm
représenté par 8 fentes. ⁴ assemblées de 20 à 100 µm selon la publication.

Toutes les valeurs réelles proviennent des publications citées ; les valeurs
dérivées (Δx = λL/d) sont calculées. Une cinquième entrée, **« Données
personnalisées »**, permet d'injecter n'importe quel jeu (λ, a, d, L, N, avec
choix du comportement photon/massif) issu d'une autre publication ou d'un TP.

## Principe de la maquette

La scène 3D ne peut pas reproduire les proportions réelles (un électron de
λ = 50 pm sur 1 m donne des franges sub-millimétriques). La simulation
construit donc une **maquette à l'échelle de la fenêtre du détecteur** en
conservant exactement les grandeurs **sans dimension** qui déterminent la
figure :

- **le nombre de franges dans la fenêtre** : N = W/Δx = 8 (fenêtre de
  400 mm de maquette, interfrange maquette 50 mm) ;
- **la forme de l'enveloppe de diffraction** : le rapport a/d ;
- **le nombre de fentes** (2, ou 8 pour le réseau C₆₀).

Paramètres maquette injectés : λ = 0,15 mm, D = 800 mm, d = 2,4 mm,
a = 2,4 × (a/d) mm, faisceau couvrant le réseau, débit 240 /s, vitesse
360 mm/s (l'animation n'affecte pas la physique : les phases et les angles
sont path-based).

## Étalonnage σ et mesure

L'histogramme de la maquette est converti en unités réelles par l'étalon :

**σ = Δx_réel / Δx_exact(maquette)**

- Δx_exact est mesuré par **autocorrélation détendancée** (voir ci-dessous)
  sur le motif théorique calculé par le **moteur exact** de la simulation
  (enveloppe × gâteau G(x) avec distances Lᵢ(x) exactes) : le léger écart
  de Fresnel de la maquette est ainsi absorbé dans l'étalonnage ;
- Δx mesuré est ensuite estimé sur l'histogramme accumulé (impacts réels de
  la simulation) avec le même estimateur, puis multiplié par σ.

La carte de comparaison affiche en continu : Δx théorie (λL/d), Δx mesuré
(simulation, n impacts), Δx documenté, écart sim/théorie, et un verdict
« compatible » si l'écart ≤ 8 %.

## Estimateur : autocorrélation détendancée

L'interfrange est extrait de l'histogramme par autocorrélation **après
soustraction de l'enveloppe lissée** (moyenne glissante ±16 bins) : la
corrélation à court décalage de l'enveloppe de diffraction est éliminée et
seule la **périodicité des franges** subsiste. La période dominante est le
premier maximum local significatif de l'autocorrélation (seuil 25 % de la
variance), affiné par interpolation parabolique sous-bin. Robuste au bruit
de Poisson ; aucune référence à la valeur théorique n'est utilisée (mesure
non circulaire, donc falsifiable).

## Validation (runs headless du noyau exact, 4 000 impacts)

| Expérience | Δx réel | Δx mesuré | Écart |
|---|---|---|---|
| Photon He–Ne | 23,74 mm | 23,80 mm | 0,27 % |
| Électron (Bach) | 178,6 µm | 174,1 µm | 2,53 % |
| C₆₀ (Arndt) | 30,00 µm | 30,13 µm | 0,43 % |
| Neutron (Zeilinger) | 100,0 µm | 97,3 µm | 2,67 % |

Étude de robustesse (10 répétitions par niveau) : estimation juste (≤ 8 %)
dans 100 % des cas dès ~400 impacts détectés ; en dessous, l'estimateur
retourne « accumulation… » ou un écart visible — le verdict invite alors à
accumuler davantage. Les scripts : `outils/` du dépôt git et l'article
(mesures batch) documentent la méthode.

## Reproduire

1. ouvrir `simulation_fentes_de_Young.html` ;
2. choisir une expérience dans **Expériences documentées** ;
3. cliquer **Rejouer cette expérience** — la maquette s'injecte, l'histogramme
   est purgé, la carte de comparaison apparaît ;
4. laisser la figure se construire (~400 impacts) : le verdict « ✓ Compatible »
   confirme la reproduction de l'interfrange documenté ;
5. exporter le profil (bouton *Exporter CSV*) si besoin d'archiver.

## Limites

- la maquette conserve les grandeurs sans dimension, pas les échelles
  absolues (l'échelle est étalonnée par σ) ;
- le comportement « photon absorbé / massif dévié » est une convention du
  modèle (voir `docs/modele_physique.md`) ;
- le gâteau de détection G(x) est une hypothèse posée, non dérivée : la
  concordance observée est un résultat de simulation, pas une preuve
  physique — voir l'avertissement général du README.
