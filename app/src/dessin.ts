/** Elevation et coupe du mur. Pur : renvoie du SVG aux couleurs en dur, pour tenir seul. */

import { echapper, nombreAffiche as n, notationSvg } from 'aedificium-ui';
import type { Calcul, Resultat } from './form';
import { T } from './form';

const POLICE = "font-family=\"system-ui,-apple-system,'Segoe UI',Roboto,sans-serif\"";
const txt = (x: number, y: number, s: string, c: string, ancre = 'start', taille = 11): string =>
  `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${taille}" fill="${c}" text-anchor="${ancre}" ${POLICE}>${notationSvg(s)}</text>`;
const ligne = (x1: number, y1: number, x2: number, y2: number, c: string, l = 1, tirets = ''): string =>
  `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${c}" stroke-width="${l}"${tirets ? ` stroke-dasharray="${tirets}"` : ''}/>`;
const fleche = (x: number, y: number, dx: number, dy: number, c: string, l = 2): string => {
  const a = Math.atan2(dy, dx);
  const p = (d: number): string => `${(x + dx - 8 * Math.cos(a + d)).toFixed(1)},${(y + dy - 8 * Math.sin(a + d)).toFixed(1)}`;
  return ligne(x, y, x + dx, y + dy, c, l) + `<polygon points="${(x + dx).toFixed(1)},${(y + dy).toFixed(1)} ${p(0.4)} ${p(-0.4)}" fill="${c}"/>`;
};

export interface OptionsDessin { cotes: boolean; comprimee: boolean }

export function dessinMur(c: Calcul, r: Resultat, o: OptionsDessin): string {
  const BLEU = '#2f5d8a';
  const ROUGE = '#a8442a';
  const VERT = '#1f6f3f';
  const NOIR = '#1a1a1a';
  const GRIS = '#6a6862';
  const ech = Math.min(360 / c.L, 252 / c.h);
  const W = c.L * ech;
  const H = c.h * ech;
  const x0 = 40 + (360 - W) / 2;
  const y0 = 70 + (252 - H) / 2;
  const yB = y0 + H;
  let s = `<svg viewBox="0 0 650 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${echapper(T('Élévation et coupe du mur', 'Wall elevation and section'))}">`;
  s += `<defs><pattern id="briques" width="36" height="20" patternUnits="userSpaceOnUse"><rect width="36" height="20" fill="#f2ece0"/><path d="M0 0H36M0 10H36M18 0V10M0 10V20M36 10V20" stroke="#c8c0ae" stroke-width="1"/></pattern></defs>`;
  s += txt(220, 22, T('Élévation', 'Elevation'), '#4a4842', 'middle', 12);
  s += `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="url(#briques)" stroke="${NOIR}" stroke-width="1.3"/>`;
  for (const y of [y0 - 14, yB]) s += `<rect x="${x0 - 10}" y="${y}" width="${W + 20}" height="14" fill="#e7eaee" stroke="${NOIR}"/>`;

  const k = c.concentree;
  if (k !== null && r.concentree) {
    const xa = x0 + k.a1 * ech;
    const la = k.a * ech;
    s += `<rect x="${xa}" y="${y0 - 20}" width="${la}" height="6" fill="${ROUGE}"/>`;
    s += fleche(xa + la / 2, y0 - 50, 0, 28, ROUGE);
    s += txt(xa + la / 2 + 8, y0 - 36, `N = ${n(k.N, 0)} kN`, ROUGE);
    const prof = (k.hc / 2) * ech;
    const ext = prof * Math.tan(Math.PI / 6);
    const gauche = Math.max(x0, xa - ext);
    const droite = Math.min(x0 + W, xa + la + ext);
    s += ligne(xa, y0, gauche, y0 + prof, ROUGE, 1, '5 3') + ligne(xa + la, y0, droite, y0 + prof, ROUGE, 1, '5 3');
  }
  if (c.contreventement !== null) {
    s += fleche(x0 + W - 100, y0 - 30, 95, 0, BLEU, 2.2);
    s += txt(x0 + W - 100, y0 - 37, `V = ${n(c.contreventement.V, 0)} kN`, BLEU);
  }
  if (o.comprimee && r.cisaillement) {
    const lc = Math.min(r.cisaillement.lc, c.L) * ech;
    s += ligne(x0 + W - lc, yB + 26, x0 + W, yB + 26, VERT, 3);
    s += txt(x0 + W / 2, yB + 42, `l_c = ${n(r.cisaillement.lc, 2)} m`, VERT, 'middle');
  }
  if (o.cotes) s += txt(220, 392, `L = ${n(c.L, 2)} m · h = ${n(c.h, 2)} m`, NOIR, 'middle');

  // Coupe : l'epaisseur est dilatee, 100 px quelle qu'elle soit.
  const xc = 500;
  const lc = 100;
  const yh = 70;
  const yb = 322;
  s += txt(550, 22, T('Coupe (épaisseur dilatée)', 'Section (thickness enlarged)'), '#4a4842', 'middle', 12);
  s += `<rect x="${xc}" y="${yh}" width="${lc}" height="${yb - yh}" fill="url(#briques)" stroke="${NOIR}" stroke-width="1.3"/>`;
  for (const y of [yh - 14, yb]) s += `<rect x="${xc - 15}" y="${y}" width="${lc + 30}" height="14" fill="#e7eaee" stroke="${NOIR}"/>`;
  s += ligne(550, yh - 14, 550, yb + 14, GRIS, 1, '7 3 2 3');
  const parM = lc / c.t;
  const [t, m, p] = r.niveaux;
  const pire = r.niveaux.reduce((a, b) => (b.taux > a.taux ? b : a));
  const niv = [[t, yh], [m, (yh + yb) / 2], [p, yb]] as const;
  for (const [x, y] of niv) {
    s += txt(478, y + 4, `Φ = ${n(x.phi, 3)}`, x === pire ? ROUGE : '#4a4842', 'end', 10.5);
    const px = 550 + Math.min(x.e, c.t / 2) * parM;
    s += `<circle cx="${px.toFixed(1)}" cy="${y}" r="3.5" fill="${x === pire ? ROUGE : BLEU}"/>`;
  }
  if (c.laterale !== null) {
    for (const y of [120, 196, 272]) s += fleche(628, y, -24, 0, BLEU, 1.6);
    s += txt(632, 200, 'w', BLEU);
  }
  if (o.cotes) s += txt(550, 370, `t = ${n(c.t, 2)} m`, NOIR, 'middle');
  return `${s}</svg>`;
}
