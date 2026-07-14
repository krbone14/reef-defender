// ============================================================
// SCENES — la machine à états du jeu.
//
// Le jeu est toujours dans exactement UNE scène : l'écran titre,
// le jeu lui-même, le game over... Chaque scène est un objet avec
// (au choix) les méthodes entrer(), update(dt), render(ctx) et
// sortir(). Ce gestionnaire appelle la bonne méthode de la scène
// courante, et gère les changements proprement.
// ============================================================

export class GestionnaireScenes {
  constructor() {
    this.actuelle = null;
  }

  // Quitte la scène courante et active la nouvelle
  changer(scene) {
    if (this.actuelle && this.actuelle.sortir) this.actuelle.sortir();
    this.actuelle = scene;
    if (scene.entrer) scene.entrer();
  }

  update(dt) {
    if (this.actuelle) this.actuelle.update(dt);
  }

  render(ctx) {
    if (this.actuelle) this.actuelle.render(ctx);
  }
}
