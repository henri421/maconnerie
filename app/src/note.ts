/** Contenu de la note de calcul commune. Pur : aucun calcul. */

import type { ElementNote, LigneResultat, NoteDeCalcul, VerificationNote } from 'aedificium-ui';
import { GAMMA_G, GAMMA_Q } from '../../src/maconnerie';
import { dessinMur } from './dessin';
import { T, type Calcul, type Resultat } from './form';
import { blocsResultat, clauses, entrees, hypotheses, nomNiveau, texteAlerte, titreVerification } from './vue';
import { nombreAffiche as n, tauxAffiche } from 'aedificium-ui';
import { VERSION_OUTIL } from './version';

const bloc = (titre: string, lignes: LigneResultat[]): ElementNote => ({ type: 'bloc', bloc: { titre, lignes, note: null } });

export function noteDuCalcul(c: Calcul, r: Resultat, cartouche: { projet: string; element: string; date: string }): NoteDeCalcul {
  const e = entrees(c);
  const verifications: VerificationNote[] = r.verifications.map((v) => ({
    nom: titreVerification(v.cle),
    clause: clauses[v.cle],
    taux: v.taux,
    ok: v.taux !== null && v.taux <= 1,
  }));
  const titre = T('Données', 'Input');
  return {
    cartouche: {
      version: VERSION_OUTIL,
      projet: cartouche.projet,
      element: cartouche.element.trim() === '' ? T('Mur', 'Wall') : cartouche.element,
      date: cartouche.date,
      norme: 'EN 1996-1-1:2005+A1:2012',
      outil: 'maconnerie',
    },
    sections: {
      geometrie: [
        bloc(titre, e.geometrie),
        { type: 'figure', svg: dessinMur(c, r, { cotes: true, comprimee: true }), legende: T('Élévation et coupe du mur', 'Wall elevation and section') },
      ],
      materiaux: [bloc(titre, e.materiaux)],
      hypotheses: [{ type: 'liste', items: hypotheses() }],
      charges: [bloc(titre, e.charges)],
      combinaisons: [
        {
          type: 'liste',
          items: [
            T(`ELU : ${n(GAMMA_G, 2)} G + ${n(GAMMA_Q, 2)} Q pour la charge verticale.`, `ULS: ${n(GAMMA_G, 2)} G + ${n(GAMMA_Q, 2)} Q for vertical load.`),
            T('Charge verticale favorable : 1,0 G pour le cisaillement et la flexion.', 'Favourable vertical load: 1.0 G for shear and bending.'),
          ],
        },
      ],
      calculs: [
        {
          type: 'tableau',
          titre: T('Charge verticale aux trois niveaux', 'Vertical load at the three levels'),
          entetes: [T('Niveau', 'Level'), 'N_Ed (kN/m)', 'e (mm)', 'Φ', 'N_Rd (kN/m)', T('Taux', 'Ratio')],
          lignes: r.niveaux.map((x) => [nomNiveau(x.nom), n(x.N, 1), n(x.e * 1000, 1), n(x.phi, 3), n(x.NRd, 1), tauxAffiche(x.taux)]),
        },
        ...blocsResultat(r).map((b): ElementNote => ({ type: 'bloc', bloc: b })),
      ],
    },
    verifications,
    avertissements: r.alertes.map(texteAlerte),
  };
}
