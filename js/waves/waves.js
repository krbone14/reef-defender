// ============================================================
// WAVES — la chorégraphie des vagues, décrite en DONNÉES.
//
// Aucune logique ici : chaque vague est un simple objet qui dit
// « tel escadron entre par tel chemin, à tel moment, pour occuper
// telles cases de la formation ». C'est la scène de jeu qui lit
// ces données et fait apparaître les ennemis.
//
// Pour inventer une nouvelle vague : ajoute un objet à VAGUES !
// ============================================================

// Petits raccourcis pour ne pas écrire 32 paires [colonne, rangée]
// à la main. (La grille : 8 colonnes de 0 à 7, 4 rangées de 0 à 3,
// la rangée 0 étant la plus haute.)
const rangee = (r, colonnes = [0, 1, 2, 3, 4, 5, 6, 7]) => colonnes.map((c) => [c, r]);
const colonnes = (cols, rangees = [0, 1, 2, 3]) =>
  cols.flatMap((c) => rangees.map((r) => [c, r]));

// Comme dans Galaga, l'espèce dépend de la rangée : les plus coriaces
// en haut (loin des harpons), la chair à canon en bas.
// Un escadron peut quand même imposer un type avec « type: 'meduse' ».
export const TYPE_PAR_RANGEE = ['poissonLion', 'barracuda', 'meduse', 'meduse'];

export const VAGUES = [

  // --- Vague type 1 : « La parade » ---------------------------
  // Les rangées défilent une par une, en alternant boucle à gauche
  // et boucle à droite. L'entrée classique, lisible, pour apprendre.
  {
    nom: 'La parade',
    escadrons: [
      { slots: rangee(3), chemin: 'boucleGauche',  delai: 0.0, intervalle: 0.18 },
      { slots: rangee(2), chemin: 'boucleDroite',  delai: 1.6, intervalle: 0.18 },
      { slots: rangee(1), chemin: 'boucleGauche',  delai: 3.2, intervalle: 0.18 },
      { slots: rangee(0), chemin: 'boucleDroite',  delai: 4.8, intervalle: 0.18 },
    ],
  },

  // --- Vague type 2 : « La tenaille » -------------------------
  // Deux courants montent des profondeurs, un de chaque côté,
  // et se referment sur le centre.
  {
    nom: 'La tenaille',
    escadrons: [
      { slots: colonnes([0, 1]), chemin: 'remonteeGauche', delai: 0.0, intervalle: 0.20 },
      { slots: colonnes([7, 6]), chemin: 'remonteeDroite', delai: 0.0, intervalle: 0.20 },
      { slots: colonnes([2, 3]), chemin: 'remonteeGauche', delai: 2.2, intervalle: 0.20 },
      { slots: colonnes([5, 4]), chemin: 'remonteeDroite', delai: 2.2, intervalle: 0.20 },
    ],
  },

  // --- Vague type 3 : « Le geyser » ---------------------------
  // Tout le monde tombe du haut de l'écran en file indienne
  // serrée, en grand S. Impressionnant et dangereux à traverser.
  {
    nom: 'Le geyser',
    escadrons: [
      { slots: rangee(0), chemin: 'plongeeCentrale', delai: 0.0, intervalle: 0.13 },
      { slots: rangee(1), chemin: 'plongeeCentrale', delai: 1.5, intervalle: 0.13 },
      { slots: rangee(2), chemin: 'plongeeCentrale', delai: 3.0, intervalle: 0.13 },
      { slots: rangee(3), chemin: 'plongeeCentrale', delai: 4.5, intervalle: 0.13 },
    ],
  },

  // --- Vague type 4 : « Le tourbillon » -----------------------
  // Quatre escadrons entrent PRESQUE en même temps par les deux
  // côtés : l'écran entier tourbillonne. La plus chaotique.
  {
    nom: 'Le tourbillon',
    escadrons: [
      { slots: colonnes([0, 2]), chemin: 'boucleGauche',   delai: 0.0, intervalle: 0.16 },
      { slots: colonnes([7, 5]), chemin: 'boucleDroite',   delai: 0.5, intervalle: 0.16 },
      { slots: colonnes([1, 3]), chemin: 'remonteeGauche', delai: 1.0, intervalle: 0.16 },
      { slots: colonnes([6, 4]), chemin: 'remonteeDroite', delai: 1.5, intervalle: 0.16 },
    ],
  },
];

// La vague n° « numero » (1, 2, 3...) : on boucle sur les 4 modèles,
// et « cycle » compte le nombre de tours complets déjà faits
// (il sert à accélérer le jeu : cycle 0 = normal, cycle 1 = plus dur...).
export function definitionVague(numero) {
  return {
    modele: VAGUES[(numero - 1) % VAGUES.length],
    cycle: Math.floor((numero - 1) / VAGUES.length),
  };
}
