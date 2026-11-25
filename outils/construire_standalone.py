#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Construit simulation_fentes_de_Young.html : version autonome
(bibliothèques Three.js et OrbitControls embarquées — fonctionne
hors ligne, par double-clic, sous Windows et Linux).

Usage :  python3 outils/construire_standalone.py
"""
from pathlib import Path
import sys

RACINE = Path(__file__).resolve().parent.parent

MORCEAUX = [
    ('/*LIB_THREE*/', 'librairies/three.min.js'),
    ('/*LIB_ORBIT*/', 'librairies/OrbitControls.js'),
    ('/*NOYAU*/', 'src/noyau.js'),
    ('/*RENDU*/', 'src/rendu.js'),
    ('/*INTERFACE*/', 'src/interface.js'),
]


def principale():
    gabarit = (RACINE / 'src' / 'gabarit.html').read_text(encoding='utf-8')
    for marqueur, chemin in MORCEAUX:
        if marqueur not in gabarit:
            sys.exit(f"Marqueur introuvable dans le gabarit : {marqueur}")
        code = (RACINE / chemin).read_text(encoding='utf-8')
        if '</script>' in code.lower():
            sys.exit(f"Le fichier {chemin} contient '</script>' — insertion impossible")
        gabarit = gabarit.replace(marqueur, code, 1)
    for marqueur, _ in MORCEAUX:
        if marqueur in gabarit:
            sys.exit(f"Marqueur résiduel après remplacement : {marqueur}")
    sortie = RACINE / 'simulation_fentes_de_Young.html'
    sortie.write_text(gabarit, encoding='utf-8')
    print(f"OK — {sortie} ({sortie.stat().st_size} octets)")


if __name__ == '__main__':
    principale()
