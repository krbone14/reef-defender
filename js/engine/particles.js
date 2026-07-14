// ============================================================
// PARTICULES — les explosions et petits effets visuels.
//
// Une particule, c'est un point coloré avec une vitesse et une
// durée de vie. Une explosion = une poignée de particules
// projetées dans toutes les directions, qui ralentissent
// (frottement de l'eau), remontent un peu (des bulles !) et
// s'estompent avant de disparaître.
// ============================================================

export class Particules {
  constructor() {
    this.liste = [];
  }

  // Une explosion à la position (x, y), dans la couleur de la victime
  explosion(x, y, couleur, nombre = 14) {
    for (let i = 0; i < nombre; i++) {
      const angle = Math.random() * Math.PI * 2;
      const vitesse = 40 + Math.random() * 140;
      this.liste.push({
        x, y,
        vx: Math.cos(angle) * vitesse,
        vy: Math.sin(angle) * vitesse,
        rayon: 1.5 + Math.random() * 2.5,
        couleur,
        vie: 0.4 + Math.random() * 0.35, // durée de vie en secondes
        vieMax: 0,                        // rempli juste en dessous
      });
      this.liste[this.liste.length - 1].vieMax = this.liste[this.liste.length - 1].vie;
    }
  }

  update(dt) {
    for (const p of this.liste) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 3 * dt;   // l'eau freine...
      p.vy *= 1 - 3 * dt;
      p.vy -= 25 * dt;      // ...et les débris-bulles remontent doucement
      p.vie -= dt;
    }
    this.liste = this.liste.filter((p) => p.vie > 0);
  }

  draw(ctx) {
    for (const p of this.liste) {
      ctx.globalAlpha = Math.max(0, p.vie / p.vieMax); // s'estompe en mourant
      ctx.fillStyle = p.couleur;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.rayon, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1; // on remet l'opacité normale pour la suite !
  }
}
