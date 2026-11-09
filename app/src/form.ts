/** Saisie textuelle de la page et conversion vers les donnees du noyau. Sans DOM. */

import { langueCourante, lireNombre } from 'aedificium-ui';
import { calculer, valeursDeTableau, type Donnees, type Famille, type Groupe, type Mortier, type Resultat, type Tableau } from '../../src/maconnerie';

export type { Resultat };
export type Calcul = Donnees;

export const T = (fr: string, en: string): string => (langueCourante() === 'en' ? en : fr);

export interface Saisie {
  t: string; h: string; L: string; poids: string;
  appuis: string; bordsVerticaux: string;
  famille: string; groupe: string; mortier: string; fb: string; fm: string;
  jointsRemplis: boolean; jointLongitudinal: boolean;
  K: string; alpha: string; beta: string; fvk0: string; fxk1: string; fxk2: string;
  gammaM: string; phi: string; KE: string; lambdaC: string;
  NG: string; NQ: string; eTete: string; ePied: string;
  Nc: string; ac: string; bc: string; a1: string; hc: string; ec: string;
  V: string; bras: string;
  wk: string; appuisLat: string; alpha2: string; cumulVent: boolean; psi0: string;
}

export const saisieParDefaut = (): Saisie => ({
  t: '0,20', h: '2,80', L: '4,00', poids: '20',
  appuis: 'dalle', bordsVerticaux: '0',
  famille: 'beton', groupe: '1', mortier: 'courant', fb: '15', fm: '10',
  jointsRemplis: true, jointLongitudinal: false,
  K: '', alpha: '', beta: '', fvk0: '', fxk1: '', fxk2: '',
  gammaM: '2,2', phi: '1,5', KE: '1000', lambdaC: '15',
  NG: '80', NQ: '30', eTete: '10', ePied: '0',
  Nc: '90', ac: '0,20', bc: '0,20', a1: '0,50', hc: '2,80', ec: '0',
  V: '40', bras: '2,80',
  wk: '0,6', appuisLat: '2', alpha2: '', cumulVent: false, psi0: '0,6',
});

export const serialiser = (s: Saisie): string => JSON.stringify(s, null, 2);

export function relire(texte: string): Saisie {
  const brut = JSON.parse(texte) as Record<string, unknown>;
  const defaut = saisieParDefaut();
  const s: Record<string, string | boolean> = { ...defaut };
  for (const [cle, val] of Object.entries(defaut)) {
    const v = brut[cle];
    if (typeof v === typeof val) s[cle] = v as string | boolean;
  }
  return s as unknown as Saisie;
}

export const tableauDe = (s: Saisie): Tableau =>
  valeursDeTableau(s.famille as Famille, Number(s.groupe) as Groupe, s.mortier as Mortier, lireNombre(s.fm) ?? 0);

class Refus extends Error {}

function positif(texte: string, nom: string): number {
  const v = lireNombre(texte);
  if (v === null || v <= 0) throw new Refus(T(`${nom} : valeur strictement positive attendue.`, `${nom}: strictly positive value expected.`));
  return v;
}
function positifOuNul(texte: string, nom: string): number {
  const v = lireNombre(texte);
  if (v === null || v < 0) throw new Refus(T(`${nom} : valeur positive ou nulle attendue.`, `${nom}: zero or positive value expected.`));
  return v;
}
function signe(texte: string, nom: string): number {
  const v = lireNombre(texte);
  if (v === null) throw new Refus(T(`${nom} : nombre attendu.`, `${nom}: number expected.`));
  return v;
}
/** Champ vide : valeur du tableau ; pas de valeur au tableau : refus. */
function tableOuSaisie(texte: string, tableau: number | null, nom: string, nul = false): number {
  if (texte.trim() !== '') return nul ? positifOuNul(texte, nom) : positif(texte, nom);
  if (tableau === null) {
    throw new Refus(T(`${nom} : la norme ne donne pas de valeur pour cette combinaison, saisissez-la.`, `${nom}: the standard gives no value for this combination, enter one.`));
  }
  return tableau;
}

export type Lecture = { ok: true; calcul: Calcul } | { ok: false; message: string };

export function lireSaisie(s: Saisie): Lecture {
  try {
    const tab = tableauDe(s);
    const t = positif(s.t, 't');
    const h = positif(s.h, 'h');
    const L = positif(s.L, 'L');
    const Nc = positifOuNul(s.Nc, 'N_Edc');
    const V = positifOuNul(s.V, 'V_Ed');
    const wk = positifOuNul(s.wk, 'w_k');
    const alpha2 = s.alpha2.trim() === '' ? null : positif(s.alpha2, 'α₂');
    const calcul: Calcul = {
      t, h, L,
      poids: positifOuNul(s.poids, T('Poids volumique', 'Unit weight')),
      appuis: s.appuis === 'bois' ? 'bois' : 'dalle',
      bordsVerticaux: Number(s.bordsVerticaux) as 0 | 1 | 2,
      materiau: {
        groupe: Number(s.groupe) as Groupe,
        mortier: s.mortier as Mortier,
        fb: positif(s.fb, 'f_b'),
        fm: positif(s.fm, 'f_m'),
        K: tableOuSaisie(s.K, tab.K, 'K'),
        alpha: tableOuSaisie(s.alpha, tab.alpha, 'α'),
        beta: tableOuSaisie(s.beta, tab.beta, 'β', true),
        fvk0: tableOuSaisie(s.fvk0, tab.fvk0, 'f_vk0'),
        fxk1: wk > 0 ? tableOuSaisie(s.fxk1, tab.fxk1, 'f_xk1') : (lireNombre(s.fxk1) ?? tab.fxk1 ?? 0),
        fxk2: wk > 0 ? tableOuSaisie(s.fxk2, tab.fxk2, 'f_xk2') : (lireNombre(s.fxk2) ?? tab.fxk2 ?? 0),
        gammaM: positif(s.gammaM, 'γ_M'),
        phi: positifOuNul(s.phi, 'φ∞'),
        KE: positif(s.KE, 'E / f_k'),
        lambdaC: positif(s.lambdaC, 'λ_c'),
        jointsRemplis: s.jointsRemplis,
        jointLongitudinal: s.jointLongitudinal,
      },
      NG: positif(s.NG, 'N_G'),
      NQ: positifOuNul(s.NQ, 'N_Q'),
      eTete: signe(s.eTete, 'e') / 1000,
      ePied: signe(s.ePied, 'e') / 1000,
      concentree:
        Nc > 0
          ? {
              N: Nc,
              a: positif(s.ac, T('Longueur d’appui', 'Bearing length')),
              b: positif(s.bc, T('Largeur d’appui', 'Bearing width')),
              a1: positifOuNul(s.a1, 'a₁'),
              hc: positif(s.hc, 'h_c'),
              e: signe(s.ec, 'e') / 1000,
            }
          : null,
      contreventement: V > 0 ? { V, bras: positif(s.bras, T('Bras de levier', 'Lever arm')) } : null,
      laterale:
        wk > 0
          ? { wk, appuis: Number(s.appuisLat) as 2 | 3 | 4, alpha2, cumulVertical: s.cumulVent, psi0: positifOuNul(s.psi0, 'ψ₀') }
          : null,
    };
    return { ok: true, calcul };
  } catch (e) {
    if (e instanceof Refus) return { ok: false, message: e.message };
    throw e;
  }
}

export const verifier = (c: Calcul): Resultat => calculer(c);
