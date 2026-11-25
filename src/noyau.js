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
    spin: 1,                // +1 horaire / -1 anti-horaire
    debit: 80,               // particules /s
    v: 140,                  // mm/s
    ralenti: 1,
    faisceau: 10,            // largeur du faisceau (mm)
    nbFentes: 2,
    largeurFente: 1.6,       // a (mm)
    ecartFentes: 4,         // d (mm)
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
  affichage: { trainees: true, eclats: true, theorie: true },
  particules: [],
  histogramme: new Float64Array(CFG.NB_BINS),
  compteur: { emises: 0, detectees: 0, absorbees: 0, diffusees: 0, indetectees: 0, collisions: 0 },
  evenements: [],
  tSim: 0,
  enPause: false,
  configSale: false,
  accEmission: 0,
  histogrammeSale: true,
};

const P = ETAT.params;

/* ---------- utilitaires ---------- */
function centresFentes() {
  const n = Math.round(P.nbFentes), d = P.ecartFentes, c = [];
  for (let i = 0; i < n; i++) c.push((i - (n - 1) / 2) * d);
  return c;
}
function sinc(t) { return (t === 0) ? 1 : Math.sin(t) / t; }
function gaussienne(sigma) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
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
function courbeTheorique(x) {
  const e = enveloppeAnalytique(x);
  if (P.mode === 'ballistique') return e;
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
      const t = (Math.random() * 4 - 2) * th0;
      if (Math.random() <= sinc(Math.PI * P.largeurFente * t / P.lambda) ** 2) { thx = t; break; }
    }
  }
  const thy = gaussienne(0.004); // divergence verticale faible, fixe
  return { thx: thx, thy: thy };
}

/* ---------- émission ---------- */
function emettre() {
  ETAT.particules.push({
    z: CFG.Z_SOURCE, vz: P.v, vx: 0, vy: 0,
    xAxe: (Math.random() - 0.5) * P.faisceau,
    yAxe: (Math.random() - 0.5) * P.hauteurFente * 0.9,
    phi: Math.random() * 2 * Math.PI,
    phiVis: Math.random() * 2 * Math.PI,
    s: 0, passe: false, fente: -1, diffuse: false, mort: false,
  });
  ETAT.compteur.emises++;
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
    pp.vx += (Math.random() - 0.5) * 0.2 * P.v;
    pp.vy += (Math.random() - 0.5) * 0.1 * P.v;
    pp.vz *= 0.9;
    ETAT.evenements.push({ type: 'diffusion', x: xr, y: yr, z: CFG.EPAISSEUR_MUR / 2 });
  }
}

/* ---------- atterrissage sur l'écran ---------- */
function compterImpact(x, y) {
  ETAT.compteur.detectees++;
  const b = Math.floor((x - CFG.X_MIN) / (CFG.X_MAX - CFG.X_MIN) * CFG.NB_BINS);
  if (b >= 0 && b < CFG.NB_BINS) ETAT.histogramme[b] += 1;
  ETAT.histogrammeSale = true;
  ETAT.evenements.push({ type: 'impact', x: x, y: y, z: P.distanceEcran - 1 });
}
function atterrir(pp) {
  const xr = pp.xAxe + P.rayonHelice * Math.cos(pp.phi);
  const yr = pp.yAxe + P.rayonHelice * Math.sin(pp.phi);
  if (P.mode === 'ballistique') { compterImpact(xr, yr); return; }
  const g = facteurInterference(xr);
  if (Math.random() <= g) compterImpact(xr, yr);
  else {
    ETAT.compteur.indetectees++;
    ETAT.evenements.push({ type: 'ejecte', x: xr, y: yr, z: P.distanceEcran - 1 });
  }
}

/* ---------- pas d'une particule ---------- */
function pasParticule(pp, dt) {
  const dz = pp.vz * dt;
  pp.s += dz; pp.z += dz;
  pp.phi += P.spin * 2 * Math.PI * dz / P.lambda;
  pp.phiVis += P.spin * 2 * Math.PI * dz / Math.max(P.lambdaVis, 0.05);
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

/* ---------- purge ---------- */
function purger() {
  ETAT.histogramme.fill(0);
  ETAT.compteur = { emises: 0, detectees: 0, absorbees: 0, diffusees: 0, indetectees: 0, collisions: 0 };
  ETAT.configSale = false;
  ETAT.histogrammeSale = true;
}
