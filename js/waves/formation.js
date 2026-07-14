// ============================================================
// FORMATION — la grille où les ennemis se rangent.
//
// Dans Galaga, la formation n'est pas figée : elle « respire »,
// s'écartant et se resserrant lentement autour de son centre.
// Chaque ennemi ne mémorise que sa case [colonne, rangée] ;
// c'est cette classe qui traduit la case en position à l'écran,
// respiration comprise. Résultat : toute la nuée bouge d'un seul
// mouvement, sans qu'aucun ennemi ne calcule quoi que ce soit.
// ============================================================

import { CONFIG } from '../config.js';

export class Formation {
  constructor() {
    this.temps = 0;
  }

  update(dt) {
    this.temps += dt;
  }

  // Position à l'écran de la case [colonne, rangée]
  positionSlot(colonne, rangee) {
    const g = CONFIG.grille;
    const f = CONFIG.formation;

    // La respiration : un facteur qui oscille doucement autour de 1
    // (ex. de 0.945 à 1.055). On ne l'applique qu'à l'écart au centre,
    // donc la colonne du milieu ne bouge presque pas et les bords
    // s'écartent le plus — exactement comme dans Galaga.
    const respiration = 1 + Math.sin(this.temps * f.cadenceRespiration) * f.ampleurRespiration;

    const centreX = CONFIG.ecran.largeur / 2;
    const ecartAuCentre = colonne - (g.colonnes - 1) / 2; // ...-1.5, -0.5, 0.5, 1.5...

    return {
      x: centreX + ecartAuCentre * g.pasX * respiration,
      y: g.yDebut + rangee * g.pasY,
    };
  }
}
