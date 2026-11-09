/** Cablage de l'interface : ce module ne calcule rien. */

import {
  brancherFeuilles,
  definirLangue,
  langueDuDocument,
  nombreAffiche,
  noteDeCalculHtml,
  notationHtml,
  ouvrirOuTelecharger,
  svgAutonome,
  telecharger,
  type BarreFeuilles,
  type Json,
} from 'aedificium-ui';
import { dessinMur } from './dessin';
import { lireSaisie, relire, saisieParDefaut, serialiser, T, tableauDe, verifier, type Calcul, type Resultat, type Saisie } from './form';
import { noteDuCalcul } from './note';
import { messageDErreur, verdictsHtml, voletsHtml } from './vue';
import './style.css';

definirLangue(langueDuDocument(document));

const CLE_SAISIE = 'maconnerie/saisie';
const CLE_CARTOUCHE = 'maconnerie:cartouche';

function exige<E extends Element>(selecteur: string): E {
  const e = document.querySelector<E>(selecteur);
  if (e === null) throw new Error(`Element absent : ${selecteur}`);
  return e;
}

const formulaire = exige<HTMLFormElement>('#formulaire');
const zones = {
  erreur: exige<HTMLElement>('[data-role="erreur"]'),
  dessin: exige<HTMLElement>('[data-role="dessin"]'),
  verdicts: exige<HTMLElement>('[data-role="verdicts"]'),
  volets: exige<HTMLElement>('[data-role="volets"]'),
  aideAlpha: exige<HTMLElement>('[data-role="aide-alpha"]'),
};
const champProjet = exige<HTMLInputElement>('[data-role="projet"]');
const champElement = exige<HTMLInputElement>('[data-role="element"]');

type Racine = Record<string, unknown>;

function charger(): Saisie | null {
  try {
    const t = window.localStorage.getItem(CLE_SAISIE);
    return t === null ? null : relire(t);
  } catch {
    return null;
  }
}
function memoriser(): void {
  try {
    window.localStorage.setItem(CLE_SAISIE, serialiser(saisie));
  } catch {
    // Stockage indisponible : la page fonctionne sans.
  }
}

let saisie: Saisie = charger() ?? saisieParDefaut();
let barre: BarreFeuilles | null = null;
let dernier: { calcul: Calcul; resultat: Resultat } | null = null;

function ecrireSaisie(): void {
  for (const e of formulaire.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-champ]')) {
    const cle = e.dataset.champ;
    if (cle === undefined) continue;
    const v = (saisie as unknown as Racine)[cle];
    if (e instanceof HTMLInputElement && e.type === 'checkbox') e.checked = v === true;
    else e.value = String(v);
  }
}

/** Les champs laisses vides reprennent le tableau de la norme, montre en grise. */
function ajusterAffichage(): void {
  const tab = tableauDe(saisie);
  const vals: [string, number | null][] = [['K', tab.K], ['alpha', tab.alpha], ['beta', tab.beta], ['fvk0', tab.fvk0], ['fxk1', tab.fxk1], ['fxk2', tab.fxk2]];
  for (const [cle, v] of vals) {
    const e = formulaire.querySelector<HTMLInputElement>(`[data-champ="${cle}"]`);
    if (e !== null) e.placeholder = v === null ? T('à saisir', 'enter') : nombreAffiche(v, 2);
  }
  for (const z of formulaire.querySelectorAll<HTMLElement>('[data-si-panneau]')) {
    z.hidden = saisie.appuisLat === '2';
  }
}

function montrerErreur(message: string | null): void {
  zones.erreur.hidden = message === null;
  zones.erreur.innerHTML = message === null ? '' : notationHtml(message);
}

const optionsDessin = () => ({
  cotes: exige<HTMLInputElement>('[data-option="cotes"]').checked,
  comprimee: exige<HTMLInputElement>('[data-option="comprimee"]').checked,
});

function renduDessin(): void {
  zones.dessin.innerHTML = dernier === null ? '' : dessinMur(dernier.calcul, dernier.resultat, optionsDessin());
}

function viderResultats(): void {
  dernier = null;
  zones.verdicts.innerHTML = '';
  zones.volets.innerHTML = '';
  zones.aideAlpha.textContent = '';
  renduDessin();
}

function recalculer(): void {
  if (barre?.dansUnProjet()) barre.signaler();
  else memoriser();
  ajusterAffichage();
  const lecture = lireSaisie(saisie);
  if (!lecture.ok) {
    montrerErreur(lecture.message);
    viderResultats();
    return;
  }
  let resultat: Resultat;
  try {
    resultat = verifier(lecture.calcul);
  } catch (e) {
    montrerErreur(messageDErreur(e));
    viderResultats();
    return;
  }
  montrerErreur(null);
  dernier = { calcul: lecture.calcul, resultat };
  zones.verdicts.innerHTML = verdictsHtml(resultat);
  zones.volets.innerHTML = voletsHtml(resultat, lecture.calcul);
  const l = resultat.laterale;
  zones.aideAlpha.textContent = l === null ? '' : `μ = ${nombreAffiche(l.mu, 2)} · h/L = ${nombreAffiche(l.hSurL, 2)}`;
  renduDessin();
}

formulaire.addEventListener('input', (ev) => {
  const c = ev.target;
  if (!(c instanceof HTMLInputElement || c instanceof HTMLSelectElement) || c.dataset.champ === undefined) return;
  (saisie as unknown as Racine)[c.dataset.champ] = c instanceof HTMLInputElement && c.type === 'checkbox' ? c.checked : c.value;
  recalculer();
});

for (const option of document.querySelectorAll<HTMLInputElement>('[data-option]')) {
  option.addEventListener('input', renduDessin);
}

document.addEventListener('click', (ev) => {
  const cible = ev.target;
  if (!(cible instanceof HTMLElement)) return;
  const action = cible.closest('button')?.dataset.action;
  if (action === undefined) return;
  if (action === 'enregistrer') return telecharger('maconnerie.json', serialiser(saisie), 'application/json;charset=utf-8');
  if (action === 'reinitialiser') {
    saisie = saisieParDefaut();
    ecrireSaisie();
    return recalculer();
  }
  if (dernier === null) return montrerErreur(T('Rien à exporter : corrigez la saisie.', 'Nothing to export: correct the input.'));
  if (action === 'exporter-note') {
    const note = noteDuCalcul(dernier.calcul, dernier.resultat, {
      projet: champProjet.value,
      element: champElement.value,
      date: new Date().toISOString().slice(0, 10),
    });
    ouvrirOuTelecharger('maconnerie-note.html', noteDeCalculHtml(note));
  } else if (action === 'exporter-dessin') {
    telecharger('maconnerie-mur.svg', svgAutonome(dessinMur(dernier.calcul, dernier.resultat, optionsDessin()), ''), 'image/svg+xml;charset=utf-8');
  }
});

exige<HTMLInputElement>('[data-role="ouvrir"]').addEventListener('change', async (e) => {
  const entree = e.target as HTMLInputElement;
  const f = entree.files?.[0];
  entree.value = '';
  if (f === undefined) return;
  try {
    saisie = relire(await f.text());
  } catch (err) {
    return montrerErreur(messageDErreur(err));
  }
  ecrireSaisie();
  recalculer();
});

try {
  const c = JSON.parse(window.localStorage.getItem(CLE_CARTOUCHE) ?? '{}') as { projet?: string; element?: string };
  champProjet.value = c.projet ?? '';
  champElement.value = c.element ?? '';
} catch {
  // Cartouche illisible : champs vides.
}
for (const champ of [champProjet, champElement]) {
  champ.addEventListener('input', () => {
    try {
      window.localStorage.setItem(CLE_CARTOUCHE, JSON.stringify({ projet: champProjet.value, element: champElement.value }));
    } catch {
      // Stockage indisponible.
    }
  });
}

ecrireSaisie();
recalculer();

barre = brancherFeuilles({
  app: 'maconnerie',
  nomApp: document.querySelector('header h1')?.textContent ?? 'maconnerie',
  conteneur: exige<HTMLElement>('[data-role="feuilles"]'),
  lire: () => JSON.parse(serialiser(saisie)) as Json,
  charger: (d) => {
    saisie = d === null ? saisieParDefaut() : relire(JSON.stringify(d));
    ecrireSaisie();
    recalculer();
  },
});

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  void import('./pwa').then((m) => m.enregistrerServiceWorker());
}
