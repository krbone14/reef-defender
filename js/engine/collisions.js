// ============================================================
// COLLISIONS — détecter quand deux choses se touchent.
//
// Chaque entité du jeu (plongeur, ennemi, harpon...) possède un
// cercle de collision invisible : une position (x, y) et un rayon.
// Deux cercles se touchent si la distance entre leurs centres est
// plus petite que la somme de leurs rayons.
//
// Astuce classique : plutôt que de calculer la vraie distance
// (qui demande une racine carrée, coûteuse), on compare les
// distances AU CARRÉ — le résultat est le même.
// ============================================================

export function cerclesSeTouchent(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const rayons = a.rayon + b.rayon;
  return dx * dx + dy * dy < rayons * rayons;
}
