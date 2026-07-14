// ============================================================
// BOSS — le poulpe géant, gardien des profondeurs.
//
// Il surgit toutes les 4 vagues. Sa mécanique de points faibles :
//  1. tant qu'il lui reste des tentacules, sa tête est BLINDÉE
//     (les harpons rebondissent dessus) ;
//  2. il faut détruire le bout de chaque tentacule (3 coups chacun) ;
//  3. tête exposée : ses yeux virent au rouge, chaque coup compte.
//
// Ses attaques : des coups de fouet de tentacule qui plongent vers
// le joueur, et des crachats d'encre bien visés.
// ============================================================

import { CONFIG } from '../config.js';

export class Poulpe {
  constructor(multVitesse = 1) {
    const c = CONFIG.boss;
    this.x = CONFIG.ecran.largeur / 2;
    this.y = -90;              // il entre par le haut, majestueux
    this.yCible = 130;
    this.rayon = c.rayonTete;  // cercle de collision de la tête
    this.pvTete = c.pvTete;
    this.multVitesse = multVitesse;
    this.tempsAnim = 0;
    this.flash = 0;            // clignote quand la tête encaisse
    this.mort = false;

    // Les 4 tentacules, réparties en éventail sous la tête.
    // « ecart » : leur position relative (-1.5 = tout à gauche).
    this.tentacules = [-1.5, -0.5, 0.5, 1.5].map((ecart) => ({
      ecart,
      pv: c.pvTentacule,
      etat: 'ondule',     // ondule | attaque | pause | retour
      avancee: 0,         // progression du coup de fouet (0 à 1)
      cibleX: 0,          // où le coup visait
      compte: 0,          // chrono de l'état en cours
      phase: Math.random() * Math.PI * 2,
    }));

    this.prochaineAttaque = 3.0; // petit répit d'entrée
    this.prochaineEncre = 2.0;
  }

  get tentaculesVivantes() {
    return this.tentacules.filter((t) => t.pv > 0);
  }

  // Le point faible n'est exposé qu'une fois les tentacules détruites
  get teteVulnerable() {
    return this.tentaculesVivantes.length === 0;
  }

  // La position du BOUT d'une tentacule (sa zone de collision).
  // Au repos elle ondule ; en attaque elle est interpolée entre sa
  // position de repos et la cible du coup de fouet.
  boutTentacule(t) {
    const repos = {
      x: this.x + t.ecart * 58 + Math.sin(this.tempsAnim * 1.6 + t.phase) * 10,
      y: this.y + 150 + Math.sin(this.tempsAnim * 1.3 + t.phase) * 14,
    };
    if (t.etat === 'ondule' || t.pv <= 0) return repos;

    // L'aller est foudroyant, le retour nonchalant
    const cible = { x: t.cibleX, y: CONFIG.joueur.y };
    const p = t.etat === 'retour' ? 1 - t.avancee : t.avancee;
    // easing « accélération douce » : p² donne le coup de fouet
    const e = t.etat === 'attaque' ? p * p : p;
    return {
      x: repos.x + (cible.x - repos.x) * e,
      y: repos.y + (cible.y - repos.y) * e,
    };
  }

  // dt, position du joueur, et une fonction pour cracher l'encre
  update(dt, joueurX, cracherEncre) {
    this.tempsAnim += dt;
    if (this.flash > 0) this.flash -= dt;

    // L'entrée en scène : il descend jusqu'à sa position
    if (this.y < this.yCible) {
      this.y = Math.min(this.yCible, this.y + 60 * dt);
      return; // pas d'attaque tant qu'il n'est pas en place
    }

    // Une dérive latérale lente, pour ne jamais être une cible facile
    this.x = CONFIG.ecran.largeur / 2
      + Math.sin(this.tempsAnim * 0.45) * 85;

    // --- Les coups de fouet ---
    this.prochaineAttaque -= dt;
    if (this.prochaineAttaque <= 0 && this.tentaculesVivantes.length > 0) {
      this.prochaineAttaque = CONFIG.boss.cadenceAttaque / this.multVitesse;
      const vivantes = this.tentaculesVivantes.filter((t) => t.etat === 'ondule');
      if (vivantes.length > 0) {
        const t = vivantes[Math.floor(Math.random() * vivantes.length)];
        t.etat = 'attaque';
        t.avancee = 0;
        t.cibleX = joueurX; // le fouet vise ta position à CET instant
      }
    }

    // La vie de chaque tentacule en action
    for (const t of this.tentacules) {
      if (t.pv <= 0) continue;
      if (t.etat === 'attaque') {
        t.avancee += dt / 0.45;              // aller en 0,45 s
        if (t.avancee >= 1) { t.etat = 'pause'; t.compte = 0.25; }
      } else if (t.etat === 'pause') {
        t.compte -= dt;                       // le fouet reste planté 0,25 s
        if (t.compte <= 0) { t.etat = 'retour'; t.avancee = 0; }
      } else if (t.etat === 'retour') {
        t.avancee += dt / 0.9;                // retour en 0,9 s
        if (t.avancee >= 1) t.etat = 'ondule';
      }
    }

    // --- Les crachats d'encre ---
    this.prochaineEncre -= dt;
    if (this.prochaineEncre <= 0) {
      this.prochaineEncre = CONFIG.boss.cadenceEncre / this.multVitesse;
      cracherEncre(this.x, this.y + 26);
    }
  }

  // Un harpon touche-t-il le boss ? Renvoie un « événement » que la
  // scène traduit en points, sons et explosions :
  //   { type: 'tentaculeBlessee' | 'tentaculeDetruite' | 'blinde'
  //          | 'teteBlessee' | 'mort', x, y }
  toucherHarpon(harpon) {
    const c = CONFIG.boss;

    // Les bouts de tentacules d'abord (c'est ce qu'on vise)
    for (const t of this.tentaculesVivantes) {
      const bout = this.boutTentacule(t);
      const d = Math.hypot(harpon.x - bout.x, harpon.y - bout.y);
      if (d < c.rayonTentacule + harpon.rayon) {
        t.pv -= 1;
        return {
          type: t.pv > 0 ? 'tentaculeBlessee' : 'tentaculeDetruite',
          x: bout.x, y: bout.y,
        };
      }
    }

    // Puis la tête
    const d = Math.hypot(harpon.x - this.x, harpon.y - this.y);
    if (d < c.rayonTete + harpon.rayon) {
      if (!this.teteVulnerable) {
        return { type: 'blinde', x: harpon.x, y: harpon.y }; // ça rebondit !
      }
      this.pvTete -= 1;
      this.flash = 0.15;
      if (this.pvTete <= 0) {
        this.mort = true;
        return { type: 'mort', x: this.x, y: this.y };
      }
      return { type: 'teteBlessee', x: this.x, y: this.y };
    }

    return null; // raté
  }

  // Le bout d'une tentacule touche-t-il le joueur ?
  toucheLeJoueur(joueur) {
    for (const t of this.tentaculesVivantes) {
      const bout = this.boutTentacule(t);
      const d = Math.hypot(joueur.x - bout.x, joueur.y - bout.y);
      if (d < CONFIG.boss.rayonTentacule + joueur.rayon) return true;
    }
    return false;
  }

  draw(ctx) {
    const coul = CONFIG.couleurs;
    // Le flash blanc quand la tête encaisse
    const enFlash = this.flash > 0 && Math.floor(this.flash * 30) % 2 === 0;

    // --- Les tentacules (dessinées d'abord : elles passent SOUS la tête)
    for (const t of this.tentacules) {
      if (t.pv <= 0) continue;
      const base = { x: this.x + t.ecart * 20, y: this.y + 18 };
      const bout = this.boutTentacule(t);

      // Une courbe souple de la base au bout, gonflée sur le côté
      const ctrl = {
        x: (base.x + bout.x) / 2 + t.ecart * 30 + Math.sin(this.tempsAnim * 2 + t.phase) * 12,
        y: (base.y + bout.y) / 2,
      };
      // On la dessine comme un chapelet de cercles qui s'affinent
      // (la vraie forme d'une tentacule !)
      for (let i = 0; i <= 10; i++) {
        const p = i / 10;
        const u = 1 - p;
        const px = u * u * base.x + 2 * u * p * ctrl.x + p * p * bout.x;
        const py = u * u * base.y + 2 * u * p * ctrl.y + p * p * bout.y;
        ctx.fillStyle = i === 10 && t.pv < CONFIG.boss.pvTentacule
          ? coul.poulpeSombre // le bout blessé s'assombrit
          : coul.poulpe;
        ctx.beginPath();
        ctx.arc(px, py, 11 - p * 6, 0, Math.PI * 2);
        ctx.fill();
      }
      // La ventouse du bout : la cible à viser !
      ctx.fillStyle = coul.mureneVentre;
      ctx.beginPath();
      ctx.arc(bout.x, bout.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- La tête
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = enFlash ? '#ffffff' : coul.poulpe;
    ctx.beginPath();
    // Le grand dôme bombé
    ctx.arc(0, -4, 30, Math.PI, 0);
    ctx.quadraticCurveTo(30, 18, 14, 22);
    ctx.quadraticCurveTo(0, 27, -14, 22);
    ctx.quadraticCurveTo(-30, 18, -30, -4);
    ctx.fill();

    // Les yeux : jaunes et placides... rouges et furieux quand
    // la tête est exposée !
    const enColere = this.teteVulnerable;
    ctx.fillStyle = enColere ? '#ff5544' : '#ffd166';
    ctx.beginPath();
    ctx.arc(-11, 2, 6, 0, Math.PI * 2);
    ctx.arc(11, 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a0a20';
    ctx.beginPath();
    ctx.arc(-11, 3, 2.5, 0, Math.PI * 2);
    ctx.arc(11, 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Les sourcils froncés
    if (enColere) {
      ctx.strokeStyle = coul.poulpeSombre;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-17, -6); ctx.lineTo(-6, -2);
      ctx.moveTo(17, -6); ctx.lineTo(6, -2);
      ctx.stroke();
    }
    ctx.restore();
  }
}
