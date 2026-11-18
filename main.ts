// Vermilion Heat — entrypoint for make.fun's "Make GTA 6" bounty (gta6-01).
// The game itself is the plain static folder game/ beside this file: index.html
// plus ES modules, no libraries, no build step and no network requests, so any
// desktop browser can load it offline. This file only hands the game in: it
// copies game/ and screenshots/ into the output directory and writes
// dossier.json there with the vendored make.fun library.
//
// What the player gets: Mara Voss, a getaway driver back in Vermilion City —
// a 3600x2600 road-grid open world in five districts (Downtown, Harbor, Old
// Town, The Hills, Beach) with traffic, stealable cars, a 0–5 star wanted
// system with chasing VCPD cruisers, four story missions with dialogue, combat
// (fists, pistol, SMG, mouse aim), a HUD with health, money, wanted stars and
// a live minimap, start / pause / busted / legend screens, and synthesized
// WebAudio sound (no audio files).
//
// Play it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
