// ============================================================
// SCÈNE INITIALES — « Tu entres dans la légende, signe ici. »
//
// La saisie à 3 lettres des bornes d'arcade : haut/bas pour faire
// défiler l'alphabet, ESPACE pour valider chaque lettre. À la
// troisième, le score est sauvegardé et on file au tableau.
// ============================================================

import { CONFIG } from '../config.js';
import { insererScore } from '../engine/scores.js';
import { SceneScores } from './scoresScene.js';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export class SceneInitiales {
  constructor(jeu, scoreFinal) {
    this.jeu = jeu;
    this.scoreFinal = scoreFinal;
    this.lettres = [0, 0, 0]; // index dans ALPHABET, pour chaque case
    this.position = 0;        // la case en cours de saisie
    this.temps = 0;
  }

  update(dt) {
    this.temps += dt;
    const input = this.jeu.input;
    const n = ALPHABET.length;

    // Haut/bas (flèches, ou Z/S en AZERTY) : on fait défiler l'alphabet.
    // Le +n avant le modulo évite un index négatif quand on recule depuis A.
    if (input.justePresse('ArrowUp') || input.justePresse('KeyW')) {
      this.lettres[this.position] = (this.lettres[this.position] + 1) % n;
      this.jeu.audio.toucheDur();
    }
    if (input.justePresse('ArrowDown') || input.justePresse('KeyS')) {
      this.lettres[this.position] = (this.lettres[this.position] - 1 + n) % n;
      this.jeu.audio.toucheDur();
    }
    // Gauche/droite : revenir sur une lettre déjà validée
    if (input.justePresse('ArrowLeft') || input.justePresse('KeyA')) {
      this.position = Math.max(0, this.position - 1);
    }
    if (input.justePresse('ArrowRight') || input.justePresse('KeyD')) {
      this.position = Math.min(2, this.position + 1);
    }

    // Au doigt : tap au-dessus des lettres = lettre suivante,
    // en dessous = précédente, sur une lettre = la sélectionner,
    // sur VALIDER = valider.
    for (const tap of input.taps) {
      const cx = CONFIG.ecran.largeur / 2;
      if (tap.y > 455 && tap.y < 515) {
        this.valider();
      } else if (tap.y > 320 && tap.y < 390) {
        this.position = Math.max(0, Math.min(2, Math.round((tap.x - cx) / 60) + 1));
      } else if (tap.y <= 320) {
        this.lettres[this.position] = (this.lettres[this.position] + 1) % n;
        this.jeu.audio.toucheDur();
      } else {
        this.lettres[this.position] = (this.lettres[this.position] - 1 + n) % n;
        this.jeu.audio.toucheDur();
      }
    }

    // ESPACE : on valide la lettre... ou tout le nom à la dernière
    if (input.justePresse('Space')) {
      this.valider();
    }
  }

  // Valide la lettre en cours ; à la troisième, on signe pour de bon
  valider() {
    if (this.position < 2) {
      this.position += 1;
      this.jeu.audio.bonus();
    } else {
      const initiales = this.lettres.map((i) => ALPHABET[i]).join('');
      const rang = insererScore(initiales, this.scoreFinal);
      this.jeu.audio.jingleVague();
      this.jeu.scenes.changer(new SceneScores(this.jeu, rang));
    }
  }

  render(ctx) {
    const coul = CONFIG.couleurs;
    const cx = CONFIG.ecran.largeur / 2;
    ctx.textAlign = 'center';

    ctx.fillStyle = coul.accent;
    ctx.font = 'bold 26px monospace';
    ctx.fillText('NOUVEAU RECORD !', cx, 180);

    ctx.fillStyle = coul.texte;
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`${this.scoreFinal} points`, cx, 220);

    ctx.font = '15px monospace';
    ctx.fillText('Entre tes initiales :', cx, 290);

    // Les trois grandes lettres, avec un curseur sous celle en cours
    ctx.font = 'bold 48px monospace';
    for (let i = 0; i < 3; i++) {
      const x = cx + (i - 1) * 60;
      const active = i === this.position;
      ctx.fillStyle = active ? coul.accent : coul.texte;
      ctx.fillText(ALPHABET[this.lettres[i]], x, 360);
      // Le curseur clignotant sous la lettre active
      if (active && Math.floor(this.temps * 3) % 2 === 0) {
        ctx.fillRect(x - 16, 372, 32, 4);
      }
    }

    // Le bouton VALIDER (surtout utile au doigt, mais toujours vrai)
    ctx.strokeStyle = coul.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 70, 458, 140, 40);
    ctx.fillStyle = coul.accent;
    ctx.font = 'bold 16px monospace';
    ctx.fillText('VALIDER', cx, 484);

    ctx.fillStyle = 'rgba(230, 242, 255, 0.55)';
    ctx.font = '13px monospace';
    if (this.jeu.input.modeTactile) {
      ctx.fillText('touche haut/bas : changer la lettre', cx, 540);
    } else {
      ctx.fillText('↑ ↓ : choisir la lettre     ESPACE : valider', cx, 540);
    }
  }
}
