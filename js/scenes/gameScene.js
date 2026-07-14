// ============================================================
// SCÈNE DE JEU — le cœur de Reef Defender.
//
// Cette scène orchestre tout pendant la partie :
//  - elle lit la définition de la vague (waves.js) et fait entrer
//    les ennemis un par un sur leurs chemins de Bézier,
//  - elle décide qui part en piqué et quand,
//  - elle détecte les collisions, distribue points et power-ups,
//  - elle déclenche sons, explosions et secousses d'écran,
//  - elle enchaîne les vagues et détecte le game over.
// ============================================================

import { CONFIG } from '../config.js';
import { Plongeur } from '../entities/player.js';
import { creerEnnemi } from '../entities/enemy.js';
import { Poulpe } from '../entities/boss.js';
import { Harpon, TirEnnemi, Encre } from '../entities/projectiles.js';
import { PowerUp, HarponPerdu } from '../entities/powerups.js';
import { cerclesSeTouchent } from '../engine/collisions.js';
import { Particules } from '../engine/particles.js';
import { dessinerRecif } from '../engine/decor.js';
import { Formation } from '../waves/formation.js';
import { CHEMINS } from '../waves/paths.js';
import { definitionVague, TYPE_PAR_RANGEE } from '../waves/waves.js';
import { SceneGameOver } from './gameOverScene.js';

export class SceneJeu {
  constructor(jeu) {
    this.jeu = jeu; // l'objet partagé : viewport, input, audio, scenes...
  }

  entrer() {
    this.plongeur = new Plongeur();
    this.formation = new Formation();
    this.particules = new Particules();
    this.ennemis = [];
    this.harpons = [];
    this.tirsEnnemis = [];
    this.powerUps = [];
    this.score = 0;
    this.vague = 0;
    this.secousse = { duree: 0, force: 0 }; // le tremblement d'écran
    this.boss = null;                        // le poulpe (vagues 4, 8...)
    this.pauseVague = 0;                     // répit après un boss vaincu
    this.messageFlash = { texte: '', duree: 0 }; // « HARPON VOLÉ ! » etc.

    // Le « contexte » que chaque ennemi reçoit à son update :
    // la formation (pour connaître sa case), la position du joueur
    // (pour viser), et une fonction pour tirer.
    const scene = this;
    this.contexteEnnemis = {
      formation: this.formation,
      get joueurX() { return scene.plongeur.x; }, // toujours à jour
      tirer: (ennemi) => {
        this.tirsEnnemis.push(
          new TirEnnemi(ennemi.x, ennemi.y, this.plongeur.x, this.plongeur.y),
        );
      },
    };

    this.vagueSuivante();
  }

  // Prépare la vague suivante : calendrier d'apparitions + difficulté
  vagueSuivante() {
    this.vague += 1;
    const { modele, cycle } = definitionVague(this.vague);
    this.compteMessage = CONFIG.dureeMessageVague; // bandeau « VAGUE N »
    this.jeu.audio.jingleVague();

    // À chaque cycle complet des 4 modèles, les ennemis accélèrent
    this.multVitesse = 1 + cycle * CONFIG.difficulte.vitesseParCycle;

    // --- Vague de boss ? Le poulpe remplace la formation ---
    if (this.vague % CONFIG.boss.periode === 0) {
      this.boss = new Poulpe(this.multVitesse);
      this.nomVague = 'LE POULPE GÉANT';
      this.apparitions = [];
      this.tempsVague = 0;
      return;
    }

    this.nomVague = modele.nom;

    // On transforme les escadrons en un calendrier d'apparitions :
    // « à t = 1.6 s, un barracuda entre par boucleDroite vers la case [3,1] ».
    // Le type dépend de la rangée (sauf si l'escadron l'impose).
    this.apparitions = [];
    for (const escadron of modele.escadrons) {
      escadron.slots.forEach((slot, i) => {
        this.apparitions.push({
          temps: escadron.delai + i * escadron.intervalle,
          type: escadron.type || TYPE_PAR_RANGEE[slot[1]],
          slot,
          chemin: escadron.chemin,
        });
      });
    }
    this.apparitions.sort((a, b) => a.temps - b.temps);

    // --- Les murènes s'invitent à partir de la vague 2 : elles
    // remplacent des poissons-lions de la rangée du haut.
    const cm = CONFIG.ennemis.murene;
    if (this.vague >= cm.desVague) {
      let aPlacer = Math.min(cm.max, 1 + Math.floor((this.vague - cm.desVague) / 4));
      for (const a of this.apparitions) {
        if (aPlacer === 0) break;
        if (a.slot[1] === 0) { a.type = 'murene'; aPlacer -= 1; }
      }
    }
    this.tempsVague = 0;

    // L'agressivité des piqués grandit avec le numéro de vague
    const p = CONFIG.piques;
    this.cadencePique = Math.max(
      p.cadenceMin,
      p.cadenceDepart - (this.vague - 1) * p.reductionParVague,
    );
    this.tailleGroupe = Math.min(
      p.tailleGroupeMax,
      p.tailleGroupeDepart + Math.floor((this.vague - 1) / p.vaguesParGroupeSupp),
    );
    this.prochainPique = this.cadencePique + p.repitApresEntree;
  }

  update(dt) {
    const input = this.jeu.input;
    this.tempsVague += dt;
    if (this.compteMessage > 0) this.compteMessage -= dt;
    if (this.secousse.duree > 0) this.secousse.duree -= dt;
    if (this.messageFlash.duree > 0) this.messageFlash.duree -= dt;

    // --- Les entrées : on fait apparaître les ennemis dont l'heure est venue
    while (this.apparitions.length > 0 && this.apparitions[0].temps <= this.tempsVague) {
      const a = this.apparitions.shift();
      this.ennemis.push(creerEnnemi(a.type, a.slot, CHEMINS[a.chemin], this.multVitesse));
    }

    // --- Le plongeur bouge et tire (tout seul en mode tactile)
    this.plongeur.update(dt, input);
    if ((input.tir || input.modeTactile) && this.plongeur.peutTirer(this.harpons.length)) {
      if (this.plongeur.armes === 'double') {
        // Le tir double : deux harpons côte à côte !
        const e = CONFIG.harpon.ecartDouble;
        this.harpons.push(new Harpon(this.plongeur.x - e, this.plongeur.y - 24));
        this.harpons.push(new Harpon(this.plongeur.x + e, this.plongeur.y - 24));
      } else {
        this.harpons.push(new Harpon(this.plongeur.x, this.plongeur.y - 24));
      }
      this.plongeur.vientDeTirer();
      this.jeu.audio.tir();
    }

    // --- Le boss, s'il est là
    if (this.boss) {
      this.boss.update(dt, this.plongeur.x, (x, y) => {
        this.tirsEnnemis.push(new Encre(x, y, this.plongeur.x, this.plongeur.y));
      });
    }

    // --- Tout le monde avance
    this.formation.update(dt);
    this.particules.update(dt);
    for (const e of this.ennemis) e.update(dt, this.contexteEnnemis);
    for (const h of this.harpons) h.update(dt);
    for (const t of this.tirsEnnemis) t.update(dt);
    for (const p of this.powerUps) p.update(dt);
    this.harpons = this.harpons.filter((h) => !h.horsEcran);
    this.tirsEnnemis = this.tirsEnnemis.filter((t) => !t.horsEcran);
    this.powerUps = this.powerUps.filter((p) => !p.horsEcran);

    this.lancerPiques(dt);
    this.collisions();
    if (this.boss) this.collisionsBoss();

    // --- Vague nettoyée ? (tout est apparu ET tout est détruit)
    // Après un boss, on laisse un petit répit de victoire.
    if (this.pauseVague > 0) {
      this.pauseVague -= dt;
    } else if (!this.boss && this.apparitions.length === 0 && this.ennemis.length === 0) {
      this.vagueSuivante();
    }

    // --- Plus de vies ? Game over
    if (this.plongeur.vies <= 0) {
      this.jeu.hiScore = Math.max(this.jeu.hiScore, this.score);
      this.jeu.scenes.changer(new SceneGameOver(this.jeu, this.score));
    }
  }

  // À intervalle régulier, un petit groupe quitte la formation
  // pour foncer sur le joueur.
  lancerPiques(dt) {
    // On attend la fin du défilé d'entrée avant d'attaquer
    if (this.apparitions.length > 0) return;
    const enFormation = this.ennemis.filter((e) => e.etat === 'formation');
    if (enFormation.length === 0) return;

    this.prochainPique -= dt;
    if (this.prochainPique <= 0) {
      this.prochainPique = this.cadencePique;
      const n = Math.min(this.tailleGroupe, enFormation.length);
      for (let i = 0; i < n; i++) {
        // On pioche un ennemi au hasard parmi ceux encore en formation
        const index = Math.floor(Math.random() * enFormation.length);
        const attaquant = enFormation.splice(index, 1)[0];
        attaquant.commencerPique(this.plongeur.x);
      }
    }
  }

  // Un ennemi vient d'être détruit : points, explosion, et
  // peut-être un power-up qui tombe de ses poches
  detruireEnnemi(ennemi, fractionPoints = 1) {
    ennemi.mort = true;
    this.score += Math.round(ennemi.pointsGagnes * fractionPoints);
    this.particules.explosion(ennemi.x, ennemi.y, ennemi.couleurExplosion);
    this.jeu.audio.explosion();

    // La murène porteuse lâche NOTRE harpon : à rattraper !
    if (ennemi.porteHarpon) {
      this.powerUps.push(new HarponPerdu(ennemi.x, ennemi.y));
      this.flash('HARPON LIBÉRÉ !');
    } else if (Math.random() < CONFIG.powerUps.chance) {
      this.powerUps.push(new PowerUp(ennemi.x, ennemi.y));
    }
  }

  // Affiche un message événement au centre de l'écran
  flash(texte, duree = 2) {
    this.messageFlash = { texte, duree };
  }

  // Le plongeur attrape une capsule : on applique son effet
  attraperPowerUp(bonus) {
    const p = CONFIG.powerUps;
    // Le harpon récupéré : le Graal — double tir jusqu'à la mort !
    if (bonus instanceof HarponPerdu) {
      this.plongeur.armes = 'double';
      this.jeu.audio.bonus();
      this.flash('DOUBLE HARPON !');
      return;
    }
    if (bonus.type === 'tirRapide') {
      this.plongeur.tirRapide = p.dureeTirRapide;
      this.jeu.audio.bonus();
    } else if (bonus.type === 'bouclier') {
      this.plongeur.bouclier = true;
      this.jeu.audio.bouclier();
    } else { // sonar : une onde balaie tous les ennemis à l'écran
      this.jeu.audio.sonar();
      this.declencherSecousse(5, 0.4);
      for (const ennemi of this.ennemis) {
        this.detruireEnnemi(ennemi, p.fractionPointsSonar);
      }
      this.ennemis = this.ennemis.filter((e) => !e.mort);
    }
  }

  declencherSecousse(force, duree) {
    this.secousse = { force, duree };
  }

  collisions() {
    // Le piège de la murène : tout harpon qui traverse un cône de
    // capture actif est HAPPÉ (elle ne vole que le « second » harpon :
    // si le tien est déjà volé ou doublé, le cône est inoffensif)
    if (this.plongeur.armes === 'normal') {
      for (const ennemi of this.ennemis) {
        if (!ennemi.coneActif) continue;
        for (const harpon of this.harpons) {
          if (!harpon.aTouche && ennemi.dansCone(harpon.x, harpon.y)) {
            harpon.aTouche = true;
            ennemi.porteHarpon = true;
            this.plongeur.armes = 'vole';
            this.jeu.audio.capture();
            this.flash('HARPON VOLÉ !');
            break;
          }
        }
      }
      this.harpons = this.harpons.filter((h) => !h.aTouche);
    }

    // Harpons contre ennemis (double points si l'ennemi est en piqué !)
    for (const harpon of this.harpons) {
      for (const ennemi of this.ennemis) {
        if (cerclesSeTouchent(harpon, ennemi)) {
          harpon.aTouche = true;
          if (ennemi.toucher()) {
            this.detruireEnnemi(ennemi);
          } else {
            this.jeu.audio.toucheDur(); // blessé mais pas coulé
          }
          break; // un harpon ne touche qu'un seul ennemi
        }
      }
    }
    this.harpons = this.harpons.filter((h) => !h.aTouche);
    this.ennemis = this.ennemis.filter((e) => !e.mort);

    // Le plongeur ramasse les capsules
    for (const bonus of this.powerUps) {
      if (cerclesSeTouchent(bonus, this.plongeur)) {
        bonus.pris = true;
        this.attraperPowerUp(bonus);
      }
    }
    this.powerUps = this.powerUps.filter((b) => !b.pris);

    // Le plongeur, s'il n'est pas invincible, craint deux choses :
    if (this.plongeur.invincible <= 0) {
      // ...les épines...
      for (const tir of this.tirsEnnemis) {
        if (cerclesSeTouchent(tir, this.plongeur)) {
          tir.aTouche = true;
          this.encaisser();
          break;
        }
      }
      this.tirsEnnemis = this.tirsEnnemis.filter((t) => !t.aTouche);

      // ...et les ennemis en piqué (collision frontale : les deux trinquent)
      if (this.plongeur.invincible <= 0) {
        for (const ennemi of this.ennemis) {
          if (ennemi.enPique && cerclesSeTouchent(ennemi, this.plongeur)) {
            this.detruireEnnemi(ennemi);
            this.encaisser();
            break;
          }
        }
        this.ennemis = this.ennemis.filter((e) => !e.mort);
      }
    }
  }

  // Les collisions spécifiques au combat de boss
  collisionsBoss() {
    const c = CONFIG.boss;

    // Harpons contre le poulpe : le boss nous dit ce qui s'est passé
    for (const harpon of this.harpons) {
      const evt = this.boss.toucherHarpon(harpon);
      if (!evt) continue;
      harpon.aTouche = true;

      if (evt.type === 'blinde') {
        // La tête est encore protégée : ça rebondit
        this.jeu.audio.toucheDur();
      } else if (evt.type === 'tentaculeBlessee') {
        this.jeu.audio.toucheDur();
        this.particules.explosion(evt.x, evt.y, CONFIG.couleurs.poulpe, 5);
      } else if (evt.type === 'tentaculeDetruite') {
        this.score += c.pointsTentacule;
        this.jeu.audio.explosion();
        this.particules.explosion(evt.x, evt.y, CONFIG.couleurs.poulpe, 18);
        this.declencherSecousse(4, 0.25);
        // Les tentacules sont généreuses en power-ups
        if (Math.random() < c.chancePowerUpTentacule) {
          this.powerUps.push(new PowerUp(evt.x, evt.y));
        }
        if (this.boss.teteVulnerable) this.flash('VISE LA TÊTE !');
      } else if (evt.type === 'teteBlessee') {
        this.jeu.audio.toucheDur();
        this.particules.explosion(evt.x, evt.y, CONFIG.couleurs.poulpeSombre, 6);
      } else if (evt.type === 'mort') {
        // Victoire ! Feu d'artifice et répit bien mérité
        this.score += c.pointsTete;
        this.jeu.audio.explosion();
        this.jeu.audio.jingleVague();
        this.declencherSecousse(10, 0.7);
        for (let i = 0; i < 4; i++) {
          this.particules.explosion(
            evt.x + (Math.random() - 0.5) * 70,
            evt.y + (Math.random() - 0.5) * 50,
            i % 2 ? CONFIG.couleurs.poulpe : CONFIG.couleurs.accent, 20);
        }
        this.flash('RÉCIF SAUVÉ !', 2.5);
        this.boss = null;
        this.pauseVague = 2.5;
        break; // plus de boss à toucher !
      }
    }
    this.harpons = this.harpons.filter((h) => !h.aTouche);

    // Les coups de fouet des tentacules
    if (this.boss && this.plongeur.invincible <= 0
        && this.boss.toucheLeJoueur(this.plongeur)) {
      this.encaisser();
    }
  }

  // Le plongeur encaisse un impact : bouclier ou vie, avec les
  // effets qui vont bien
  encaisser() {
    const resultat = this.plongeur.toucher();
    if (resultat === 'bouclier') {
      this.jeu.audio.bouclier();
      this.particules.explosion(this.plongeur.x, this.plongeur.y,
        CONFIG.couleurs.bouclier, 8); // la bulle éclate
    } else {
      this.jeu.audio.degat();
      this.declencherSecousse(6, 0.35);
      this.particules.explosion(this.plongeur.x, this.plongeur.y,
        CONFIG.couleurs.plongeur, 20);
    }
  }

  render(ctx) {
    // La secousse : on décale tout le dessin d'un poil, au hasard,
    // tant qu'elle dure. Simple et très efficace.
    const secoue = this.secousse.duree > 0;
    if (secoue) {
      ctx.save();
      const f = this.secousse.force;
      ctx.translate((Math.random() - 0.5) * f, (Math.random() - 0.5) * f);
    }

    dessinerRecif(ctx, this.tempsVague); // le récif qu'on défend !
    if (this.boss) this.boss.draw(ctx);
    for (const e of this.ennemis) e.draw(ctx);
    for (const h of this.harpons) h.draw(ctx);
    for (const t of this.tirsEnnemis) t.draw(ctx);
    for (const p of this.powerUps) p.draw(ctx);
    this.particules.draw(ctx);
    this.plongeur.draw(ctx);

    if (secoue) ctx.restore(); // le HUD, lui, ne tremble pas

    this.dessinerHUD(ctx);

    // Le bandeau de début de vague : « VAGUE N » et son petit nom
    if (this.compteMessage > 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = CONFIG.couleurs.accent;
      ctx.font = 'bold 32px monospace';
      ctx.fillText(`VAGUE ${this.vague}`, CONFIG.ecran.largeur / 2, 310);
      ctx.fillStyle = CONFIG.couleurs.texte;
      ctx.font = '16px monospace';
      ctx.fillText(`« ${this.nomVague} »`, CONFIG.ecran.largeur / 2, 340);
    }

    // Les messages événements : « HARPON VOLÉ ! », « RÉCIF SAUVÉ ! »...
    if (this.messageFlash.duree > 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = CONFIG.couleurs.accent;
      ctx.font = 'bold 22px monospace';
      ctx.fillText(this.messageFlash.texte, CONFIG.ecran.largeur / 2, 400);
    }
  }

  // HUD = « Head-Up Display » : les infos affichées par-dessus le jeu
  dessinerHUD(ctx) {
    const coul = CONFIG.couleurs;
    ctx.font = 'bold 16px monospace';

    // Score à gauche, meilleur score au centre, vague à droite
    ctx.fillStyle = coul.texte;
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${String(this.score).padStart(6, '0')}`, 10, 24);
    ctx.fillStyle = coul.accent;
    ctx.textAlign = 'center';
    const meilleur = Math.max(this.jeu.hiScore, this.score);
    ctx.fillText(`TOP ${String(meilleur).padStart(6, '0')}`, CONFIG.ecran.largeur / 2, 24);
    ctx.fillStyle = coul.texte;
    ctx.textAlign = 'right';
    ctx.fillText(`VAGUE ${this.vague}`, CONFIG.ecran.largeur - 10, 24);

    // Les vies restantes : des petits masques de plongée en bas à gauche
    for (let i = 0; i < this.plongeur.vies; i++) {
      const x = 16 + i * 22;
      const y = CONFIG.ecran.hauteur - 16;
      ctx.fillStyle = coul.plongeur;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = coul.masque;
      ctx.fillRect(x - 5, y - 3, 10, 4);
    }

    // Le bonus tir rapide restant : une petite jauge sous le score
    if (this.plongeur.tirRapide > 0) {
      const fraction = this.plongeur.tirRapide / CONFIG.powerUps.dureeTirRapide;
      ctx.fillStyle = coul.bonus;
      ctx.fillRect(10, 32, 80 * fraction, 4);
    }

    // La barre de vie du boss : tentacules + tête
    if (this.boss) {
      const c = CONFIG.boss;
      const total = c.pvTete + 4 * c.pvTentacule;
      const restant = this.boss.pvTete
        + this.boss.tentacules.reduce((somme, t) => somme + Math.max(0, t.pv), 0);
      const largeur = 200;
      const x = (CONFIG.ecran.largeur - largeur) / 2;
      ctx.fillStyle = 'rgba(230, 242, 255, 0.25)';
      ctx.fillRect(x, 34, largeur, 6);
      ctx.fillStyle = this.boss.teteVulnerable ? '#ff5544' : coul.poulpe;
      ctx.fillRect(x, 34, largeur * (restant / total), 6);
    }
  }
}
