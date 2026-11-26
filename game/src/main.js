// Merrow Vale Courier — boot, game loop, input, and the state machine.
// States: title → flying → landed / crashed. Missions are picked on the title
// screen; ?shot=cover|flight|rings|landing presets a scene for screenshots.

import { createPlane, stepFlight, forwardVector } from './flight.js';
import {
  groundHeightAt, makeCamera, drawSky, drawSea, drawTerrain, project,
} from './terrain.js';
import { makeCourse, checkRingPass, nextRing, drawRings } from './rings.js';
import { drawAircraft, drawCockpit } from './aircraft.js';
import { MISSIONS, missionById, createRun, scoreRing, scoreLanding, finishRun } from './missions.js';
import { updateHud, showMessage, tickMessage, drawTitleScreen, drawEndScreen } from './hud.js';
import { ensureAudio, setEngine, ringChime, thud, crashSound } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const params = new URLSearchParams(location.search);
const shotMode = params.get('shot') || '';

let missionIndex = 0;
let plane = createPlane();
let rings = makeCourse(MISSIONS[0].course);
let run = createRun(MISSIONS[0]);
let state = 'title'; // title | flying | ended
let paused = false;
let prevPos = { x: plane.x, y: plane.y, z: plane.z };

const keys = {};
let mouse = { x: W / 2, y: H / 2, active: false };
let wheelDelta = 0;

function applyMission(i) {
  missionIndex = ((i % MISSIONS.length) + MISSIONS.length) % MISSIONS.length;
  const m = MISSIONS[missionIndex];
  plane = createPlane();
  plane.fuel = m.fuelStart;
  plane.windX = m.wind.x; plane.windZ = m.wind.z;
  rings = makeCourse(m.course);
  run = createRun(m);
  prevPos = { x: plane.x, y: plane.y, z: plane.z };
}

function startFlying() {
  ensureAudio();
  if (state !== 'flying') {
    applyMission(missionIndex);
    state = 'flying';
    showMessage(`${run.mission.name} — THROTTLE UP, THEN PULL BACK GENTLY`, 4);
  }
}

function endRun(outcome) {
  state = 'ended';
  const landingBonus = outcome === 'landed' ? scoreLanding(run, plane) : 0;
  finishRun(run, outcome, plane);
  if (outcome === 'landed') {
    thud();
    showMessage(`LANDED! +${landingBonus} TOUCHDOWN BONUS`, 3);
  } else {
    crashSound();
  }
  setEngine(0, 0, false);
}

function readInput() {
  return {
    pitchUp: keys.ArrowUp || keys.KeyW,
    pitchDown: keys.ArrowDown || keys.KeyS,
    rollLeft: keys.ArrowLeft || keys.KeyA,
    rollRight: keys.ArrowRight || keys.KeyD,
    throttleUp: keys.ShiftLeft || keys.ShiftRight || keys.KeyE,
    throttleDown: keys.ControlLeft || keys.ControlRight || keys.KeyQ,
    throttleDelta: wheelDelta,
    mousePitch: mouse.active ? (0.5 - mouse.y / H) * 0.5 : 0,
    mouseRoll: mouse.active ? (mouse.x / W - 0.5) * 1.1 : 0,
  };
}

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
  keys[e.code] = true;
  ensureAudio();
  if (e.code === 'Enter' && state !== 'flying') startFlying();
  if (e.code === 'KeyM') {
    applyMission(missionIndex + 1);
    if (state === 'title') showMessage(MISSIONS[missionIndex].name, 1.5);
  }
  if (e.code === 'KeyR') { applyMission(missionIndex); state = 'flying'; }
  if (e.code === 'KeyP' && state === 'flying') paused = !paused;
  if (e.code === 'Space') plane.flaps = true;
  if (e.code >= 'Digit1' && e.code <= 'Digit3') {
    applyMission(Number(e.code.slice(-1)) - 1);
  }
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
  if (e.code === 'Space') plane.flaps = false;
});
canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - r.left) / r.width) * W;
  mouse.y = ((e.clientY - r.top) / r.height) * H;
  mouse.active = true;
});
canvas.addEventListener('mouseleave', () => { mouse.active = false; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  wheelDelta += e.deltaY < 0 ? 0.06 : -0.06;
}, { passive: false });
canvas.addEventListener('mousedown', () => { ensureAudio(); if (state !== 'flying') startFlying(); });

// Screenshot presets: real gameplay states, rendered by the game's own code.
function applyShotPreset() {
  if (!shotMode) return;
  state = 'flying';
  if (shotMode === 'cover') {
    // Climbing away from the field, first ring big and dead ahead.
    plane.y = 66; plane.z = 160; plane.speed = 45; plane.throttle = 0.6;
    plane.pitch = 0.1; plane.heading = 0;
  } else if (shotMode === 'flight') {
    plane.y = 85; plane.z = -480; plane.x = 300; plane.speed = 66;
    plane.throttle = 0.8; plane.heading = -0.5; plane.roll = 0.18;
  } else if (shotMode === 'rings') {
    // On final to the next ring, low over the valley.
    const nxt = nextRing(rings);
    if (nxt) {
      plane.x = nxt.x - 90; plane.y = nxt.y + 4; plane.z = nxt.z + 130;
      plane.heading = Math.atan2(nxt.x - plane.x, -(nxt.z - plane.z));
      plane.speed = 60; plane.throttle = 0.8;
    }
  } else if (shotMode === 'landing') {
    // Short final from the north: runway dead ahead to the south, gentle
    // descent, approach speed. Heading 180 (south) puts the strip in frame.
    plane.x = 0; plane.y = 25; plane.z = -480; plane.speed = 38;
    plane.throttle = 0.15; plane.heading = Math.PI; plane.pitch = -0.05;
  }
  showMessage('', 0);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!paused) {
    // In a ?shot= pose the flight model is held so the frame stays exactly
    // the composed one; the renderer, HUD and instruments all still run live,
    // and ordinary play (no ?shot=) always steps the physics.
    if (state === 'flying' && !shotMode) {
      const input = readInput();
      wheelDelta = 0;
      prevPos = { x: plane.x, y: plane.y, z: plane.z };
      stepFlight(plane, input, dt, groundHeightAt);
      setEngine(plane.throttle, plane.speed, plane.airborne);
      const hit = checkRingPass(plane, prevPos, rings);
      if (hit) {
        scoreRing(run);
        ringChime();
        showMessage(`RING ${run.ringsPassed}/${run.mission.ringsToWin}  +${run.mission.ringScore}`, 1.6);
        if (run.ringsPassed >= run.mission.ringsToWin) {
          showMessage('ALL RINGS — NOW LAND ON THE STRIP', 3);
        }
      }
      if (plane.crashed) endRun('crashed');
      else if (plane.landed) endRun('landed');
      else if (plane.fuel <= 0 && plane.speed < 8 && plane.y <= groundHeightAt(plane.x, plane.z) + 2) {
        endRun('crashed');
      }
    }
    tickMessage(dt);
  }

  // Render: sky, sea, terrain, rings, aircraft, cockpit, then screens on top.
  const cam = makeCamera(plane, W, H);
  drawSky(ctx, cam, plane, W, H, now);
  drawSea(ctx, cam, W, H);
  drawTerrain(ctx, cam, plane);
  if (state !== 'title') drawRings(ctx, cam, rings, now);
  // Next-ring guide arrow at the screen edge when the ring is off-screen.
  if (state === 'flying') drawGuideArrow(ctx, cam);
  drawAircraft(ctx, plane, W, H);
  drawCockpit(ctx, plane, W, H, now);
  if (state === 'title') drawTitleScreen(ctx, W, H, missionIndex);
  if (state === 'ended') drawEndScreen(ctx, W, H, run, plane);
  if (paused) {
    ctx.fillStyle = 'rgba(6, 12, 24, 0.5)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('PAUSED — P TO RESUME', W / 2, H / 2);
  }
  updateHud(plane, run);
  requestAnimationFrame(frame);
}

function drawGuideArrow(ctx, cam) {
  const nxt = nextRing(rings);
  if (!nxt) return;
  const s = project(cam, nxt);
  let ax, ay;
  if (s && s.x > 40 && s.x < W - 40 && s.y > 40 && s.y < H - 160) return; // visible already
  if (s) { ax = Math.max(50, Math.min(W - 50, s.x)); ay = Math.max(90, Math.min(H - 180, s.y)); }
  else { ax = W / 2; ay = 110; }
  ctx.save();
  ctx.translate(ax, ay);
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NEXT RING', 0, -16);
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(10, 8);
  ctx.lineTo(-10, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

applyShotPreset();
requestAnimationFrame(frame);
