// ============================================================
// PROJECTILES — le harpon du joueur et les tirs ennemis.
//
// Un projectile, c'est très simple : une position, une vitesse
// verticale, un cercle de collision. Quand il sort de l'écran,
// la scène de jeu le supprime.
// ============================================================

import { CONFIG } from '../config.js';

// --- Le harpon du joueur (monte tout droit) -------------------
export class Harpon {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.rayon = CONFIG.harpon.rayon;
  }

  update(dt) {
    this.y -= CONFIG.harpon.vitesse * dt; // vers le haut : y diminue
  }

  get horsEcran() {
    return this.y < -20;
  }

  draw(ctx) {
    const coul = CONFIG.couleurs;
    ctx.save();
    ctx.translate(this.x, this.y);

    // La hampe (le manche du harpon)
    ctx.strokeStyle = coul.harpon;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.lineTo(0, -4);
    ctx.stroke();

    // La pointe en triangle
    ctx.fillStyle = coul.harpon;
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(-4, -2); ctx.lineTo(4, -2);
    ctx.fill();

    ctx.restore();
  }
}

// --- Tir ennemi : une bulle urticante -------------------------
// Lâchée pendant les piqués. « Légèrement guidée » : au départ,
// elle vise la position du joueur, mais sans pouvoir partir à plus
// de angleMax de la verticale — on peut donc toujours l'esquiver.
export class TirEnnemi {
  constructor(x, y, cibleX, cibleY) {
    this.x = x;
    this.y = y;
    this.rayon = CONFIG.tirsEnnemis.rayon;

    // Angle vers le joueur (0 = tout droit vers le bas), borné
    const c = CONFIG.tirsEnnemis;
    let angle = Math.atan2(cibleX - x, cibleY - y);
    angle = Math.max(-c.angleMax, Math.min(c.angleMax, angle));
    this.vx = Math.sin(angle) * c.vitesse;
    this.vy = Math.cos(angle) * c.vitesse;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  get horsEcran() {
    return this.y > CONFIG.ecran.hauteur + 20 || this.x < -20 || this.x > CONFIG.ecran.largeur + 20;
  }

  draw(ctx) {
    const coul = CONFIG.couleurs;
    ctx.save();
    ctx.translate(this.x, this.y);
    // L'épine est orientée dans sa direction de vol
    ctx.rotate(Math.atan2(this.vx, this.vy));

    // Un fuseau effilé (pointe en bas, vers le sens du vol)
    ctx.fillStyle = coul.tirEnnemi;
    ctx.beginPath();
    ctx.moveTo(0, 8);            // la pointe
    ctx.quadraticCurveTo(3, 0, 0, -7);
    ctx.quadraticCurveTo(-3, 0, 0, 8);
    ctx.fill();

    ctx.restore();
  }
}

// --- L'encre du poulpe -----------------------------------------
// Un gros blob sombre craché par le boss, qui vise le joueur.
// Même interface que TirEnnemi : la scène les range dans la même
// liste et les traite pareil.
export class Encre {
  constructor(x, y, cibleX, cibleY) {
    this.x = x;
    this.y = y;
    this.rayon = CONFIG.encre.rayon;
    this.temps = 0;

    // Contrairement aux épines, l'encre vise sans limite d'angle :
    // face au boss, il faut VRAIMENT bouger.
    const dx = cibleX - x;
    const dy = cibleY - y;
    const d = Math.hypot(dx, dy) || 1;
    this.vx = (dx / d) * CONFIG.encre.vitesse;
    this.vy = (dy / d) * CONFIG.encre.vitesse;
  }

  update(dt) {
    this.temps += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  get horsEcran() {
    return this.y > CONFIG.ecran.hauteur + 20 || this.y < -20
      || this.x < -20 || this.x > CONFIG.ecran.largeur + 20;
  }

  draw(ctx) {
    // Un blob qui tremble, avec un liseré violet
    const tremble = 1 + Math.sin(this.temps * 15) * 0.15;
    ctx.fillStyle = CONFIG.couleurs.encre;
    ctx.strokeStyle = CONFIG.couleurs.poulpe;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.rayon * tremble, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
