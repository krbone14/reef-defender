// ============================================================
// MAIN — le point d'entrée du jeu.
//
// C'est le premier fichier chargé par index.html. Son rôle :
// assembler les briques du moteur (écran, clavier, scènes),
// lancer la première scène, puis démarrer la boucle de jeu.
// ============================================================

import { Viewport } from './engine/viewport.js';
import { Input } from './engine/input.js';
import { demarrerBoucle } from './engine/loop.js';
import { AudioJeu } from './engine/audio.js';
import { meilleurScore } from './engine/scores.js';
import { GestionnaireScenes } from './scenes/scenes.js';
import { SceneTitre } from './scenes/titleScene.js';

// L'écran, le clavier + tactile, le son et la machine à états
const viewport = new Viewport(document.getElementById('jeu'));
const input = new Input(viewport);
const audio = new AudioJeu();
const scenes = new GestionnaireScenes();

// Le navigateur n'autorise le son qu'après un premier geste du
// joueur : on guette la toute première touche ou le premier clic.
window.addEventListener('keydown', () => audio.debloquer(), { once: true });
window.addEventListener('pointerdown', () => audio.debloquer(), { once: true });

// « jeu » est l'objet partagé que toutes les scènes reçoivent :
// il leur donne accès au moteur et aux données qui survivent
// d'une scène à l'autre (comme le meilleur score, chargé depuis
// la sauvegarde du navigateur).
const jeu = { viewport, input, audio, scenes, hiScore: meilleurScore() };

// Astuce debug : ouvre la console du navigateur (F12) et tape par
// exemple « jeu.scenes.actuelle.score = 9999 » pour tricher !
window.jeu = jeu;

// Tout commence à l'écran titre
scenes.changer(new SceneTitre(jeu));

// Et c'est parti ! La boucle appellera update puis render
// à chaque frame, jusqu'à la fermeture de la page.
demarrerBoucle(
  (dt) => {
    scenes.update(dt);
    input.finDeFrame();
  },
  () => {
    viewport.debutRendu();
    scenes.render(viewport.ctx);
  },
);
