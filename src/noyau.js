'use strict';
/* ============================================================
   NOYAU — physique de la simulation
   Double fente de Young, corpuscules en trajectoire hélicoïdale.
   Unités : millimètres (échelle normalisée ≈ ×1000 vs lumière visible).

   Principe :
   - chaque corpuscule suit un AXE balistique (source → fente → écran)
     en décrivant une HÉLICE de rayon r autour de cet axe ;
   - sa PHASE INTERNE φ avance comme 2π·s/λ (s = chemin parcouru) ;
   - la probabilité de détection à l'abscisse x est modulée par
     G(x) = |Σᵢ exp(i·2π·Φ(Lᵢ(x)))|² / N²  (gâteau de détection),
     où Lᵢ(x) = fenteᵢ → point x de l'écran : c'est l'hypothèse
     phénoménologique centrale (cf. docs/modele_physique.md).
   - DÉTERMINISME : toutes les décisions stochastiques tirent d'un
     générateur seedé (mulberry32, graine ETAT.graine) et le pas de
     temps est FIXE (60 Hz) → à paramètres et graine donnés, « purger »
     puis relancer rejoue la même séquence d'impacts à l'identique.
   ============================================================ */

const CFG = {
  Z_SOURCE: -250,        // position du canon (mm)
  EPAISSEUR_MUR: 6,
  LARGEUR_MUR: 400,
  HAUTEUR_MUR: 280,
  LARGEUR_ECRAN_X: 400,
  HAUTEUR_ECRAN_Y: 280,
  NB_BINS: 240,
  X_MIN: -200,
  X_MAX: 200,
  S0: 1000,              // échelle de l'évolution d'amplitude (mm)
  MAX_PARTICULES: 400,
};

const ETAT = {
  params: {
    mode: 'helicoide',       // 'helicoide' | 'ballistique'
    type: 'photon',          // 'photon' | 'massif'
    spin: 1,                // +1 horaire / -1 anti-horaire / 0 mélange 50/50
    debit: 80,               // particules /s
    v: 140,                  // mm/s
    ralenti: 1,
    faisceau: 10,            // largeur du faisceau (mm)
    nbFentes: 2,
    largeurFente: 1.6,       // a (mm)
    ecartFentes: 4,          // d (mm)
    hauteurFente: 60,        // (mm)
    distanceEcran: 800,      // D (mm)
    lambda: 0.15,            // λ physique (mm)
    rayonHelice: 0.35,       // r physique (mm)
    lambdaVis: 3,            // pas visuel de l'hélice (rendu seul)
    echelleHelice: 6,        // grossissement visuel du rayon (rendu seul)
    divergence: 'sinc2',     // 'sinc2' | 'gaussienne' | 'nulle'
    sigmaTheta: 30,          // mrad (mode gaussienne)
    collisions: false,
    rayonCollision: 0.5,     // mm
    epsilon: 0,              // évolution d'amplitude ε / 1000 mm
  },
  affichage: { trainees: true, eclats: true, theorie: true, couleurSpin: false },
  particules: [],
  histogramme: new Float64Array(CFG.NB_BINS),
  compteur: { emises: 0, detectees: 0, absorbees: 0, diffusees: 0, indetectees: 0, collisions: 0,
              emisPlus: 0, emisMoins: 0, detectPlus: 0, detectMoins: 0 },
  evenements: [],
  tSim: 0,
  enPause: false,
  configSale: false,
  accEmission: 0,
  accTemps: 0,             // accumulateur du pas de temps fixe (rendu)
  histogrammeSale: true,
  experience: null,         // expérience documentée active (cf. EXPERIENCES)
  graine: 42,               // graine du générateur déterministe
  graineCanonique: true,   // rejeu : utiliser la graine canonique de l'expérience
};

const P = ETAT.params;

/* ---------- utilitaires ---------- */
function centresFentes() {
  const n = Math.round(P.nbFentes), d = P.ecartFentes, c = [];
  for (let i = 0; i < n; i++) c.push((i - (n - 1) / 2) * d);
  return c;
}
function sinc(t) { return (t === 0) ? 1 : Math.sin(t) / t; }

/* ---------- générateurs déterministes (mulberry32) ----------
   Deux flux indépendants, tous deux seedés par ETAT.graine :
   - alea()          : émission, phase initiale, sens du spin, divergence
                       post-fente, diffusion sur l'arête (la GÉOMÉTRIE) ;
   - aleaDetection() : rejet du gâteau G(x) (la LOI de détection).
   Séparer les flux garantit que le rejeu hélicoïdal et son TÉMOIN
   BALISTIQUE PUR (même expérience, même graine) partagent exactement le
   même flux de corpuscules — mêmes émissions, mêmes franchissements de
   fente, mêmes absorptions — seule la loi de détection diffère.
   « Purger » réinitialise les deux flux : à paramètres et graine
   inchangés, la séquence d'impacts — particule après particule — est
   rigoureusement identique d'un rejeu à l'autre (navigateur comme banc
   headless : même noyau, même graine, même pas de temps fixe). */
function creerMulberry32(graine) {
  let a = graine >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let alea = creerMulberry32(42);
let aleaDetection = creerMulberry32((Math.imul(42, 0x9E3779B1) ^ 0x6D2B79F5) >>> 0);
function reinitialiserAlea() {
  alea = creerMulberry32(ETAT.graine >>> 0);
  aleaDetection = creerMulberry32((Math.imul(ETAT.graine >>> 0, 0x9E3779B1) ^ 0x6D2B79F5) >>> 0);
}

/* graine canonique stable d'une expérience (FNV-1a de son identifiant) :
   deux sessions différentes rejouent la même expérience avec la même
   graine → rejeu identique d'une machine à l'autre. */
function graineExperience(chaine) {
  let h = 2166136261;
  for (let i = 0; i < chaine.length; i++) { h ^= chaine.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function gaussienne(sigma) {
  let u = 0, v = 0;
  while (u === 0) u = alea();
  while (v === 0) v = alea();
  return sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ---------- phase avec évolution d'amplitude ----------
   λ(s) = λ·(1 + ε·s/S0). Phase cumulée (en tours) sur L :
   Φ(L) = ∫₀^L ds/λ(s) = (S0/(λ·ε))·ln(1 + ε·L/S0) ;  ε→0 : L/λ. */
function phaseCumulee(L) {
  const e = P.epsilon, S0 = CFG.S0, lam = P.lambda;
  if (Math.abs(e) < 1e-9) return L / lam;
  const x = 1 + e * L / S0;
  if (x <= 1e-3) return L / (lam * 1e-3);
  return (S0 / (lam * e)) * Math.log(x);
}
function lambdaEffectif(L) { return P.lambda * (1 + P.epsilon * L / CFG.S0); }

/* ---------- gâteau de détection (facteur d'interférence) ----------
   G(x) = |Σᵢ e^{i·2π·Φ(Lᵢ(x))}|² / N². Cohérent pour N fentes,
   et automatiquement étiré si ε ≠ 0 (étude « redshift »). */
function facteurInterference(x) {
  const c = centresFentes(), n = c.length, D = P.distanceEcran;
  if (n < 2) return 1;
  let re = 0, im = 0;
  for (let i = 0; i < n; i++) {
    const L = Math.sqrt(D * D + (x - c[i]) * (x - c[i]));
    const ph = 2 * Math.PI * phaseCumulee(L);
    re += Math.cos(ph); im += Math.sin(ph);
  }
  return (re * re + im * im) / (n * n);
}

/* ---------- enveloppe : densité d'axes attendue sur l'écran ---------- */
function enveloppeAnalytique(x) {
  const c = centresFentes(), D = P.distanceEcran;
  let s = 0;
  if (P.divergence === 'nulle') {
    for (const xi of c) if (Math.abs(x - xi) < P.largeurFente / 2) s += 1;
  } else if (P.divergence === 'gaussienne') {
    const sx = (P.sigmaTheta / 1000) * D;
    for (const xi of c) s += Math.exp(-(x - xi) * (x - xi) / (2 * sx * sx));
  } else { // sinc² — enveloppe de Fraunhofer
    const lam = lambdaEffectif(D);
    for (const xi of c) s += sinc(Math.PI * P.largeurFente * (x - xi) / (lam * D)) ** 2;
  }
  return s;
}
function courbeTheorique(x, mode) {
  const m = mode || P.mode;      // mode explicite : l'étalonnage σ se fait
  const e = enveloppeAnalytique(x);   // toujours sur le motif AVEC franges
  if (m === 'ballistique') return e;  // (même si la session est balistique)
  return e * facteurInterference(x);
}

/* ---------- tirage de la divergence post-fente ---------- */
function tirageDivergence() {
  let thx = 0;
  if (P.divergence === 'gaussienne') {
    thx = gaussienne(P.sigmaTheta / 1000);
  } else if (P.divergence === 'sinc2') {
    const th0 = P.lambda / P.largeurFente; // premier zéro (petits angles)
    for (let k = 0; k < 300; k++) {
      const t = (alea() * 4 - 2) * th0;
      if (alea() <= sinc(Math.PI * P.largeurFente * t / P.lambda) ** 2) { thx = t; break; }
    }
  }
  const thy = gaussienne(0.004); // divergence verticale faible, fixe
  return { thx: thx, thy: thy };
}

/* ---------- émission ----------
   Le sens du spin est propre à CHAQUE corpuscule : P.spin = ±1 impose
   un sens unique ; P.spin = 0 émet un mélange 50/50 des deux sens.
   Le tirage est TOUJOURS consommé dans le flux géométrique (même en
   sens imposé, où il est ignoré) : le flux de corpuscules — axes,
   phases, franchissements — est ainsi IDENTIQUE quel que soit le réglage
   du spin, et le rejeu hélicoïdal partage exactement le même flux que
   son témoin balistique pur (la détection tire d'un flux séparé). */
function emettre() {
  const tir = alea();
  let spin = (P.spin === 0) ? (tir < 0.5 ? -1 : 1) : P.spin;
  if (spin !== 1 && spin !== -1) spin = 1;   // garde-fou
  ETAT.particules.push({
    z: CFG.Z_SOURCE, vz: P.v, vx: 0, vy: 0,
    xAxe: (alea() - 0.5) * P.faisceau,
    yAxe: (alea() - 0.5) * P.hauteurFente * 0.9,
    phi: alea() * 2 * Math.PI,
    phiVis: alea() * 2 * Math.PI,
    spin: spin,
    s: 0, passe: false, fente: -1, diffuse: false, mort: false,
  });
  ETAT.compteur.emises++;
  if (spin > 0) ETAT.compteur.emisPlus++; else ETAT.compteur.emisMoins++;
}

/* ---------- franchissement du mur (z = 0) ----------
   Photon : absorbé s'il frappe la paroi. Massif : diffusion
   élastique sur l'arête (le corpuscule continue, éparpillé). */
function franchirMur(pp) {
  const c = centresFentes();
  const xr = pp.xAxe + P.rayonHelice * Math.cos(pp.phi);
  const yr = pp.yAxe + P.rayonHelice * Math.sin(pp.phi);
  let fente = -1;
  for (let i = 0; i < c.length; i++) {
    if (Math.abs(xr - c[i]) <= P.largeurFente / 2 && Math.abs(yr) <= P.hauteurFente / 2) { fente = i; break; }
  }
  if (fente >= 0) {
    pp.fente = fente;
    const dv = tirageDivergence();
    pp.vx = dv.thx * P.v; pp.vy = dv.thy * P.v;
  } else if (P.type === 'photon') {
    pp.mort = true;
    ETAT.compteur.absorbees++;
    ETAT.evenements.push({ type: 'absorption', x: xr, y: yr, z: CFG.EPAISSEUR_MUR / 2 });
  } else {
    pp.diffuse = true;
    ETAT.compteur.diffusees++;
    pp.vx += (alea() - 0.5) * 0.2 * P.v;
    pp.vy += (alea() - 0.5) * 0.1 * P.v;
    pp.vz *= 0.9;
    ETAT.evenements.push({ type: 'diffusion', x: xr, y: yr, z: CFG.EPAISSEUR_MUR / 2 });
  }
}

/* ---------- atterrissage sur l'écran ---------- */
function compterImpact(x, y, spin) {
  ETAT.compteur.detectees++;
  if (spin === 1) ETAT.compteur.detectPlus++;
  else if (spin === -1) ETAT.compteur.detectMoins++;
  const b = Math.floor((x - CFG.X_MIN) / (CFG.X_MAX - CFG.X_MIN) * CFG.NB_BINS);
  if (b >= 0 && b < CFG.NB_BINS) ETAT.histogramme[b] += 1;
  ETAT.histogrammeSale = true;
  ETAT.evenements.push({ type: 'impact', x: x, y: y, z: P.distanceEcran - 1 });
}
function atterrir(pp) {
  const xr = pp.xAxe + P.rayonHelice * Math.cos(pp.phi);
  const yr = pp.yAxe + P.rayonHelice * Math.sin(pp.phi);
  if (P.mode === 'ballistique') { compterImpact(xr, yr, pp.spin); return; }
  const g = facteurInterference(xr);
  if (aleaDetection() <= g) compterImpact(xr, yr, pp.spin);
  else {
    ETAT.compteur.indetectees++;
    ETAT.evenements.push({ type: 'ejecte', x: xr, y: yr, z: P.distanceEcran - 1 });
  }
}

/* ---------- pas d'une particule ---------- */
function pasParticule(pp, dt) {
  const dz = pp.vz * dt;
  pp.s += dz; pp.z += dz;
  pp.phi += pp.spin * 2 * Math.PI * dz / P.lambda;
  pp.phiVis += pp.spin * 2 * Math.PI * dz / Math.max(P.lambdaVis, 0.05);
  if (!pp.passe && pp.z >= 0) { pp.passe = true; franchirMur(pp); }
  pp.xAxe += pp.vx * dt; pp.yAxe += pp.vy * dt;
  if (!pp.mort && pp.z >= P.distanceEcran) { atterrir(pp); pp.mort = true; }
}

/* ---------- collisions élastiques entre corpuscules ----------
   Sphères dures d'égal masse (test de falsification : les franges
   doivent se dégrader). La distance est mesurée entre les points
   réels des hélices, pas entre les axes. */
function resoudreCollisions() {
  if (!P.collisions || ETAT.particules.length < 2) return;
  const dmin = 2 * P.rayonCollision;
  const cell = Math.max(dmin * 2, 1e-6);
  const grilles = new Map();
  for (let i = 0; i < ETAT.particules.length; i++) {
    const k = Math.floor(ETAT.particules[i].z / cell);
    if (!grilles.has(k)) grilles.set(k, []);
    grilles.get(k).push(i);
  }
  const pa = [0, 0, 0], pb = [0, 0, 0];
  function posDe(pp, out) {
    out[0] = pp.xAxe + P.rayonHelice * Math.cos(pp.phi);
    out[1] = pp.yAxe + P.rayonHelice * Math.sin(pp.phi);
    out[2] = pp.z;
  }
  function tester(i, j) {
    const A = ETAT.particules[i], B = ETAT.particules[j];
    if (A.mort || B.mort) return;
    posDe(A, pa); posDe(B, pb);
    const dx = pa[0] - pb[0], dy = pa[1] - pb[1], dz = pa[2] - pb[2];
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 >= dmin * dmin || d2 <= 1e-12) return;
    const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, nz = dz / d;
    const vrel = (A.vx - B.vx) * nx + (A.vy - B.vy) * ny + (A.vz - B.vz) * nz;
    if (vrel < 0) {
      A.vx -= vrel * nx; A.vy -= vrel * ny; A.vz -= vrel * nz;
      B.vx += vrel * nx; B.vy += vrel * ny; B.vz += vrel * nz;
      ETAT.compteur.collisions++;
    }
    const corr = (dmin - d) / 2;
    A.xAxe += corr * nx; A.yAxe += corr * ny; A.z += corr * nz;
    B.xAxe -= corr * nx; B.yAxe -= corr * ny; B.z -= corr * nz;
  }
  for (const [k, idx] of grilles) {
    for (let a = 0; a < idx.length; a++)
      for (let b = a + 1; b < idx.length; b++) tester(idx[a], idx[b]);
    const g2 = grilles.get(k + 1);
    if (g2) for (const i of idx) for (const j of g2) tester(i, j);
  }
}

/* ---------- pas global de la simulation ---------- */
function pasSimulation(dt) {
  const dtP = dt * P.ralenti;
  ETAT.accEmission += P.debit * dtP;
  while (ETAT.accEmission >= 1 && ETAT.particules.length < CFG.MAX_PARTICULES) {
    ETAT.accEmission -= 1;
    emettre();
  }
  for (const pp of ETAT.particules) if (!pp.mort) pasParticule(pp, dtP);
  resoudreCollisions();
  ETAT.particules = ETAT.particules.filter(pp => !pp.mort);
  ETAT.tSim += dtP;
}

/* ---------- mesures ---------- */
function lissageHisto() {
  const h = ETAT.histogramme, n = h.length, l = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0, c = 0;
    for (let k = -2; k <= 2; k++) { const j = i + k; if (j >= 0 && j < n) { s += h[j]; c++; } }
    l[i] = s / c;
  }
  return l;
}
function visibiliteMesuree() {
  const dxThe = lambdaEffectif(P.distanceEcran) * P.distanceEcran / P.ecartFentes;
  const l = lissageHisto();
  const centre = Math.floor(CFG.NB_BINS / 2);
  const tailleBin = (CFG.X_MAX - CFG.X_MIN) / CFG.NB_BINS;
  const demiFenetre = Math.min(Math.round(2.5 * dxThe / tailleBin), Math.floor(CFG.NB_BINS / 2) - 1);
  let mx = 0, mn = Infinity;
  for (let i = centre - demiFenetre; i <= centre + demiFenetre; i++) {
    if (l[i] > mx) mx = l[i];
    if (l[i] < mn) mn = l[i];
  }
  if (mx <= 0) return null;
  return (mx - mn) / (mx + mn);
}

/* ---------- purge : remise à zéro STOCHASTIQUE COMPLÈTE ----------
   Purge l'histogramme ET les compteurs, vide le vol, remet à zéro les
   accumulateurs et RÉINITIALISE le générateur à ETAT.graine : relancer
   ensuite rejoue la séquence d'impacts à l'identique (même configuration,
   même graine). */
function purger() {
  ETAT.histogramme.fill(0);
  ETAT.particules.length = 0;
  ETAT.accEmission = 0;
  ETAT.accTemps = 0;
  ETAT.tSim = 0;
  ETAT.compteur = { emises: 0, detectees: 0, absorbees: 0, diffusees: 0, indetectees: 0, collisions: 0,
                    emisPlus: 0, emisMoins: 0, detectPlus: 0, detectMoins: 0 };
  reinitialiserAlea();
  ETAT.configSale = false;
  ETAT.histogrammeSale = true;
}

/* ============================================================
   EXPÉRIENCES DOCUMENTÉES — données réelles publiées et
   maquette à l'échelle de la fenêtre du détecteur.

   Principe du mapping « maquette » : la scène 3D ne peut pas
   reproduire les proportions réelles (électron λ = 50 pm à 1 m
   de distance = franges sub-millimétriques). On construit donc
   une maquette à l'échelle de la FENÊTRE DU DÉTECTEUR en
   conservant exactement les grandeurs SANS DIMENSION qui
   déterminent la figure :
   - le nombre de franges dans la fenêtre : N = W/Δx, Δx = λL/d ;
   - la forme de l'enveloppe de diffraction : rapport a/d ;
   - le nombre de fentes.
   L'histogramme et Δx sont ensuite reconvertis en unités réelles
   (mètres) via l'étalon σ = Δx_réel/Δx_maquette, calibré sur le
   motif EXACT du moteur (même physique que la simulation) — la
   mesure converge vers la valeur documentée, à la statistique
   près. Toutes les valeurs réelles ci-dessous proviennent des
   publications citées (aucune valeur inventée) ; les valeurs
   dérivées (Δx = λL/d) sont calculées à partir des grandeurs
   publiées.
   ============================================================ */

const EXPERIENCES = [
  {
    id: 'photon-openstax', particule: 'Photon', massif: false,
    titre: 'Lumière laser He–Ne — atelier pédagogique', annee: 2016,
    lambda: 633e-9, a: 16e-6, d: 80e-6, L: 3.0, nbFentes: 2,
    noteA: 'largeur de fente non fournie par l\u2019exercice — fixée à d/5 pour l\u2019enveloppe (sans effet sur Δx)',
    dxDocumente: 2.37e-2,
    sourceDx: 'Δx = λL/d, réponse de l\u2019exercice (2,37 cm)',
    notes: [
      'Lumière monochromatique 633 nm (laser hélium-néon)',
      'vitesse de la particule : c ≈ 3×10⁸ m/s',
    ],
    reference: 'OpenStax College Physics (ch. 27, exercice « Double slit ») — SUNY/Lumen',
    url: 'https://courses.lumenlearning.com/suny-physics/chapter/27-3-youngs-double-slit-experiment',
  },
  {
    id: 'electron-bach-2013', particule: 'Électron', massif: true,
    titre: 'Fentes de Young contrôlées, un électron à la fois', annee: 2013,
    lambda: 50e-12, a: 50e-9, d: 280e-9, L: 1.0, nbFentes: 2,
    noteA: 'λ = 50 pm déduit de 600 eV ; L = longueur du système (« 1 meter long system »), distance exacte fente→détecteur non publiée (figure agrandie par lentille quadrupolaire)',
    dxDocumente: 1.79e-4,
    sourceDx: 'Δx théorique = λL/d (la valeur observée agrandie n\u2019est pas publiée)',
    notes: [
      'faisceau de 600 eV, deux fentes de 50 nm (écart 280 nm, hauteur 4 µm)',
      'v = √(2eV/m) ≈ 1,45×10⁷ m/s',
      'électrons consécutifs séparés de 2,3×10⁶ m en moyenne : jamais deux à la fois',
      'la figure complète s\u2019est construite en ~2 h, impact après impact',
    ],
    reference: 'R. Bach, D. Pope, S.-H. Liou, H. Batelaan, New J. Phys. 15, 033018 (2013)',
    url: 'https://arxiv.org/abs/1210.6243',
  },
  {
    id: 'c60-arndt-1999', particule: 'Fullerène C₆₀', massif: true,
    titre: 'Interférences de molécules C₆₀', annee: 1999,
    lambda: 2.5e-12, a: 50e-9, d: 100e-9, L: 1.2, nbFentes: 8,
    noteA: 'réseau SiN de période 100 nm avec ouvertures de 50 nm — représenté ici par 8 fentes (le réseau réel en comporte des dizaines)',
    dxDocumente: 3.0e-5,
    sourceDx: 'Nairz et al. 2003 : interfrange au détecteur = L·λ/d (30 µm)',
    notes: [
      'vitesse la plus probable ≈ 220 m/s → λ = h/mv ≈ 2,5 pm',
      'λ est ~400 fois plus petite que le diamètre de la molécule (~1 nm)',
      'détecteur placé 1,2 m en aval du réseau',
    ],
    reference: 'M. Arndt, O. Nairz, J. Petschinka, A. Zeilinger, Nature 401, 680 (1999) ; détails : O. Nairz et al., Am. J. Phys. 71, 319 (2003)',
    url: 'https://pubmed.ncbi.nlm.nih.gov/18494170/',
  },
  {
    id: 'neutron-zeilinger-1988', particule: 'Neutron', massif: true,
    titre: 'Diffraction de neutrons froids', annee: 1988,
    lambda: 2e-9, a: 20e-6, d: 100e-6, L: 5.0, nbFentes: 2,
    noteA: 'largeur retenue 20 µm — la publication annonce des assemblées de 20 à 100 µm',
    dxDocumente: 1.0e-4,
    sourceDx: 'interfrange observé ≈ 0,1 mm, rapporté pour λ ≈ 2 nm, d = 0,1 mm, L = 5 m',
    notes: [
      'neutrons froids, λ ≈ 2 nm (réglable entre ~1,5 et 3 nm)',
      'v = h/(m·λ) ≈ 200 m/s',
      'double fente d\u2019écart 0,1 mm, détecteur à 5 m',
    ],
    reference: 'A. Zeilinger, R. Gähler, C. G. Shull, W. Treimer, W. Mampe, Rev. Mod. Phys. 60, 1067 (1988)',
    url: 'https://ui.adsabs.harvard.edu/abs/1988RvMP...60.1067Z/abstract',
  },
];

/* ---------- formatage d'une longueur réelle (m) ---------- */
function formatLongueurM(m) {
  const v = Math.abs(m);
  if (v >= 1) return m.toFixed(2) + ' m';
  if (v >= 1e-2) return (m * 100).toFixed(1) + ' cm';
  if (v >= 1e-3) return (m * 1e3).toFixed(1) + ' mm';
  if (v >= 1e-6) return (m * 1e6).toFixed(1) + ' µm';
  if (v >= 1e-9) return (m * 1e9).toFixed(1) + ' nm';
  return (m * 1e12).toFixed(1) + ' pm';
}

/* ---------- interfrange estimé par autocorrélation détendancée ----------
   Série = comptages − enveloppe lissée (moyenne glissante large) : on
   retire la lente variation d'intensité de l'enveloppe de diffraction
   pour que l'autocorrélation mesure la PÉRIODICITÉ des franges et non
   la forme de l'enveloppe. La période dominante est le décalage du
   premier maximum local significatif de l'autocorrélation, affiné par
   interpolation parabolique. Robuste au bruit de Poisson ; retourne
   null tant que la statistique est insuffisante. */
function estimerInterfrange(comptages, largeurFenetre) {
  const n = comptages.length;
  if (n < 16) return null;
  let total = 0;
  for (let i = 0; i < n; i++) total += comptages[i];
  if (total < 150) return null;
  // détendance (enveloppe = moyenne glissante ±16 bins ; l'interfrange
  // maquette ≈ 30 bins n'est atténué qu'à ~9 %, l'enveloppe lente disparaît)
  const demiF = 16;
  const env = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0, c = 0;
    for (let k = Math.max(0, i - demiF); k <= Math.min(n - 1, i + demiF); k++) { s += comptages[k]; c++; }
    env[i] = s / c;
  }
  const d = new Float64Array(n);
  for (let i = 0; i < n; i++) d[i] = comptages[i] - env[i];
  let v0 = 0;
  for (let i = 0; i < n; i++) v0 += d[i] * d[i];
  if (v0 <= 1e-12) return null;
  const lagMax = Math.floor(n / 2) - 2;
  const acf = new Float64Array(lagMax + 1);
  for (let lag = 0; lag <= lagMax; lag++) {
    let s = 0;
    for (let i = 0; i + lag < n; i++) s += d[i] * d[i + lag];
    acf[lag] = s / (n - lag);
  }
  // léger lissage (1-2-1)
  const sm = new Float64Array(lagMax + 1);
  for (let i = 0; i <= lagMax; i++) {
    const u = acf[Math.max(0, i - 1)], b = acf[i], v = acf[Math.min(lagMax, i + 1)];
    sm[i] = (u + 2 * b + v) / 4;
  }
  // premier maximum local significatif (période fondamentale)
  let meilleur = -1;
  for (let lag = 3; lag <= lagMax - 1; lag++) {
    if (sm[lag] > sm[lag - 1] && sm[lag] >= sm[lag + 1] && sm[lag] >= 0.25 * acf[0]) { meilleur = lag; break; }
  }
  if (meilleur < 0) return null;
  // raffinement sous-bin (parabole)
  const den = sm[meilleur - 1] - 2 * sm[meilleur] + sm[meilleur + 1];
  const decal = den < -1e-12 ? (0.5 * (sm[meilleur - 1] - sm[meilleur + 1])) / den : 0;
  const lagF = meilleur + Math.max(-0.5, Math.min(0.5, decal));
  return (lagF * largeurFenetre) / n;
}

/* interfrange mesuré sur l'histogramme courant (mm de maquette) */
function interfrangeMesuree() {
  return estimerInterfrange(ETAT.histogramme, CFG.X_MAX - CFG.X_MIN);
}

/* ---------- maquette : paramètres de scène d'une expérience ----------
   Grandeurs sans dimension conservées ; bornes des curseurs
   respectées. Retourne { patch, dxReel } (dxReel en mètres). */
function mapperExperience(exp) {
  const Nf = 8;                        // franges visibles dans la fenêtre
  const W = CFG.X_MAX - CFG.X_MIN;    // largeur de la fenêtre-maquette (mm)
  const Ds = 800, lamS = 0.15;        // distance & λ de la maquette (mm)
  const n = Math.max(1, Math.min(8, Math.round(exp.nbFentes)));
  const dxs = W / Nf;                 // interfrange maquette (mm)
  const ds = lamS * Ds / dxs;        // écart des fentes maquette (mm)
  // valeurs alignées sur les pas des curseurs (a : 0,05 mm ; faisceau : 0,5 mm)
  const as = Math.round(Math.max(0.4, Math.min(5, ds * (exp.a / exp.d))) / 0.05) * 0.05;
  const faisceau = Math.round(Math.max(6, Math.min(30, (n - 1) * ds + 2 * as + 3)) / 0.5) * 0.5;
  return {
    patch: {
      /* mode & spin NON fixés ici : le rejeu préserve les réglages de
         l'utilisateur (hélicoïdal par défaut ; balistique pur, spin mixte,
         etc. — cf. bouton « Témoin balistique pur » de l'interface). */
      type: exp.massif ? 'massif' : 'photon',
      nbFentes: n,
      largeurFente: as,
      ecartFentes: ds,
      distanceEcran: Ds,
      lambda: lamS,
      rayonHelice: Math.max(0.05, Math.min(0.3, Math.round(as * 0.2 / 0.05) * 0.05)),
      faisceau: faisceau,
      debit: 240, v: 360, ralenti: 1,
      epsilon: 0, collisions: false, divergence: 'sinc2',
    },
    dxReel: exp.lambda * exp.L / exp.d,
  };
}

/* ---------- étalon σ (mètres réels / mm de maquette) ----------
   Calibré sur le motif EXACT du moteur (même physique que la
   simulation) : l'interfrange réel est posé égal à l'interfrange
   exact de la maquette, ce qui absorbe le léger écart de Fresnel
   de la maquette. La mesure convergera vers la valeur réelle
   documentée, à la statistique près. */
function calibrerSigma(dxReel) {
  const nb = CFG.NB_BINS, pas = (CFG.X_MAX - CFG.X_MIN) / nb;
  const comptes = new Float64Array(nb);
  for (let i = 0; i < nb; i++) {
    const x = CFG.X_MIN + (i + 0.5) * pas;
    comptes[i] = courbeTheorique(x, 'helicoide') * 10000;
  }
  const dxExact = estimerInterfrange(comptes, CFG.X_MAX - CFG.X_MIN);
  return dxExact !== null && dxExact > 1e-6 ? dxReel / dxExact : null;
}
