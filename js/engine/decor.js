// ============================================================
// DÉCOR — le récif corallien qu'on défend, en bas de l'écran.
//
// Purement décoratif (aucune collision) : des silhouettes de
// coraux et une anémone qui ondule. Dessiné en premier, tout le
// reste du jeu passe par-dessus.
// ============================================================

import { CONFIG } from '../config.js';

export function dessinerRecif(ctx, temps) {
  const H = CONFIG.ecran.hauteur;
  const L = CONFIG.ecran.largeur;
  ctx.fillStyle = CONFIG.couleurs.corail;
  ctx.strokeStyle = CONFIG.couleurs.corail;

  // Le sol : une bande bombée tout en bas
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.quadraticCurveTo(L * 0.3, H - 18, L * 0.55, H - 10);
  ctx.quadraticCurveTo(L * 0.8, H - 4, L, H - 14);
  ctx.lineTo(L, H);
  ctx.fill();

  // Un corail branchu à gauche
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (const [x0, x1, h] of [[40, 28, 46], [52, 58, 60], [64, 52, 38]]) {
    ctx.beginPath();
    ctx.moveTo(x0, H - 6);
    ctx.quadraticCurveTo(x0, H - h * 0.6, x1, H - h);
    ctx.stroke();
  }

  // Un corail-cerveau (une bosse striée) au centre-droit
  ctx.beginPath();
  ctx.arc(L * 0.72, H - 8, 26, Math.PI, 0);
  ctx.fill();

  // L'anémone à droite, dont les bras respirent avec le courant
  ctx.lineWidth = 3;
  for (let i = 0; i < 5; i++) {
    const bx = L - 46 + i * 8;
    const balancement = Math.sin(temps * 1.2 + i * 0.8) * 5;
    ctx.beginPath();
    ctx.moveTo(bx, H - 4);
    ctx.quadraticCurveTo(bx + balancement, H - 20, bx + balancement * 1.6, H - 32);
    ctx.stroke();
  }
}
