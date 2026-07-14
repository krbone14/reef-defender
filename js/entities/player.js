// ============================================================
// PLONGEUR — le personnage du joueur.
//
// Il ne se déplace que sur l'axe horizontal (comme dans Galaga),
// à hauteur fixe en bas de l'écran. Son sprite est entièrement
// dessiné en code : des formes géométriques simples, vues de dos
// (on voit sa bouteille, sa tête et ses palmes qui dépassent).
// ============================================================

import { CONFIG } from '../config.js';

export class Plongeur {
  constructor() {
    const c = CONFIG.joueur;
    this.x = CONFIG.ecran.largeur / 2; // on démarre au centre
    this.y = c.y;
    this.rayon = c.rayon;
    this.vies = c.vies;
    this.rechargement = 0;  // temps restant avant de pouvoir retirer
    this.invincible = 0;    // temps d'invincibilité restant (après un coup)
    this.bouclier = false;  // la bulle protectrice (absorbe UN impact)
    this.tirRapide = 0;     // secondes de tir rapide restantes

    // L'état de l'armement, façon Galaga :
    //  'normal' : 2 harpons à l'écran max
    //  'vole'   : la murène a volé le second -> 1 seul à la fois
    //  'double' : harpon récupéré -> tir double !
    this.armes = 'normal';
  }

  // Combien de harpons peuvent voler en même temps ?
  get maxHarpons() {
    const h = CONFIG.harpon;
    if (this.armes === 'vole') return h.maxAEcranVole;
    if (this.armes === 'double') return h.maxAEcranDouble;
    return h.maxAEcran;
  }

  update(dt, input) {
    const c = CONFIG.joueur;

    // Déplacement horizontal : au clavier, ou en suivant le doigt.
    // Le plongeur ne se téléporte pas sous le doigt : il nage vers
    // lui à sa vitesse normale (sinon ce serait de la triche !).
    if (input.doigtX !== null) {
      const ecart = input.doigtX - this.x;
      const pas = c.vitesse * dt;
      this.x += Math.abs(ecart) <= pas ? ecart : Math.sign(ecart) * pas;
    } else {
      if (input.gauche) this.x -= c.vitesse * dt;
      if (input.droite) this.x += c.vitesse * dt;
    }
    this.x = Math.max(c.margeBord, Math.min(CONFIG.ecran.largeur - c.margeBord, this.x));

    // Les compteurs de temps descendent vers zéro
    if (this.rechargement > 0) this.rechargement -= dt;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.tirRapide > 0) this.tirRapide -= dt;
  }

  // Peut-on tirer ? Deux conditions, comme dans Galaga :
  // le tir a rechargé, ET il reste de la place à l'écran.
  peutTirer(nbHarponsAEcran) {
    return this.rechargement <= 0 && nbHarponsAEcran < this.maxHarpons;
  }

  vientDeTirer() {
    // Avec le bonus « tir rapide », le rechargement est bien plus court
    const mult = this.tirRapide > 0 ? CONFIG.powerUps.multCadenceTirRapide : 1;
    this.rechargement = CONFIG.harpon.cadence * mult;
  }

  // Touché ! Le bouclier absorbe l'impact s'il est là, sinon on
  // perd une vie. Renvoie 'bouclier' ou 'vie' pour que la scène
  // joue le bon son.
  toucher() {
    if (this.bouclier) {
      this.bouclier = false;
      this.invincible = 1.0; // court répit le temps que la bulle éclate
      return 'bouclier';
    }
    this.vies -= 1;
    this.invincible = CONFIG.joueur.invincibilite;
    // Comme dans Galaga : perdre une vie remet l'armement à neuf
    // (le double harpon se perd... mais un harpon volé se remplace)
    this.armes = 'normal';
    return 'vie';
  }

  draw(ctx) {
    // Clignotement pendant l'invincibilité : on saute une frame
    // sur deux (10 fois par seconde) pour un effet stroboscopique.
    if (this.invincible > 0 && Math.floor(this.invincible * 10) % 2 === 0) return;

    const coul = CONFIG.couleurs;
    ctx.save();
    ctx.translate(this.x, this.y);

    // La bulle du bouclier, tout autour du plongeur
    if (this.bouclier) {
      ctx.strokeStyle = coul.bouclier;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Les palmes (deux triangles jaunes qui dépassent en bas)
    ctx.fillStyle = coul.palmes;
    ctx.beginPath();
    ctx.moveTo(-6, 8); ctx.lineTo(-14, 22); ctx.lineTo(-2, 14);
    ctx.moveTo(6, 8); ctx.lineTo(14, 22); ctx.lineTo(2, 14);
    ctx.fill();

    // Le corps : la combinaison de plongée (ovale bleu)
    ctx.fillStyle = coul.plongeur;
    ctx.beginPath();
    ctx.ellipse(0, 2, 9, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // La bouteille sur le dos (rectangle arrondi gris clair)
    ctx.fillStyle = '#a8bcc8';
    ctx.beginPath();
    ctx.roundRect(-4, -4, 8, 14, 3);
    ctx.fill();

    // La tête, avec la sangle du masque
    ctx.fillStyle = coul.peau;
    ctx.beginPath();
    ctx.arc(0, -10, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = coul.masque;
    ctx.fillRect(-6, -12, 12, 4); // la sangle cyan du masque

    // Le(s) harpon(s), pointé(s) vers le haut, prêt(s) à tirer.
    // En mode double : deux harpons. En mode volé : aucun visible
    // à droite (elle nous l'a pris !)... enfin si, un seul.
    const positions = this.armes === 'double'
      ? [-CONFIG.harpon.ecartDouble, CONFIG.harpon.ecartDouble]
      : [0];
    for (const hx of positions) {
      ctx.strokeStyle = coul.harpon;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hx, -14);
      ctx.lineTo(hx, -26);
      ctx.stroke();
      ctx.fillStyle = coul.harpon;
      ctx.beginPath(); // la pointe
      ctx.moveTo(hx, -30); ctx.lineTo(hx - 3, -24); ctx.lineTo(hx + 3, -24);
      ctx.fill();
    }

    ctx.restore();
  }
}
