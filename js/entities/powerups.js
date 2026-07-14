// ============================================================
// POWER-UPS — les bonus lâchés par les ennemis détruits.
//
// Une capsule dorée coule doucement vers le fond ; si le plongeur
// l'attrape, elle s'active :
//  - tirRapide : cadence de tir démultipliée pendant quelques secondes
//  - bouclier  : une bulle qui absorbe UN impact
//  - sonar     : onde de choc qui balaie tous les ennemis à l'écran
//                (pour la moitié des points — c'est la solution de
//                facilité, elle rapporte moins !)
// ============================================================

import { CONFIG } from '../config.js';

export const TYPES_POWERUP = ['tirRapide', 'bouclier', 'sonar'];

export class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    // Si aucun type n'est imposé, on tire au sort
    this.type = type || TYPES_POWERUP[Math.floor(Math.random() * TYPES_POWERUP.length)];
    this.rayon = CONFIG.powerUps.rayon;
    this.temps = 0;
  }

  update(dt) {
    this.temps += dt;
    this.y += CONFIG.powerUps.vitesseChute * dt;
    this.x += Math.sin(this.temps * 3) * 15 * dt; // coule en zigzaguant
  }

  get horsEcran() {
    return this.y > CONFIG.ecran.hauteur + 20;
  }

  draw(ctx) {
    const coul = CONFIG.couleurs;
    ctx.save();
    ctx.translate(this.x, this.y);

    // La capsule : un cercle doré qui « pulse » pour attirer l'œil
    const pulsation = 1 + Math.sin(this.temps * 6) * 0.1;
    ctx.strokeStyle = coul.bonus;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.rayon * pulsation, 0, Math.PI * 2);
    ctx.stroke();

    // L'icône au centre, selon le type
    ctx.strokeStyle = coul.bonus;
    ctx.fillStyle = coul.bonus;
    if (this.type === 'tirRapide') {
      // Deux petits harpons côte à côte
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-3, 5); ctx.lineTo(-3, -5);
      ctx.moveTo(3, 5); ctx.lineTo(3, -5);
      ctx.stroke();
    } else if (this.type === 'bouclier') {
      // Une petite bulle
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.stroke();
    } else { // sonar
      // Des ondes concentriques
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 2, 3, Math.PI * 1.15, Math.PI * 1.85);
      ctx.arc(0, 2, 6.5, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// --- Le harpon libéré ------------------------------------------
// Quand la murène porteuse est détruite, TON harpon retombe vers
// le fond. Rattrape-le : tu tireras en double jusqu'à ta prochaine
// mort. (Il coule tout droit, sans zigzag : c'est du métal !)
export class HarponPerdu {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.rayon = 12; // généreux : le rattraper doit être facile
    this.temps = 0;
  }

  update(dt) {
    this.temps += dt;
    this.y += CONFIG.powerUps.vitesseChute * 1.3 * dt;
  }

  get horsEcran() {
    return this.y > CONFIG.ecran.hauteur + 20;
  }

  draw(ctx) {
    const coul = CONFIG.couleurs;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.sin(this.temps * 4) * 0.4); // il tournoie en coulant

    // Un halo doré pour dire « c'est important ! »
    ctx.globalAlpha = 0.3 + Math.sin(this.temps * 8) * 0.15;
    ctx.fillStyle = coul.bonus;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Le harpon lui-même
    ctx.strokeStyle = coul.harpon;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(0, -6);
    ctx.stroke();
    ctx.fillStyle = coul.harpon;
    ctx.beginPath();
    ctx.moveTo(0, -11); ctx.lineTo(-4, -3); ctx.lineTo(4, -3);
    ctx.fill();

    ctx.restore();
  }
}
