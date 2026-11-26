// Merrow Vale Courier — entrypoint (Node 22, standard library only).
//
// The hand-in program: it copies this repository's game/ and screenshots/
// into the grader's output directory and writes dossier.json there with the
// vendored make.fun library, so the judge can read the game. It runs twice
// and must write identical bytes both times, so it copies and writes only
// deterministic content: no timestamps, no random data, no environment reads.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail fast with a readable error when the game's entry page is missing,
// instead of handing in a dossier for a game that cannot open.
if (!existsSync(join(repoRoot, 'game', 'index.html'))) {
  throw new Error('game/index.html is missing: the entry has no playable game');
}

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });

const shotsDir = join(outputDir, 'screenshots');
mkdirSync(shotsDir, { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), shotsDir, { recursive: true });
}

// Caps mirror the gate's own limits (see the competition's RULES.txt):
// the dossier text is capped, screenshots are at most four and 256 KiB each,
// game/ holds at most 993 entries and 48 MiB, and no path under game/ is
// longer than 1000 bytes.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
