// The courier's aircraft, drawn in chase view, and the lit cockpit panel
// along the bottom of the screen: artificial horizon, airspeed, altimeter,
// compass strip, fuel and throttle.

export function drawAircraft(ctx, plane, width, height) {
  const cx = width / 2, cy = height * 0.56;
  const bank = plane.roll;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(bank);
  const s = 1 + plane.speed * 0.0012; // the plane grows a touch with speed
  ctx.scale(s, s);
  // Shadow on the ground far below (only when low).
  // Wings: broad, slightly swept, sunlit on top.
  ctx.fillStyle = '#d8b25a';
  ctx.beginPath();
  ctx.moveTo(-118, 6); ctx.lineTo(-96, -8); ctx.lineTo(96, -8); ctx.lineTo(118, 6);
  ctx.lineTo(96, 12); ctx.lineTo(-96, 12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#b98f3e';
  ctx.fillRect(-118, 6, 236, 3);
  // Tailplane and fin.
  ctx.fillStyle = '#c9a24e';
  ctx.beginPath();
  ctx.moveTo(-34, -34); ctx.lineTo(34, -34); ctx.lineTo(24, -26); ctx.lineTo(-24, -26);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8a6d2f';
  ctx.beginPath();
  ctx.moveTo(-4, -30); ctx.lineTo(10, -62); ctx.lineTo(14, -30); ctx.closePath(); ctx.fill();
  // Fuselage: warm cream with a teal cheatline, seen from behind and above.
  const body = ctx.createLinearGradient(0, -34, 0, 26);
  body.addColorStop(0, '#f3e6c8');
  body.addColorStop(0.55, '#e8d5a8');
  body.addColorStop(1, '#b99c62');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -36);
  ctx.bezierCurveTo(16, -30, 20, -6, 15, 22);
  ctx.bezierCurveTo(8, 30, -8, 30, -15, 22);
  ctx.bezierCurveTo(-20, -6, -16, -30, 0, -36);
  ctx.fill();
  ctx.fillStyle = '#1f7a8c';
  ctx.fillRect(-15, -6, 30, 5);
  // Cabin windows glowing amber in the dusk light.
  ctx.fillStyle = '#ffd97a';
  ctx.beginPath(); ctx.ellipse(-6, -18, 4, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(6, -18, 4, 6, 0, 0, Math.PI * 2); ctx.fill();
  // Propeller blur: the courier is a prop plane, and the disc catches the sun.
  ctx.fillStyle = 'rgba(220, 230, 240, 0.35)';
  ctx.beginPath(); ctx.ellipse(0, -40, 26, 4, 0, 0, Math.PI * 2); ctx.fill();
  // Navigation lights: red left, green right, white tail strobe.
  ctx.fillStyle = '#ff4d4d';
  ctx.beginPath(); ctx.arc(-118, 8, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3dff7a';
  ctx.beginPath(); ctx.arc(118, 8, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(0, -36, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // Speed streaks at high throttle, drawn in screen space.
  if (plane.speed > 62) {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const x = (i * 211 + 40) % width;
      const y = (i * 137 + 90) % (height * 0.7);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 26 + plane.speed * 0.3); ctx.stroke();
    }
  }
}

function dial(ctx, x, y, r, label) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(6, 14, 26, 0.85)';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(150, 220, 255, 0.7)';
  ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#8fd8ff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 0, -r - 6);
  ctx.restore();
}

export function drawCockpit(ctx, plane, width, height, time) {
  const y = height - 92;
  // Panel shelf.
  const g = ctx.createLinearGradient(0, y - 46, 0, height);
  g.addColorStop(0, 'rgba(10, 18, 30, 0.25)');
  g.addColorStop(1, 'rgba(8, 14, 24, 0.92)');
  ctx.fillStyle = g;
  ctx.fillRect(0, y - 46, width, height - y + 46);
  ctx.fillStyle = 'rgba(150, 220, 255, 0.35)';
  ctx.fillRect(0, y - 46, width, 1);

  // Artificial horizon: sky/ground ball rolling with the plane.
  dial(ctx, width / 2, y + 4, 40, 'ATTITUDE');
  ctx.save();
  ctx.translate(width / 2, y + 4);
  ctx.beginPath(); ctx.arc(0, 0, 36, 0, Math.PI * 2); ctx.clip();
  ctx.rotate(-plane.roll);
  const horizonY = plane.pitch * 60;
  ctx.fillStyle = '#3f8fd2'; ctx.fillRect(-40, -40 + horizonY, 80, 40 - horizonY + 40);
  ctx.fillStyle = '#7a5a34'; ctx.fillRect(-40, horizonY, 80, 80);
  ctx.fillStyle = '#fff'; ctx.fillRect(-40, horizonY - 1, 80, 2);
  ctx.restore();
  ctx.strokeStyle = '#ffd94d'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 16, y + 4); ctx.lineTo(width / 2 - 4, y + 4);
  ctx.moveTo(width / 2 + 4, y + 4); ctx.lineTo(width / 2 + 16, y + 4);
  ctx.stroke();

  // Airspeed dial (left) and altimeter (right): lit amber numerals.
  const spd = Math.round(plane.speed / 0.51444);
  const alt = Math.round(plane.y * 3.28084);
  dial(ctx, width / 2 - 150, y + 4, 34, 'AIRSPEED');
  ctx.fillStyle = '#fff7d6'; ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(String(spd), width / 2 - 150, y + 11);
  ctx.font = '10px sans-serif'; ctx.fillStyle = '#8fd8ff';
  ctx.fillText('kt', width / 2 - 150, y + 26);
  dial(ctx, width / 2 + 150, y + 4, 34, 'ALTITUDE');
  ctx.fillStyle = '#fff7d6'; ctx.font = 'bold 20px monospace';
  ctx.fillText(String(alt), width / 2 + 150, y + 11);
  ctx.font = '10px sans-serif'; ctx.fillStyle = '#8fd8ff';
  ctx.fillText('ft', width / 2 + 150, y + 26);

  // Compass strip: heading tape with the current heading centred. Numbers
  // every 30 degrees so they never run together.
  const hdg = Math.round(((-plane.heading * 180) / Math.PI % 360 + 360) % 360);
  ctx.fillStyle = 'rgba(6, 14, 26, 0.85)';
  ctx.fillRect(width / 2 - 90, y - 44, 180, 20);
  ctx.strokeStyle = 'rgba(150, 220, 255, 0.7)';
  ctx.strokeRect(width / 2 - 90, y - 44, 180, 20);
  ctx.save();
  ctx.beginPath(); ctx.rect(width / 2 - 90, y - 44, 180, 20); ctx.clip();
  ctx.fillStyle = '#dff3ff'; ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  for (let d = -45; d <= 45; d += 5) {
    const hd = (hdg + d + 360) % 360;
    const x = width / 2 + d * 2;
    if (d % 30 === 0) ctx.fillText(String(hd).padStart(3, '0'), x, y - 30);
    else ctx.fillRect(x, y - 27, 1, 3);
  }
  ctx.restore();
  ctx.fillStyle = '#ffd94d';
  ctx.beginPath();
  ctx.moveTo(width / 2 - 5, y - 44); ctx.lineTo(width / 2 + 5, y - 44);
  ctx.lineTo(width / 2, y - 36); ctx.closePath(); ctx.fill();

  // Fuel gauge and throttle bar, right side of the panel.
  const fx = width - 150;
  ctx.fillStyle = '#8fd8ff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('FUEL', fx, y - 26);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(fx, y - 20, 120, 10);
  ctx.fillStyle = plane.fuel > 25 ? '#3dff7a' : '#ff5a4d';
  ctx.fillRect(fx, y - 20, 120 * (plane.fuel / 100), 10);
  ctx.fillStyle = '#8fd8ff';
  ctx.fillText('THR', fx, y + 2);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(fx, y + 8, 120, 10);
  ctx.fillStyle = '#ffd94d';
  ctx.fillRect(fx, y + 8, 120 * plane.throttle, 10);

  // Stall warning blinks when the wing is about to quit.
  if (plane.speed < 26 && plane.y > 8) {
    const blink = Math.sin(time * 0.02) > 0;
    if (blink) {
      ctx.fillStyle = '#ff5a4d'; ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('STALL — NOSE DOWN, ADD POWER', width / 2, y - 58);
    }
  }
}
