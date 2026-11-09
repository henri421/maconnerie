// Valeurs de reference : calcul a la main, independant du noyau (cas de la maquette).
import { describe, expect, it } from 'vitest';
import { calculer, coefficientRho, phiMilieu, valeursDeTableau, type Donnees, type Materiau } from '../src/maconnerie';

const materiau = (m: Partial<Materiau> = {}): Materiau => ({
  groupe: 1, mortier: 'courant', fb: 15, fm: 10, K: 0.55, alpha: 0.7, beta: 0.3, fvk0: 0.2, fxk1: 0.1, fxk2: 0.4,
  gammaM: 2.2, phi: 1.5, KE: 1000, lambdaC: 15, jointsRemplis: true, jointLongitudinal: false, ...m,
});
const cas = (d: Partial<Donnees> = {}): Donnees => ({
  t: 0.2, h: 2.8, L: 4, poids: 20, appuis: 'dalle', bordsVerticaux: 0, materiau: materiau(), NG: 80, NQ: 30, eTete: 0.01, ePied: 0,
  concentree: { N: 90, a: 0.2, b: 0.2, a1: 0.5, hc: 2.8, e: 0 },
  contreventement: { V: 40, bras: 2.8 },
  laterale: { wk: 0.6, appuis: 2, alpha2: null, cumulVertical: false, psi0: 0.6 },
  ...d,
});
const v = (r: ReturnType<typeof calculer>, cle: string) => r.verifications.find((x) => x.cle === cle)!;

describe('tableaux de la norme', () => {
  it('K du tableau 3.3', () => {
    expect(valeursDeTableau('beton', 2, 'courant', 10).K).toBe(0.45);
    expect(valeursDeTableau('beton', 4, 'courant', 10).K).toBe(0.35);
    expect(valeursDeTableau('terre-cuite', 3, 'mince', 10).K).toBe(0.5);
    expect(valeursDeTableau('silico', 1, 'allege-600', 5).K).toBeNull();
  });
  it('exposants : joint mince, equations 3.3 et 3.4', () => {
    expect(valeursDeTableau('silico', 1, 'mince', 10)).toMatchObject({ alpha: 0.85, beta: 0 });
    expect(valeursDeTableau('terre-cuite', 2, 'mince', 10)).toMatchObject({ alpha: 0.7, beta: 0 });
    expect(valeursDeTableau('terre-cuite', 1, 'mince', 10)).toMatchObject({ alpha: 0.85, beta: 0 });
  });
  it('fvk0 du tableau 3.4', () => {
    expect(valeursDeTableau('terre-cuite', 1, 'courant', 10).fvk0).toBe(0.3);
    expect(valeursDeTableau('beton', 1, 'courant', 5).fvk0).toBe(0.15);
    expect(valeursDeTableau('beton', 1, 'courant', 2).fvk0).toBe(0.1);
    expect(valeursDeTableau('beton', 1, 'mince', 10).fvk0).toBe(0.3);
    expect(valeursDeTableau('silico', 1, 'mince', 10).fvk0).toBe(0.4);
  });
  it('fxk1 et fxk2', () => {
    expect(valeursDeTableau('terre-cuite', 1, 'courant', 2.5)).toMatchObject({ fxk1: 0.1, fxk2: 0.2 });
    expect(valeursDeTableau('beton', 1, 'courant', 2.5)).toMatchObject({ fxk1: 0.05, fxk2: 0.2 });
    expect(valeursDeTableau('beton', 1, 'courant', 10)).toMatchObject({ fxk1: 0.1, fxk2: 0.4 });
    expect(valeursDeTableau('beton', 1, 'mince', 10)).toMatchObject({ fxk1: 0.2, fxk2: 0.3 });
  });
});

describe('cas par defaut', () => {
  const r = calculer(cas());
  it('resistance de la maconnerie', () => {
    expect(r.fk).toBeCloseTo(7.3051, 3);
    expect(r.fd).toBeCloseTo(3.3205, 3);
  });
  it('elancement', () => {
    expect(r.rho).toBe(0.75);
    expect(r.hef).toBeCloseTo(2.1, 6);
    expect(r.lambda).toBeCloseTo(10.5, 6);
    expect(r.einit).toBeCloseTo(0.004667, 5);
    expect(r.ek).toBe(0);
  });
  it('trois niveaux', () => {
    const [t, m, p] = r.niveaux;
    expect(t.N).toBeCloseTo(153, 6);
    expect(t.phi).toBeCloseTo(0.85333, 4);
    expect(t.NRd).toBeCloseTo(566.7, 1);
    expect(m.N).toBeCloseTo(160.56, 6);
    expect(m.e).toBeCloseTo(0.01, 6);
    expect(m.phi).toBeCloseTo(0.8306, 3);
    expect(p.N).toBeCloseTo(168.12, 6);
    expect(p.phi).toBeCloseTo(0.9, 6);
  });
  it('charge concentree', () => {
    expect(r.concentree!.lefm).toBeCloseTo(1.5083, 3);
    expect(r.concentree!.beta).toBeCloseTo(1.3393, 3);
    expect(r.concentree!.NRdc).toBeCloseTo(177.88, 1);
    expect(v(r, 'concentree').taux).toBeCloseTo(0.5059, 3);
  });
  it('cisaillement', () => {
    expect(r.cisaillement!.NFav).toBeCloseTo(364.8, 6);
    expect(r.cisaillement!.lc).toBe(4);
    expect(r.cisaillement!.sigma).toBeCloseTo(0.456, 4);
    expect(r.cisaillement!.fvk).toBeCloseTo(0.3824, 4);
    expect(r.cisaillement!.VRd).toBeCloseTo(139.05, 1);
    expect(r.cisaillement!.sigmaMax).toBeCloseTo(1.05, 2);
  });
  it('flexion laterale, plafond de la contrainte', () => {
    expect(r.laterale!.sigma).toBeCloseTo(0.4135, 3);
    expect(r.alertes).toContain('sigma-plafonnee');
    expect(r.laterale!.MEd).toBeCloseTo(0.882, 3);
    expect(v(r, 'laterale').taux).toBeCloseTo(0.2883, 3);
  });
  it('le plus grand taux gouverne', () => {
    expect(r.gouvernant).toBe('concentree');
  });
});

describe('hauteur effective', () => {
  const base = { t: 0.2, h: 2.8, L: 4, appuis: 'dalle' as const, eTete: 0 };
  it('rho4 sur deux bords', () => {
    const r = coefficientRho({ ...base, bordsVerticaux: 2 });
    expect(r.rang).toBe(4);
    expect(r.rho).toBeCloseTo(0.75 / (1 + ((0.75 * 2.8) / 4) ** 2), 6);
  });
  it('rho3 sur un bord et h > 3,5 L', () => {
    const r = coefficientRho({ ...base, h: 6, L: 1.5, bordsVerticaux: 1 });
    expect(r.rho).toBeCloseTo(0.375, 6);
  });
  it('rho4 quand h > 1,15 L', () => {
    expect(coefficientRho({ ...base, L: 2, bordsVerticaux: 2 }).rho).toBeCloseTo(0.5 * 2 / 2.8, 6);
  });
  it('raidisseurs trop eloignes : retour a rho2', () => {
    const r = coefficientRho({ ...base, L: 7, bordsVerticaux: 2 });
    expect(r).toMatchObject({ rang: 2, rho: 0.75, loin: true });
  });
  it('rho2 = 1 si excentricite en tete > 0,25 t', () => {
    expect(coefficientRho({ ...base, eTete: 0.06, bordsVerticaux: 0 })).toMatchObject({ rho: 1, retombe: true });
  });
  it('plancher bois', () => {
    expect(coefficientRho({ ...base, appuis: 'bois', bordsVerticaux: 0 }).rho).toBe(1);
  });
});

describe('cas particuliers', () => {
  it('fluage au-dela de lambda_c', () => {
    const r = calculer(cas({ h: 5, appuis: 'bois' }));
    expect(r.lambda).toBe(25);
    const em = (153 * 0.01) / 2 / (153 + (1.35 * 20) / 2) + 5 / 450;
    expect(r.em).toBeCloseTo(em, 6);
    expect(r.ek).toBeCloseTo(0.002 * 1.5 * 25 * Math.sqrt(0.2 * r.em), 6);
    expect(r.emk).toBeCloseTo(em + r.ek, 6);
  });
  it('annexe G avec E = 1000 fk retrouve G.5 a 1 % pres', () => {
    const l = 20;
    const e = 0.1;
    const G5 = (1 - 2 * e) * Math.exp(-(((l - 2) / (23 - 37 * e)) ** 2) / 2);
    expect(Math.abs(phiMilieu(l, 1000, e * 0.2, 0.2) / G5 - 1)).toBeLessThan(0.01);
  });
  it('excentricite au-dela de t/2 : resistance nulle', () => {
    const r = calculer(cas({ eTete: 0.15 }));
    expect(r.niveaux[0].phi).toBe(0);
    expect(v(r, 'vertical').taux).toBeGreaterThan(1);
  });
  it('petite section : fd reduite', () => {
    const r = calculer(cas({ L: 0.4, concentree: null, contreventement: null, laterale: null }));
    expect(r.A).toBeCloseTo(0.08, 6);
    expect(r.fd / r.fdBrut).toBeCloseTo(0.94, 6);
    expect(r.alertes).toContain('section-reduite');
  });
  it('joint longitudinal : K x 0,8', () => {
    expect(calculer(cas({ materiau: materiau({ jointLongitudinal: true }) })).fk).toBeCloseTo(7.3051 * 0.8, 3);
  });
  it('groupe 2 : beta = 1', () => {
    const r = calculer(cas({ materiau: materiau({ groupe: 2 }) }));
    expect(r.concentree!.beta).toBe(1);
    expect(r.alertes).toContain('beta-groupe');
  });
  it('beta plafonne a 1,25 + a1/(2 hc)', () => {
    const r = calculer(cas({ concentree: { N: 10, a: 0.05, b: 0.05, a1: 0.05, hc: 2.8, e: 0 } }));
    expect(r.concentree!.beta).toBeCloseTo(1.25 + 0.05 / 5.6, 6);
  });
  it('joints non remplis : equation 3.6 et plafond 0,045 fb', () => {
    const r = calculer(cas({ materiau: materiau({ jointsRemplis: false, fb: 2 }) }));
    expect(r.cisaillement!.fvk).toBeCloseTo(0.09, 6);
    expect(r.alertes).toContain('fvk-plafonnee');
  });
  it('partie comprimee reduite', () => {
    const r = calculer(cas({ contreventement: { V: 120, bras: 2.8 } }));
    const e = (120 * 2.8) / 364.8;
    expect(r.cisaillement!.lc).toBeCloseTo(3 * (2 - e), 6);
    expect(r.alertes).toContain('lc-partielle');
  });
  it('resultante hors du mur : cisaillement refuse', () => {
    const r = calculer(cas({ contreventement: { V: 400, bras: 2.8 } }));
    expect(r.cisaillement!.lc).toBe(0);
    expect(v(r, 'cisaillement').taux).toBeGreaterThan(1);
  });
  it('panneau sur 4 bords : alpha2 manquant, pas de taux', () => {
    const r = calculer(cas({ laterale: { wk: 0.6, appuis: 4, alpha2: null, cumulVertical: false, psi0: 0.6 } }));
    expect(v(r, 'laterale').taux).toBeNull();
    expect(r.alertes).toContain('alpha2-manquant');
  });
  it('panneau sur 4 bords : formule 5.18', () => {
    const r = calculer(cas({ laterale: { wk: 0.6, appuis: 4, alpha2: 0.05, cumulVertical: false, psi0: 0.6 } }));
    expect(r.laterale!.MEd).toBeCloseTo(0.72, 6);
    expect(v(r, 'laterale').taux).toBeCloseTo(0.594, 3);
    expect(r.laterale!.mu).toBeCloseTo(2.5253, 3);
  });
  it('vent cumule : e_hm augmente em', () => {
    const r = calculer(cas({ laterale: { wk: 0.6, appuis: 2, alpha2: null, cumulVertical: true, psi0: 0.6 } }));
    expect(r.ehm).toBeCloseTo((1.5 * 0.6 * 0.6 * 2.8 ** 2) / 8 / 160.56, 6);
  });
  it('verifications facultatives absentes', () => {
    const r = calculer(cas({ concentree: null, contreventement: null, laterale: null }));
    expect(r.verifications.map((x) => x.cle)).toEqual(['vertical', 'elancement']);
  });
});
