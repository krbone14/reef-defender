// ============================================================
// VIEWPORT — l'écran logique du jeu.
//
// Tout le jeu est pensé en 480×640 (des coordonnées « logiques »).
// Cette classe adapte le canvas à la taille réelle de la fenêtre :
//  - elle calcule la plus grande échelle qui fait tenir 480×640
//    dans la fenêtre sans déformer (le reste = bandes noires),
//  - elle tient compte des écrans haute densité (devicePixelRatio)
//    pour que le rendu vectoriel reste parfaitement net.
// ============================================================

import { CONFIG } from '../config.js';

export class Viewport {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.largeur = CONFIG.ecran.largeur;
    this.hauteur = CONFIG.ecran.hauteur;

    // On recalcule l'échelle si la fenêtre change de taille
    window.addEventListener('resize', () => this.ajuster());
    this.ajuster();
  }

  ajuster() {
    // La plus grande échelle qui fait tenir le jeu dans la fenêtre
    const echelleCSS = Math.min(
      window.innerWidth / this.largeur,
      window.innerHeight / this.hauteur,
    );

    // Sur un écran « Retina », 1 pixel CSS = 2 ou 3 pixels physiques :
    // on dessine plus fin pour rester net.
    const dpr = window.devicePixelRatio || 1;
    this.echelle = echelleCSS * dpr;

    // Taille interne du canvas (en pixels physiques)...
    this.canvas.width = Math.round(this.largeur * this.echelle);
    this.canvas.height = Math.round(this.hauteur * this.echelle);
    // ...et taille affichée à l'écran (en pixels CSS)
    this.canvas.style.width = `${Math.round(this.largeur * echelleCSS)}px`;
    this.canvas.style.height = `${Math.round(this.hauteur * echelleCSS)}px`;
  }

  // Convertit une position de la fenêtre (un doigt sur l'écran, en
  // pixels CSS) en coordonnées logiques du jeu (480×640).
  versLogique(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * this.largeur,
      y: ((clientY - rect.top) / rect.height) * this.hauteur,
    };
  }

  // À appeler au début de chaque frame : applique l'échelle puis
  // peint le fond (dégradé bleu profond → abysses).
  debutRendu() {
    const ctx = this.ctx;
    ctx.setTransform(this.echelle, 0, 0, this.echelle, 0, 0);

    const degrade = ctx.createLinearGradient(0, 0, 0, this.hauteur);
    degrade.addColorStop(0, CONFIG.couleurs.fondHaut);
    degrade.addColorStop(1, CONFIG.couleurs.fondBas);
    ctx.fillStyle = degrade;
    ctx.fillRect(0, 0, this.largeur, this.hauteur);
  }
}
