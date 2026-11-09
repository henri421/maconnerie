# maconnerie

Vérification d'un **mur en maçonnerie non armée** selon l'**EN 1996-1-1:2005+A1:2012** : charge verticale
(6.1), charge concentrée (6.1.3), cisaillement de contreventement (6.2) et charge latérale (6.3).

Fait partie de la suite [Aedificium web](https://henri421.github.io/WebAedificium/).
Page publiée : <https://henri421.github.io/maconnerie/> (en anglais : `/en/`).

> **Aide au calcul. L'outil constate, il ne prescrit pas.** Valeurs recommandées de la norme, à régler
> selon l'Annexe nationale (γ_M, K, f_vk0, f_xk). Pour un panneau sur 3 ou 4 bords, α₂ se lit dans
> l'annexe E de la norme et se saisit. **Les valeurs ont été comparées à un calcul indépendant, pas encore
> à un logiciel du commerce.** La vérification finale incombe à l'ingénieur du projet.

## Choix déclarés

- Φ_m par les équations générales G.1 à G.4, avec le rapport E/f_k saisi.
- Plafond de la contrainte favorable en flexion : 0,15 N_Rd / t à mi-hauteur.
- Limites 0,065 f_b et 0,045 f_b appliquées à f_vk.
- Superposition sous charge concentrée à mi-hauteur, sur la longueur diffusée.

## Hors périmètre

Maçonnerie armée, précontrainte ou confinée, murs creux, voûte horizontale (6.3.2), feu, séisme.
