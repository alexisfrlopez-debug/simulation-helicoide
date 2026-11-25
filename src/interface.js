'use strict';
/* ============================================================
   INTERFACE — commandes, statistiques, profil d'intensité,
   export CSV, démarrage.
   ============================================================ */

function $(id) { return document.getElementById(id); }

/* ---------- registre des liaisons (pour injecter des valeurs) ---------- */
const LIAISONS = {};     // clé de paramètre -> id d'élément
const RAFRAICHIRS = {};   // clé de paramètre -> fct de rafraîchissement de l'affichage

/* ---------- liaisons génériques ---------- */
function bindRange(id, cle, unite, dec, apres) {
  const el = $(id), val = $('v' + id.slice(1));
  LIAISONS[cle] = id;
  const rafraichir = () => { val.textContent = parseFloat(el.value).toFixed(dec) + (unite || ''); };
  RAFRAICHIRS[cle] = rafraichir;
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
  LIAISONS[cle] = id;
  const maj = () => {
    P[cle] = entier ? parseInt(el.value, 10) : el.value;
    if (apres) apres();
  };
  el.addEventListener('change', maj);
  maj();
}
function bindCheck(id, obj, cle) {
  const el = $(id);
  LIAISONS[cle] = id;
  el.addEventListener('change', () => { obj[cle] = el.checked; });
  obj[cle] = el.checked;
}
function marquerSale() {
  ETAT.configSale = true;
  if (ETAT.experience) ETAT.experience.modifie = true;
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
    'spin +1 : émis <b>' + c.emisPlus + '</b> · détectés <b>' + c.detectPlus + '</b>' +
    ' — spin −1 : émis <b>' + c.emisMoins + '</b> · détectés <b>' + c.detectMoins + '</b><br>' +
    'absorbées (mur) : <b>' + c.absorbees + '</b> · diffusées (arête) : <b>' + c.diffusees + '</b><br>' +
    'non détectées (phase) : <b>' + c.indetectees + '</b> · collisions : <b>' + c.collisions + '</b><br>' +
    'en vol : <b>' + ETAT.particules.length + '</b> · t<sub>sim</sub> : <b>' + ETAT.tSim.toFixed(1) + ' s</b> · graine : <b>' + ETAT.graine + '</b><br>' +
    'écart de frange Δx = λ<sub>eff</sub>·D/d : <b>' + dxThe.toFixed(1) + ' mm</b><br>' +
    'visibilité V = (I<sub>max</sub>−I<sub>min</sub>)/(I<sub>max</sub>+I<sub>min</sub>) : <b>' +
    (V === null ? '—' : V.toFixed(3)) + '</b>';
  majCarteExperience();
}

/* ============================================================
   EXPÉRIENCES DOCUMENTÉES — injection d'une maquette, carte de
   comparaison Δx mesuré / théorie / documenté, données
   personnalisées.
   ============================================================ */

const FACTEURS_UNITES = { pm: 1e-12, nm: 1e-9, 'µm': 1e-6, mm: 1e-3, cm: 1e-2, m: 1 };
const UNITES_TEXTE = [['pm', 1e-12], ['nm', 1e-9], ['µm', 1e-6], ['mm', 1e-3], ['cm', 1e-2], ['m', 1]];

/* ---------- injection programmatique de paramètres ---------- */
function imposerParametres(patch) {
  for (const cle of Object.keys(patch)) {
    P[cle] = patch[cle];
    const id = LIAISONS[cle];
    if (id) {
      const el = $(id);
      if (el.type === 'checkbox') el.checked = !!patch[cle];
      else el.value = patch[cle];
    }
    if (RAFRAICHIRS[cle]) RAFRAICHIRS[cle]();
  }
  $('ligneSigma').style.display = (P.divergence === 'gaussienne') ? 'flex' : 'none';
  // reconstructions cohérentes de la scène
  reconstruireMur();
  repeindreFondEcran();
  if (texEcran) texEcran.needsUpdate = true;
  majPositionsEcran();
  majLectureRouge();
}

/* ---------- rejouer une expérience documentée ----------
   Le rejeu préserve les réglages de MODE et de SPIN de l'utilisateur
   (hélicoïdal par défaut) ; « forcer » permet au bouton « Témoin
   balistique pur » d'imposer mode balistique + mélange des deux spins.
   Graine : canonique de l'expérience (stable d'une session à l'autre)
   si ETAT.graineCanonique, sinon la graine saisie. La purge qui suit
   réinitialise le générateur → le rejeu est identique, particule après
   particule, sur n'importe quelle machine. */
function rejouerExperience(exp, forcer) {
  const m = mapperExperience(exp);
  if (forcer) {
    if (forcer.mode) m.patch.mode = forcer.mode;
    if (forcer.spin !== undefined) m.patch.spin = forcer.spin;
  }
  imposerParametres(m.patch);
  let graine;
  if (ETAT.graineCanonique) {
    graine = graineExperience(exp.signature || exp.id);
  } else {
    const v = parseInt($('iGraine').value, 10);
    graine = (isNaN(v) ? 42 : v) >>> 0;
  }
  ETAT.graine = graine;
  $('iGraine').value = String(graine);
  purger();
  repeindreFondEcran();
  if (texEcran) texEcran.needsUpdate = true;
  ETAT.experience = {
    exp: exp,
    dxReel: m.dxReel,
    sigma: calibrerSigma(m.dxReel),
    graine: graine,
    contexte: { mode: P.mode, spin: P.spin },
    modifie: false,
  };
  $('avertConfig').style.display = 'none';
  afficherCarteExperience();
  majCarteExperience();
  vueEnsemble();
  dessinerCharte();
  majStats();
}

/* ---------- carte de comparaison (expérience active) ---------- */
function libelleMode(m) { return m === 'ballistique' ? 'balistique pur' : 'hélicoïdal'; }
function libelleSpin(s) {
  if (s === 0) return 'les deux (50/50)';
  return s > 0 ? '+1 (horaire)' : '−1 (anti-horaire)';
}
function afficherCarteExperience() {
  const ex = ETAT.experience;
  if (!ex) { $('carteExperience').classList.add('cache'); return; }
  $('carteExperience').classList.remove('cache');
  const e = ex.exp;
  $('expParticule').textContent = e.particule;
  $('expTitre').textContent = e.titre + ' (' + e.annee + ')';
  $('expDxTheo').textContent = formatLongueurM(ex.dxReel);
  $('expDxDoc').textContent = (e.dxDocumente !== undefined) ? formatLongueurM(e.dxDocumente) : 'non publié';
  $('expGraine').textContent = ex.graine + ' · ' + libelleMode(ex.contexte.mode) + ' · spin ' + libelleSpin(ex.contexte.spin);
  let donnees = 'Données : λ = ' + formatLongueurM(e.lambda) + ' · a = ' + formatLongueurM(e.a) +
    ' · d = ' + formatLongueurM(e.d) + ' · L = ' + formatLongueurM(e.L) + ' · ' +
    (e.nbFentes >= 8 ? 'réseau (' + e.nbFentes + ' fentes)' : e.nbFentes + ' fente' + (e.nbFentes > 1 ? 's' : ''));
  if (e.noteA) donnees += '<br>' + e.noteA;
  for (const nt of e.notes) donnees += '<br>' + nt;
  donnees += '<br>Δx documenté — ' + e.sourceDx;
  $('expDonnees').innerHTML = donnees;
  const ref = $('expRef');
  if (e.url) { ref.href = e.url; ref.textContent = e.reference; ref.style.display = 'block'; }
  else { ref.style.display = 'none'; }
}

function majCarteExperience() {
  const ex = ETAT.experience;
  if (!ex || !$('carteExperience')) return;
  if ($('carteExperience').classList.contains('cache')) return;
  $('expImpacts').textContent = ETAT.compteur.detectees;
  $('expModifie').classList.toggle('cache', !ex.modifie);
  const dxScene = interfrangeMesuree();
  const dxMes = (dxScene !== null && ex.sigma) ? dxScene * ex.sigma : null;
  if (dxMes !== null) {
    $('expDxMes').textContent = formatLongueurM(dxMes);
    const ecart = Math.abs(dxMes - ex.dxReel) / ex.dxReel;
    $('expEcart').textContent = (ecart * 100).toFixed(1) + ' %';
    if (P.mode === 'ballistique') {
      $('expVerdict').className = 'note att';
      $('expVerdict').textContent = 'Témoin balistique pur : écart de ' + (ecart * 100).toFixed(0) +
        ' % avec la théorie — l\u2019interfrange documenté n\u2019est PAS reproduit sans phase interne (enveloppe de diffraction seule). C\u2019est le résultat attendu du témoin : l\u2019écart mesure ce que la phase apporte.';
    } else if (ecart <= 0.08) {
      $('expVerdict').className = 'note ok';
      $('expVerdict').textContent = '✓ Compatible : le modèle hélicoïdal à phase interne reproduit l\u2019interfrange prédit (écart ≤ 8 %).';
    } else {
      $('expVerdict').className = 'note att';
      $('expVerdict').textContent = 'Écart de ' + (ecart * 100).toFixed(0) +
        ' % avec la théorie — accumulez davantage d\u2019impacts' +
        (ex.modifie ? ' ou revenez aux paramètres injectés (rejouez l\u2019expérience)' : '') + '.';
    }
  } else if (P.mode === 'ballistique' && ETAT.compteur.detectees >= 300) {
    $('expDxMes').textContent = '— aucune frange';
    $('expEcart').textContent = '—';
    $('expVerdict').className = 'note att';
    $('expVerdict').textContent = 'Témoin balistique pur : aucune périodicité détectable — sans phase interne, les franges ne se forment pas (enveloppe de diffraction seule). C\u2019est le résultat attendu du témoin.';
  } else {
    $('expDxMes').textContent = '— accumulation…';
    $('expEcart').textContent = '—';
    $('expVerdict').className = 'note';
    $('expVerdict').textContent = 'Laissez la figure se construire : l\u2019interfrange mesuré apparaît dès que la statistique suffit (~400 impacts détectés).';
  }
}

/* ---------- sélection & informations ---------- */
function majInfoExperience(exp, estCustom) {
  const el = $('infoExperience');
  if (estCustom) {
    el.innerHTML = 'Saisir λ, a, d, L et le nombre de fentes d\u2019une expérience publiée ou d\u2019un TP, puis appliquer : la maquette et la carte de comparaison utiliseront ces données réelles.';
    return;
  }
  if (!exp) {
    el.innerHTML = 'Choisir une expérience publiée charge ses données réelles (λ, fentes, distance) et construit une maquette jouable ; pendant la lecture, la carte ci-dessous compare l\u2019interfrange mesuré, la théorie λL/d et la valeur documentée.';
    return;
  }
  let s = '<b>' + exp.titre + '</b> (' + exp.annee + ')<br>' +
    'λ = ' + formatLongueurM(exp.lambda) + ' · a = ' + formatLongueurM(exp.a) +
    ' · d = ' + formatLongueurM(exp.d) + ' · L = ' + formatLongueurM(exp.L) + ' · ' +
    (exp.nbFentes >= 8 ? 'réseau (' + exp.nbFentes + ' fentes)' : exp.nbFentes + ' fente' + (exp.nbFentes > 1 ? 's' : ''));
  for (const nt of exp.notes) s += '<br>' + nt;
  s += '<br>Δx : ' + exp.sourceDx + ((exp.dxDocumente !== undefined) ? ' — ' + formatLongueurM(exp.dxDocumente) : '');
  if (exp.noteA) s += '<br><i>' + exp.noteA + '</i>';
  s += '<br><a href="' + exp.url + '" target="_blank" rel="noreferrer">' + exp.reference + '</a>';
  el.innerHTML = s;
}

/* ---------- données personnalisées ---------- */
function lireMesure(vid, uid) {
  const v = parseFloat($(vid).value.replace(',', '.'));
  if (isNaN(v)) return NaN;
  const f = FACTEURS_UNITES[$(uid).value];
  return v * f;
}
function appliquerCustom(forcer) {
  const lambda = lireMesure('cLambda', 'uLambda');
  const a = lireMesure('cA', 'uA');
  const d = lireMesure('cD', 'uD');
  const L = lireMesure('cL', 'uL');
  const n = parseInt($('cNb').value, 10);
  if (!(lambda > 0) || !(a > 0) || !(d > a) || !(L > 0) || !(n >= 1 && n <= 8)) {
    $('erreurCustom').textContent = 'Valeurs invalides : il faut λ > 0, d > a > 0, L > 0 et 1 ≤ N ≤ 8.';
    return;
  }
  $('erreurCustom').textContent = '';
  const type = $('cType').value;
  rejouerExperience({
    id: 'custom', particule: 'Particule', massif: type === 'massif',
    titre: 'Données personnalisées', annee: new Date().getFullYear(),
    lambda: lambda, a: a, d: d, L: L, nbFentes: n,
    signature: ['custom', lambda, a, d, L, n, type].join('|'),
    noteA: 'données saisies par l\u2019utilisateur',
    dxDocumente: undefined,
    sourceDx: 'Δx théorique = λL/d',
    notes: [], reference: 'paramètres fournis par l\u2019utilisateur', url: '',
  }, forcer);
}

/* ---------- montage du panneau expériences ---------- */
function lierExperiences() {
  // menus d'unités
  const remplirUnites = (id, defaut) => {
    const sel = $(id);
    for (const [t] of UNITES_TEXTE) {
      const o = document.createElement('option');
      o.value = t; o.textContent = t;
      if (t === defaut) o.selected = true;
      sel.appendChild(o);
    }
  };
  remplirUnites('uLambda', 'nm');
  remplirUnites('uA', 'µm');
  remplirUnites('uD', 'µm');
  remplirUnites('uL', 'm');

  $('selExperience').addEventListener('change', () => {
    const id = $('selExperience').value;
    $('champsCustom').classList.toggle('cache', id !== 'custom');
    $('erreurCustom').textContent = '';
    majInfoExperience(EXPERIENCES.find(e => e.id === id) || null, id === 'custom');
  });

  $('btnRejouer').addEventListener('click', () => {
    const id = $('selExperience').value;
    if (id === 'custom') { appliquerCustom(); return; }
    const exp = EXPERIENCES.find(e => e.id === id);
    if (exp) rejouerExperience(exp);
  });
  // témoin balistique pur : MÊME expérience, MÊME graine canonique, mais
  // mode balistique + mélange des deux sens de spin → le même flux de
  // corpuscules se joue sans phase interne ; seule la détection diffère.
  $('btnTemoin').addEventListener('click', () => {
    const id = $('selExperience').value;
    if (id === 'custom') { appliquerCustom({ mode: 'ballistique', spin: 0 }); return; }
    const exp = EXPERIENCES.find(e => e.id === id);
    if (exp) rejouerExperience(exp, { mode: 'ballistique', spin: 0 });
  });
  $('btnCustomAppliquer').addEventListener('click', () => appliquerCustom());
  $('btnQuitterExperience').addEventListener('click', () => {
    ETAT.experience = null;
    $('carteExperience').classList.add('cache');
  });
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
    '# parametres : mode=' + p.mode + ' ; type=' + p.type + ' ; spin=' +
      (p.spin === 0 ? 'mixte(50/50)' : (p.spin > 0 ? '+1' : '-1')) +
      ' ; graine=' + ETAT.graine + ' ; lambda_mm=' + p.lambda +
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
  bindCheck('cbCouleurSpin', ETAT.affichage, 'couleurSpin');

  // — reproductibilité —
  bindCheck('cbGraineCanonique', ETAT, 'graineCanonique');
  const elGraine = $('iGraine');
  elGraine.addEventListener('change', () => {
    const v = parseInt(elGraine.value, 10);
    ETAT.graine = (isNaN(v) ? 42 : v) >>> 0;
    elGraine.value = String(ETAT.graine);
  });

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
  lierExperiences();
  majLectureRouge();
  dessinerCharte();
  majStats();
  boucle();
}
initialiser();
