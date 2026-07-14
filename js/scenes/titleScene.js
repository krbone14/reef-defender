// ============================================================
// SCÈNE TITRE — l'écran d'accueil, façon borne d'arcade.
//
// Le titre ondule comme sous l'eau, des bulles montent des
// profondeurs, et on attend ESPACE pour plonger.
// ============================================================

import { CONFIG } from '../config.js';
import { dessinerRecif } from '../engine/decor.js';
import { SceneJeu } from './gameScene.js';
import { SceneScores } from './scoresScene.js';

export class SceneTitre {
  constructor(jeu) {
    this.jeu = jeu;
    this.temps = 0;

    // Un rideau de bulles décoratives, chacune avec sa taille
    // et sa vitesse propres
    this.bulles = [];
    for (let i = 0; i < 24; i++) {
      this.bulles.push({
        x: Math.random() * CONFIG.ecran.largeur,
        y: Math.random() * CONFIG.ecran.hauteur,
        rayon: 1.5 + Math.random() * 3,
        vitesse: 15 + Math.random() * 30,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  update(dt) {
    this.temps += dt;

    // Les bulles montent en zigzaguant ; arrivées en haut,
    // elles repartent du bas (recyclage !)
    for (const b of this.bulles) {
      b.y -= b.vitesse * dt;
      b.x += Math.sin(this.temps * 2 + b.phase) * 10 * dt;
      if (b.y < -10) {
        b.y = CONFIG.ecran.hauteur + 10;
        b.x = Math.random() * CONFIG.ecran.largeur;
      }
    }

    // ESPACE ou un tap sur l'écran : on plonge !
    if (this.jeu.input.valide) {
      this.jeu.scenes.changer(new SceneJeu(this.jeu));
    }
    // V comme « voir les scores » (même touche en AZERTY et QWERTY)
    if (this.jeu.input.justePresse('KeyV')) {
      this.jeu.scenes.changer(new SceneScores(this.jeu));
    }
  }

  render(ctx) {
    const coul = CONFIG.couleurs;
    const cx = CONFIG.ecran.largeur / 2;

    dessinerRecif(ctx, this.temps);

    // Les bulles, discrètes, derrière le texte
    ctx.fillStyle = 'rgba(139, 233, 253, 0.25)';
    for (const b of this.bulles) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.rayon, 0, Math.PI * 2);
      ctx.fill();
    }

    // Le titre, lettre par lettre, chaque lettre ondulant comme
    // portée par la houle
    ctx.font = 'bold 44px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = coul.accent;
    this.texteOndulant(ctx, 'REEF', cx - 54, 190);
    this.texteOndulant(ctx, 'DEFENDER', cx - 106, 245);

    ctx.textAlign = 'center';
    ctx.fillStyle = coul.masque;
    ctx.font = '15px monospace';
    ctx.fillText('Défends le récif contre la nuée !', cx, 300);

    // Le meilleur score de la session
    ctx.fillStyle = coul.texte;
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`TOP ${String(this.jeu.hiScore).padStart(6, '0')}`, cx, 360);

    // L'invitation clignote lentement, comme sur une borne d'arcade
    if (Math.floor(this.temps * 1.5) % 2 === 0) {
      ctx.fillStyle = coul.texte;
      ctx.font = 'bold 18px monospace';
      const invite = this.jeu.input.modeTactile
        ? 'TOUCHE L\'ÉCRAN POUR PLONGER'
        : 'APPUIE SUR ESPACE POUR PLONGER';
      ctx.fillText(invite, cx, 440);
    }

    ctx.fillStyle = 'rgba(230, 242, 255, 0.55)';
    ctx.font = '13px monospace';
    if (this.jeu.input.modeTactile) {
      ctx.fillText('glisse le doigt pour nager — le harpon tire tout seul', cx, 500);
    } else {
      ctx.fillText('← → ou Q / D : bouger      ESPACE : harponner', cx, 500);
      ctx.fillText('V : voir les meilleurs scores', cx, 524);
    }
  }

  // Dessine un texte dont chaque lettre monte et descend en décalé
  texteOndulant(ctx, texte, x, y) {
    for (let i = 0; i < texte.length; i++) {
      const dy = Math.sin(this.temps * 2.5 + i * 0.7) * 4;
      ctx.fillText(texte[i], x, y + dy);
      x += ctx.measureText(texte[i]).width;
    }
  }
}
