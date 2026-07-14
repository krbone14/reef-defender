// ============================================================
// CONFIG — toutes les constantes de gameplay au même endroit.
// C'est ICI qu'on ajuste l'équilibrage du jeu : vitesses, points
// de vie, cadences de tir... Modifie une valeur, recharge la page,
// et observe la différence !
// ============================================================

export const CONFIG = {

  // --- L'écran logique du jeu ---------------------------------
  // Le jeu est toujours calculé en 480×640, quelle que soit la
  // taille réelle de la fenêtre (viewport.js s'occupe de l'échelle).
  ecran: {
    largeur: 480,
    hauteur: 640,
  },

  // --- Le plongeur --------------------------------------------
  joueur: {
    vitesse: 280,          // pixels par seconde (déplacement horizontal)
    vies: 3,               // nombre de vies au départ
    y: 585,                // hauteur fixe du plongeur (il ne bouge que sur X)
    rayon: 12,             // rayon de collision (le plongeur est un cercle invisible)
    margeBord: 24,         // distance minimale aux bords de l'écran
    invincibilite: 2.5,    // secondes d'invincibilité après avoir été touché
  },

  // --- Le harpon (tir du joueur) ------------------------------
  harpon: {
    vitesse: 520,          // pixels par seconde, vers le haut
    cadence: 0.3,          // secondes minimum entre deux tirs
    maxAEcran: 2,          // comme Galaga : 2 harpons à l'écran maximum
    maxAEcranVole: 1,      // ...un seul si la murène a volé le second !
    maxAEcranDouble: 4,    // ...quatre en mode double harpon
    ecartDouble: 7,        // écart entre les deux harpons du tir double
    rayon: 4,              // rayon de collision
  },

  // --- Le boss : le poulpe géant ------------------------------
  boss: {
    periode: 4,            // il surgit toutes les N vagues (vagues 4, 8, 12...)
    pvTete: 12,            // points de vie de la tête (le point faible)
    pvTentacule: 3,        // points de vie de chaque tentacule
    rayonTete: 30,
    rayonTentacule: 14,    // la zone à viser : le bout de chaque tentacule
    pointsTentacule: 250,
    pointsTete: 3000,
    cadenceAttaque: 2.4,   // secondes entre deux coups de tentacule
    cadenceEncre: 3.0,     // secondes entre deux crachats d'encre
    chancePowerUpTentacule: 0.5, // les tentacules détruites sont généreuses
  },

  // --- L'encre du poulpe ---------------------------------------
  encre: {
    vitesse: 180,
    rayon: 7,
  },

  // --- Les ennemis --------------------------------------------
  // tirsParPique : nombre d'épines lâchées pendant un piqué
  // elan : ampleur du recul avant le piqué (petit = attaque sèche)
  ennemis: {
    meduse: {              // lente et inoffensive de loin... mais nombreuse
      pv: 1,
      rayon: 14,
      points: 50,          // score en formation (le double en piqué !)
      vitessePique: 230,
      tirsParPique: 0,
      elan: 80,
    },
    barracuda: {           // rapide, piqués secs et agressifs
      pv: 1,
      rayon: 13,
      points: 80,
      vitessePique: 360,
      tirsParPique: 0,
      elan: 35,            // presque pas d'élan : il fonce direct
    },
    poissonLion: {         // encaisse 2 tirs et crache des épines
      pv: 2,
      rayon: 15,
      points: 100,
      vitessePique: 250,
      tirsParPique: 2,
      elan: 80,
      cadenceTirFormation: [6, 12], // tire une épine toutes les 6 à 12 s depuis la formation
    },
    murene: {              // la voleuse de harpon !
      pv: 2,
      rayon: 16,
      points: 150,
      pointsPorteuse: 1000, // le jackpot si elle porte ton harpon
      vitessePique: 260,
      tirsParPique: 0,
      elan: 60,
      desVague: 2,          // elle apparaît à partir de cette vague
      max: 2,               // jamais plus de N murènes par vague
      yCapture: 240,        // hauteur où elle s'arrête pour déployer son cône
      dureeCapture: 2.2,    // secondes de déploiement du cône
      porteeCone: 230,      // longueur du cône de capture, vers le bas
    },
  },

  // --- Les power-ups -------------------------------------------
  powerUps: {
    chance: 0.08,             // probabilité qu'un ennemi détruit lâche un bonus
    vitesseChute: 90,         // le bonus coule doucement vers le bas
    rayon: 11,
    dureeTirRapide: 8,        // secondes de tir rapide
    multCadenceTirRapide: 0.4, // cadence multipliée par 0.4 = 2,5× plus rapide
    fractionPointsSonar: 0.5, // les ennemis balayés par le sonar valent moitié prix
  },

  // --- Les entrées en formation -------------------------------
  entree: {
    vitesse: 330,          // vitesse sur les chemins de Bézier d'arrivée
  },

  // --- La grille de formation ---------------------------------
  // Les ennemis s'alignent sur cette grille (centrée sur l'écran).
  grille: {
    colonnes: 8,
    rangees: 4,
    yDebut: 90,            // hauteur de la première rangée
    pasX: 50,              // espacement horizontal entre deux ennemis
    pasY: 48,              // espacement vertical
  },

  // --- La respiration de la formation -------------------------
  formation: {
    cadenceRespiration: 0.9,   // vitesse de l'oscillation (radians/seconde)
    ampleurRespiration: 0.055, // ±5,5 % d'écartement autour du centre
  },

  // --- Les piqués ----------------------------------------------
  piques: {
    cadenceDepart: 2.8,        // secondes entre deux départs de piqué (vague 1)
    reductionParVague: 0.18,   // la cadence se resserre d'autant à chaque vague...
    cadenceMin: 1.1,           // ...sans jamais passer sous ce plancher
    tailleGroupeDepart: 1,     // nombre d'ennemis qui piquent ensemble (vague 1)
    tailleGroupeMax: 3,
    vaguesParGroupeSupp: 3,    // +1 ennemi par groupe toutes les N vagues
    tirsParPique: 2,           // nombre de tirs lâchés pendant un piqué
    repitApresEntree: 1.0,     // secondes de calme entre la fin du défilé et le 1er piqué
  },

  // --- Tirs ennemis (bulles urticantes) ------------------------
  // Lâchés uniquement pendant les piqués, comme dans Galaga.
  tirsEnnemis: {
    vitesse: 200,          // pixels par seconde
    rayon: 5,
    angleMax: 0.6,         // en radians (~34°) : le tir vise le joueur,
                           // mais sans pouvoir partir à l'horizontale
  },

  // --- Montée en difficulté ------------------------------------
  // Les 4 modèles de vagues bouclent ; à chaque tour complet
  // (« cycle »), tout le monde accélère.
  difficulte: {
    vitesseParCycle: 0.15, // +15 % de vitesse ennemie par cycle de 4 vagues
  },

  // --- Le son ---------------------------------------------------
  audio: {
    volume: 0.22,          // volume général (0 = muet, 1 = très fort)
  },

  // --- Les high scores ------------------------------------------
  scores: {
    cle: 'reefdefender.scores', // nom de la sauvegarde dans le navigateur
    taille: 10,                 // on garde les 10 meilleurs
  },

  // --- Divers ---------------------------------------------------
  dureeMessageVague: 2.0,  // secondes d'affichage du bandeau « VAGUE N »

  // --- La palette de couleurs -----------------------------------
  // Style « flat rétro » : peu de couleurs, bien contrastées.
  couleurs: {
    fondHaut: '#07203c',     // bleu profond en haut...
    fondBas: '#030d1c',      // ...encore plus sombre en bas (les abysses)
    plongeur: '#2277b5',     // combinaison de plongée
    palmes: '#ffb454',       // palmes jaunes
    peau: '#e8b98a',
    masque: '#8be9fd',       // vitre du masque, cyan lumineux
    harpon: '#dce8f4',
    meduse: '#c47fe0',       // violet translucide
    meduseClair: '#ecd0fa',
    barracuda: '#a8d8e8',    // argenté bleuté
    barracudaSombre: '#5a92ad',
    poissonLion: '#e8695a',  // rouge corail
    poissonLionRayure: '#f7e3c8',
    tirEnnemi: '#7ef0d4',    // vert bioluminescent (les épines)
    murene: '#8fb04e',       // vert olive
    mureneVentre: '#d8e0a0',
    cone: '#b8f06a',         // le cône de capture, vert électrique
    poulpe: '#b0619e',       // violet-rose du boss
    poulpeSombre: '#7a3f70',
    encre: '#2a1a3a',        // les crachats d'encre, presque noirs
    bonus: '#ffd166',        // capsule des power-ups
    bouclier: '#8be9fd',     // la bulle protectrice
    corail: '#173a54',       // le récif décoratif, en silhouette
    texte: '#e6f2ff',
    accent: '#ffd166',       // jaune doré pour les titres et le score
  },
};
