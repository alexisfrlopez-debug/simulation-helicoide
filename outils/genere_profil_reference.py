#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Génère les profils d'intensité de référence (théorie analytique du
simulateur) au format CSV — données de comparaison pour l'article.

Formules identiques à celles du simulateur (src/noyau.js) :
  enveloppe  = Σᵢ sinc²(π·a·(x−xᵢ)/(λ_eff·D))          (diffraction)
  facteur G  = |Σᵢ exp(i·2π·Φ(Lᵢ(x)))|²/N²                (gâteau de détection)
  Φ(L)       = (S0/(λ·ε))·ln(1+ε·L/S0)   [ε→0 : L/λ]     (évolution d'amplitude)
"""
import math
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
S0 = 1000.0


def centres_fentes(n, d):
    return [(i - (n - 1) / 2.0) * d for i in range(n)]


def phase_cumulee(L, lam, eps):
    if abs(eps) < 1e-12:
        return L / lam
    x = 1 + eps * L / S0
    if x <= 1e-3:
        return L / (lam * 1e-3)
    return (S0 / (lam * eps)) * math.log(x)


def facteur_interference(x, lam, a, d, n, D, eps):
    c = centres_fentes(n, d)
    if n < 2:
        return 1.0
    re, im = 0.0, 0.0
    for xi in c:
        L = math.sqrt(D * D + (x - xi) ** 2)
        ph = 2 * math.pi * phase_cumulee(L, lam, eps)
        re += math.cos(ph)
        im += math.sin(ph)
    return (re * re + im * im) / (n * n)


def enveloppe(x, lam, a, d, n, D, eps):
    c = centres_fentes(n, d)
    lam_eff = lam * (1 + eps * D / S0)
    s = 0.0
    for xi in c:
        t = math.pi * a * (x - xi) / (lam_eff * D)
        sinc = 1.0 if t == 0 else math.sin(t) / t
        s += sinc * sinc
    return s


def generer(chemin, lam, a, d, n, D, eps, titre):
    lignes = [
        '# ' + titre,
        '# Profil d\'intensité théorique — double fente de Young (unités normalisées mm)',
        f'# parametres : lambda_mm={lam} ; a_mm={a} ; d_mm={d} ; N_fentes={n} ; D_mm={D} ; epsilon={eps}',
        f'# lambda_effectif_a_l_ecran_mm={lam * (1 + eps * D / S0):.5f}',
        '# colonnes : position_mm ; enveloppe_normalisee ; facteur_interference ; '
        'intensite_helicoide_normalisee ; intensite_ballistique_normalisee',
    ]
    xs, envs, gs = [], [], []
    nb = 801
    for i in range(nb):
        x = -200 + i * 400.0 / (nb - 1)
        xs.append(x)
        envs.append(enveloppe(x, lam, a, d, n, D, eps))
        gs.append(facteur_interference(x, lam, a, d, n, D, eps))
    env_max = max(envs) or 1.0
    intensite = [e * g for e, g in zip(envs, gs)]
    int_max = max(intensite) or 1.0
    for x, e, g, it in zip(xs, envs, gs, intensite):
        lignes.append('%7.2f ; %.6f ; %.6f ; %.6f ; %.6f' % (
            x, e / env_max, g, it / int_max, e / env_max))
    chemin.write_text('\n'.join(lignes) + '\n', encoding='utf-8')
    print('OK —', chemin)


def principale():
    generer(RACINE / 'data' / 'profil_intensite_reference.csv',
            lam=0.15, a=1.6, d=4.0, n=2, D=800.0, eps=0.0,
            titre='Référence — franges de Young (epsilon = 0)')
    generer(RACINE / 'data' / 'profil_intensite_redshift_exemple.csv',
            lam=0.15, a=1.6, d=4.0, n=2, D=800.0, eps=0.3,
            titre='Exemple « décalage vers le rouge » (epsilon = +0.3 / 1000 mm)')


if __name__ == '__main__':
    principale()
