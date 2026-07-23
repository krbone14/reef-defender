// REPL driver for Reef Defender (static Canvas game, ES6 modules).
// Run via `node driver.mjs` after ./setup.sh. Commands come from stdin,
// one per line — designed to be piped a heredoc or driven under tmux.
//
// Why this exists instead of `chromium-cli`: that tool isn't installed
// in this container, and the game's ES6 modules are blocked under
// file://, so it needs an actual HTTP server + a real browser, not a
// static screenshot tool.
import { chromium } from 'playwright';
import * as readline from 'node:readline';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';

const SKILL_DIR = path.dirname(new URL(import.meta.url).pathname);
const REPO_DIR = path.resolve(SKILL_DIR, '../../..'); // .claude/skills/run-reefdefender -> repo root
const SHOT_DIR = process.env.SCREENSHOT_DIR || '/tmp/reefdefender-shots';
const PORT = 8420;
fs.mkdirSync(SHOT_DIR, { recursive: true });

// Only libnspr4/libnss3/libasound live here (see setup.sh) — harmless
// to point at even if the host already has them system-wide.
const LOCAL_LIBS = path.join(SKILL_DIR, 'system-libs/usr/lib/x86_64-linux-gnu');
if (fs.existsSync(LOCAL_LIBS)) {
  process.env.LD_LIBRARY_PATH = `${LOCAL_LIBS}:${process.env.LD_LIBRARY_PATH || ''}`;
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

let server = null;
let browser = null;
let page = null;

const COMMANDS = {
  async launch() {
    if (browser) return console.log('already launched');
    server = http.createServer((req, res) => {
      const p = decodeURIComponent(req.url.split('?')[0]);
      const file = path.join(REPO_DIR, p === '/' ? 'index.html' : p);
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    await new Promise((resolve) => server.listen(PORT, resolve));

    browser = await chromium.launch({ args: ['--no-sandbox'] });
    page = await browser.newPage({ viewport: { width: 500, height: 700 } });
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('[console.error]', msg.text());
    });
    page.on('pageerror', (err) => console.log('[pageerror]', err.message));
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });
    console.log('launched. Reef Defender loaded at', `http://localhost:${PORT}/`);
  },

  async ss(name) {
    if (!page) return console.log('ERROR: launch first');
    const f = path.join(SHOT_DIR, (name || `ss-${Date.now()}`) + '.png');
    await page.screenshot({ path: f });
    console.log('screenshot:', f);
  },

  // Title screen -> ESPACE to start; in-game: ArrowLeft/ArrowRight to
  // move, Space to fire, V on title for the scores screen.
  async press(key) { if (page) await page.keyboard.press(key); },
  async keydown(key) { if (page) await page.keyboard.down(key); },
  async keyup(key) { if (page) await page.keyboard.up(key); },

  async wait(ms) { await new Promise((r) => setTimeout(r, Number(ms) || 500)); },

  async eval(expr) {
    if (!page) return console.log('ERROR: launch first');
    try { console.log(JSON.stringify(await page.evaluate(expr))); }
    catch (e) { console.log('ERROR:', e.message); }
  },

  async quit() {
    if (browser) await browser.close().catch(() => {});
    if (server) await new Promise((r) => server.close(r));
    browser = null; page = null; server = null;
  },
  help() { console.log('commands:', Object.keys(COMMANDS).join(', ')); },
};

const stdin = fs.createReadStream(null, { fd: fs.openSync('/dev/stdin', 'r') });
const rl = readline.createInterface({ input: stdin, output: process.stdout, prompt: 'driver> ' });

// readline fires 'line' for every buffered line as fast as they arrive —
// it does NOT wait for an async listener to resolve before firing the
// next one. Piping a heredoc (many lines at once, as opposed to a human
// typing) makes that race obvious: `launch` hadn't finished before `ss`
// ran. Queue commands and run them strictly one at a time.
let queue = Promise.resolve();
let closed = false; // piping a heredoc closes stdin (EOF) long before the
                     // queued async commands finish draining — guard every
                     // rl.prompt() so we don't resume an already-closed interface

rl.on('line', (line) => {
  queue = queue.then(async () => {
    const [cmd, ...rest] = line.trim().split(/\s+/);
    if (!cmd) return;
    const fn = COMMANDS[cmd];
    if (!fn) { console.log('unknown:', cmd, '— try: help'); return; }
    try { await fn(rest.join(' ')); } catch (e) { console.log('ERROR:', e.message); }
    if (cmd === 'quit') { closed = true; process.exit(0); }
    if (!closed) rl.prompt();
  });
});
rl.on('close', () => {
  closed = true;
  queue.then(async () => { await COMMANDS.quit(); process.exit(0); });
});

console.log('Reef Defender driver — "help" for commands, "launch" to start');
rl.prompt();
