// HUD: the DOM readouts at the top of the screen, the centre message line,
// and the title / mission / results screens drawn over the game.

import { knots, feet, headingDeg } from './flight.js';
import { MISSIONS } from './missions.js';

export function updateHud(plane, run) {
  document.getElementById('hud-alt').textContent = feet(plane.y);
  document.getElementById('hud-spd').textContent = knots(plane.speed);
  document.getElementById('hud-hdg').textContent = String(headingDeg(plane.heading)).padStart(3, '0');
  document.getElementById('hud-fuel').textContent = Math.round(plane.fuel);
  document.getElementById('hud-score').textContent = run ? run.score : 0;
  document.getElementById('hud-mission').textContent = run
    ? `${run.mission.name}  ·  RINGS ${run.ringsPassed}/${run.mission.ringsToWin}`
    : 'MERROW VALE COURIER';
}

let messageTimer = 0;
export function showMessage(text, seconds) {
  const el = document.getElementById('hud-message');
  el.textContent = text;
  messageTimer = seconds || 2.5;
}

export function tickMessage(dt) {
  if (messageTimer > 0) {
    messageTimer -= dt;
    if (messageTimer <= 0) document.getElementById('hud-message').textContent = '';
  }
}

export function drawTitleScreen(ctx, width, height, missionIndex) {
  ctx.fillStyle = 'rgba(6, 12, 24, 0.55)';
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 54px Georgia, serif';
  ctx.fillText('MERROW VALE COURIER', width / 2, height * 0.3);
  ctx.fillStyle = '#dff3ff';
  ctx.font = '22px Georgia, serif';
  ctx.fillText('A bush-plane courier game — fly the mail, mind the hills, land her gentle.',
    width / 2, height * 0.3 + 40);
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#ffd94d';
  ctx.fillText('PRESS ENTER TO FLY', width / 2, height * 0.52);
  ctx.fillStyle = '#cfe8ff';
  ctx.font = '16px sans-serif';
  const lines = [
    'Arrows / WASD — pitch and bank   ·   Shift / Ctrl or E / Q — throttle   ·   Mouse — steer, wheel — throttle',
    'Space — airbrake   ·   M — change mission   ·   R — restart   ·   P — pause',
  ];
  lines.forEach((l, i) => ctx.fillText(l, width / 2, height * 0.6 + i * 26));
  drawMissionList(ctx, width, height, missionIndex);
}

export function drawMissionList(ctx, width, height, selected) {
  ctx.textAlign = 'left';
  ctx.font = 'bold 17px sans-serif';
  MISSIONS.forEach((m, i) => {
    const y = height * 0.72 + i * 34;
    const x = width / 2 - 260;
    if (i === selected) {
      ctx.fillStyle = 'rgba(255, 217, 77, 0.18)';
      ctx.fillRect(x - 12, y - 22, 520, 28);
      ctx.fillStyle = '#ffd94d';
      ctx.fillText('▸', x - 8, y);
    }
    ctx.fillStyle = i === selected ? '#fff7d6' : '#bcd8ea';
    ctx.fillText(`${i + 1}. ${m.name}`, x + 14, y);
    ctx.fillStyle = '#8fb4c9';
    ctx.font = '14px sans-serif';
    ctx.fillText(m.blurb, x + 240, y);
    ctx.font = 'bold 17px sans-serif';
  });
  ctx.textAlign = 'center';
}

export function drawEndScreen(ctx, width, height, run, plane) {
  ctx.fillStyle = 'rgba(6, 12, 24, 0.6)';
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  const won = run.outcome === 'landed' && run.ringsPassed >= run.mission.ringsToWin;
  ctx.fillStyle = won ? '#7dff9a' : (run.outcome === 'landed' ? '#ffd94d' : '#ff8a7a');
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText(
    run.outcome === 'crashed' ? 'SHE WENT DOWN'
      : won ? 'MAIL DELIVERED!'
      : 'DOWN SAFE — RINGS MISSED',
    width / 2, height * 0.36);
  ctx.fillStyle = '#fff7d6';
  ctx.font = '22px sans-serif';
  ctx.fillText(`Score ${run.score}   ·   Rings ${run.ringsPassed}/${run.mission.ringsToWin}   ·   Fuel ${Math.round(plane.fuel)}%`,
    width / 2, height * 0.36 + 44);
  ctx.fillStyle = '#cfe8ff';
  ctx.font = '17px sans-serif';
  ctx.fillText('Enter — fly again    ·    M — change mission    ·    R — restart',
    width / 2, height * 0.36 + 84);
}
