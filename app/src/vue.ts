/** Mise en forme des resultats. Pure : aucun calcul, aucun acces au DOM. */

import { echapper, nombreAffiche, notationHtml, tauxAffiche, type LigneResultat } from 'aedificium-ui';
import { GAMMA_G, GAMMA_Q, type CleVerification, type CodeAlerte, type GroupeVerification, type NomNiveau, type Verification } from '../../src/maconnerie';
import { T, type Calcul, type Resultat } from './form';

const n = nombreAffiche;

export const clauses: Record<CleVerification, string> = {
  vertical: '6.1.2 · annexe G',
  elancement: '5.5.1.4',
  concentree: '6.1.3',
  'concentree-milieu': '6.1.3(5)',
  cisaillement: '6.2 · 3.6.2',
  'compression-lc': '6.2(5)',
  laterale: '6.3.1 · 5.5.5',
};

export const titreVerification = (c: CleVerification): string =>
  ({
    vertical: T('Résistance du mur', 'Wall resistance'),
    elancement: T('Élancement', 'Slenderness'),
    concentree: T('Sous l’appui', 'Under the bearing'),
    'concentree-milieu': T('À mi-hauteur, charges superposées', 'At mid-height, loads combined'),
    cisaillement: T('Cisaillement', 'Shear'),
    'compression-lc': T('Compression de la partie comprimée', 'Compression of the compressed length'),
    laterale: T('Flexion hors plan', 'Out-of-plane bending'),
  })[c];

const titreGroupe = (g: GroupeVerification): string =>
  ({
    vertical: T('Charge verticale', 'Vertical load'),
    concentree: T('Charge concentrée', 'Concentrated load'),
    contreventement: T('Contreventement', 'Bracing'),
    laterale: T('Charge latérale', 'Lateral load'),
  })[g];

export const nomNiveau = (x: NomNiveau): string =>
  ({ tete: T('Tête', 'Top'), milieu: T('Mi-hauteur', 'Mid-height'), pied: T('Pied', 'Bottom') })[x];

export const texteAlerte = (a: CodeAlerte): string =>
  ({
    'fb-limite': T('f_b dépasse la limite de 3.6.1.2(2).', 'f_b exceeds the limit of 3.6.1.2(2).'),
    'fm-limite': T('f_m dépasse la limite de 3.6.1.2(2).', 'f_m exceeds the limit of 3.6.1.2(2).'),
    'fm-sur-fb': T('f_m dépasse 2 f_b (3.6.1.2(2)).', 'f_m exceeds 2 f_b (3.6.1.2(2)).'),
    'rho-retombe': T('Excentricité en tête > 0,25 t : ρ₂ = 1,0 (5.5.1.2).', 'Top eccentricity > 0.25 t: ρ₂ = 1.0 (5.5.1.2).'),
    'raidisseur-loin': T('Bords verticaux trop éloignés pour compter (5.5.1.2(7)) : mur tenu en tête et en pied seulement.', 'Vertical edges too far apart to count (5.5.1.2(7)): wall held at top and bottom only.'),
    elancement: T('Élancement supérieur à 27 : hors du domaine de la norme.', 'Slenderness above 27: outside the scope of the standard.'),
    'section-reduite': T('Section inférieure à 0,1 m² : f_d multipliée par (0,7 + 3A).', 'Section below 0.1 m²: f_d multiplied by (0.7 + 3A).'),
    'beta-groupe': T('Groupes 2 à 4 : β = 1 (6.1.3(3)).', 'Groups 2 to 4: β = 1 (6.1.3(3)).'),
    'concentree-excentree': T('Excentricité de la charge concentrée supérieure à t/4 (6.1.3(4)).', 'Concentrated load eccentricity above t/4 (6.1.3(4)).'),
    'ab-sur-aef': T('A_b / A_ef dépasse 0,45 : rapport limité à 0,45.', 'A_b / A_ef exceeds 0.45: ratio limited to 0.45.'),
    'joints-non-remplis': T('Joints verticaux non remplis : tenir compte des actions horizontales transmises (3.6.1.2(5)).', 'Unfilled perpends: take account of the horizontal actions transmitted (3.6.1.2(5)).'),
    'alpha2-manquant': T('Panneau sur 3 ou 4 bords : saisir α₂ (annexe E) avec le μ et le h/L affichés.', 'Panel on 3 or 4 edges: enter α₂ (annex E) using the μ and h/L shown.'),
    'sigma-plafonnee': T('Contrainte favorable plafonnée à 0,15 N_Rd / t (6.3.1(4)).', 'Favourable stress capped at 0.15 N_Rd / t (6.3.1(4)).'),
    'lc-partielle': T('Le mur n’est comprimé que sur une partie de sa longueur.', 'The wall is compressed over part of its length only.'),
    'fvk-plafonnee': T('f_vk limitée par 0,065 f_b ou 0,045 f_b.', 'f_vk limited by 0.065 f_b or 0.045 f_b.'),
  })[a];

const unite = (c: CleVerification): string =>
  ({
    vertical: 'kN/m', elancement: '', concentree: 'kN', 'concentree-milieu': 'kN/m',
    cisaillement: 'kN', 'compression-lc': 'N/mm²', laterale: 'kN·m/m',
  })[c];

const decimales = (c: CleVerification): number => (c === 'laterale' || c === 'compression-lc' ? 2 : 1);

function corps(v: Verification, r: Resultat): string {
  const d = decimales(v.cle);
  const u = unite(v.cle);
  const noms: Record<CleVerification, [string, string]> = {
    vertical: ['N_Ed', 'N_Rd'], elancement: ['λ', ''], concentree: ['N_Edc', 'N_Rdc'], 'concentree-milieu': ['N_Ed', 'N_Rd'],
    cisaillement: ['V_Ed', 'V_Rd'], 'compression-lc': ['σ_max', 'f_d'], laterale: ['M_Ed', 'M_Rd'],
  };
  const [e, x] = noms[v.cle];
  if (v.taux === null) return T('Saisir α₂ (annexe E) pour conclure.', 'Enter α₂ (annex E) to conclude.');
  const signe = v.taux > 1 ? '>' : '≤';
  let plus = '';
  if (v.cle === 'vertical') {
    const p = r.niveaux.reduce((a, b) => (b.taux > a.taux ? b : a));
    plus = ` ; ${nomNiveau(p.nom).toLowerCase()}, Φ = ${n(p.phi, 3)}`;
  } else if (v.cle === 'concentree') {
    plus = ` ; β = ${n(r.concentree!.beta, 2)} ; l_efm = ${n(r.concentree!.lefm, 2)} m`;
  } else if (v.cle === 'cisaillement') {
    const c = r.cisaillement!;
    plus = ` ; l_c = ${n(c.lc, 2)} m ; σ_d = ${n(c.sigma, 2)} N/mm² ; f_vk = ${n(c.fvk, 2)} N/mm²`;
  } else if (v.cle === 'laterale') {
    const l = r.laterale!;
    const surDeuxBords = Math.abs(v.R - l.fxd1App * l.Z * 1000) < 1e-9;
    plus = surDeuxBords ? ` ; f_xd1,app = ${n(l.fxd1App, 3)} N/mm²` : ` ; μ = ${n(l.mu, 2)} ; f_xd2 = ${n(l.fxd2, 3)} N/mm²`;
  }
  const droite = v.cle === 'elancement' ? `${v.R}` : `${x} = ${n(v.R, d)} ${u}`;
  const gauche = v.cle === 'elancement' ? `${e} = ${n(v.E, 1)}` : `${e} = ${n(v.E, d)} ${u}`;
  return `${gauche} ${signe} ${droite}${plus}`;
}

const largeur = (v: number): string => (Number.isFinite(v) ? String(Math.min(100, Math.max(0, Math.round(v * 1000) / 10))) : '100');

export function verdictsHtml(r: Resultat): string {
  let html = '';
  let groupe: GroupeVerification | null = null;
  for (const v of r.verifications) {
    if (v.groupe !== groupe) {
      groupe = v.groupe;
      html += `<div class="groupe">${echapper(titreGroupe(groupe))}</div>`;
    }
    const classe = v.taux === null ? 'verdict alerte' : v.taux > 1 ? 'verdict depasse' : 'verdict ok';
    const gouverne = r.gouvernant === v.cle ? ` · ${T('gouvernant', 'governing')}` : '';
    const barre = v.taux === null ? '' : `<div class="jauge"><i style="width:${largeur(v.taux)}%"></i></div><span class="taux">${tauxAffiche(v.taux)}</span>`;
    html +=
      `<div class="${classe}" data-verification="${v.cle}"><h3>${echapper(titreVerification(v.cle))}${gouverne} ` +
      `<span class="clause">${clauses[v.cle]}</span></h3>${barre}<p>${notationHtml(corps(v, r))}</p></div>`;
  }
  if (r.alertes.length > 0) {
    html += `<div class="groupe">${echapper(T('Alertes', 'Warnings'))}</div>`;
    html += r.alertes.map((a) => `<p class="alerte">${notationHtml(texteAlerte(a))}</p>`).join('');
  }
  return html;
}

const ligne = (symbole: string, libelle: string, valeur: string): LigneResultat => ({ symbole, libelle, valeur });

export function entrees(c: Calcul): Record<'geometrie' | 'materiaux' | 'charges', LigneResultat[]> {
  const m = c.materiau;
  return {
    geometrie: [
      ligne('t', T('Épaisseur', 'Thickness'), `${n(c.t, 3)} m`),
      ligne('h', T('Hauteur libre', 'Clear height'), `${n(c.h, 2)} m`),
      ligne('L', T('Longueur', 'Length'), `${n(c.L, 2)} m`),
      ligne('', T('Tête et pied', 'Top and bottom'), c.appuis === 'dalle' ? T('Dalle béton armé', 'RC slab') : T('Plancher bois', 'Timber floor')),
      ligne('', T('Bords verticaux raidis', 'Stiffened vertical edges'), String(c.bordsVerticaux)),
    ],
    materiaux: [
      ligne('f_b', T('Résistance normalisée', 'Normalised strength'), `${n(m.fb, 1)} N/mm²`),
      ligne('f_m', T('Résistance du mortier', 'Mortar strength'), `${n(m.fm, 1)} N/mm²`),
      ligne('', T('Groupe', 'Group'), String(m.groupe)),
      ligne('K', T('Constante', 'Constant'), n(m.K, 2)),
      ligne('α', T('Exposant', 'Exponent'), n(m.alpha, 2)),
      ligne('β', T('Exposant', 'Exponent'), n(m.beta, 2)),
      ligne('f_vk0', T('Cisaillement initial', 'Initial shear strength'), `${n(m.fvk0, 2)} N/mm²`),
      ligne('f_xk1', T('Flexion, plan parallèle aux lits', 'Flexure, plane parallel to bed joints'), `${n(m.fxk1, 2)} N/mm²`),
      ligne('f_xk2', T('Flexion, plan perpendiculaire aux lits', 'Flexure, plane perpendicular to bed joints'), `${n(m.fxk2, 2)} N/mm²`),
      ligne('γ_M', T('Coefficient partiel', 'Partial factor'), n(m.gammaM, 2)),
      ligne('φ∞', T('Fluage ultime', 'Final creep'), n(m.phi, 2)),
      ligne('E/f_k', T('Rapport', 'Ratio'), n(m.KE, 0)),
    ],
    charges: [
      ligne('N_G', T('Permanente en tête', 'Permanent at top'), `${n(c.NG, 1)} kN/m`),
      ligne('N_Q', T('Variable en tête', 'Variable at top'), `${n(c.NQ, 1)} kN/m`),
      ligne('e', T('Excentricité en tête', 'Top eccentricity'), `${n(c.eTete * 1000, 1)} mm`),
      ligne('e', T('Excentricité en pied', 'Bottom eccentricity'), `${n(c.ePied * 1000, 1)} mm`),
      ligne('γ', T('Poids volumique', 'Unit weight'), `${n(c.poids, 1)} kN/m³`),
      ...(c.concentree ? [ligne('N_Edc', T('Charge concentrée', 'Concentrated load'), `${n(c.concentree.N, 1)} kN`)] : []),
      ...(c.contreventement ? [ligne('V_Ed', T('Effort de contreventement', 'Bracing force'), `${n(c.contreventement.V, 1)} kN`)] : []),
      ...(c.laterale ? [ligne('w_k', T('Charge latérale', 'Lateral load'), `${n(c.laterale.wk, 2)} kN/m²`)] : []),
    ],
  };
}

export interface BlocCalcul { titre: string; lignes: LigneResultat[]; note: null }

export function blocsResultat(r: Resultat): BlocCalcul[] {
  const bloc = (titre: string, lignes: LigneResultat[]): BlocCalcul => ({ titre, lignes, note: null });
  const out = [
    bloc(T('Maçonnerie', 'Masonry'), [
      ligne('f_k', 'K·f_b^α·f_m^β (3.1)', `${n(r.fk, 2)} N/mm²`),
      ligne('f_d', T('Résistance de calcul', 'Design strength'), `${n(r.fd, 2)} N/mm²`),
    ]),
    bloc(T('Élancement et excentricités', 'Slenderness and eccentricities'), [
      ligne(`ρ_${r.rang}`, T('Coefficient de réduction (5.5.1.2)', 'Reduction factor (5.5.1.2)'), n(r.rho, 3)),
      ligne('h_ef', T('Hauteur effective', 'Effective height'), `${n(r.hef, 2)} m`),
      ligne('λ', 'h_ef / t', n(r.lambda, 1)),
      ligne('e_init', 'h_ef / 450', `${n(r.einit * 1000, 1)} mm`),
      ligne('e_hm', T('Due à la charge latérale', 'Due to lateral load'), `${n(r.ehm * 1000, 1)} mm`),
      ligne('e_m', T('Due aux charges (6.7)', 'Due to loads (6.7)'), `${n(r.em * 1000, 1)} mm`),
      ligne('e_k', T('Due au fluage (6.8)', 'Due to creep (6.8)'), `${n(r.ek * 1000, 1)} mm`),
      ligne('e_mk', '≥ 0,05 t (6.6)', `${n(r.emk * 1000, 1)} mm`),
    ]),
  ];
  if (r.concentree) {
    const c = r.concentree;
    out.push(bloc(T('Charge concentrée', 'Concentrated load'), [
      ligne('A_b', T('Surface d’appui', 'Bearing area'), `${n(c.Ab, 4)} m²`),
      ligne('l_efm', T('Longueur diffusée à mi-hauteur', 'Spread length at mid-height'), `${n(c.lefm, 2)} m`),
      ligne('A_ef', 'l_efm·t', `${n(c.Aef, 3)} m²`),
      ligne('A_b/A_ef', T('Rapport', 'Ratio'), n(c.rapport, 3)),
      ligne('β', T('Majoration (6.11)', 'Enhancement (6.11)'), n(c.beta, 3)),
      ligne('N_Rdc', 'β·A_b·f_d', `${n(c.NRdc, 1)} kN`),
    ]));
  }
  if (r.cisaillement) {
    const c = r.cisaillement;
    out.push(bloc(T('Cisaillement', 'Shear'), [
      ligne('N', T('Charge verticale favorable, 1,0 G', 'Favourable vertical load, 1.0 G'), `${n(c.NFav, 1)} kN`),
      ligne('e', 'M / N', `${n(c.e, 3)} m`),
      ligne('l_c', T('Partie comprimée', 'Compressed length'), `${n(c.lc, 2)} m`),
      ligne('σ_d', T('Contrainte moyenne', 'Mean stress'), `${n(c.sigma, 3)} N/mm²`),
      ligne('f_vk', '(3.5) · (3.6)', `${n(c.fvk, 3)} N/mm²`),
      ligne('V_Rd', 'f_vd·t·l_c', `${n(c.VRd, 1)} kN`),
      ligne('σ_max', T('Sous charge maximale', 'Under maximum load'), `${n(c.sigmaMax, 2)} N/mm²`),
    ]));
  }
  if (r.laterale) {
    const l = r.laterale;
    out.push(bloc(T('Charge latérale', 'Lateral load'), [
      ligne('w_Ed', `${n(GAMMA_Q, 1)}·w_k`, `${n(l.wEd, 2)} kN/m²`),
      ligne('σ_d', T('Contrainte favorable retenue', 'Favourable stress used'), `${n(l.sigma, 3)} N/mm²`),
      ligne('f_xd1', '', `${n(l.fxd1, 3)} N/mm²`),
      ligne('f_xd1,app', '(6.17)', `${n(l.fxd1App, 3)} N/mm²`),
      ligne('f_xd2', '', `${n(l.fxd2, 3)} N/mm²`),
      ligne('Z', 't²/6', `${n(l.Z * 1e6, 0)} cm³/m`),
      ligne('μ', 'f_xd1,app / f_xd2', n(l.mu, 2)),
      ligne('h/L', '', n(l.hSurL, 2)),
      ligne('M_Ed', '', `${n(l.MEd, 2)} kN·m/m`),
      ligne('M_Rd', 'f_xd·Z', `${n(l.MRd, 2)} kN·m/m`),
    ]));
  }
  return out;
}

export function voletsHtml(r: Resultat, c: Calcul): string {
  const niveaux = r.niveaux
    .map((x) => {
      const pire = r.niveaux.every((y) => y.taux <= x.taux);
      return `<tr${pire ? ' class="gouverne"' : ''}><td>${echapper(nomNiveau(x.nom))}</td><td class="n">${n(x.N, 1)}</td><td class="n">${n(x.e * 1000, 1)}</td><td class="n">${n(x.phi, 3)}</td><td class="n">${n(x.NRd, 1)}</td><td class="n">${tauxAffiche(x.taux)}</td></tr>`;
    })
    .join('');
  const blocs = blocsResultat(r)
    .map(
      (b) =>
        `<h3>${echapper(b.titre)}</h3><table class="grandeurs"><tbody>${b.lignes
          .map((l) => `<tr><td>${notationHtml(l.symbole)}</td><td class="libelle">${notationHtml(l.libelle)}</td><td class="valeur">${echapper(l.valeur)}</td></tr>`)
          .join('')}</tbody></table>`,
    )
    .join('');
  const m = c.materiau;
  return `<details class="volet" open><summary>${T('Charge verticale aux trois niveaux', 'Vertical load at the three levels')}</summary><div class="defile"><table class="zones"><thead><tr><th>${T('Niveau', 'Level')}</th><th>N<sub>Ed</sub> (kN/m)</th><th>e (mm)</th><th>Φ</th><th>N<sub>Rd</sub> (kN/m)</th><th>${T('taux', 'ratio')}</th></tr></thead><tbody>${niveaux}</tbody></table></div></details>
<details class="volet"><summary>${T('Détail des calculs', 'Calculation details')}</summary>${blocs}</details>
<details class="volet"><summary>${T('Coefficients et sources', 'Coefficients and sources')}</summary><ul>
<li>K = ${n(m.K, 2)}, α = ${n(m.alpha, 2)}, β = ${n(m.beta, 2)} : ${T('3.6.1.2, tableau 3.3', '3.6.1.2, table 3.3')}</li>
<li>f<sub>vk0</sub> = ${n(m.fvk0, 2)} N/mm² : ${T('tableau 3.4', 'table 3.4')} ; f<sub>xk1</sub> = ${n(m.fxk1, 2)}, f<sub>xk2</sub> = ${n(m.fxk2, 2)} N/mm² : 3.6.4</li>
<li>γ<sub>M</sub> = ${n(m.gammaM, 2)} : ${T('2.4.3, à régler selon l’Annexe nationale', '2.4.3, to be set from the National Annex')}</li>
<li>γ<sub>G</sub> = ${n(GAMMA_G, 2)}, γ<sub>Q</sub> = ${n(GAMMA_Q, 2)} : EN 1990</li></ul></details>
<details class="volet"><summary>${T('Hypothèses', 'Assumptions')}</summary><ul>${hypotheses().map((h) => `<li>${notationHtml(h)}</li>`).join('')}</ul></details>`;
}

export const hypotheses = (): string[] => [
  T('Le moment en pied vaut V_Ed × bras de levier ; l_c suit d’une distribution linéaire (6.2(3)).', 'The bottom moment equals V_Ed × lever arm; l_c follows a linear distribution (6.2(3)).'),
  T('Cisaillement et flexion : charge verticale favorable 1,0 G.', 'Shear and bending: favourable vertical load 1.0 G.'),
  T('Le moment à mi-hauteur vaut (N_t·e_t + N_b·e_b)/2 ; donner aux excentricités de tête et de pied leur signe dans un même repère.', 'The mid-height moment is (N_t·e_t + N_b·e_b)/2; give top and bottom eccentricities their signs in one reference.'),
  T('La contrainte favorable en flexion est plafonnée à 0,15 N_Rd / t à mi-hauteur : lecture de l’outil pour 6.3.1(4).', 'The favourable bending stress is capped at 0.15 N_Rd / t at mid-height: the tool’s reading of 6.3.1(4).'),
  T('Pour un panneau sur 3 ou 4 bords, α₁ = μ·α₂ donne le même taux dans les deux directions.', 'For a panel on 3 or 4 edges, α₁ = μ·α₂ gives the same ratio in both directions.'),
  T('Non traités : maçonnerie armée, murs creux, voûte horizontale (6.3.2), feu, séisme.', 'Not covered: reinforced masonry, cavity walls, arching (6.3.2), fire, seismic.'),
];

export function messageDErreur(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
