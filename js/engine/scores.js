// ============================================================
// SCORES — le tableau des meilleurs scores, façon borne d'arcade.
//
// Sauvegardé dans le localStorage du navigateur : une petite zone
// de stockage propre à chaque site, qui survit à la fermeture de
// la page. On y range le top 10 sous forme de JSON.
// ============================================================

import { CONFIG } from '../config.js';

// Le tableau d'origine, pour que la borne ne soit jamais vide
const SCORES_DEFAUT = [
  { initiales: 'KAI', score: 5000 },
  { initiales: 'LOU', score: 4000 },
  { initiales: 'AXL', score: 3000 },
  { initiales: 'ZOE', score: 2000 },
  { initiales: 'TOM', score: 1000 },
];

export function chargerScores() {
  try {
    const brut = localStorage.getItem(CONFIG.scores.cle);
    if (brut) return JSON.parse(brut);
  } catch (e) {
    // localStorage indisponible ou données corrompues : pas grave,
    // on repart du tableau par défaut
  }
  return [...SCORES_DEFAUT];
}

export function meilleurScore() {
  const scores = chargerScores();
  return scores.length > 0 ? scores[0].score : 0;
}

// Ce score mérite-t-il d'entrer au tableau ?
export function estQualifie(score) {
  const scores = chargerScores();
  return score > 0 && (
    scores.length < CONFIG.scores.taille ||
    score > scores[scores.length - 1].score
  );
}

// Insère le score à sa place et renvoie son rang (0 = premier).
export function insererScore(initiales, score) {
  const scores = chargerScores();
  scores.push({ initiales, score });
  scores.sort((a, b) => b.score - a.score);       // du plus grand au plus petit
  scores.length = Math.min(scores.length, CONFIG.scores.taille);
  try {
    localStorage.setItem(CONFIG.scores.cle, JSON.stringify(scores));
  } catch (e) {
    // stockage plein ou bloqué : le score vivra le temps de la session
  }
  return scores.findIndex((s) => s.initiales === initiales && s.score === score);
}
