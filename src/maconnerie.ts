/**
 * Noyau de calcul : mur en maconnerie non armee, EN 1996-1-1:2005+A1:2012.
 *
 * Unites : m, kN, kN/m, kN/m2 pour la geometrie et les actions ; N/mm2 pour les
 * resistances. Aucune dependance au DOM.
 */

export type Famille = 'terre-cuite' | 'silico' | 'beton' | 'cellulaire' | 'reconstituee' | 'naturelle';
export type Mortier = 'courant' | 'mince' | 'allege-600' | 'allege-800';
export type Groupe = 1 | 2 | 3 | 4;

export const GAMMA_G = 1.35;
export const GAMMA_Q = 1.5;
export const ELANCEMENT_MAX = 27;

export interface Tableau {
  K: number | null;
  alpha: number;
  beta: number;
  fvk0: number | null;
  fxk1: number | null;
  fxk2: number | null;
}

type LigneK = readonly [number | null, number | null, number | null, number | null];
// Tableau 3.3 : usage courant, joint mince, allege 600-800, allege 800-1300.
const TABLE_K: Record<Famille, Partial<Record<Groupe, LigneK>>> = {
  'terre-cuite': { 1: [0.55, 0.75, 0.3, 0.4], 2: [0.45, 0.7, 0.25, 0.3], 3: [0.35, 0.5, 0.2, 0.25], 4: [0.35, 0.35, 0.2, 0.25] },
  silico: { 1: [0.55, 0.8, null, null], 2: [0.45, 0.65, null, null] },
  beton: { 1: [0.55, 0.8, 0.45, 0.45], 2: [0.45, 0.65, 0.45, 0.45], 3: [0.4, 0.5, null, null], 4: [0.35, null, null, null] },
  cellulaire: { 1: [0.55, 0.8, 0.45, 0.45] },
  reconstituee: { 1: [0.45, 0.75, null, null] },
  naturelle: { 1: [0.45, null, null, null] },
};

const INDICE_MORTIER: Record<Mortier, 0 | 1 | 2 | 3> = { courant: 0, mince: 1, 'allege-600': 2, 'allege-800': 3 };

function fvk0DeTableau(f: Famille, m: Mortier, fm: number): number {
  if (m === 'allege-600' || m === 'allege-800') return 0.15;
  if (m === 'mince') return f === 'silico' ? 0.4 : 0.3; // tableau 3.4
  if (fm >= 10) return f === 'terre-cuite' ? 0.3 : 0.2;
  if (fm >= 2.5) return f === 'terre-cuite' ? 0.2 : 0.15;
  return 0.1;
}

function fxk1DeTableau(f: Famille, m: Mortier, fm: number): number | null {
  if (m === 'courant') return fm >= 5 || f === 'terre-cuite' ? 0.1 : 0.05;
  if (m === 'mince') return { 'terre-cuite': 0.15, silico: 0.2, beton: 0.2, cellulaire: 0.15, reconstituee: null, naturelle: 0.15 }[f];
  return f === 'terre-cuite' || f === 'cellulaire' ? 0.1 : null;
}

/** NOTE 2 du 3.6.3(3) : beton cellulaire de masse volumique seche < 400 kg/m3 a part. */
function fxk2DeTableau(f: Famille, m: Mortier, fm: number, cellulaireLeger = false): number | null {
  if (f === 'cellulaire' && cellulaireLeger) return m === 'courant' || m === 'mince' ? 0.2 : 0.15;
  if (m === 'courant') return fm >= 5 ? 0.4 : 0.2;
  if (m === 'mince') return { 'terre-cuite': 0.15, silico: 0.3, beton: 0.3, cellulaire: 0.3, reconstituee: null, naturelle: 0.15 }[f];
  return f === 'terre-cuite' ? 0.1 : f === 'cellulaire' ? 0.15 : null;
}

/** Valeurs tabulees de la norme ; `K` nul signale une combinaison sans valeur. */
export function valeursDeTableau(f: Famille, g: Groupe, m: Mortier, fm: number, cellulaireLeger = false): Tableau {
  const K = TABLE_K[f][g]?.[INDICE_MORTIER[m]] ?? null;
  let alpha = 0.7;
  let beta = 0.3;
  if (m === 'mince') {
    // Equation 3.4 pour la terre cuite des groupes 2 et 3, sinon 3.3.
    alpha = f === 'terre-cuite' && (g === 2 || g === 3) ? 0.7 : 0.85;
    beta = 0;
  }
  return { K, alpha, beta, fvk0: fvk0DeTableau(f, m, fm), fxk1: fxk1DeTableau(f, m, fm), fxk2: fxk2DeTableau(f, m, fm, cellulaireLeger) };
}

export interface Materiau {
  groupe: Groupe;
  mortier: Mortier;
  fb: number;
  fm: number;
  K: number;
  alpha: number;
  beta: number;
  fvk0: number;
  fxk1: number;
  fxk2: number;
  gammaM: number;
  phi: number;
  /** Rapport E / fk. */
  KE: number;
  lambdaC: number;
  jointsRemplis: boolean;
  jointLongitudinal: boolean;
}

export interface Concentree { N: number; a: number; b: number; a1: number; hc: number; e: number }
export interface Contreventement { V: number; bras: number }
export interface Laterale {
  wk: number;
  appuis: 2 | 3 | 4;
  alpha2: number | null;
  /** Ajoute e_hm a la charge verticale (6.4.2) avec psi0 sur le vent. */
  cumulVertical: boolean;
  psi0: number;
}

export interface Donnees {
  t: number;
  h: number;
  L: number;
  poids: number;
  appuis: 'dalle' | 'bois';
  bordsVerticaux: 0 | 1 | 2;
  materiau: Materiau;
  NG: number;
  NQ: number;
  /** Excentricites signees en tete et en pied (m), de meme repere. */
  eTete: number;
  ePied: number;
  concentree: Concentree | null;
  contreventement: Contreventement | null;
  laterale: Laterale | null;
}

export type NomNiveau = 'tete' | 'milieu' | 'pied';
export interface Niveau { nom: NomNiveau; N: number; e: number; phi: number; NRd: number; taux: number }

export type CleVerification =
  | 'vertical' | 'elancement' | 'concentree' | 'concentree-milieu'
  | 'cisaillement' | 'compression-lc' | 'laterale';
export type GroupeVerification = 'vertical' | 'concentree' | 'contreventement' | 'laterale';

export interface Verification {
  cle: CleVerification;
  groupe: GroupeVerification;
  /** Null : verification impossible, une donnee manque. */
  taux: number | null;
  E: number;
  R: number;
}

export type CodeAlerte =
  | 'fb-limite' | 'fm-limite' | 'fm-sur-fb' | 'rho-retombe' | 'raidisseur-loin' | 'elancement'
  | 'section-reduite' | 'beta-groupe' | 'concentree-excentree' | 'ab-sur-aef' | 'joints-non-remplis'
  | 'alpha2-manquant' | 'sigma-plafonnee' | 'lc-partielle' | 'fvk-plafonnee';

export interface DetailConcentree { beta: number; lefm: number; Aef: number; Ab: number; NRdc: number; rapport: number }
export interface DetailCisaillement { NFav: number; e: number; lc: number; sigma: number; fvk: number; fvd: number; VRd: number; sigmaMax: number }
export interface DetailLaterale { wEd: number; sigma: number; fxd1: number; fxd1App: number; fxd2: number; Z: number; MEd: number; MRd: number; mu: number; hSurL: number }

export interface Resultat {
  fk: number;
  fd: number;
  fdBrut: number;
  A: number;
  rho: number;
  rang: 2 | 3 | 4;
  hef: number;
  lambda: number;
  einit: number;
  ek: number;
  em: number;
  emk: number;
  ehm: number;
  niveaux: Niveau[];
  verifications: Verification[];
  concentree: DetailConcentree | null;
  cisaillement: DetailCisaillement | null;
  laterale: DetailLaterale | null;
  alertes: CodeAlerte[];
  gouvernant: CleVerification | null;
}

const RAPPORT_IMPOSSIBLE = 99;
const taux = (E: number, R: number): number => (R > 0 ? E / R : RAPPORT_IMPOSSIBLE);

/** Annexe G, equations G.1 a G.4. */
export function phiMilieu(lambda: number, KE: number, emk: number, t: number): number {
  const r = emk / t;
  if (r >= 0.5) return 0;
  const k = lambda / Math.sqrt(KE);
  const u = (k - 0.063) / (0.73 - 1.17 * r);
  return (1 - 2 * r) * Math.exp((-u * u) / 2);
}

/** Coefficient rho_n (5.5.1.2) ; `rang` 2 quand les bords verticaux ne comptent pas. */
export function coefficientRho(
  d: Pick<Donnees, 't' | 'h' | 'L' | 'appuis' | 'bordsVerticaux' | 'eTete'>,
): { rho: number; rang: 2 | 3 | 4; retombe: boolean; loin: boolean } {
  const retombe = d.appuis === 'dalle' && Math.abs(d.eTete) > 0.25 * d.t;
  const rho2 = d.appuis === 'bois' || retombe ? 1 : 0.75;
  const { h, L, t, bordsVerticaux: n } = d;
  if (n === 1 && L < 15 * t) {
    const rho = h <= 3.5 * L ? rho2 / (1 + ((rho2 * h) / (3 * L)) ** 2) : Math.max((1.5 * L) / h, 0.3);
    return { rho, rang: 3, retombe, loin: false };
  }
  if (n === 2 && L < 30 * t) {
    const rho = h <= 1.15 * L ? rho2 / (1 + ((rho2 * h) / L) ** 2) : (0.5 * L) / h;
    return { rho, rang: 4, retombe, loin: false };
  }
  return { rho: rho2, rang: 2, retombe, loin: n > 0 };
}

export function calculer(d: Donnees): Resultat {
  const m = d.materiau;
  const alertes: CodeAlerte[] = [];
  const { t, h, L } = d;
  const courant = m.mortier === 'courant';
  const allege = m.mortier === 'allege-600' || m.mortier === 'allege-800';

  if (m.fb > (m.mortier === 'mince' ? 50 : 75)) alertes.push('fb-limite');
  if (courant && m.fm > 20) alertes.push('fm-limite');
  if (allege && m.fm > 10) alertes.push('fm-limite');
  if (courant && m.fm > 2 * m.fb) alertes.push('fm-sur-fb');

  const K = m.jointLongitudinal && courant ? m.K * 0.8 : m.K;
  const fk = K * m.fb ** m.alpha * m.fm ** m.beta;
  const fdBrut = fk / m.gammaM;
  const A = t * L;
  const fd = A < 0.1 ? fdBrut * (0.7 + 3 * A) : fdBrut;
  if (A < 0.1) alertes.push('section-reduite');

  const r = coefficientRho(d);
  if (r.retombe) alertes.push('rho-retombe');
  if (r.loin) alertes.push('raidisseur-loin');
  const hef = r.rho * h;
  const lambda = hef / t;
  if (lambda > ELANCEMENT_MAX) alertes.push('elancement');

  const pp = d.poids * t * h;
  const Nt = GAMMA_G * d.NG + GAMMA_Q * d.NQ;
  const Nm = Nt + (GAMMA_G * pp) / 2;
  const Nb = Nt + GAMMA_G * pp;
  const einit = hef / 450;
  const min = 0.05 * t;

  const lat = d.laterale;
  const ehm = lat !== null && lat.cumulVertical ? (GAMMA_Q * lat.psi0 * lat.wk * h * h) / 8 / Nm : 0;
  const Mm = (Nt * d.eTete + Nb * d.ePied) / 2;
  const em = Math.abs(Mm) / Nm + ehm + einit;
  const ek = lambda > m.lambdaC ? 0.002 * m.phi * lambda * Math.sqrt(t * em) : 0;
  const emk = Math.max(em + ek, min);

  const eT = Math.max(Math.abs(d.eTete) + einit, min);
  const eB = Math.max(Math.abs(d.ePied) + einit, min);
  const resistance = (phi: number): number => phi * t * fd * 1000;
  const niveau = (nom: NomNiveau, N: number, e: number, phi: number): Niveau => {
    const p = Math.max(0, phi);
    return { nom, N, e, phi: p, NRd: resistance(p), taux: taux(N, resistance(p)) };
  };
  const niveaux = [
    niveau('tete', Nt, eT, 1 - (2 * eT) / t),
    niveau('milieu', Nm, emk, phiMilieu(lambda, m.KE, emk, t)),
    niveau('pied', Nb, eB, 1 - (2 * eB) / t),
  ];
  const nMilieu = niveaux[1];
  const pire = niveaux.reduce((a, b) => (b.taux > a.taux ? b : a));

  const verifications: Verification[] = [
    { cle: 'vertical', groupe: 'vertical', taux: pire.taux, E: pire.N, R: pire.NRd },
    { cle: 'elancement', groupe: 'vertical', taux: lambda / ELANCEMENT_MAX, E: lambda, R: ELANCEMENT_MAX },
  ];

  // 6.1.3 : charge concentree
  let concentree: DetailConcentree | null = null;
  const c = d.concentree;
  if (c !== null) {
    const Ab = c.a * c.b;
    const ext = (c.hc / 2) * Math.tan(Math.PI / 6);
    const lefm = c.a + Math.min(ext, c.a1) + Math.min(ext, Math.max(0, L - c.a1 - c.a));
    const Aef = lefm * t;
    const rapport = Ab / Aef;
    if (rapport > 0.45) alertes.push('ab-sur-aef');
    let beta = 1;
    if (m.groupe === 1) {
      const brut = (1 + (0.3 * c.a1) / c.hc) * (1.5 - 1.1 * Math.min(rapport, 0.45));
      beta = Math.max(1, Math.min(brut, 1.25 + c.a1 / (2 * c.hc), 1.5));
    } else {
      alertes.push('beta-groupe');
    }
    if (Math.abs(c.e) > t / 4) alertes.push('concentree-excentree');
    const NRdc = beta * Ab * fd * 1000;
    concentree = { beta, lefm, Aef, Ab, NRdc, rapport };
    verifications.push({ cle: 'concentree', groupe: 'concentree', taux: taux(c.N, NRdc), E: c.N, R: NRdc });
    // 6.1.3(5) : superposition a mi-hauteur, sur la longueur diffusee.
    const E = c.N / lefm + Nm;
    verifications.push({ cle: 'concentree-milieu', groupe: 'concentree', taux: taux(E, nMilieu.NRd), E, R: nMilieu.NRd });
  }

  // 6.2 : cisaillement
  let cisaillement: DetailCisaillement | null = null;
  const v = d.contreventement;
  if (v !== null) {
    const NFav = (d.NG + pp) * L;
    const M = v.V * v.bras;
    const e = NFav > 0 ? M / NFav : Infinity;
    const lc = Math.min(L, 3 * (L / 2 - e));
    if (lc < L) alertes.push('lc-partielle');
    if (!m.jointsRemplis) alertes.push('joints-non-remplis');
    const sigma = lc > 0 ? NFav / (t * lc) / 1000 : 0;
    const brut = m.jointsRemplis ? m.fvk0 + 0.4 * sigma : 0.5 * m.fvk0 + 0.4 * sigma;
    const plafond = (m.jointsRemplis ? 0.065 : 0.045) * m.fb;
    if (brut > plafond) alertes.push('fvk-plafonnee');
    const fvk = Math.min(brut, plafond);
    const fvd = fvk / m.gammaM;
    const VRd = lc > 0 ? fvd * t * lc * 1000 : 0;
    // 6.2(5) : compression maximale sous la charge verticale la plus forte.
    const NMax = Nb * L;
    const eMax = M / NMax;
    const sigmaMax =
      eMax <= L / 6 ? (NMax / (t * L)) * (1 + (6 * eMax) / L) / 1000 : eMax < L / 2 ? (2 * NMax) / (3 * t * (L / 2 - eMax)) / 1000 : Infinity;
    cisaillement = { NFav, e, lc: Math.max(0, lc), sigma, fvk, fvd, VRd, sigmaMax };
    verifications.push({ cle: 'cisaillement', groupe: 'contreventement', taux: taux(v.V, VRd), E: v.V, R: VRd });
    verifications.push({
      cle: 'compression-lc',
      groupe: 'contreventement',
      taux: Number.isFinite(sigmaMax) ? sigmaMax / fd : RAPPORT_IMPOSSIBLE,
      E: sigmaMax,
      R: fd,
    });
  }

  // 6.3 : charge laterale
  let laterale: DetailLaterale | null = null;
  if (lat !== null) {
    const wEd = GAMMA_Q * lat.wk;
    const Nd = d.NG + pp / 2;
    const sigmaBrut = Nd / t / 1000;
    const plafond = (0.15 * nMilieu.NRd) / t / 1000;
    if (sigmaBrut > plafond) alertes.push('sigma-plafonnee');
    const sigma = Math.min(sigmaBrut, plafond);
    const fxd1 = m.fxk1 / m.gammaM;
    const fxd1App = fxd1 + sigma;
    const fxd2 = m.fxk2 / m.gammaM;
    const Z = (t * t) / 6;
    const mu = fxd1App / fxd2;
    const hSurL = h / L;
    let MEd: number;
    let MRd: number;
    let valeur: number | null;
    if (lat.appuis === 2) {
      MEd = (wEd * h * h) / 8;
      MRd = fxd1App * Z * 1000;
      valeur = taux(MEd, MRd);
    } else if (lat.alpha2 === null) {
      alertes.push('alpha2-manquant');
      MEd = 0;
      MRd = fxd2 * Z * 1000;
      valeur = null;
    } else {
      // (5.18) ; pour (5.17), alpha1 = mu.alpha2 donne le meme rapport.
      MEd = lat.alpha2 * wEd * L * L;
      MRd = fxd2 * Z * 1000;
      valeur = taux(MEd, MRd);
    }
    laterale = { wEd, sigma, fxd1, fxd1App, fxd2, Z, MEd, MRd, mu, hSurL };
    verifications.push({ cle: 'laterale', groupe: 'laterale', taux: valeur, E: MEd, R: MRd });
  }

  let gouvernant: CleVerification | null = null;
  let max = -Infinity;
  for (const x of verifications) {
    if (x.taux !== null && x.taux > max) {
      max = x.taux;
      gouvernant = x.cle;
    }
  }

  return {
    fk, fd, fdBrut, A, rho: r.rho, rang: r.rang, hef, lambda, einit, ek, em, emk, ehm,
    niveaux, verifications, concentree, cisaillement, laterale,
    alertes: [...new Set(alertes)], gouvernant,
  };
}
