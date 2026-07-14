// ============================================================
// SCÈNE GAME OVER — fin de partie.
//
// Affiche le score final, puis ESPACE envoie :
//  - vers la saisie des initiales si le score entre au top 10,
//  - sinon droit au tableau des scores.
// ============================================================

import { CONFIG } from '../config.js';
import { estQualifie } from '../engine/scores.js';
import { SceneInitiales } from './enterScoreScene.js';
import { SceneScores } from './scoresScene.js';

export class SceneGameOver {
  constructor(jeu, scoreFinal) {
    this.jeu = jeu;
    this.scoreFinal = scoreFinal;
    this.tempsAffiche = 0;
  }

  entrer() {
    this.jeu.audio.jingleGameOver();
  }

  update(dt) {
    this.tempsAffiche += dt;
    // Petit délai avant d'accepter ESPACE (ou un tap), pour éviter
    // de zapper l'écran par accident si on tirait au moment de mourir.
    if (this.tempsAffiche > 1 && this.jeu.input.valide) {
      if (estQualifie(this.scoreFinal)) {
        this.jeu.scenes.changer(new SceneInitiales(this.jeu, this.scoreFinal));
      } else {
        this.jeu.scenes.changer(new SceneScores(this.jeu));
      }
    }
  }

  render(ctx) {
    const coul = CONFIG.couleurs;
    const cx = CONFIG.ecran.largeur / 2;

    ctx.textAlign = 'center';

    ctx.fillStyle = coul.accent;
    ctx.font = 'bold 40px monospace';
    ctx.fillText('GAME OVER', cx, 260);

    ctx.fillStyle = coul.texte;
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`SCORE FINAL  ${this.scoreFinal}`, cx, 320);
    ctx.fillText(`MEILLEUR     ${this.jeu.hiScore}`, cx, 350);

    // Le message d'invite clignote doucement
    if (this.tempsAffiche > 1 && Math.floor(this.tempsAffiche * 2) % 2 === 0) {
      ctx.font = '16px monospace';
      ctx.fillText('Appuie sur ESPACE pour continuer', cx, 430);
    }
  }
}
