// ============================================================
// INPUT — lecture du clavier.
//
// On n'agit PAS directement dans les événements keydown/keyup :
// on se contente d'y noter l'état des touches, et c'est le jeu
// qui interroge cet état à chaque frame. C'est le schéma
// classique des jeux : « polling » plutôt que « événements ».
//
// On utilise e.code (position PHYSIQUE de la touche) : « KeyA »
// désigne la touche à gauche de la rangée du haut, c'est-à-dire
// Q sur un clavier AZERTY. Ça marche donc pour tout le monde.
//
// TACTILE : dès qu'un doigt touche l'écran, le jeu passe en
// « mode tactile » : le plongeur suit le doigt et tire tout seul.
// On mémorise aussi chaque « tap » avec sa position, pour que les
// menus puissent réagir au toucher.
// ============================================================

export class Input {
  // viewport : nécessaire pour convertir la position du doigt
  // (pixels de l'écran) en coordonnées du jeu (480×640)
  constructor(viewport) {
    this.touches = new Set();      // touches actuellement enfoncées
    this.justePressees = new Set(); // touches pressées PENDANT cette frame

    this.modeTactile = false;  // devient true au premier toucher, pour toujours
    this.doigtX = null;        // position X du doigt (null = pas de doigt posé)
    this.taps = [];            // les « taps » de cette frame : [{x, y}]

    const surTouche = (e) => {
      e.preventDefault(); // pas de défilement ni de zoom pendant le jeu
      this.modeTactile = true;
      const t = e.changedTouches[0];
      const p = viewport.versLogique(t.clientX, t.clientY);
      if (e.type === 'touchstart') this.taps.push(p);
      this.doigtX = p.x;
    };
    window.addEventListener('touchstart', surTouche, { passive: false });
    window.addEventListener('touchmove', surTouche, { passive: false });
    window.addEventListener('touchend', () => { this.doigtX = null; }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (!e.repeat) this.justePressees.add(e.code);
      this.touches.add(e.code);
      // Empêche la page de défiler avec espace / les flèches
      if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.touches.delete(e.code);
    });
  }

  // Touche maintenue ? (pour le déplacement et le tir continu)
  get gauche() { return this.touches.has('ArrowLeft') || this.touches.has('KeyA'); } // Q en AZERTY
  get droite() { return this.touches.has('ArrowRight') || this.touches.has('KeyD'); }
  get tir()    { return this.touches.has('Space'); }

  // Touche qui vient JUSTE d'être pressée ? (pour valider un menu :
  // on ne veut pas que « maintenir espace » relance 60 fois le jeu)
  justePresse(code) { return this.justePressees.has(code); }

  // « Valider » universel : ESPACE au clavier, ou un tap au doigt
  get valide() { return this.justePresse('Space') || this.taps.length > 0; }

  // À appeler en fin de frame : les « juste pressées » et les taps
  // ne valent que pour une seule frame.
  finDeFrame() {
    this.justePressees.clear();
    this.taps.length = 0;
  }
}
