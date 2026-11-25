'use strict';
/* ============================================================
   RENDU — scène 3D (Three.js) : mur fendu, écran accumulant
   les impacts, corpuscules + traînées hélicoïdales, éclats.
   ============================================================ */

let renderer = null, scene = null, camera = null, controls = null;
let toileEcran = null, texEcran = null;
let murGroup = null, ecranMesh = null, cadreEcran = null, groupeSource = null;
let horloge = null, etoileTexture = null;
const poolMeshes = [], poolTrainees = [], poolEclats = [];
const etiquettes = {};
let derniereMajTexEcran = 0, derniereMajCharte = 0, derniereMajStats = 0;

function initRendu() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0e1a);
  camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 1, 6000);
  camera.position.set(240, 175, 760);
  construireScene();
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(innerWidth, innerHeight);
    document.getElementById('conteneur3d').appendChild(renderer.domElement);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 260);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    window.addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      if (renderer) renderer.setSize(innerWidth, innerHeight);
    });
  } catch (e) {
    renderer = null;
    document.getElementById('bandeauWebgl').classList.remove('cache');
  }
  horloge = new THREE.Clock();
}

/* ---------- décor permanent ---------- */
function construireScene() {
  const lumAmb = new THREE.AmbientLight(0xffffff, 0.55);
  const lumPoint = new THREE.PointLight(0xfff2cc, 0.9, 2000);
  lumPoint.position.set(0, 40, CFG.Z_SOURCE + 30);
  const lumDir = new THREE.DirectionalLight(0xffffff, 0.5);
  lumDir.position.set(-200, 400, 400);
  scene.add(lumAmb, lumPoint, lumDir);

  const grille = new THREE.GridHelper(2600, 26, 0x2a3a5e, 0x1a2540);
  grille.position.set(0, -CFG.HAUTEUR_MUR / 2 - 30, 300);
  scene.add(grille);

  // — canon source —
  groupeSource = new THREE.Group();
  const corps = new THREE.Mesh(
    new THREE.CylinderGeometry(11, 14, 34, 24),
    new THREE.MeshStandardMaterial({ color: 0x9aa4b8, metalness: 0.7, roughness: 0.35 }));
  corps.rotation.x = Math.PI / 2;
  const bouche = new THREE.Mesh(
    new THREE.CylinderGeometry(4, 4, 3, 16),
    new THREE.MeshBasicMaterial({ color: 0xffd766 }));
  bouche.rotation.x = Math.PI / 2;
  bouche.position.z = 19;
  groupeSource.add(corps, bouche);
  groupeSource.position.set(0, 0, CFG.Z_SOURCE - 14);
  scene.add(groupeSource);

  // — écran-textile accumulant les impacts —
  toileEcran = document.createElement('canvas');
  toileEcran.width = 512; toileEcran.height = 358;
  repeindreFondEcran();
  texEcran = new THREE.CanvasTexture(toileEcran);
  ecranMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(CFG.LARGEUR_ECRAN_X, CFG.HAUTEUR_ECRAN_Y),
    new THREE.MeshBasicMaterial({ map: texEcran, side: THREE.DoubleSide }));
  ecranMesh.position.set(0, 0, P.distanceEcran + 1.5);
  scene.add(ecranMesh);
  cadreEcran = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(CFG.LARGEUR_ECRAN_X, CFG.HAUTEUR_ECRAN_Y)),
    new THREE.LineBasicMaterial({ color: 0x6ea8ff }));
  cadreEcran.position.copy(ecranMesh.position);
  scene.add(cadreEcran);

  etoileTexture = creerTextureHalo();

  ajouterEtiquette('Source (canon)', 0, 95, CFG.Z_SOURCE, 'source');
  ajouterEtiquette('Mur à fentes', 0, CFG.HAUTEUR_MUR / 2 + 45, 0, 'mur');
  ajouterEtiquette('Écran détecteur', 0, CFG.HAUTEUR_ECRAN_Y / 2 + 40, P.distanceEcran, 'ecran');

  reconstruireMur();
}

function ajouterEtiquette(texte, x, y, z, cle) {
  const cv = document.createElement('canvas');
  cv.width = 320; cv.height = 64;
  const c = cv.getContext('2d');
  c.font = '600 26px "Noto Sans", "Segoe UI", sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const l = c.measureText(texte).width;
  c.fillStyle = 'rgba(10,14,26,0.75)';
  c.fillRect(160 - l / 2 - 10, 8, l + 20, 48);
  c.fillStyle = '#d8e2f3';
  c.fillText(texte, 160, 32);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
  sp.scale.set(64, 12.8, 1);
  sp.position.set(x, y, z);
  scene.add(sp);
  etiquettes[cle] = sp;
}

function creerTextureHalo() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}

/* ---------- mur fendu ---------- */
function reconstruireMur() {
  if (murGroup) {
    scene.remove(murGroup);
    murGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  }
  murGroup = new THREE.Group();
  const c = centresFentes();
  const bornes = [-CFG.LARGEUR_MUR / 2];
  for (const xi of c) { bornes.push(xi - P.largeurFente / 2, xi + P.largeurFente / 2); }
  bornes.push(CFG.LARGEUR_MUR / 2);
  const mat = new THREE.MeshStandardMaterial({ color: 0x8a8f98, metalness: 0.45, roughness: 0.5 });
  for (let i = 0; i + 1 < bornes.length; i += 2) {
    const x1 = bornes[i], x2 = bornes[i + 1];
    if (x2 - x1 <= 0.01) continue;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(x2 - x1, CFG.HAUTEUR_MUR, CFG.EPAISSEUR_MUR), mat);
    seg.position.set((x1 + x2) / 2, 0, 0);
    murGroup.add(seg);
  }
  scene.add(murGroup);
}

/* ---------- fond de l'écran-textile ---------- */
function repeindreFondEcran() {
  const ctx = toileEcran.getContext('2d');
  ctx.fillStyle = '#0d1322';
  ctx.fillRect(0, 0, toileEcran.width, toileEcran.height);
  const c = centresFentes();
  ctx.strokeStyle = 'rgba(90,120,200,0.25)';
  for (const xi of c) {
    const px = (xi - CFG.X_MIN) / (CFG.X_MAX - CFG.X_MIN) * toileEcran.width;
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, toileEcran.height); ctx.stroke();
  }
}

/* ---------- positions dépendant de D ---------- */
function majPositionsEcran() {
  if (!ecranMesh) return;
  ecranMesh.position.z = P.distanceEcran + 1.5;
  cadreEcran.position.z = P.distanceEcran + 1.5;
  if (etiquettes.ecran) etiquettes.ecran.position.z = P.distanceEcran;
}

/* ---------- corpuscules : maillots + traînées ---------- */
function couleurParticule() { return P.type === 'photon' ? 0xffd766 : 0x69b7ff; }

function obtenirMesh(i) {
  while (poolMeshes.length <= i) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff }));
    scene.add(m);
    poolMeshes.push(m);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(64 * 3), 3));
    geo.setDrawRange(0, 0);
    const ligne = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.5 }));
    ligne.frustumCulled = false;
    scene.add(ligne);
    poolTrainees.push(ligne);
  }
  return poolMeshes[i];
}

/* traînée hélicoïdale reconstruite analytiquement en arrière
   (lisse quel que soit le débit d'images) */
function majTrainee(ligne, pp) {
  if (!ETAT.affichage.trainees) { ligne.visible = false; return; }
  ligne.visible = true;
  ligne.material.color.setHex(couleurParticule());
  const pos = ligne.geometry.attributes.position;
  const rVis = P.rayonHelice * P.echelleHelice;
  const lamV = Math.max(P.lambdaVis, 0.05);
  const pasZ = 0.35;
  const penteX = pp.vz !== 0 ? pp.vx / pp.vz : 0;
  const penteY = pp.vz !== 0 ? pp.vy / pp.vz : 0;
  let n = 0;
  for (let k = 0; k < 64; k++) {
    const zk = pp.z - k * pasZ;
    if (pp.passe && zk < 0) break;
    const ph = pp.phiVis - P.spin * 2 * Math.PI * k * pasZ / lamV;
    pos.setXYZ(n++,
      pp.xAxe - k * pasZ * penteX + rVis * Math.cos(ph),
      pp.yAxe - k * pasZ * penteY + rVis * Math.sin(ph),
      zk);
  }
  ligne.geometry.setDrawRange(0, n);
  pos.needsUpdate = true;
}

/* ---------- éclats (impacts, absorptions, diffusions) ---------- */
function obtenirEclat() {
  for (const e of poolEclats) if (!e.actif) return e;
  if (poolEclats.length >= 48) {
    let vieux = poolEclats[0];
    for (const e of poolEclats) if (e.t > vieux.t) vieux = e;
    vieux.actif = false; vieux.sp.visible = false;
    return vieux;
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: etoileTexture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  sp.scale.set(7, 7, 1);
  sp.visible = false;
  scene.add(sp);
  const e = { sp: sp, actif: false, t: 0, duree: 0.45 };
  poolEclats.push(e);
  return e;
}

/* ---------- mise à jour par image ---------- */
function majRendu(dt) {
  if (!toileEcran) return;
  // éclats à partir des événements
  if (renderer) {
    for (const ev of ETAT.evenements) {
      if (!ETAT.affichage.eclats) break;
      const e = obtenirEclat();
      e.actif = true; e.t = 0; e.sp.visible = true;
      e.sp.position.set(ev.x, ev.y, ev.z);
      if (ev.type === 'impact') { e.sp.material.color.setHex(0xffe9a0); e.sp.scale.set(7, 7, 1); }
      else if (ev.type === 'absorption') { e.sp.material.color.setHex(0xff5e5e); e.sp.scale.set(9, 9, 1); }
      else if (ev.type === 'diffusion') { e.sp.material.color.setHex(0xff9d5e); e.sp.scale.set(8, 8, 1); }
      else { e.sp.material.color.setHex(0x8fa8ff); e.sp.scale.set(4, 4, 1); }
    }
  }
  // peindre les impacts sur l'écran-textile
  const ctx = toileEcran.getContext('2d');
  for (const ev of ETAT.evenements) {
    if (ev.type !== 'impact') continue;
    const px = (ev.x - CFG.X_MIN) / (CFG.X_MAX - CFG.X_MIN) * toileEcran.width;
    const py = (1 - (ev.y + CFG.HAUTEUR_ECRAN_Y / 2) / CFG.HAUTEUR_ECRAN_Y) * toileEcran.height;
    if (px < 0 || px >= toileEcran.width || py < 0 || py >= toileEcran.height) continue;
    ctx.fillStyle = 'rgba(255,224,130,0.30)';
    ctx.beginPath(); ctx.arc(px, py, 1.3, 0, 6.2832); ctx.fill();
  }
  ETAT.evenements.length = 0;
  const maintenant = performance.now();
  if (ETAT.histogrammeSale && maintenant - derniereMajTexEcran > 150) {
    texEcran.needsUpdate = true;
    derniereMajTexEcran = maintenant;
    ETAT.histogrammeSale = false;
  }
  if (!renderer) return;
  // maillots des corpuscules
  for (let i = 0; i < ETAT.particules.length; i++) {
    const pp = ETAT.particules[i];
    const m = obtenirMesh(i);
    m.visible = true;
    m.material.color.setHex(couleurParticule());
    const rVis = P.rayonHelice * P.echelleHelice;
    m.position.set(
      pp.xAxe + rVis * Math.cos(pp.phiVis),
      pp.yAxe + rVis * Math.sin(pp.phiVis),
      pp.z);
    m.scale.setScalar(P.type === 'photon' ? 2.0 : 2.6);
    majTrainee(poolTrainees[i], pp);
  }
  for (let i = ETAT.particules.length; i < poolMeshes.length; i++) {
    poolMeshes[i].visible = false;
    poolTrainees[i].visible = false;
  }
  // éclats : vieillissement
  for (const e of poolEclats) {
    if (!e.actif) continue;
    e.t += dt;
    const a = 1 - e.t / e.duree;
    if (a <= 0) { e.actif = false; e.sp.visible = false; continue; }
    e.sp.material.opacity = a;
    e.sp.scale.multiplyScalar(1 + 0.8 * dt);
  }
}

/* ---------- vues prédéfinies ---------- */
function vueEnsemble() {
  if (!camera) return;
  camera.position.set(240, 175, 0.6 * P.distanceEcran + 250);
  if (controls) { controls.target.set(0, 0, 0.45 * P.distanceEcran + 120); controls.update(); }
}
function vueFentes() {
  if (!camera) return;
  camera.position.set(60, 38, 130);
  if (controls) { controls.target.set(0, 0, 5); controls.update(); }
}
function vueEcran() {
  if (!camera) return;
  camera.position.set(0, 90, P.distanceEcran + 700);
  if (controls) { controls.target.set(0, 0, P.distanceEcran); controls.update(); }
}

/* ---------- boucle principale ---------- */
function boucle() {
  requestAnimationFrame(boucle);
  const dt = Math.min(horloge.getDelta(), 0.05);
  if (!ETAT.enPause) pasSimulation(dt);
  majRendu(dt);
  if (renderer) {
    try { controls.update(); renderer.render(scene, camera); } catch (e) { /* rendu interrompu */ }
  }
  const maintenant = performance.now();
  if (maintenant - derniereMajCharte > 300) { dessinerCharte(); derniereMajCharte = maintenant; }
  if (maintenant - derniereMajStats > 400) { majStats(); derniereMajStats = maintenant; }
}
