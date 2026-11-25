'use strict';
/* ============================================================
   INTERFACE — commandes, statistiques, profil d'intensité,
   export CSV, démarrage.
   ============================================================ */

function $(id) { return document.getElementById(id); }

/* ---------- liaisons génériques ---------- */
function bindRange(id, cle, unite, dec, apres) {
  const el = $(id), val = $('v' + id.slice(1));
  const rafraichir = () => { val.textContent = parseFloat(el.value).toFixed(dec) + (unite || ''); };
  el.addEventListener('input', () => {
    P[cle] = parseFloat(el.value);
    rafraichir();
    if (apres) apres(false);
  });
  P[cle] = parseFloat(el.value);
  rafraichir();
  if (apres) apres(true);
}
function bindSelect(id, cle, entier, apres) {
  const el = $(id);
  const maj = () => {
    P[cle] = entier ? parseInt(el.value, 10) : el.value;
    if (apres) apres();
  };
  el.addEventListener('change', maj);
  maj();
}
function bindCheck(id, obj, cle) {
  const el = $(id);
  el.addEventListener('change', () => { obj[cle] = el.checked; });
  obj[cle] = el.checked;
}
function marquerSale() {
  ETAT.configSale = true;
  $('avertConfig').style.display = 'block';
}
function reconfigMur(initiale) {
  if (initiale) return;
  reconstruireMur();
  repeindreFondEcran();
  if (texEcran) texEcran.needsUpdate = true;
  marquerSale();
}

/* ---------- lectures « redshift » ---------- */
function majLectureRouge() {
  const lamEff = lambdaEffectif(P.distanceEcran);
  $('vLambdaEff').textContent = lamEff.toFixed(3) + ' mm';
  $('vZeff').textContent = (P.epsilon * P.distanceEcran / CFG.S0 * 100).toFixed(2) + ' %';
}

/* ---------- profil d'intensité ---------- */
const cCharte = $('charte');
const ctxCharte = cCharte.getContext('2d');
function dessinerCharte() {
  const W = cCharte.width, H = cCharte.height;
  ctxCharte.clearRect(0, 0, W, H);
  const mL = 46, mR = 10, mT = 18, mB = 26;
  const lw = W - mL - mR, lh = H - mT - mB;
  const ech = x => mL + (x - CFG.X_MIN) / (CFG.X_MAX - CFG.X_MIN) * lw;
  // grille + axes
  ctxCharte.strokeStyle = '#22304f';
  ctxCharte.fillStyle = '#8fa3c8';
  ctxCharte.font = '10px sans-serif';
  ctxCharte.textAlign = 'center';
  for (let gx = -200; gx <= 200; gx += 50) {
    ctxCharte.beginPath();
    ctxCharte.moveTo(ech(gx), mT);
    ctxCharte.lineTo(ech(gx), mT + lh);
    ctxCharte.stroke();
    ctxCharte.fillText(gx === 0 ? '0' : String(gx), ech(gx), H - 12);
  }
  ctxCharte.fillText('position x sur l\u2019écran (mm)', mL + lw / 2, H - 1);
  // histogramme (normalisé à son maximum)
  const h = ETAT.histogramme;
  let hMax = 0;
  for (let i = 0; i < h.length; i++) if (h[i] > hMax) hMax = h[i];
  if (hMax > 0) {
    const bw = lw / CFG.NB_BINS;
    ctxCharte.fillStyle = 'rgba(90,140,255,0.45)';
    for (let i = 0; i < CFG.NB_BINS; i++) {
      const bh = h[i] / hMax * lh;
      if (bh > 0) ctxCharte.fillRect(mL + i * bw, mT + lh - bh, Math.max(bw - 0.5, 0.6), bh);
    }
    ctxCharte.strokeStyle = '#7aa4ff';
    ctxCharte.lineWidth = 1;
    ctxCharte.beginPath();
    for (let i = 0; i < CFG.NB_BINS; i++) {
      const x = CFG.X_MIN + (i + 0.5) / CFG.NB_BINS * (CFG.X_MAX - CFG.X_MIN);
      const y = mT + lh - (h[i] / hMax) * lh;
      if (i === 0) ctxCharte.moveTo(ech(x), y); else ctxCharte.lineTo(ech(x), y);
    }
    ctxCharte.stroke();
  }
  // courbe théorique (normalisée à son maximum)
  if (ETAT.affichage.theorie) {
    const nb = 300;
    const th = new Array(nb);
    let thMax = 1e-12;
    for (let i = 0; i < nb; i++) {
      const x = CFG.X_MIN + (i + 0.5) / nb * (CFG.X_MAX - CFG.X_MIN);
      th[i] = courbeTheorique(x);
      if (th[i] > thMax) thMax = th[i];
    }
    ctxCharte.strokeStyle = '#ff6b5e';
    ctxCharte.setLineDash([5, 4]);
    ctxCharte.lineWidth = 1.4;
    ctxCharte.beginPath();
    for (let i = 0; i < nb; i++) {
      const x = CFG.X_MIN + (i + 0.5) / nb * (CFG.X_MAX - CFG.X_MIN);
      const y = mT + lh - Math.min(th[i] / thMax, 1) * lh;
      if (i === 0) ctxCharte.moveTo(ech(x), y); else ctxCharte.lineTo(ech(x), y);
    }
    ctxCharte.stroke();
    ctxCharte.setLineDash([]);
  }
}

/* ---------- statistiques ---------- */
function majStats() {
  const c = ETAT.compteur;
  const V = visibiliteMesuree();
  const dxThe = lambdaEffectif(P.distanceEcran) * P.distanceEcran / P.ecartFentes;
  const taux = c.emises > 0 ? (100 * c.detectees / c.emises).toFixed(1) : '0.0';
  $('stats').innerHTML =
    'émises : <b>' + c.emises + '</b> · détectées : <b>' + c.detectees + '</b> (' + taux + ' %)<br>' +
    'absorbées (mur) : <b>' + c.absorbees + '</b> · diffusées (arête) : <b>' + c.diffusees + '</b><br>' +
    'non détectées (phase) : <b>' + c.indetectees + '</b> · collisions : <b>' + c.collisions + '</b><br>' +
    'en vol : <b>' + ETAT.particules.length + '</b> · t<sub>sim</sub> : <b>' + ETAT.tSim.toFixed(1) + ' s</b><br>' +
    'écart de frange Δx = λ<sub>eff</sub>·D/d : <b>' + dxThe.toFixed(1) + ' mm</b><br>' +
    'visibilité V = (I<sub>max</sub>−I<sub>min</sub>)/(I<sub>max</sub>+I<sub>min</sub>) : <b>' +
    (V === null ? '—' : V.toFixed(3)) + '</b>';
}

/* ---------- export CSV ---------- */
function exporterCSV() {
  const c = ETAT.compteur, p = P;
  const pas = (CFG.X_MAX - CFG.X_MIN) / CFG.NB_BINS;
  const th = new Array(CFG.NB_BINS);
  let thMax = 1e-12, hMax = 0;
  for (let i = 0; i < CFG.NB_BINS; i++) {
    const x = CFG.X_MIN + (i + 0.5) * pas;
    th[i] = courbeTheorique(x);
    if (th[i] > thMax) thMax = th[i];
    if (ETAT.histogramme[i] > hMax) hMax = ETAT.histogramme[i];
  }
  const lignes = [
    '# Simulation double fente de Young — corpuscules hélicoïdaux',
    '# date : ' + new Date().toISOString(),
    '# parametres : mode=' + p.mode + ' ; type=' + p.type + ' ; lambda_mm=' + p.lambda +
      ' ; a_mm=' + p.largeurFente + ' ; d_mm=' + p.ecartFentes + ' ; N_fentes=' + p.nbFentes +
      ' ; D_mm=' + p.distanceEcran + ' ; epsilon=' + p.epsilon + ' ; divergence=' + p.divergence +
      ' ; rayon_helice_mm=' + p.rayonHelice + ' ; collisions=' + p.collisions + ' ; r_collision_mm=' + p.rayonCollision,
    '# comptages : emises=' + c.emises + ' ; detectees=' + c.detectees + ' ; absorbees=' + c.absorbees +
      ' ; diffusees=' + c.diffusees + ' ; indetectees=' + c.indetectees + ' ; collisions=' + c.collisions,
    'position_mm_centre_bin;comptage;intensite_normalisee;theorie_normalisee',
  ];
  for (let i = 0; i < CFG.NB_BINS; i++) {
    const x = CFG.X_MIN + (i + 0.5) * pas;
    const hn = hMax > 0 ? ETAT.histogramme[i] / hMax : 0;
    lignes.push(x.toFixed(3) + ';' + ETAT.histogramme[i] + ';' + hn.toFixed(5) + ';' + (th[i] / thMax).toFixed(5));
  }
  const blob = new Blob(['\uFEFF' + lignes.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'profil_intensite_' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.csv';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}

/* ---------- montage des commandes ---------- */
function lierInterface() {
  bindSelect('selMode', 'mode', false, marquerSale);
  bindSelect('selType', 'type', false, null);
  bindSelect('selSpin', 'spin', true, null);
  bindSelect('selNbFentes', 'nbFentes', true, () => reconfigMur(false));

  bindRange('rDebit', 'debit', ' /s', 0, null);
  bindRange('rVitesse', 'v', ' mm/s', 0, null);
  bindRange('rLenteur', 'ralenti', ' ×', 2, null);
  bindRange('rFaisceau', 'faisceau', ' mm', 1, marquerSale);
  bindRange('rLargeurFente', 'largeurFente', ' mm', 2, initiale => reconfigMur(initiale));
  bindRange('rEcartFentes', 'ecartFentes', ' mm', 1, initiale => reconfigMur(initiale));
  bindRange('rHauteurFente', 'hauteurFente', ' mm', 0, initiale => reconfigMur(initiale));
  bindRange('rDistanceEcran', 'distanceEcran', ' mm', 0, initiale => {
    majPositionsEcran();
    majLectureRouge();
    if (!initiale) marquerSale();
  });

  bindRange('rLambda', 'lambda', ' mm', 2, marquerSale);
  bindRange('rRayon', 'rayonHelice', ' mm', 2, null);
  bindRange('rLambdaVis', 'lambdaVis', ' mm', 1, null);
  bindRange('rEchelleHelice', 'echelleHelice', ' ×', 1, null);

  bindSelect('selDivergence', 'divergence', false, () => {
    $('ligneSigma').style.display = (P.divergence === 'gaussienne') ? 'flex' : 'none';
    marquerSale();
  });
  bindRange('rSigma', 'sigmaTheta', ' mrad', 1, marquerSale);

  bindCheck('cbCollisions', P, 'collisions');
  bindRange('rRayonCollision', 'rayonCollision', ' mm', 2, null);
  bindRange('rEpsilon', 'epsilon', '', 2, initiale => {
    majLectureRouge();
    if (!initiale) marquerSale();
  });

  bindCheck('cbTrainees', ETAT.affichage, 'trainees');
  bindCheck('cbEclats', ETAT.affichage, 'eclats');
  bindCheck('cbTheorie', ETAT.affichage, 'theorie');

  $('btnPause').addEventListener('click', () => {
    ETAT.enPause = !ETAT.enPause;
    $('btnPause').textContent = ETAT.enPause ? 'Reprendre' : 'Pause';
  });
  $('btnPurger').addEventListener('click', () => {
    purger();
    repeindreFondEcran();
    if (texEcran) texEcran.needsUpdate = true;
    $('avertConfig').style.display = 'none';
    dessinerCharte();
    majStats();
  });
  $('btnCsv').addEventListener('click', exporterCSV);
  $('btnRecentrer').addEventListener('click', vueEnsemble);
  $('btnVueEnsemble').addEventListener('click', vueEnsemble);
  $('btnVueFentes').addEventListener('click', vueFentes);
  $('btnVueEcran').addEventListener('click', vueEcran);
}

/* ---------- démarrage ---------- */
function initialiser() {
  initRendu();
  lierInterface();
  majLectureRouge();
  dessinerCharte();
  majStats();
  boucle();
}
initialiser();
