// Ring courses: glowing gates the courier flies through. A ring is passed when
// the plane crosses its plane within its radius; missed rings can be re-flown.
import { project } from './terrain.js';

export function makeCourse(kind) {
  const rings = [];
  if (kind === 'canyon') {
    // Low slalom down the western valley, hugging the terrain.
    const path = [
      [-120, 55, 120], [-260, 48, -80], [-380, 52, -300], [-300, 60, -520],
      [-120, 70, -640], [80, 78, -560], [260, 70, -380], [420, 66, -180],
      [520, 80, 60], [420, 90, 300], [220, 85, 470], [60, 60, 380],
    ];
    for (const [x, y, z] of path) rings.push({ x, y, z, r: 16, passed: false });
  } else if (kind === 'storm') {
    // Three guide rings on final approach, then the runway does the talking.
    const path = [[-40, 90, -700], [10, 55, -520], [0, 30, -340]];
    for (const [x, y, z] of path) rings.push({ x, y, z, r: 18, passed: false });
  } else {
    // Dawn ring run: a loop out over the sea and back to the field.
    const path = [
      [0, 70, 60], [180, 80, -140], [380, 90, -320], [300, 100, -620],
      [0, 110, -720], [-320, 95, -560], [-420, 80, -260], [-180, 70, -40],
    ];
    for (const [x, y, z] of path) rings.push({ x, y, z, r: 18, passed: false });
  }
  return rings;
}

// A ring faces the incoming plane: its normal points along the course direction.
export function ringNormal(rings, i) {
  const cur = rings[i];
  const nxt = rings[Math.min(i + 1, rings.length - 1)];
  const dx = nxt.x - cur.x, dy = nxt.y - cur.y, dz = nxt.z - cur.z;
  const l = Math.hypot(dx, dy, dz) || 1;
  return { x: dx / l, y: dy / l, z: dz / l };
}

export function checkRingPass(plane, prev, rings) {
  for (let i = 0; i < rings.length; i++) {
    const ring = rings[i];
    if (ring.passed) continue;
    const n = ringNormal(rings, i);
    const dPrev = (prev.x - ring.x) * n.x + (prev.y - ring.y) * n.y + (prev.z - ring.z) * n.z;
    const dNow = (plane.x - ring.x) * n.x + (plane.y - ring.y) * n.y + (plane.z - ring.z) * n.z;
    if (dPrev > 0 && dNow <= 0) {
      const dist = Math.hypot(plane.x - ring.x, plane.y - ring.y, plane.z - ring.z);
      if (dist < ring.r) { ring.passed = true; return ring; }
    }
  }
  return null;
}

export function nextRing(rings) {
  return rings.find((r) => !r.passed) || null;
}

export function drawRings(ctx, cam, rings, time) {
  for (let i = 0; i < rings.length; i++) {
    const ring = rings[i];
    if (ring.passed) continue;
    const n = ringNormal(rings, i);
    // Build a basis in the ring's plane and draw the circle as a projected loop.
    const up = Math.abs(n.y) > 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
    const a = {
      x: n.y * up.z - n.z * up.y, y: n.z * up.x - n.x * up.z, z: n.x * up.y - n.y * up.x,
    };
    const al = Math.hypot(a.x, a.y, a.z) || 1;
    a.x /= al; a.y /= al; a.z /= al;
    const b = {
      x: n.y * a.z - n.z * a.y, y: n.z * a.x - n.x * a.z, z: n.x * a.y - n.y * a.x,
    };
    const isNext = nextRing(rings) === ring;
    const pulse = 0.75 + 0.25 * Math.sin(time * 0.004 + i);
    ctx.lineWidth = isNext ? 5 : 3;
    ctx.strokeStyle = isNext
      ? `rgba(255, 214, 80, ${pulse})`
      : 'rgba(120, 220, 255, 0.8)';
    ctx.beginPath();
    let started = false;
    for (let k = 0; k <= 28; k++) {
      const t = (k / 28) * Math.PI * 2;
      const px = ring.x + (a.x * Math.cos(t) + b.x * Math.sin(t)) * ring.r;
      const py = ring.y + (a.y * Math.cos(t) + b.y * Math.sin(t)) * ring.r;
      const pz = ring.z + (a.z * Math.cos(t) + b.z * Math.sin(t)) * ring.r;
      const s = project(cam, { x: px, y: py, z: pz });
      if (!s) { started = false; continue; }
      if (!started) { ctx.moveTo(s.x, s.y); started = true; }
      else ctx.lineTo(s.x, s.y);
    }
    ctx.closePath(); ctx.stroke();
    // Centre beacon: a small glowing diamond so the ring reads at distance.
    const c = project(cam, ring);
    if (c && c.depth < 1200) {
      ctx.fillStyle = isNext ? '#ffd650' : '#78dcff';
      const s = Math.max(3, c.scale * 3);
      ctx.save();
      ctx.translate(c.x, c.y); ctx.rotate(Math.PI / 4);
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.restore();
    }
  }
}
