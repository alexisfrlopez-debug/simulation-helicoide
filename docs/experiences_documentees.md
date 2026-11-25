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

Générateur déterministe depuis la version « rejeu à l'identique » : ces
nombres sont **strictement reproductibles** (graines canoniques ci-dessous).

| Expérience | Δx réel | Δx mesuré | Écart |
|---|---|---|---|
| Photon He–Ne | 23,74 mm | 23,89 mm | 0,63 % |
| Électron (Bach) | 178,6 µm | 174,6 µm | 2,24 % |
| C₆₀ (Arndt) | 30,00 µm | 30,01 µm | 0,03 % |
| Neutron (Zeilinger) | 100,0 µm | 98,2 µm | 1,78 % |

Étude de robustesse (10 répétitions par niveau) : estimation juste (≤ 8 %)
dans 100 % des cas dès ~400 impacts détectés ; en dessous, l'estimateur
retourne « accumulation… » ou un écart visible — le verdict invite alors à
accumuler davantage. Les scripts : `outils/` du dépôt git et l'article
(mesures batch) documentent la méthode.

## Rejeu à l'identique (déterminisme)

Trois mécanismes rendent chaque rejeu **rigoureusement identique, particule
après particule** :

1. **Générateur seedé (mulberry32)** — toutes les décisions stochastiques
   (émission, phase initiale, sens du spin en mélange, divergence
   post-fente, diffusion sur l'arête, rejet du gâteau G(x)) tirent de flux
   seedés par une **graine** (panneau *Reproductibilité*). « Purger » remet
   le flux à la graine : la même configuration rejoue la même séquence
   d'impacts. Deux flux indépendants — géométrie / détection — font que
   changer la loi de détection ne perturbe jamais le flux de corpuscules ;
2. **Pas de temps fixe (60 Hz)** — le temps réel est accumulé puis consommé
   par quanta exacts de 1/60 s : la physique ne dépend jamais de la cadence
   d'affichage (30, 60 ou 144 images/s donnent la même séquence) ;
3. **Graines canoniques** — chaque expérience documentée possède une graine
   stable (FNV-1a de son identifiant) : le rejeu est identique d'une
   session ou d'une machine à l'autre, **navigateur et banc headless
   compris** (le run de validation ci-dessus est celui du navigateur).

| Expérience | Graine canonique |
|---|---|
| Photon He–Ne (OpenStax) | 3717060512 |
| Électron (Bach 2013) | 983603173 |
| Fullerène C₆₀ (Arndt 1999) | 3144428501 |
| Neutron (Zeilinger 1988) | 3424947339 |

Le rejeu **préserve vos réglages** de mode et de sens du spin. Décocher
« graine canonique » permet d'imposer sa propre graine (étude de
robustesse : relancer avec plusieurs graines et vérifier la stabilité de
l'interfrange). Le CSV exporté consigne la graine et le mode de spin.

## Témoin balistique pur — contrôle falsifiable

Le bouton **« Témoin balistique pur (les deux spins) »** rejoue la MÊME
expérience (même graine canonique) en mode balistique pur, avec le
**mélange 50/50 des deux sens de spin**. Grâce à la séparation des flux
géométrie/détection, le témoin reçoit **exactement le même flux de
corpuscules** que le rejeu hélicoïdal — mêmes émissions, mêmes
franchissements de fente, mêmes absorptions/diffusions — seule la loi de
détection diffère (voir `outils/test_rejeu_deterministe.js`) :

| Vérification headless (4 expériences × 2 000 impacts) | Résultat |
|---|---|
| rejeu hélicoïdal ×2 → histogrammes/compteurs | identiques (octet par octet) |
| rejeu balistique ×2 → histogrammes/compteurs | identiques (octet par octet) |
| émissions / absorptions / diffusions hélicoïdal vs témoin | identiques (même flux) |
| interfrange du témoin | **aucune périodicité détectable** |

Le témoin **ne reproduit pas** l'interfrange documenté : sans phase
interne, l'accumulateur ne collecte que l'enveloppe de diffraction — la
carte de comparaison l'affiche explicitement (« aucune frange » ou un
écart important). C'est le résultat attendu du contrôle : l'écart entre le
témoin et la théorie λL/d mesure précisément ce que la phase interne
apporte au modèle hélicoïdal.

## Sens du spin

Le sélecteur propose horaire (+1), anti-horaire (−1) et **« les deux —
mélange 50/50 »** : le sens est alors propre à chaque corpuscule (comptés
séparément dans les statistiques, visualisables en cochant « Colorer selon
le sens du spin »). Le tirage du spin est toujours consommé dans le flux
géométrique, même en sens imposé : changer le sens ne désynchronise jamais
le flux de corpuscules — rejeu à l'identique garanti quel que soit le
réglage.

## Reproduire

1. ouvrir `simulation_fentes_de_Young.html` ;
2. choisir une expérience dans **Expériences documentées** ;
3. cliquer **Rejouer cette expérience** — la maquette s'injecte, la
   graine canonique s'affiche, l'histogramme est purgé, la carte de
   comparaison apparaît ;
4. laisser la figure se construire (~400 impacts) : le verdict
   « ✓ Compatible » confirme la reproduction de l'interfrange documenté ;
5. cliquer **Purger** puis relancer : la séquence d'impacts est identique
   à la précédente (rejeu déterministe) ;
6. cliquer **Témoin balistique pur (les deux spins)** : même graine, même
   flux de corpuscules, aucune frange — le contrôle falsifiable ;
7. exporter le profil (bouton *Exporter CSV*) si besoin d'archiver.

## Limites

- la maquette conserve les grandeurs sans dimension, pas les échelles
  absolues (l'échelle est étalonnée par σ) ;
- le comportement « photon absorbé / massif dévié » est une convention du
  modèle (voir `docs/modele_physique.md`) ;
- le gâteau de détection G(x) est une hypothèse posée, non dérivée : la
  concordance observée est un résultat de simulation, pas une preuve
  physique — voir l'avertissement général du README.
