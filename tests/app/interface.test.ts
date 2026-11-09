import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lireSaisie, relire, saisieParDefaut, serialiser, verifier, type Saisie } from '../../app/src/form';
import { dessinMur } from '../../app/src/dessin';
import { noteDuCalcul } from '../../app/src/note';
import { verdictsHtml, voletsHtml } from '../../app/src/vue';

const lire = (f: string): string => readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8');
function calcule(s: Saisie) {
  const l = lireSaisie(s);
  if (!l.ok) throw new Error(l.message);
  return { c: l.calcul, r: verifier(l.calcul) };
}

describe('saisie', () => {
  it('champs vides : valeurs du tableau', () => {
    const { c } = calcule(saisieParDefaut());
    expect(c.materiau).toMatchObject({ K: 0.55, alpha: 0.7, beta: 0.3, fvk0: 0.2, fxk1: 0.1, fxk2: 0.4 });
  });
  it('une valeur saisie remplace le tableau, virgule acceptee', () => {
    expect(calcule({ ...saisieParDefaut(), K: '0,5' }).c.materiau.K).toBe(0.5);
  });
  it('combinaison sans valeur au tableau : refus explicite', () => {
    const l = lireSaisie({ ...saisieParDefaut(), famille: 'silico', mortier: 'allege-600' });
    expect(l.ok).toBe(false);
  });
  it('epaisseur nulle refusee', () => {
    expect(lireSaisie({ ...saisieParDefaut(), t: '0' }).ok).toBe(false);
  });
  it('charges nulles : verifications retirees', () => {
    const { r } = calcule({ ...saisieParDefaut(), Nc: '0', V: '0', wk: '0' });
    expect(r.verifications.map((x) => x.cle)).toEqual(['vertical', 'elancement']);
  });
  it('excentricites en mm converties en m', () => {
    expect(calcule(saisieParDefaut()).c.eTete).toBeCloseTo(0.01, 9);
  });
  it('JSON aller-retour identique, champ inconnu ignore', () => {
    const s = saisieParDefaut();
    expect(relire(serialiser(s))).toEqual(s);
    expect(relire('{"t":"0.3","x":1}').t).toBe('0.3');
  });
});

describe('rendus', () => {
  const { c, r } = calcule(saisieParDefaut());
  it('classes de verdict lues par la barre des feuilles', () => {
    expect(verdictsHtml(r)).toContain('class="verdict ok"');
    const ko = calcule({ ...saisieParDefaut(), NG: '900' }).r;
    expect(verdictsHtml(ko)).toContain('class="verdict depasse"');
    const manque = calcule({ ...saisieParDefaut(), appuisLat: '4' }).r;
    expect(verdictsHtml(manque)).toContain('class="verdict alerte"');
  });
  it('volets et dessin', () => {
    expect(voletsHtml(r, c)).toContain('<details');
    expect(dessinMur(c, r, { cotes: true, comprimee: true })).toMatch(/^<svg/);
  });
  it('note de calcul complete', () => {
    const note = noteDuCalcul(c, r, { projet: 'P', element: '', date: '2026-11-09' });
    expect(note.cartouche.norme).toContain('EN 1996-1-1');
    expect(note.verifications.length).toBe(r.verifications.length);
    expect(note.sections.calculs?.length ?? 0).toBeGreaterThan(2);
  });
});

describe('pages et barre des feuilles', () => {
  it('zone de la barre sous l en-tete', () => {
    for (const page of ['app/index.html', 'app/en/index.html']) {
      const html = lire(page);
      const zone = html.indexOf('data-role="feuilles"');
      expect(zone, page).toBeGreaterThan(html.indexOf('</header>'));
      expect(zone, page).toBeLessThan(html.indexOf('<main'));
    }
  });
  it('tous les champs de la saisie sont dans les deux pages', () => {
    for (const page of ['app/index.html', 'app/en/index.html']) {
      const html = lire(page);
      for (const cle of Object.keys(saisieParDefaut())) expect(html, `${page} ${cle}`).toContain(`data-champ="${cle}"`);
    }
  });
  it('main.ts branche la barre ; dans un projet, pas de memoire locale', () => {
    const m = lire('app/src/main.ts');
    expect(m).toContain("app: 'maconnerie'");
    expect(m).toMatch(/if \(barre\?\.dansUnProjet\(\)\) barre\.signaler\(\);\s*else memoriser\(\);/);
  });
});
