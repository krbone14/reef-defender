---
name: run-reefdefender
description: Build, run, and drive Reef Defender (the underwater Galaga-style canvas game). Use when asked to start Reef Defender, launch/run/play the game, take a screenshot of it, or verify a change works in the browser.
---

Reef Defender is a static HTML5 Canvas + vanilla JS game (no build step,
no dependencies) — it just needs to be served over HTTP (ES6 modules are
blocked under `file://`). Drive it via
`.claude/skills/run-reefdefender/driver.mjs`: a small headless-Chromium
REPL, since `chromium-cli` isn't installed in this container. The driver
serves the repo itself, so it needs no separate dev server.

All paths below are relative to the repo root.

## Prerequisites

No system packages needed to serve the game itself. The driver needs
Node + Playwright's Chromium, and this container has no passwordless
`sudo`, so Chromium's runtime shared libs (`libnspr4`, `libnss3`,
`libasound2`) can't be installed system-wide via `--with-deps`.
`setup.sh` (below) fetches just those `.deb`s with `apt-get download`
(does **not** require root) and extracts the `.so` files locally.

## Setup

```bash
.claude/skills/run-reefdefender/setup.sh
```

Idempotent: installs `playwright` into the skill dir's own
`node_modules` (kept separate from the game, which has zero
dependencies), downloads Chromium into `~/.cache/ms-playwright` if not
already cached, and extracts the missing shared libs into
`.claude/skills/run-reefdefender/system-libs/` if not already present.

## Build

None — static site, nothing to compile.

## Run (agent path)

```bash
node .claude/skills/run-reefdefender/driver.mjs <<'EOF'
launch
ss title
press Space
wait 1500
ss wave1
quit
EOF
```

The driver starts its own static server on `localhost:8420`, launches
headless Chromium, and reads one command per line from stdin — pipe a
heredoc (as above) for a scripted run, or `node driver.mjs` interactively.
Screenshots land in `/tmp/reefdefender-shots/` (override with
`SCREENSHOT_DIR`). Console errors and page exceptions print automatically
as `[console.error]` / `[pageerror]` lines — check for those, not just
that a screenshot exists.

| command | what it does |
|---|---|
| `launch` | starts the static server + browser, navigates to the game |
| `ss <name>` | screenshot → `<SHOT_DIR>/<name>.png` |
| `press <key>` | one key press, e.g. `press Space`, `press ArrowLeft` |
| `keydown <key>` / `keyup <key>` | held key, for movement (`keydown ArrowLeft` ... `keyup ArrowLeft`) |
| `wait <ms>` | pause, e.g. `wait 1000` |
| `eval <expr>` | `page.evaluate(expr)`, e.g. `eval jeu.scenes.actuelle.score` (the game exposes `window.jeu` for exactly this) |
| `quit` | closes the browser and stops the server |

Game controls once launched: **ESPACE** to start from the title screen
and to fire; **ArrowLeft/ArrowRight** (or Q/D) to move; **V** on the
title screen for the high-score table.

## Run (human path)

```bash
python3 -m http.server 8420   # from repo root
# then open http://localhost:8420 in a real browser
```

Or on Windows, double-click `jouer.bat` (uses `serve.ps1`). Not useful
for an agent — no window to see.

## Test

No test suite — this project has none (README explicitly aims for
zero build/dependencies).

---

## Gotchas

- **`playwright install --with-deps` fails here**: it shells out to
  `apt-get install` as root via `sudo`, which needs a TTY for password
  auth and isn't available non-interactively. Fixed by `setup.sh`
  downloading just the missing `.deb`s (`apt-get download` doesn't need
  root) and pointing `LD_LIBRARY_PATH` at the extracted `.so` files
  instead of installing them system-wide.
- **readline + heredoc races ahead of async commands**: piping a
  heredoc delivers all lines to `stdin` at once; Node's `readline`
  fires the `'line'` event for each one immediately — it does **not**
  wait for an async listener to resolve before firing the next line.
  Without a queue, `ss title` was running before `launch`'s browser
  even opened (silent `ERROR: launch first` for every subsequent
  command). `driver.mjs` chains each command onto a `Promise` queue so
  they run strictly one at a time.
- **`file://` doesn't work**: the game uses `<script type="module">`;
  browsers block ES6 module imports from the filesystem. Must be
  served over `http://`, hence the driver's built-in static server.

## Troubleshooting

- **`error while loading shared libraries: libnspr4.so: cannot open
  shared object file`**: `setup.sh` hasn't been run (or was run before
  this fix existed). Run it — it downloads the lib and driver.mjs picks
  it up automatically via `LD_LIBRARY_PATH`.
- **`Error [ERR_USE_AFTER_CLOSE]: readline was closed`**: only hit this
  before the promise-queue fix above; if it recurs, some command in the
  driver is calling `rl.prompt()` after stdin already closed (EOF from a
  heredoc) — guard it behind the `closed` flag.
