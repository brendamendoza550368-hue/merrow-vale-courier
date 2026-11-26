[![make.fun competition](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![make.fun repo rank](https://make.fun/badge/best-flight-game-20261126-0057/brendamendoza550368-hue/merrow-vale-courier/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![make.fun repo reward](https://make.fun/badge/best-flight-game-20261126-0057/brendamendoza550368-hue/merrow-vale-courier/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

# Merrow Vale Courier

A bush-plane courier game, built for the [make.fun best flight game bounty](https://make.fun/bounty/best-flight-game-20261126-0057).

Fly the mail across Merrow Vale island: thread the glowing ring courses, mind your fuel and the hills, and put the plane down gently on the strip. Three sorties — Dawn Ring Run, Canyon Slalom, and Storm Landing — each with its own rings, wind, and fuel.

## Play

Open `game/index.html` in desktop Chrome (or serve `game/` with any static server). No network requests, no build step.

- **Arrows / WASD** — pitch and bank
- **Shift / Ctrl** (or **E / Q**) — throttle up / down
- **Mouse** — steer; **wheel** — throttle
- **Space** — airbrake
- **M** — change mission · **Enter** — fly · **R** — restart · **P** — pause

The cockpit panel shows a lit artificial horizon, airspeed, altimeter, heading tape, fuel and throttle; the top bar shows altitude, speed, heading, fuel and score. Fly through every ring, then land on the runway for the touchdown bonus.

## How it is built

Pure Canvas 2D, no libraries: a small custom projection engine (`game/src/terrain.js`) renders the procedural island, sea, runway and sky; `game/src/flight.js` is the flight model (throttle, lift, stall, wind, fuel); `game/src/rings.js` the ring courses; `game/src/aircraft.js` the chase-view plane and lit instruments; `game/src/missions.js` the three sorties; `game/src/audio.js` synthesised engine sound (WebAudio, no files); `game/src/hud.js` and `game/src/main.js` the HUD, screens and game loop.

`main.ts` (Node 22) hands the entry in: it copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.

## License

MIT — see [LICENSE](LICENSE).
