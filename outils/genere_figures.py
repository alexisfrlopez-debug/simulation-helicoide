#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Génération des figures de l'article à partir des mesures batch (data/mesures_*.csv).

Figures produites (PDF vectoriel, étiquettes en français) :
  figures/fig_principe.pdf            — schéma 3D du modèle (hélice, mur, écran)
  figures/fig_balistique_helicoide.pdf — mesure balistique vs hélicoïdal
  figures/fig_emergence.pdf           — construction particule par particule
  figures/fig_variantes.pdf           — mono-fente / massif / collisions
  figures/fig_redshift.pdf            — epsilon = 0 vs 0.3 (franges étirées)

Impression des métriques (modulation M, espacement des franges, fractions)
dans data/mesures_metriques.json pour l'article.
"""
import csv, json, math, os
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import cm

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(RACINE, 'data')
FIGS = os.path.join(RACINE, 'article', 'figures')
os.makedirs(FIGS, exist_ok=True)

plt.rcParams.update({
    'font.family': 'DejaVu Sans', 'font.size': 9,
    'axes.titlesize': 10, 'axes.labelsize': 9,
    'axes.unicode_minus': False, 'legend.fontsize': 8,
    'figure.dpi': 150, 'savefig.bbox': None,
})

# Palette sobre (saturation faible)
C_BLEU = '#3a6ea5'      # mesures
C_ROUGE = '#b03a2e'     # théorie
C_GRIS = '#666666'      # enveloppe / secondaire
C_VERT = '#2e7d5b'      # variantes
LAM, D_ECRAN, D_FENTES, A_FENTE = 0.15, 800.0, 4.0, 1.6
DX_THEO = LAM * D_ECRAN / D_FENTES        # 30 mm
DX_RED = LAM * (1 + 0.3 * D_ECRAN / 1000.0) * D_ECRAN / D_FENTES  # ~37.2 mm


def lire_csv(nom):
    """Lit un CSV de mesures ; renvoie (x, compte, intensite, theorie, enveloppe)."""
    chemin = os.path.join(DATA, nom)
    xs, c, ins, the, env = [], [], [], [], []
    with open(chemin, encoding='utf-8') as f:
        for ligne in f:
            if ligne.startswith('#') or not ligne.strip():
                continue
            parts = ligne.strip().split(',')
            if parts[0] in ('x_mm', 'x'):
                continue
            vals = [float(p) for p in parts]
            xs.append(vals[0]); c.append(vals[1])
            ins.append(vals[2] if len(vals) > 2 else 0.0)
            the.append(vals[3] if len(vals) > 3 else 0.0)
            env.append(vals[4] if len(vals) > 4 else 0.0)
    return [np.array(a) for a in (xs, c, ins, the, env)]


def modulation(x, h, dx):
    """Modulation M = amplitude de la 1re harmonique de fréquence 1/dx, normalisée."""
    sel = np.abs(x) <= 75.0
    xs, hs = x[sel], h[sel]
    if hs.sum() <= 0:
        return 0.0
    A = np.sum(hs * np.exp(2j * np.pi * xs / dx))
    return float(2.0 * abs(A) / hs.sum())


def espacement_par_harmonique(x, h, d_min, d_max, pas_scan=0.05):
    """Ecart de franges mesuré : le delta qui maximise la modulation M."""
    deltas = np.arange(d_min, d_max + 1e-9, pas_scan)
    Ms = [modulation(x, h, d) for d in deltas]
    i = int(np.argmax(Ms))
    return float(deltas[i]), float(Ms[i])


def espacement_franges(x, h):
    """Mesure de l'écart entre maxima (fenêtre centrale, histogramme lissé)."""
    k = np.ones(5) / 5.0
    lisse = np.convolve(h, k, mode='same')
    sel = np.abs(x) <= 60.0
    idx = [i for i in range(2, len(x) - 2)
           if sel[i] and lisse[i] == max(lisse[max(0, i-12):i+13])
           and lisse[i] > 0.25 * lisse.max()]
    if len(idx) < 2:
        return None, []
    pos = [x[i] for i in idx]
    diffs = np.diff(pos)
    return float(np.median(diffs)), pos


METRIQUES = {}

# ============ 1. schéma de principe (3D) ============
fig = plt.figure(figsize=(7.2, 4.4))
ax = fig.add_subplot(projection='3d')
r_vis, lam_vis = 6.0, 22.0          # rayon/pas visuels exagérés (rendu)
z_src, z_mur, z_ecr = -250, 0, 800

def helice(x0, x1, z0, z1, r, pas, n_tours, spin=1):
    """Points d'une hélice interpolée entre (x0,z0) et (x1,z1)."""
    t = np.linspace(0, 1, int(n_tours * 40))
    x = x0 + (x1 - x0) * t
    z = z0 + (z1 - z0) * t
    phi = spin * 2 * np.pi * t * n_tours
    return x, r * np.cos(phi), z, r * np.sin(phi)

# mur (plan translucide) + deux fentes
xm, ym = np.meshgrid(np.linspace(-60, 60, 2), np.linspace(-45, 45, 2))
ax.plot_surface(xm, ym, np.zeros_like(xm), alpha=0.10, color='gray', linewidth=0)
for xf in (-2, 2):
    ax.plot([xf, xf], [-8, 8], [0, 0], color=C_ROUGE, lw=2.5)
# écran (plan translucide)
xe, ye = np.meshgrid(np.linspace(-60, 60, 2), np.linspace(-45, 45, 2))
ax.plot_surface(xe, ye, 800 * np.ones_like(xe), alpha=0.10, color='gray', linewidth=0)
# profil d'intensité sur l'écran (théorie)
def profil_theo(x):
    x = np.asarray(x, dtype=float)
    def sinc(t):
        t = np.asarray(t, dtype=float)
        out = np.ones_like(t)
        nz = np.abs(t) > 1e-9
        out[nz] = np.sin(np.pi * t[nz]) / (np.pi * t[nz])
        return out
    env = sinc(A_FENTE * x / (LAM * D_ECRAN)) ** 2 + sinc(A_FENTE * (x - 4) / (LAM * D_ECRAN)) ** 2
    L1 = np.sqrt(D_ECRAN ** 2 + (x - 2) ** 2); L2 = np.sqrt(D_ECRAN ** 2 + (x + 2) ** 2)
    g = np.cos(np.pi * (L1 - L2) / LAM) ** 2
    return env * g
x_prof = np.linspace(-60, 60, 400)
y_prof = profil_theo(x_prof); y_prof = y_prof / y_prof.max() * 40
ax.plot(x_prof, y_prof, 800 * np.ones_like(x_prof), color=C_BLEU, lw=1.8)
ax.plot([0, 0], [0, 0], [z_src, z_ecr], color=C_GRIS, lw=0.7, ls=':', alpha=0.8)
# deux trajectoires hélicoïdales convergeant vers une frange brillante (x=30)
for xf, spin in ((2, 1), (-2, -1)):
    xh, yh, zh, ph = helice(0, xf, z_src, 0, r_vis, lam_vis, 250 / lam_vis, spin)
    ax.plot(xh + ph, yh, zh, color=C_VERT if xf > 0 else '#7a5aa0', lw=1.3, alpha=0.9)
    xh2, yh2, zh2, ph2 = helice(xf, 30, 0, 800, r_vis, lam_vis, 800 / lam_vis, spin)
    ax.plot(xh2 + ph2, yh2, zh2, color=C_VERT if xf > 0 else '#7a5aa0', lw=1.3, alpha=0.9)
# repères texte
ax.scatter([0], [0], [z_src], color='k', s=18)
ax.text(0, 0, z_src - 55, 'source', ha='center', fontsize=9)
ax.text(24, 40, 0, 'mur + 2 fentes', fontsize=9, color=C_ROUGE)
ax.text(-52, 38, 800, 'écran', fontsize=9)
ax.text(34, 42, 780, 'figure $I(x)$', fontsize=9, color=C_BLEU)
ax.text(12, 30, -140, 'hélices $(r,\\lambda)$', fontsize=9, color=C_VERT)
ax.set_xlim(-60, 60); ax.set_ylim(-45, 45); ax.set_zlim(-260, 860)
ax.set_box_aspect((1, 0.75, 3.1))
ax.set_xlabel('x (mm)'); ax.set_ylabel('y (mm)'); ax.set_zlabel('z (mm)', labelpad=-6)
ax.view_init(elev=17, azim=-72)
ax.set_title('Schéma du modèle : axes balistiques, hélices de rayon $r$, phase interne $\\phi=2\\pi s/\\lambda$', pad=2)
fig.savefig(os.path.join(FIGS, 'fig_principe.pdf'))
plt.close(fig)

# ============ 2. balistique vs hélicoïdal ============
x_b, c_b, i_b, t_b, _e0 = lire_csv('mesures_ballistique.csv')
x_h, c_h, i_h, t_h, e_h = lire_csv('mesures_helicoide.csv')
fig, axes = plt.subplots(2, 1, figsize=(7.0, 5.6), sharex=True, constrained_layout=True)
ax = axes[0]
ax.plot(x_b, i_b, '.', ms=2.6, color=C_BLEU, label='mesuré (histogramme, 38 000 impacts)')
ax.plot(x_b, t_b, '-', color=C_ROUGE, lw=1.2, label='théorie (enveloppe $\\mathrm{sinc}^2$)')
ax.set_title('Mode balistique pur — pas de franges (référence classique)')
ax.set_ylabel('intensité normalisée')
ax.legend(loc='upper left', bbox_to_anchor=(1.01, 1.0), frameon=False)
ax = axes[1]
ax.plot(x_h, i_h, '.', ms=2.6, color=C_BLEU, label='mesuré (19 000 impacts)')
ax.plot(x_h, t_h, '-', color=C_ROUGE, lw=1.2, label='théorie enveloppe $\\times$ gâteau $G(x)$')
ax.plot(x_h, e_h, '--', color=C_GRIS, lw=1.0, label='enveloppe seule')
ax.set_title('Mode hélicoïdal — franges de Young')
ax.set_xlabel('x sur l\'écran (mm)'); ax.set_ylabel('intensité normalisée')
ax.annotate('$\\Delta x = \\lambda D / d = 30$ mm', xy=(30, 1.0), xytext=(52, 0.62),
            arrowprops=dict(arrowstyle='->', color='k', lw=0.8), fontsize=9)
ax.legend(loc='upper left', bbox_to_anchor=(1.01, 1.0), frameon=False)
fig.savefig(os.path.join(FIGS, 'fig_balistique_helicoide.pdf'))
plt.close(fig)

METRIQUES['ballistique'] = {'M': modulation(x_b, c_b, DX_THEO)}
METRIQUES['helicoide'] = {'M': modulation(x_h, c_h, DX_THEO)}
dx_mes, M_pic = espacement_par_harmonique(x_h, c_h, 22.0, 40.0)
METRIQUES['helicoide']['espacement_mesure_mm'] = round(dx_mes, 2)
METRIQUES['helicoide']['espacement_theorique_mm'] = DX_THEO
esp, pos = espacement_franges(x_h, c_h)
METRIQUES['helicoide']['maxima_mm'] = [round(p, 1) for p in pos]

# ============ 3. émergence particule par particule ============
fig, axes = plt.subplots(2, 2, figsize=(7.2, 5.2), sharex=True, sharey=True,
                         constrained_layout=True)
for ax, k in zip(axes.flat, (100, 500, 2000, 10000)):
    x_e, c_e, i_e, _t0, _e1 = lire_csv('mesures_emergence_%d.csv' % k)
    ax.plot(x_e, i_e, '.', ms=2.6, color=C_BLEU)
    ax.plot(x_h, t_h, '-', color=C_ROUGE, lw=1.0, alpha=0.85)
    ax.set_title('%s impacts' % format(k, ',').replace(',', ' '), fontsize=9)
    ax.set_xlim(-80, 80)
for ax in axes[1]:
    ax.set_xlabel('x (mm)')
for ax in axes[:, 0]:
    ax.set_ylabel('intensité normalisée')
fig.suptitle('Construction de la figure, corpuscule après corpuscule (mode hélicoïdal)', fontsize=10)
fig.savefig(os.path.join(FIGS, 'fig_emergence.pdf'))
plt.close(fig)

# ============ 4. variantes (mono-fente, massif, collisions) ============
x_m, c_m, i_m, t_m, _e2 = lire_csv('mesures_mono_fente.csv')
x_mass, c_mass, i_mass, t_mass, e_mass = lire_csv('mesures_massif.csv')
x_col, c_col, i_col, t_col, e_col = lire_csv('mesures_collisions.csv')
fig, axes = plt.subplots(1, 3, figsize=(7.4, 2.9), sharey=True, constrained_layout=True)
ax = axes[0]
ax.plot(x_m, i_m, '.', ms=2.2, color=C_BLEU, label='mesuré')
ax.plot(x_m, t_m, '-', color=C_ROUGE, lw=1.0, label='théorie')
ax.set_title('(a) une seule fente : enveloppe', fontsize=9)
ax.set_xlabel('x (mm)')
METRIQUES['mono_fente'] = {'M': modulation(x_m, c_m, DX_THEO)}
ax = axes[1]
ax.plot(x_h, i_h, '.', ms=2.2, color=C_BLEU, label='photon')
ax.plot(x_mass, i_mass, '.', ms=2.2, color=C_VERT, label='massif')
ax.set_title('(b) photon vs massif', fontsize=9)
ax.set_xlabel('x (mm)')
METRIQUES['massif'] = {'M': modulation(x_mass, c_mass, DX_THEO)}
ax = axes[2]
ax.plot(x_h, i_h, '.', ms=2.2, color=C_BLEU, label='sans collisions')
ax.plot(x_col, i_col, '.', ms=2.2, color=C_ROUGE, label='collisions activées')
ax.set_title('(c) collisions inter-corpuscules', fontsize=9)
ax.set_xlabel('x (mm)')
METRIQUES['collisions'] = {'M': modulation(x_col, c_col, DX_THEO)}
axes[0].set_ylabel('intensité normalisée')
axes[0].legend(loc='lower center', fontsize=7, frameon=False, ncol=1,
               bbox_to_anchor=(0.5, -0.02), handletextpad=0.2)
axes[1].legend(loc='lower center', fontsize=7, frameon=False,
               bbox_to_anchor=(0.5, -0.02), handletextpad=0.2)
axes[2].legend(loc='lower center', fontsize=7, frameon=False,
               bbox_to_anchor=(0.5, -0.02), handletextpad=0.2)
fig.suptitle('Variantes : référence mono-fente, comportement photon/massif, effet des collisions', fontsize=10)
fig.savefig(os.path.join(FIGS, 'fig_variantes.pdf'))
plt.close(fig)

# ============ 5. redshift ============
x_r, c_r, i_r, t_r, e_r = lire_csv('mesures_redshift.csv')
fig, ax = plt.subplots(figsize=(7.0, 3.4), constrained_layout=True)
ax.plot(x_h, i_h, '.', ms=2.6, color=C_BLEU, label=r'mesuré, $\varepsilon=0$')
ax.plot(x_r, i_r, '.', ms=2.6, color=C_VERT, label=r'mesuré, $\varepsilon=+0{,}3$')
ax.plot(x_h, t_h, '-', color=C_ROUGE, lw=1.1, alpha=0.9,
        label=r'théorie, $\varepsilon=0$ ($\Delta x=30$ mm)')
ax.plot(x_r, t_r, '--', color='#7a5aa0', lw=1.1,
        label=r'théorie, $\varepsilon=+0{,}3$ ($\Delta x \approx 37$ mm)')
ax.set_xlabel('x sur l\'écran (mm)'); ax.set_ylabel('intensité normalisée')
ax.set_title(r"Evolution d'amplitude $\lambda(s)=\lambda\,(1+\varepsilon\, s/S_0)$ : franges étirées")
ax.set_xlim(-90, 90)
ax.legend(loc='upper left', bbox_to_anchor=(1.01, 1.0), frameon=False)
METRIQUES['redshift'] = {'M': modulation(x_r, c_r, DX_RED)}
dx_red_mes, _ = espacement_par_harmonique(x_r, c_r, 25.0, 50.0)
METRIQUES['redshift']['espacement_mesure_mm'] = round(dx_red_mes, 2)
METRIQUES['redshift']['espacement_theorique_mm'] = round(DX_RED, 2)
fig.savefig(os.path.join(FIGS, 'fig_redshift.pdf'))
plt.close(fig)

# ============ métriques : fractions et résumé ============
resume = json.load(open(os.path.join(DATA, 'mesures_resume.json'), encoding='utf-8'))
frac = {}
for r in resume:
    c = r['compteurs']
    passe = c['detectees'] + c['indetectees']
    frac[r['run']] = {
        'emises': c['emises'], 'detectees': c['detectees'],
        'absorbees': c['absorbees'], 'diffusees': c['diffusees'],
        'indetectees': c['indetectees'], 'collisions': c['collisions'],
        'fraction_detectee_par_passe': round(c['detectees'] / passe, 4) if passe else None,
    }
METRIQUES['fractions'] = frac
METRIQUES['dx_theorique_mm'] = DX_THEO
METRIQUES['dx_redshift_mm'] = DX_RED
chemin = os.path.join(DATA, 'mesures_metriques.json')
json.dump(METRIQUES, open(chemin, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
print('== figures écrites dans', FIGS)
for k, v in METRIQUES.items():
    if k != 'fractions':
        print(k, json.dumps(v, ensure_ascii=False))
print('== métriques ->', chemin)
