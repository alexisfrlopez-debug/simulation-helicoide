#!/usr/bin/env node
/* ============================================================
   test_rejeu_deterministe.js — banc headless
   Vérifie les trois promesses du module « expériences documentées » :
   1. REJU À L'IDENTIQUE : chaque expérience, rejouée deux fois depuis
      deux modules noyau séparés (même graine canonique, même pas de
      temps fixe 1/60), donne des histogrammes et des compteurs
      STRICTEMENT identiques (octet par octet) ;
   2. TÉMOIN BALISTIQUE PUR : le même rejeu en mode balistique avec le
      mélange des deux sens de spin — sans phase interne, l'interfrange
      documenté n'est pas reproduit (aucune périodicité) : c'est le
      résultat attendu du témoin ;
   3. MÊME FLUX DE CORPUSCULES : émissions, absorptions et diffusions
      du témoin sont IDENTIQUES à celles du rejeu hélicoïdal (les deux
      flux aléatoires géométrie/détection sont séparés) — seule la loi
      de détection diffère.
   Usage : node outils/test_rejeu_deterministe.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'src', 'noyau.js'), 'utf8');

function chargerNoyau() {
  return new Function(SRC + '\n;return {CFG, ETAT, P, pasSimulation, purger, EXPERIENCES, ' +
    'mapperExperience, calibrerSigma, interfrangeMesuree, graineExperience};')();
}

/* exécute une expérience jusqu'à CIBLE détections ; renvoie le module */
function executer(N, exp, options) {
  preparer(N, exp, options);
  const dt = 1 / 60;                          // pas fixe = boucle navigateur
  let garde = 0;
  while (N.ETAT.compteur.detectees < CIBLE && garde < 600000) {
    N.pasSimulation(dt);
    garde++;
  }
  return N;
}

/* exécute exactement `pas` pas de simulation (comparaison de flux) */
function executerPas(N, exp, options, pas) {
  preparer(N, exp, options);
  const dt = 1 / 60;
  for (let i = 0; i < pas; i++) N.pasSimulation(dt);
  return N;
}

function preparer(N, exp, options) {
  const m = mapperExperience(exp);
  Object.assign(N.P, m.patch);
  if (options) {
    if (options.mode) N.P.mode = options.mode;
    if (options.spin !== undefined) N.P.spin = options.spin;
  }
  N.ETAT.graine = graineExperience(exp.id);   // graine canonique (comme l'interface)
  N.purger();
}

const CIBLE = 2000;
const rapport = [];
let toutOk = true;

const N0 = chargerNoyau();
const { graineExperience, mapperExperience } = N0;
for (const exp of N0.EXPERIENCES) {
  const fiche = { id: exp.id, particule: exp.particule, graine: graineExperience(exp.id) };

  // 1 — rejeu hélicoïdal ×2 : identité stricte
  const h1 = executer(chargerNoyau(), exp);
  const h2 = executer(chargerNoyau(), exp);
  fiche.helicoide = {
    detectees: h1.ETAT.compteur.detectees,
    dxMes: (function () {
      const sigma = h1.calibrerSigma(mapperExperience(exp).dxReel);
      const dx = h1.interfrangeMesuree();
      return dx !== null && sigma ? dx * sigma : null;
    })(),
  };
  fiche.identique = JSON.stringify(Array.from(h1.ETAT.histogramme)) ===
                    JSON.stringify(Array.from(h2.ETAT.histogramme)) &&
                    JSON.stringify(h1.ETAT.compteur) === JSON.stringify(h2.ETAT.compteur);

  // 2 — témoin balistique pur (les deux spins) ×2 : identité stricte
  const t1 = executer(chargerNoyau(), exp, { mode: 'ballistique', spin: 0 });
  const t2 = executer(chargerNoyau(), exp, { mode: 'ballistique', spin: 0 });
  const dxReel = mapperExperience(exp).dxReel;
  fiche.temoin = {
    detectees: t1.ETAT.compteur.detectees,
    dxMes: (function () {
      const sigma = t1.calibrerSigma(dxReel);
      const dx = t1.interfrangeMesuree();
      return dx !== null && sigma ? dx * sigma : null;
    })(),
  };
  fiche.temoin.ecartPct = fiche.temoin.dxMes === null ? null
    : +(Math.abs(fiche.temoin.dxMes - dxReel) / dxReel * 100).toFixed(1);
  fiche.identiqueTemoin = JSON.stringify(Array.from(t1.ETAT.histogramme)) ===
                          JSON.stringify(Array.from(t2.ETAT.histogramme)) &&
                          JSON.stringify(t1.ETAT.compteur) === JSON.stringify(t2.ETAT.compteur);

  // 3 — même flux de corpuscules : à nombre de PAS égal, les émissions,
  //     absorptions et diffusions sont identiques entre le rejeu
  //     hélicoïdal et le témoin balistique (le tirage du spin est toujours
  //     consommé ; la détection tire d'un flux séparé) — seule la loi de
  //     détection diffère.
  const PAS_FLUX = 15000;
  const hf = executerPas(chargerNoyau(), exp, { spin: 0 }, PAS_FLUX);
  const tf = executerPas(chargerNoyau(), exp, { mode: 'ballistique', spin: 0 }, PAS_FLUX);
  fiche.memeFlux = hf.ETAT.compteur.emises === tf.ETAT.compteur.emises &&
                   hf.ETAT.compteur.absorbees === tf.ETAT.compteur.absorbees &&
                   hf.ETAT.compteur.diffusees === tf.ETAT.compteur.diffusees;
  fiche.flux = { pas: PAS_FLUX, emises: hf.ETAT.compteur.emises,
                 absorbees: hf.ETAT.compteur.absorbees,
                 diffusees: hf.ETAT.compteur.diffusees,
                 detecteesHelicoide: hf.ETAT.compteur.detectees,
                 detecteesTemoin: tf.ETAT.compteur.detectees };

  // 4 — mélange des deux spins ≈ 50/50
  fiche.spinMix = {
    emisPlus: t1.ETAT.compteur.emisPlus, emisMoins: t1.ETAT.compteur.emisMoins,
    detectPlus: t1.ETAT.compteur.detectPlus, detectMoins: t1.ETAT.compteur.detectMoins,
  };

  // verdicts
  fiche.ok = fiche.identique && fiche.identiqueTemoin && fiche.memeFlux &&
             (fiche.temoin.dxMes === null || fiche.temoin.ecartPct > 8);
  if (!fiche.ok) toutOk = false;
  rapport.push(fiche);
}

console.log(JSON.stringify(rapport, null, 2));
console.log(toutOk
  ? '=> OK : rejeu à l\u2019identique vérifié (hélicoïdal et témoin balistique), même flux de corpuscules, témoin sans franges.'
  : '=> ÉCHEC : au moins une promesse non tenue.');
process.exit(toutOk ? 0 : 1);
