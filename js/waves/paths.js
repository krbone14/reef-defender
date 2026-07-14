// ============================================================
// PATHS — les chemins courbes des ennemis (entrées et piqués).
//
// Comme dans le vrai Galaga, les trajectoires sont des courbes
// de Bézier : on donne 4 points (départ, 2 points de contrôle,
// arrivée) et la courbe « épouse » ces points en douceur.
//
// LE point délicat : si on parcourt une Bézier avec t qui avance
// régulièrement, l'ennemi ACCÉLÈRE dans les lignes droites et
// RALENTIT dans les virages serrés (les points de la courbe ne
// sont pas répartis uniformément). Pour une vitesse constante,
// on « déroule » la courbe en petits segments droits et on mémorise
// la distance cumulée : c'est la paramétrisation par longueur d'arc.
// ============================================================

import { CONFIG } from '../config.js';

// Position sur une Bézier cubique au paramètre t (entre 0 et 1).
// C'est LA formule des courbes de Bézier : un mélange pondéré
// des 4 points de contrôle.
function pointBezier(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return {
    x: u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    y: u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  };
}

export class Chemin {
  // segments : une liste de Béziers cubiques [p0, p1, p2, p3] mises
  // bout à bout. Par défaut les coordonnées sont « normalisées »
  // (entre 0 et 1, comme un pourcentage de l'écran) ; les chemins
  // construits à la volée (les piqués) passent normalise = false
  // pour donner directement des pixels.
  constructor(segments, normalise = true) {
    const echX = normalise ? CONFIG.ecran.largeur : 1;
    const echY = normalise ? CONFIG.ecran.hauteur : 1;

    this.points = [];   // la courbe découpée en petits points
    this.cumuls = [];   // distance parcourue depuis le départ, point par point
    let total = 0;
    let precedent = null;

    for (const [p0, p1, p2, p3] of segments) {
      // 60 échantillons par courbe : assez fin pour être fluide
      for (let i = 0; i <= 60; i++) {
        const p = pointBezier(p0, p1, p2, p3, i / 60);
        const point = { x: p.x * echX, y: p.y * echY };
        if (precedent) {
          const d = Math.hypot(point.x - precedent.x, point.y - precedent.y);
          if (d < 0.001) continue; // jonction entre 2 segments : point en double
          total += d;
        }
        this.points.push(point);
        this.cumuls.push(total);
        precedent = point;
      }
    }
    this.longueur = total; // longueur totale du chemin, en pixels
  }

  // Renvoie la position après « distance » pixels parcourus.
  // On cherche entre quels deux points échantillonnés on se trouve
  // (par dichotomie, rapide), puis on interpole entre les deux.
  position(distance) {
    const n = this.points.length;
    if (distance <= 0) return { ...this.points[0] };
    if (distance >= this.longueur) return { ...this.points[n - 1] };

    let bas = 0, haut = n - 1;
    while (haut - bas > 1) {
      const milieu = (bas + haut) >> 1;
      if (this.cumuls[milieu] <= distance) bas = milieu;
      else haut = milieu;
    }
    const t = (distance - this.cumuls[bas]) / (this.cumuls[haut] - this.cumuls[bas]);
    const a = this.points[bas], b = this.points[haut];
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }
}

// Symétrie horizontale : transforme un chemin « gauche » en chemin
// « droite » sans tout redéfinir (x devient 1 - x).
const miroir = (segments) =>
  segments.map((seg) => seg.map(([x, y]) => [1 - x, y]));

// --- Les chemins d'entrée nommés -----------------------------
// Coordonnées normalisées : (0,0) = coin haut-gauche, (1,1) = bas-droite.
// Tous se terminent vers (0.5, 0.28), juste sous la zone de formation :
// de là, l'ennemi vole en ligne droite jusqu'à sa case.

// Entre par le haut-gauche, traverse, plonge et fait une boucle
const boucleGauche = [
  [[-0.06, 0.12], [0.30, 0.22], [0.78, 0.30], [0.78, 0.55]],
  [[0.78, 0.55], [0.78, 0.82], [0.38, 0.82], [0.38, 0.55]],
  [[0.38, 0.55], [0.38, 0.40], [0.44, 0.32], [0.50, 0.28]],
];

// Tombe du haut de l'écran en grand « S », puis remonte
const plongeeCentrale = [
  [[0.50, -0.05], [0.15, 0.18], [0.85, 0.42], [0.50, 0.62]],
  [[0.50, 0.62], [0.25, 0.76], [0.30, 0.40], [0.50, 0.28]],
];

// Entre par le bas-gauche et remonte en courbe élégante
const remonteeGauche = [
  [[-0.06, 0.85], [0.35, 0.80], [0.62, 0.62], [0.60, 0.45]],
  [[0.60, 0.45], [0.58, 0.34], [0.54, 0.30], [0.50, 0.28]],
];

export const CHEMINS = {
  boucleGauche: new Chemin(boucleGauche),
  boucleDroite: new Chemin(miroir(boucleGauche)),
  plongeeCentrale: new Chemin(plongeeCentrale),
  remonteeGauche: new Chemin(remonteeGauche),
  remonteeDroite: new Chemin(miroir(remonteeGauche)),
};

// --- Le piqué -------------------------------------------------
// Contrairement aux entrées (fixes), chaque piqué est construit
// sur mesure au moment du départ : il part de la position ACTUELLE
// de l'ennemi et vise la position ACTUELLE du joueur (cibleX).
// Petit élan vers le haut, grande courbe, et sortie sous l'écran.
// « elan » : l'ampleur du recul avant l'attaque — grand pour la
// méduse théâtrale, minuscule pour le barracuda qui fonce direct.
export function cheminDePique(x0, y0, cibleX, elan = 80) {
  // L'ennemi s'élance vers le centre de l'écran
  const dir = x0 < CONFIG.ecran.largeur / 2 ? 1 : -1;
  const H = CONFIG.ecran.hauteur;
  const miParcours = [(x0 + cibleX) / 2, (y0 + 480) / 2];

  return new Chemin([
    // 1. l'élan : petit recul en arrière-haut, puis bascule en avant
    [[x0, y0], [x0 - dir * elan, y0 - elan - 10], [x0 + dir * 160, y0 + 100], miParcours],
    // 2. la descente : fonce sur le joueur et sort par le bas
    [miParcours, [cibleX - dir * 60, 480], [cibleX, 560], [cibleX + dir * 30, H + 60]],
  ], false); // false = coordonnées déjà en pixels
}
