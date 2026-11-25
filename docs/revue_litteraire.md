# Revue rapide : trajectoires hélicoïdales, spin et dualité onde-corpuscule — travaux antérieurs

Réponse à la question « ce type de travail a-t-il déjà été tenté ? »,
avec références vérifiées. Répartition en quatre blocs : le fait
expérimental à expliquer, les approches à trajectoire, l'hélice-zitterbewegung
et le spin, le décalage vers le rouge. En conclusion : le créneau exact du
projet.

## 1. Le fait expérimental cardinal : l'interférence se construit particule par particule

Toute explication corpusculaire doit passer ce test :

- **G. I. Taylor (1909)**, « Interference fringes with feeble light »,
  *Mathematical Proceedings of the Cambridge Philosophical Society* 15,
  114-115 — des franges identiques en lumière ultra-faible
  (exposition de l'ordre du mois) : le motif ne dépend pas de l'intensité.
  (https://www.damtp.cam.ac.uk/user/gold/pdfs/teaching/old_literature/Taylor1909.pdf)
- **Merli, Missiroli & Pozzi (1974-1976)** — interférence d'électrons
  détectés un à un (biprisme électrostatique) ;
  élue « plus belle expérience de la physique » par les lecteurs de
  *Physics World* (2002). (https://pmc.ncbi.nlm.nih.gov/articles/PMC4617474)
- **Tonomura, Endo, Matsuda, Kawasaki & Ezawa (1989)**, « Demonstration of
  single-electron buildup of an interference pattern », *Am. J. Phys.* 57,
  117-117 (1989), doi:10.1119/1.16104 — le corpuscule d'émission est si
  espacé du suivant que deux électrons ne coexistent jamais dans
  l'appareil ; les franges apparaissent quand même.
  (https://pubs.aip.org/aapt/ajp/article/57/2/117/1040594)
- **Bach, Pope, Liou & Batelaan (2013)**, « Controlled double-slit electron
  diffraction », *New J. Phys.* 15, 033018, doi:10.1088/1367-2630/15/3/033018
  — réalisation complète de l'expérience imaginaire de Feynman, masque
  mobile + accumulation événement par événement.
  (https://iopscience.iop.org/article/10.1088/1367-2630/15/3/033018)

**Conséquence directe pour la question des collisions** : quand les franges
apparaissent alors qu'une seule particule est présente à la fois dans
l'appareil, aucune interaction *entre* particules ne peut être le mécanisme.
Les collisions inter-corpuscules ne rapprochent pas des motifs réels : elles
s'en éloignent (charge d'espace, brouillage). Le simulateur le vérifie
expérimentalement (option « collisions » : chute de la visibilité V).

## 2. Approches à trajectoire : les ancêtres directs

- **Louis de Broglie** — onde-pilote et théorie de la double solution
  (Congrès Solvay 1927) : la particule chemine sur une trajectoire continue
  guidée par une onde qui la traverse ; reprise et formalisée par
  **David Bohm (1952)**. C'est l'ossature conceptuelle « particule réelle +
  statistique → franges ».
- **Couder & Fort (2006)**, « Single-particle diffraction and interference at
  a macroscopic scale », *Phys. Rev. Lett.* 97, 154101,
  doi:10.1103/PhysRevLett.97.154101 — gouttes « marchantes » sur bain
  vibré, statistiques évoquant diffraction et double fente à l'échelle
  macroscopique. Suites : tunneling imprévisible (Eddi et al., *PRL* 102,
  240401, 2009), mémoire de chemin. (https://link.aps.org/doi/10.1103/PhysRevLett.97.154101)
- **Le point de rupture des gouttes** : la double fente des gouttes
  marchantes n'a pas survécu à la réplication —
  A. Andersen et al., comment. sur Couder & Fort (arXiv:1405.0466, 2014) ;
  Pucci, Harris, et al. « Walking droplets interacting with single and
  double slits » (2018) ; synthèse critique dans T. Bohr et al. (2016) et
  la revue de J. W. M. Bush, « Pilot-wave hydrodynamics », *Annu. Rev.
  Fluid Mech.* 47, 269-292 (2015).
  (https://arxiv.org/abs/1405.0466 — compte rendu vulgarisé :
  https://www.quantamagazine.org/famous-experiment-dooms-pilot-wave-alternative-to-quantum-weirdness-20181011)
  Moralité : l'onde-pilote *macroscopique* a échoué sur la double fente ;
  le créneau « particule + mécanisme *interne* » reste ouvert.

## 3. Hélice et spin : la zitterbewegung

- **Erwin Schrödinger (1930)** — la « zitterbewegung » du Dirac libre :
  oscillation interne à la fréquence 2mc²/h découverte dans les solutions
  de l'équation de Dirac.
- **David Hestenes (1990)**, « The zitterbewegung interpretation of quantum
  mechanics », *Foundations of Physics* 20, 1213-1232,
  doi:10.1007/BF01889466 — propose de lire l'électron comme une charge
  ponctuelle décrivant une **hélice** de rayon ħ/2mc le long de la ligne
  d'univers : le spin S = ħ/2 *est* le moment orbital de ce mouvement
  circulaire interne, et le moment magnétique suit.
  (https://link.springer.com/article/10.1007/BF01889466)
  C'est la formulated ancestor direct du lien « hélice ↔ spin » visé par
  l'article ; le simulateur permet d'exhiber le mécanisme en statistique
  (phase interne → franges) sans prétendre remplacer Dirac.
- Pour les **photons** : la polarisation circulaire correspond déjà à un
  moment angulaire ±ħ le long de la propagation (hélicité) ; des modèles de
  photon « localisé à trajectoire hélicoïdale » existent en marge de la
  théorie quantique standard, mais aucune formulation n'est établie. À
  traiter prudemment dans l'article (mention, pas revendication).

## 4. Décalage vers le rouge : la lumière fatiguée et ses tests

- **F. Zwicky (1929)**, « On the Redshift of Spectral Lines through
  Interstellar Space », *PNAS* 15 (10), 773-779,
  doi:10.1073/pnas.15.10.773 — l'hypothèse historique « lumière fatiguée » :
  le photon perd de l'énergie en chemin.
  (https://pubmed.ncbi.nlm.nih.gov/16577237)
- Ce qui l'a discréditée (et que toute variante doit affronter) : le test de
  Tolman sur la brillance de surface (~(1+z)⁴ attendu), l'absence de flou
  des images lointaines, et surtout la **dilatation temporelle observée des
  courbes de lumière des supernovae Ia** (le facteur (1+z) appliqué aux
  durées). Une variante « amplitude interne qui glisse » change les
  prédictions : elle n'implique pas de refroidissement du flux ni de flou,
  mais elle doit quand même reproduire la dilatation temporelle et la
  relation de Hubble — c'est le programme de tests à écrire noir sur blanc
  dans l'article, avec le paramètre ε du simulateur comme commande
  numérique (z_eff = ε·D/S₀ dans les unités normalisées).

## 5. Positionnement : ce qui a été tenté, ce qui ne l'a pas été

| Ingrédient | État de l'art | Référence |
|---|---|---|
| Trajectoire corpusculaire + statistique → franges | tenté et vivant (Bohm) ; échec macroscopique (gouttes) | Bohm 1952 ; Couder & Fort 2006 + réfutation 2014-2018 |
| Hélice interne ↔ spin | établi comme interprétation Dirac (Hestenes) | Hestenes 1990 |
| Interférence reconstruite par une **phase interne portée par la trajectoire hélicoïdale** (sans onde-pilote externe) | à ma connaissance non publié en combinaison | — |
| Redshift par **évolution de l'amplitude interne** (et non par perte d'énergie) | distinct de Zwicky ; je n'en connais pas de formulation publiée | — |

Le créneau du projet est donc la **combinaison** : (1) faire émerger les
franges de Young d'une phase interne hélicoïdale, corpuscule par corpuscule,
sans interaction inter-corpuscules ; (2) lire ε comme une pente de
« décalage vers le rouge de phase » et confronter aux tests cosmologiques.

**Réserve honnête** : cette revue est un point d'entrée, pas une recherche
exhaustive ; avant soumission, passer Inspire/Google Scholar avec les termes
« zitterbewegung interference », « helical trajectory double slit »,
« tired light phase shift », et vérifier l'absence de doublon récent.

## 6. Références (vérifiées en ligne)

1. G. I. Taylor, *Math. Proc. Camb. Phil. Soc.* **15**, 114 (1909).
2. P. G. Merli, G. F. Missiroli, G. Pozzi, *Am. J. Phys.* **44**, 306 (1976) ;
   analyse historique : https://pmc.ncbi.nlm.nih.gov/articles/PMC4617474
3. A. Tonomura, J. Endo, T. Matsuda, T. Kawasaki, H. Ezawa, *Am. J. Phys.*
   **57**, 117 (1989), doi:10.1119/1.16104.
4. R. Bach, D. Pope, S.-H. Liou, H. Batelaan, *New J. Phys.* **15**, 033018
   (2013), doi:10.1088/1367-2630/15/3/033018.
5. Y. Couder, E. Fort, *Phys. Rev. Lett.* **97**, 154101 (2006),
   doi:10.1103/PhysRevLett.97.154101.
6. A. Eddi, E. Fort, F. Moisy, Y. Couder, *Phys. Rev. Lett.* **102**,
   240401 (2009).
7. A. Andersen et al., comment. arXiv:1405.0466 (2014) ; G. Pucci et al.
   (2018) ; J. W. M. Bush, *Annu. Rev. Fluid Mech.* **47**, 269 (2015).
8. D. Hestenes, *Found. Phys.* **20**, 1213 (1990), doi:10.1007/BF01889466.
9. F. Zwicky, *PNAS* **15**, 773 (1929), doi:10.1073/pnas.15.10.773.
10. L. de Broglie, théorie de la double solution (1927) ; D. Bohm, *Phys.
    Rev.* **85**, 166 (1952).
