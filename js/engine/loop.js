// ============================================================
// LOOP — la boucle de jeu, le « cœur qui bat » du jeu.
//
// requestAnimationFrame demande au navigateur : « appelle-moi
// juste avant de redessiner l'écran ». Sur un écran 60 Hz c'est
// 60 fois par seconde, sur un écran 120 Hz c'est 120 fois.
//
// Pour que le jeu tourne à la MÊME vitesse partout, on mesure
// le temps écoulé depuis la frame précédente (le « delta time »,
// dt) et toutes les vitesses du jeu sont exprimées en
// pixels PAR SECONDE : position += vitesse * dt.
// ============================================================

export function demarrerBoucle(update, render) {
  let tempsPrecedent = performance.now();

  function frame(maintenant) {
    // dt en secondes (performance.now() donne des millisecondes)
    let dt = (maintenant - tempsPrecedent) / 1000;
    tempsPrecedent = maintenant;

    // Si l'onglet a été mis en pause (changement d'onglet...), dt peut
    // valoir plusieurs secondes : on le borne pour éviter que tout
    // « saute » d'un coup (un harpon qui traverserait tous les ennemis !).
    if (dt > 0.1) dt = 0.1;

    update(dt);   // 1. faire avancer le monde
    render();     // 2. le dessiner

    requestAnimationFrame(frame); // et on recommence à la frame suivante
  }

  requestAnimationFrame(frame);
}
