// ============================================================
// ENNEMIS — la classe de base et la méduse.
//
// Chaque ennemi est une petite machine à états à lui tout seul :
//
//   entree ──► rejoint ──► formation ──► pique ─┐
//                 ▲                             │
//                 └──── (ressort en haut) ──────┘
//
//  - entree     : il suit son chemin de Bézier d'arrivée
//  - rejoint    : vol en ligne droite vers sa case de formation
//  - formation  : il « respire » avec la nuée et attend son tour
//  - pique      : il fonce sur le joueur en tirant, sort par le
//                 bas, ressort en haut et retourne se ranger
//
// (Phase 3 : barracuda, poisson-lion et murène s'ajouteront ici.)
// ============================================================

import { CONFIG } from '../config.js';
import { cheminDePique } from '../waves/paths.js';

export class Ennemi {
  // stats  : l'entrée de CONFIG.ennemis pour ce type
  // slot   : sa case [colonne, rangée] dans la formation
  // chemin : son chemin d'entrée (objet Chemin)
  // multVitesse : multiplicateur de difficulté (1 = normal)
  constructor(stats, slot, chemin, multVitesse = 1) {
    this.stats = stats;
    this.pv = stats.pv;
    this.rayon = stats.rayon;
    this.points = stats.points;
    this.slot = slot;
    this.chemin = chemin;
    this.vitesseEntree = CONFIG.entree.vitesse * multVitesse;
    this.vitessePique = stats.vitessePique * multVitesse;

    // Certains ennemis (le poisson-lion) tirent depuis la formation,
    // à intervalle aléatoire dans [min, max]
    if (stats.cadenceTirFormation) {
      this.armerTirFormation();
    }

    this.etat = 'entree';
    this.distance = 0;            // distance parcourue sur le chemin courant
    const depart = chemin.position(0);
    this.x = depart.x;
    this.y = depart.y;

    this.tempsAnim = Math.random() * 10; // horloge personnelle (animations)
    this.phase = Math.random() * Math.PI * 2;
  }

  // contexte : { formation, joueurX, tirer(ennemi) } fourni par la scène
  update(dt, contexte) {
    this.tempsAnim += dt;

    switch (this.etat) {

      case 'entree': {
        // On avance le long du chemin de Bézier, à vitesse constante
        this.distance += this.vitesseEntree * dt;
        const p = this.chemin.position(this.distance);
        this.x = p.x;
        this.y = p.y;
        if (this.distance >= this.chemin.longueur) this.etat = 'rejoint';
        break;
      }

      case 'rejoint': {
        // Ligne droite vers sa case (qui bouge : la formation respire !)
        const slot = contexte.formation.positionSlot(this.slot[0], this.slot[1]);
        const dx = slot.x - this.x;
        const dy = slot.y - this.y;
        const d = Math.hypot(dx, dy);
        const pas = this.vitesseEntree * dt;
        if (d <= pas) {
          this.etat = 'formation'; // arrivé : on se range
        } else {
          this.x += (dx / d) * pas;
          this.y += (dy / d) * pas;
        }
        break;
      }

      case 'formation': {
        // On colle à sa case, plus une minuscule ondulation personnelle
        const slot = contexte.formation.positionSlot(this.slot[0], this.slot[1]);
        this.x = slot.x + Math.sin(this.tempsAnim * 1.5 + this.phase) * 2;
        this.y = slot.y + Math.cos(this.tempsAnim * 2.0 + this.phase) * 2;

        // Le poisson-lion crache une épine de temps en temps
        if (this.stats.cadenceTirFormation) {
          this.prochainTirFormation -= dt;
          if (this.prochainTirFormation <= 0) {
            contexte.tirer(this);
            this.armerTirFormation();
          }
        }
        break;
      }

      case 'pique': {
        this.distance += this.vitessePique * dt;
        const p = this.chemin.position(this.distance);
        this.x = p.x;
        this.y = p.y;

        // Pendant la descente, on lâche quelques tirs vers le joueur
        if (this.tirsRestants > 0 && this.y >= this.prochainTirY) {
          contexte.tirer(this);
          this.tirsRestants -= 1;
          this.prochainTirY += 100 + Math.random() * 80;
        }

        // Sorti par le bas ? On ressort en haut et on rentre au bercail
        if (this.y > CONFIG.ecran.hauteur + 40) {
          const slot = contexte.formation.positionSlot(this.slot[0], this.slot[1]);
          this.x = slot.x;
          this.y = -30;
          this.etat = 'rejoint';
        }
        break;
      }
    }
  }

  // Tire au sort le délai avant la prochaine épine de formation
  armerTirFormation() {
    const [min, max] = this.stats.cadenceTirFormation;
    this.prochainTirFormation = min + Math.random() * (max - min);
  }

  // Départ en piqué : on se construit un chemin sur mesure qui vise
  // la position actuelle du joueur.
  commencerPique(joueurX) {
    this.etat = 'pique';
    this.chemin = cheminDePique(this.x, this.y, joueurX, this.stats.elan);
    this.distance = 0;
    this.tirsRestants = this.stats.tirsParPique;
    this.prochainTirY = 160 + Math.random() * 120; // premier tir vers cette hauteur
  }

  get enPique() {
    return this.etat === 'pique';
  }

  // Comme dans Galaga : un ennemi abattu en plein piqué vaut double !
  get pointsGagnes() {
    return this.enPique ? this.points * 2 : this.points;
  }

  // Renvoie true si l'ennemi est détruit par ce coup
  toucher() {
    this.pv -= 1;
    return this.pv <= 0;
  }
}

// --- La méduse : lente, fragile, ondulante --------------------
export class Meduse extends Ennemi {
  constructor(slot, chemin, multVitesse) {
    super(CONFIG.ennemis.meduse, slot, chemin, multVitesse);
    this.couleurExplosion = CONFIG.couleurs.meduse;
  }

  draw(ctx) {
    const coul = CONFIG.couleurs;
    ctx.save();
    ctx.translate(this.x, this.y);

    // Les tentacules : quatre courbes qui ondulent sous le dôme
    ctx.strokeStyle = coul.meduse;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const tx = -7.5 + i * 5;
      const ondulation = Math.sin(this.tempsAnim * 4 + this.phase + i) * 3;
      ctx.beginPath();
      ctx.moveTo(tx, 4);
      ctx.quadraticCurveTo(tx + ondulation, 10, tx - ondulation, 16);
      ctx.stroke();
    }

    // Le dôme violet
    ctx.fillStyle = coul.meduse;
    ctx.beginPath();
    ctx.arc(0, 0, 12, Math.PI, 0);
    ctx.quadraticCurveTo(6, 6, 0, 5);
    ctx.quadraticCurveTo(-6, 6, -12, 0);
    ctx.fill();

    // Deux points de bioluminescence
    ctx.fillStyle = coul.meduseClair;
    ctx.beginPath();
    ctx.arc(-4, -3, 2, 0, Math.PI * 2);
    ctx.arc(4, -3, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// --- Le barracuda : une flèche argentée ------------------------
export class Barracuda extends Ennemi {
  constructor(slot, chemin, multVitesse) {
    super(CONFIG.ennemis.barracuda, slot, chemin, multVitesse);
    this.couleurExplosion = CONFIG.couleurs.barracuda;
  }

  draw(ctx) {
    const coul = CONFIG.couleurs;
    ctx.save();
    ctx.translate(this.x, this.y);
    // En piqué, il se penche dans le sens de sa course
    if (this.enPique) ctx.rotate(Math.sin(this.tempsAnim * 2) * 0.15);

    // Le corps : un long fuseau pointé vers le bas (vers sa proie)
    ctx.fillStyle = coul.barracuda;
    ctx.beginPath();
    ctx.moveTo(0, 16);                        // le museau pointu
    ctx.quadraticCurveTo(7, 2, 5, -12);
    ctx.lineTo(-5, -12);
    ctx.quadraticCurveTo(-7, 2, 0, 16);
    ctx.fill();

    // La queue fourchue, qui bat
    const battement = Math.sin(this.tempsAnim * 8) * 3;
    ctx.fillStyle = coul.barracudaSombre;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(-6 + battement, -19);
    ctx.lineTo(0, -15);
    ctx.lineTo(6 + battement, -19);
    ctx.fill();

    // La rayure sombre du flanc et l'œil
    ctx.strokeStyle = coul.barracudaSombre;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.lineTo(0, -10);
    ctx.stroke();
    ctx.fillStyle = '#0a2030';
    ctx.beginPath();
    ctx.arc(3, 8, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// --- Le poisson-lion : hérissé d'épines, encaisse 2 tirs -------
export class PoissonLion extends Ennemi {
  constructor(slot, chemin, multVitesse) {
    super(CONFIG.ennemis.poissonLion, slot, chemin, multVitesse);
    this.couleurExplosion = CONFIG.couleurs.poissonLion;
  }

  draw(ctx) {
    const coul = CONFIG.couleurs;
    ctx.save();
    ctx.translate(this.x, this.y);

    // Les épines rayonnantes (sa fameuse crinière venimeuse),
    // qui s'écartent en respirant
    const ecart = 1 + Math.sin(this.tempsAnim * 3 + this.phase) * 0.12;
    ctx.strokeStyle = coul.poissonLion;
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const angle = -Math.PI * 0.95 + (i / 8) * Math.PI * 0.9; // en éventail au-dessus
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 8, Math.sin(angle) * 8);
      ctx.lineTo(Math.cos(angle) * 16 * ecart, Math.sin(angle) * 16 * ecart);
      ctx.stroke();
    }

    // Le corps rond, rayé comme un tigre des mers
    ctx.fillStyle = coul.poissonLion;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = coul.poissonLionRayure;
    ctx.lineWidth = 2;
    for (const rx of [-4, 0, 4]) {
      ctx.beginPath();
      ctx.moveTo(rx, -8);
      ctx.quadraticCurveTo(rx + 2, 0, rx, 8);
      ctx.stroke();
    }

    // Blessé (1 PV restant) : il vire au sombre, on sait qu'il va céder
    if (this.pv < this.stats.pv) {
      ctx.fillStyle = 'rgba(10, 20, 40, 0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// --- La murène : la voleuse de harpon --------------------------
// Son piqué a une étape de plus : à mi-descente, elle S'ARRÊTE et
// déploie un cône de capture lumineux. Tout harpon tiré dans le
// cône est happé ! Elle repart ensuite le porter dans la formation,
// et il faut la détruire pour le récupérer... en double tir.
export class Murene extends Ennemi {
  constructor(slot, chemin, multVitesse) {
    super(CONFIG.ennemis.murene, slot, chemin, multVitesse);
    this.couleurExplosion = CONFIG.couleurs.murene;
    this.porteHarpon = false;  // a-t-elle volé le harpon du joueur ?
    this.aDejaCapture = false; // un seul arrêt-cône par piqué
    this.compteCapture = 0;
  }

  update(dt, contexte) {
    // Pendant la capture, elle fait du surplace en frétillant
    if (this.etat === 'capture') {
      this.tempsAnim += dt;
      this.x += Math.sin(this.tempsAnim * 10) * 8 * dt;
      this.compteCapture -= dt;
      if (this.compteCapture <= 0) this.etat = 'pique'; // elle repart
      return;
    }

    super.update(dt, contexte);

    // Arrivée à la bonne profondeur pendant son piqué : arrêt, cône !
    if (this.etat === 'pique' && !this.aDejaCapture
        && this.y >= CONFIG.ennemis.murene.yCapture) {
      this.aDejaCapture = true;
      this.etat = 'capture';
      this.compteCapture = CONFIG.ennemis.murene.dureeCapture;
    }
  }

  // Chaque nouveau piqué donne droit à un nouvel arrêt-capture
  commencerPique(joueurX) {
    super.commencerPique(joueurX);
    this.aDejaCapture = false;
  }

  get coneActif() {
    return this.etat === 'capture' && !this.porteHarpon;
  }

  // Ce point (un harpon...) est-il dans le cône de capture ?
  // Le cône part de sa gueule et s'élargit vers le bas.
  dansCone(px, py) {
    const dy = py - (this.y + 10);
    if (dy < 0 || dy > CONFIG.ennemis.murene.porteeCone) return false;
    const demiLargeur = 16 + dy * 0.42;
    return Math.abs(px - this.x) < demiLargeur;
  }

  // La porteuse du harpon vaut le jackpot
  get pointsGagnes() {
    if (this.porteHarpon) return CONFIG.ennemis.murene.pointsPorteuse;
    return super.pointsGagnes;
  }

  draw(ctx) {
    const coul = CONFIG.couleurs;

    // Le cône de capture, pulsant, dessiné SOUS la murène
    if (this.coneActif) {
      const portee = CONFIG.ennemis.murene.porteeCone;
      ctx.save();
      ctx.globalAlpha = 0.25 + Math.sin(this.tempsAnim * 12) * 0.1;
      ctx.fillStyle = coul.cone;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + 10);
      ctx.lineTo(this.x - 16 - portee * 0.42, this.y + 10 + portee);
      ctx.lineTo(this.x + 16 + portee * 0.42, this.y + 10 + portee);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    // Le corps serpentin : une colonne de segments qui ondulent
    ctx.strokeStyle = coul.murene;
    ctx.lineCap = 'round';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(Math.sin(this.tempsAnim * 5 + 2) * 6, -22);
    ctx.quadraticCurveTo(
      Math.sin(this.tempsAnim * 5 + 1) * 8, -8,
      Math.sin(this.tempsAnim * 5) * 4, 4,
    );
    ctx.stroke();

    // La tête et la gueule ouverte (deux mâchoires en V vers le bas)
    ctx.fillStyle = coul.murene;
    ctx.beginPath();
    ctx.arc(0, 6, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = coul.mureneVentre;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-5, 10); ctx.lineTo(-3, 16);
    ctx.moveTo(5, 10); ctx.lineTo(3, 16);
    ctx.stroke();

    // Les yeux jaunes perçants
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(-3, 4, 1.8, 0, Math.PI * 2);
    ctx.arc(3, 4, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Le harpon volé, en travers de la gueule — bien visible :
    // c'est ELLE qu'il faut abattre !
    if (this.porteHarpon) {
      ctx.strokeStyle = coul.harpon;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-12, 13); ctx.lineTo(12, 13);
      ctx.stroke();
      ctx.fillStyle = coul.harpon;
      ctx.beginPath();
      ctx.moveTo(15, 13); ctx.lineTo(9, 10); ctx.lineTo(9, 16);
      ctx.fill();
    }

    ctx.restore();
  }
}

// --- La fabrique d'ennemis ------------------------------------
// waves.js désigne les ennemis par leur nom ('meduse'...) : cette
// fonction traduit le nom en objet.
const TYPES = {
  meduse: Meduse,
  barracuda: Barracuda,
  poissonLion: PoissonLion,
  murene: Murene,
};

export function creerEnnemi(type, slot, chemin, multVitesse) {
  return new TYPES[type](slot, chemin, multVitesse);
}
