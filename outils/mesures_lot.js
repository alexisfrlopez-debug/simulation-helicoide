#!/usr/bin/env node
/* ============================================================
   mesures_lot.js — banc de mesure « headless »
   Exécute le noyau physique exact de la simulation autonome
   (src/noyau.js) sans rendu 3D, et exporte :
   - data/mesures_<nom>.csv          (histogramme mesuré + théorie)
   - data/mesures_emergence_<k>.csv  (clichés pendant l'accumulation)
   - data/mesures_resume.json        (compteurs, visibilité, paramètres)
   Usage : node outils/mesures_lot.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(RACINE, 'src', 'noyau.js'), 'utf8');
const DT = 0.05;                     // pas d'intégration (s)
const SEUILS_EMERGENCE = [100, 500, 2000, 10000];   // détectées

function chargerNoyau() {
  const fabrique = new Function(
    SRC + '\n;return {CFG, ETAT, P, pasSimulation, courbeTheorique, ' +
    'enveloppeAnalytique, facteurInterference, visibiliteMesuree, ' +
    'lambdaEffectif, centresFentes};'
  );
  return fabrique();
}

function fmt(x) { return Number(x).toFixed(6); }

function ecrireCSV(nomFichier, N, lignesEnTete, colonneEnv) {
  const cfg = N.CFG;
  const P = N.ETAT.params;
  const h = N.ETAT.histogramme;
  const n = h.length;
  const binW = (cfg.X_MAX - cfg.X_MIN) / n;
  const hMax = Math.max(1, Math.max.apply(null, Array.from(h)));
  // théorie + éventuelle enveloppe, évaluées aux centres des bins
  const th = [], env = [];
  for (let i = 0; i < n; i++) {
    const x = cfg.X_MIN + (i + 0.5) * binW;
    th.push(N.courbeTheorique(x));
    if (colonneEnv) env.push(N.enveloppeAnalytique(x));
  }
  const thMax = Math.max(1e-12, Math.max.apply(null, th));
  const envMax = Math.max(1e-12, Math.max.apply(null, env));
  let out = lignesEnTete.join('\n') + '\n';
  out += 'x_mm,compte,intensite_norm,theorie_norm' +
         (colonneEnv ? ',enveloppe_norm' : '') + '\n';
  for (let i = 0; i < n; i++) {
    const x = cfg.X_MIN + (i + 0.5) * binW;
    out += fmt(x) + ',' + h[i] + ',' + fmt(h[i] / hMax) + ',' + fmt(th[i] / thMax) +
           (colonneEnv ? ',' + fmt(env[i] / envMax) : '') + '\n';
  }
  fs.writeFileSync(nomFichier, out);
}

function lancer(nom, params, cibleEmises, avecEmergence, avecEnv) {
  const N = chargerNoyau();
  Object.assign(N.ETAT.params, params);
  const P = N.ETAT.params;
  const P0 = JSON.parse(JSON.stringify(P));
  const cliches = {};
  const seuils = avecEmergence ? [...SEUILS_EMERGENCE] : [];
  let etapes = 0;
  const t0 = Date.now();
  while (N.ETAT.compteur.emises < cibleEmises && etapes < 5e6) {
    N.pasSimulation(DT);
    etapes++;
    while (seuils.length && N.ETAT.compteur.detectees >= seuils[0]) {
      cliches[seuils[0]] = N.ETAT.histogramme.slice();
      seuils.shift();
    }
  }
  const duree = ((Date.now() - t0) / 1000).toFixed(1);
  const V = N.visibiliteMesuree();
  const lamEff = N.lambdaEffectif(P.distanceEcran);
  const dxTheo = lamEff * P.distanceEcran / P.ecartFentes;
  const entete = [
    '# mesure batch — noyau exact du simulateur (src/noyau.js), sans rendu',
    '# run: ' + nom + ' ; dt=' + DT + ' s ; cible_emises=' + cibleEmises,
    '# parametres: ' + JSON.stringify(P0),
    '# compteurs: ' + JSON.stringify(N.ETAT.compteur),
    '# visibilite_mesuree: ' + (V === null ? 'n/a' : V.toFixed(4)) +
      ' ; lambda_effectif_mm: ' + lamEff.toFixed(4) +
      ' ; ecart_franges_theorique_mm: ' + dxTheo.toFixed(2),
  ];
  ecrireCSV(path.join(RACINE, 'data', 'mesures_' + nom + '.csv'), N, entete, avecEnv);
  if (avecEmergence) {
    for (const k of SEUILS_EMERGENCE) {
      if (!cliches[k]) continue;
      const ent = [
        '# emergence — cliché à ' + k + ' corpuscules détectés (run ' + nom + ')',
        '# parametres: ' + JSON.stringify(P0),
      ];
      const cfg = N.CFG;
      const h = cliches[k];
      const n = h.length;
      const binW = (cfg.X_MAX - cfg.X_MIN) / n;
      const hMax = Math.max(1, Math.max.apply(null, Array.from(h)));
      let out = ent.join('\n') + '\nx_mm,compte,intensite_norm\n';
      for (let i = 0; i < n; i++) {
        const x = cfg.X_MIN + (i + 0.5) * binW;
        out += fmt(x) + ',' + h[i] + ',' + fmt(h[i] / hMax) + '\n';
      }
      fs.writeFileSync(path.join(RACINE, 'data', 'mesures_emergence_' + k + '.csv'), out);
    }
  }
  const resum = {
    run: nom, cible_emises: cibleEmises, dt: DT,
    parametres: P0, compteurs: N.ETAT.compteur,
    visibilite_mesuree: V, lambda_effectif_mm: lamEff,
    ecart_franges_theorique_mm: dxTheo,
    etapes: etapes, duree_s: Number(duree),
  };
  console.log('run ' + nom.padEnd(12) + ' emises=' + N.ETAT.compteur.emises +
    ' detectees=' + N.ETAT.compteur.detectees +
    ' absorbees=' + N.ETAT.compteur.absorbees +
    ' diffusees=' + N.ETAT.compteur.diffusees +
    ' indetectees=' + N.ETAT.compteur.indetectees +
    ' collisions=' + N.ETAT.compteur.collisions +
    ' V=' + (V === null ? 'n/a' : V.toFixed(3)) +
    ' [' + duree + ' s CPU]');
  return resum;
}

/* ---------------- définition des runs ---------------- */
const RUNS = [
  ['ballistique', { mode: 'ballistique', type: 'photon', debit: 200 }, 120000, false, false],
  ['helicoide',   { mode: 'helicoide',   type: 'photon', debit: 200 }, 120000, true, true],
  ['mono_fente',  { mode: 'helicoide', type: 'photon', nbFentes: 1, debit: 200 }, 60000, false, false],
  ['massif',      { mode: 'helicoide', type: 'massif', debit: 200 }, 60000, false, true],
  ['redshift',    { mode: 'helicoide', type: 'photon', epsilon: 0.3, debit: 200 }, 60000, false, true],
  ['collisions',  { mode: 'helicoide', type: 'photon', collisions: true,
                    rayonCollision: 2.0, debit: 400 }, 60000, false, true],
];

const resume = [];
for (const [nom, params, cible, em, env] of RUNS) {
  resume.push(lancer(nom, params, cible, em, env));
}
fs.writeFileSync(path.join(RACINE, 'data', 'mesures_resume.json'),
  JSON.stringify(resume, null, 2));
console.log('== ' + resume.length + ' runs -> data/mesures_*.csv + mesures_resume.json');
