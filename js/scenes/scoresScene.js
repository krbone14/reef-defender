// ============================================================
// SCÈNE TABLEAU DES SCORES — le panthéon du récif.
//
// Les 10 meilleurs plongeurs, sauvegardés dans le navigateur.
// Si on vient de signer un record, sa ligne clignote fièrement.
// ============================================================

import { CONFIG } from '../config.js';
import { chargerScores } from '../engine/scores.js';
import { SceneTitre } from './titleScene.js';

export class SceneScores {
  // rangAMettreEnValeur : la ligne du score fraîchement inscrit
  // (ou -1 / undefined si on vient juste consulter le tableau)
  constructor(jeu, rangAMettreEnValeur = -1) {
    this.jeu = jeu;
    this.rang = rangAMettreEnValeur;
    this.scores = chargerScores();
    this.temps = 0;
  }

  update(dt) {
    this.temps += dt;
    if (this.temps > 0.5 && this.jeu.input.valide) {
      this.jeu.scenes.changer(new SceneTitre(this.jeu));
    }
  }

  render(ctx) {
    const coul = CONFIG.couleurs;
    const cx = CONFIG.ecran.largeur / 2;
    ctx.textAlign = 'center';

    ctx.fillStyle = coul.accent;
    ctx.font = 'bold 28px monospace';
    ctx.fillText('MEILLEURS PLONGEURS', cx, 100);

    ctx.font = 'bold 18px monospace';
    this.scores.forEach((s, i) => {
      // La ligne du nouveau record clignote en doré
      const nouvelle = i === this.rang;
      if (nouvelle && Math.floor(this.temps * 3) % 2 === 0) return;
      ctx.fillStyle = nouvelle ? coul.accent : coul.texte;

      const y = 160 + i * 34;
      ctx.textAlign = 'right';
      ctx.fillText(`${i + 1}.`, cx - 90, y);
      ctx.textAlign = 'left';
      ctx.fillText(s.initiales, cx - 60, y);
      ctx.textAlign = 'right';
      ctx.fillText(String(s.score).padStart(6, '0'), cx + 110, y);
    });

    ctx.textAlign = 'center';
    if (Math.floor(this.temps * 1.5) % 2 === 0) {
      ctx.fillStyle = coul.texte;
      ctx.font = '15px monospace';
      ctx.fillText('ESPACE pour revenir au titre', cx, 560);
    }
  }
}
