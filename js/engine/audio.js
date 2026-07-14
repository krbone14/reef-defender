// ============================================================
// AUDIO — tous les sons du jeu, synthétisés en Web Audio.
//
// Aucun fichier audio : chaque son est fabriqué mathématiquement,
// comme sur les consoles des années 80. Deux ingrédients :
//  - des OSCILLATEURS (une onde qui vibre à une fréquence donnée :
//    plus la fréquence est haute, plus le son est aigu),
//  - du BRUIT BLANC (un « pshhh » aléatoire, parfait pour les
//    explosions).
// On sculpte ensuite le volume dans le temps (l'« enveloppe ») :
// une attaque brève et une extinction douce, et voilà un « pioum ».
//
// Détail important : le navigateur interdit de jouer du son avant
// le premier geste du joueur (clic ou touche). D'où la méthode
// debloquer(), appelée par main.js au premier appui.
// ============================================================

import { CONFIG } from '../config.js';

export class AudioJeu {
  constructor() {
    this.ctx = null; // pas encore débloqué : silence
  }

  // À appeler lors du premier geste du joueur (exigence du navigateur)
  debloquer() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); // le bouton de volume général
      this.master.gain.value = CONFIG.audio.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  // --- Les deux briques de base --------------------------------

  // Un « bip » : une note qui glisse de freqDebut à freqFin.
  // type : la forme de l'onde ('square' = son 8-bit, 'sine' = doux,
  // 'sawtooth' = agressif, 'triangle' = flûté).
  bip(freqDebut, freqFin, duree, type = 'square', volume = 1, retard = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + retard;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqDebut, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqFin, 1), t + duree);

    // L'enveloppe : montée éclair, extinction exponentielle
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duree);

    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + duree);
  }

  // Une bouffée de bruit blanc (pour les explosions)
  bruit(duree, volume = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const nbEchantillons = Math.floor(this.ctx.sampleRate * duree);
    const tampon = this.ctx.createBuffer(1, nbEchantillons, this.ctx.sampleRate);
    const donnees = tampon.getChannelData(0);
    for (let i = 0; i < nbEchantillons; i++) {
      donnees[i] = (Math.random() * 2 - 1) * (1 - i / nbEchantillons); // s'éteint
    }
    const source = this.ctx.createBufferSource();
    source.buffer = tampon;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(this.master);
    source.start(t);
  }

  // --- Les sons du jeu ------------------------------------------

  tir()        { this.bip(900, 250, 0.09, 'square', 0.5); }
  explosion()  { this.bruit(0.25, 0.8); this.bip(220, 40, 0.2, 'sawtooth', 0.4); }
  toucheDur()  { this.bip(500, 400, 0.06, 'square', 0.4); } // ennemi blessé, pas détruit
  degat()      { this.bruit(0.35, 1); this.bip(300, 60, 0.45, 'sawtooth', 0.6); }
  bonus()      { [523, 659, 784].forEach((f, i) => this.bip(f, f, 0.1, 'triangle', 0.6, i * 0.07)); }
  bouclier()   { this.bip(300, 600, 0.25, 'sine', 0.5); }
  capture()    { this.bip(700, 90, 0.5, 'sawtooth', 0.55); } // la murène ricane
  sonar() {
    // Le « ping » du sonar, avec deux échos de plus en plus faibles
    [0, 0.18, 0.36].forEach((retard, i) =>
      this.bip(1200, 1150, 0.3, 'sine', 0.5 / (i + 1), retard));
  }
  jingleVague() { [392, 523, 659].forEach((f, i) => this.bip(f, f, 0.12, 'square', 0.4, i * 0.1)); }
  jingleGameOver() {
    [523, 392, 311, 262].forEach((f, i) => this.bip(f, f, 0.22, 'triangle', 0.5, i * 0.18));
  }
}
