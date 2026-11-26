// Merrow Vale island: a procedural heightfield, a sea, a runway, and the
// chase-camera projection that turns world points into screen points.

export const ISLAND = 1200; // half-size of the island in metres
const STEP = 75;            // terrain grid spacing

// Deterministic value noise: same island every load, no assets needed.
function hash2(ix, iz) {
  let n = (ix * 374761393 + iz * 668265263) | 0;
  n = (n ^ (n >> 13)) | 0;
  n = Math.imul(n, 1274126177);
  n = (n ^ (n >> 16)) >>> 0;
  return n / 4294967295;
}
function smooth(t) { return t * t * (3 - 2 * t); }
function noise2(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const a = hash2(ix, iz), b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  const u = smooth(fx), v = smooth(fz);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
function fbm(x, z) {
  return noise2(x, z) * 0.55 + noise2(x * 2.13 + 7.7, z * 2.13 + 3.1) * 0.3
    + noise2(x * 4.31 + 13.7, z * 4.31 + 9.4) * 0.15;
}

// The airfield is flattened: a capsule around the runway strip so the ground
// under the runway is level and landings are fair.
export function groundHeightAt(x, z) {
  const d = Math.hypot(x, z);
  const coast = Math.max(0, (d - 950) / 250); // island falls away into the sea
  let h = fbm(x * 0.0016 + 11, z * 0.0016 + 5) * 95 - coast * 120;
  const beyondEnds = Math.max(-700 - z, 0, z - 460);
  const flat = Math.hypot(x, beyondEnds);
  const blend = Math.max(0, Math.min(1, (flat - 60) / 220));
  h = h * blend + 2.5 * (1 - blend);
  return Math.max(h, -6);
}

export function isOnRunway(x, z) {
  return Math.abs(x) < 14 && z > -260 && z < 460;
}

// Camera: sits behind and above the plane, looks ahead, rolls with the plane.
export function makeCamera(plane, width, height) {
  const fwd = {
    x: Math.sin(plane.heading) * Math.cos(plane.pitch),
    y: Math.sin(plane.pitch),
    z: -Math.cos(plane.heading) * Math.cos(plane.pitch),
  };
  const eye = {
    x: plane.x - fwd.x * 9.5,
    y: plane.y - fwd.y * 9.5 + 3.1,
    z: plane.z - fwd.z * 9.5,
  };
  const target = {
    x: plane.x + fwd.x * 26,
    y: plane.y + fwd.y * 26,
    z: plane.z + fwd.z * 26,
  };
  const f = { x: target.x - eye.x, y: target.y - eye.y, z: target.z - eye.z };
  const fl = Math.hypot(f.x, f.y, f.z);
  f.x /= fl; f.y /= fl; f.z /= fl;
  // Right vector, rolled with the plane so the horizon banks in turns.
  const up0 = { x: 0, y: 1, z: 0 };
  let r = cross(f, up0); normalize(r);
  const roll = plane.roll * 0.55;
  const cr = Math.cos(roll), sr = Math.sin(roll);
  const r2 = { x: r.x * cr - up0.x * sr, y: r.y * cr - up0.y * sr, z: r.z * cr - up0.z * sr };
  const u = cross(r2, f); normalize(u);
  const focal = (height * 0.5) / Math.tan((62 * Math.PI) / 360);
  return { eye, f, r: r2, u, focal, cx: width / 2, cy: height / 2 };
}

function cross(a, b) {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}
function normalize(v) {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  v.x /= l; v.y /= l; v.z /= l;
}

export function project(cam, p) {
  const dx = p.x - cam.eye.x, dy = p.y - cam.eye.y, dz = p.z - cam.eye.z;
  const cz = dx * cam.f.x + dy * cam.f.y + dz * cam.f.z;
  if (cz < 0.6) return null;
  const cx = dx * cam.r.x + dy * cam.r.y + dz * cam.r.z;
  const cy = dx * cam.u.x + dy * cam.u.y + dz * cam.u.z;
  return {
    x: cam.cx + (cx / cz) * cam.focal,
    y: cam.cy - (cy / cz) * cam.focal,
    depth: cz,
    scale: cam.focal / cz,
  };
}

function shadeFor(height, slope) {
  if (height < 1.5) return '#c9b078';            // beach sand
  if (height < 14) return '#5d9b4a';             // meadow
  if (height < 38) return '#3f7d3c';             // forest green
  if (height < 62) return '#6b7f56';             // high scrub
  return '#8d8f96';                              // bare rock
}

export function drawSky(ctx, cam, plane, width, height, time) {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  const horizon = height * 0.52 + plane.pitch * 260 - Math.sin(plane.roll) * 40;
  g.addColorStop(0, '#2f6db3');
  g.addColorStop(Math.max(0.05, horizon / height), '#9fc8e8');
  g.addColorStop(1, '#274b63');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  // Sun, fixed in the east sky.
  const sun = project(cam, { x: plane.x + 1400, y: 320, z: plane.z - 900 });
  if (sun) {
    ctx.fillStyle = 'rgba(255, 236, 170, 0.95)';
    ctx.beginPath(); ctx.arc(sun.x, sun.y, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255, 236, 170, 0.25)';
    ctx.beginPath(); ctx.arc(sun.x, sun.y, 52, 0, Math.PI * 2); ctx.fill();
  }
  // Drifting clouds: soft white blobs placed in the world, projected each frame.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 9; i++) {
    const cx0 = ((i * 613) % 2200) - 1100 + Math.sin(time * 0.01 + i) * 30;
    const cz0 = ((i * 977) % 2200) - 1100;
    const c = project(cam, { x: cx0, y: 250 + (i % 3) * 30, z: cz0 });
    if (c && c.depth < 1600) {
      const s = c.scale * 38;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, s, s * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawSea(ctx, cam, width, height) {
  // The sea is everything below the horizon that is not land: fill from the
  // projected horizon line down, then the terrain paints over it where the
  // island rises. (A single far quad would fail whenever a corner falls
  // behind the camera, leaving sky showing through instead of water.)
  const far = {
    x: cam.eye.x + cam.f.x * 2000,
    y: cam.eye.y,
    z: cam.eye.z + cam.f.z * 2000,
  };
  const h = project(cam, far);
  const horizonY = h ? h.y : height * 0.52;
  if (horizonY <= 0 || horizonY >= height) return; // horizon off-screen: sky or land fills the view
  const g = ctx.createLinearGradient(0, horizonY, 0, height);
  g.addColorStop(0, '#3d84b5');
  g.addColorStop(1, '#1d4f74');
  ctx.fillStyle = g;
  ctx.fillRect(0, horizonY, width, height - horizonY);
}

export function drawTerrain(ctx, cam, plane) {
  // Painter's algorithm: draw grid rows far-to-near relative to the camera.
  const rows = [];
  for (let gz = -ISLAND; gz < ISLAND; gz += STEP) rows.push(gz);
  rows.sort((a, b) => {
    const da = Math.hypot(plane.x - 0, plane.z - (a + STEP / 2));
    const db = Math.hypot(plane.x - 0, plane.z - (b + STEP / 2));
    return db - da;
  });
  for (const gz of rows) {
    for (let gx = -ISLAND; gx < ISLAND; gx += STEP) {
      const h00 = groundHeightAt(gx, gz), h10 = groundHeightAt(gx + STEP, gz);
      const h01 = groundHeightAt(gx, gz + STEP), h11 = groundHeightAt(gx + STEP, gz + STEP);
      if (Math.max(h00, h10, h01, h11) < -3) continue; // open sea, already drawn
      const p00 = project(cam, { x: gx, y: h00, z: gz });
      const p10 = project(cam, { x: gx + STEP, y: h10, z: gz });
      const p01 = project(cam, { x: gx, y: h01, z: gz + STEP });
      const p11 = project(cam, { x: gx + STEP, y: h11, z: gz + STEP });
      if (!p00 || !p10 || !p01 || !p11) continue;
      const hm = (h00 + h10 + h01 + h11) / 4;
      ctx.fillStyle = shadeFor(hm, 0);
      ctx.beginPath();
      ctx.moveTo(p00.x, p00.y); ctx.lineTo(p10.x, p10.y);
      ctx.lineTo(p11.x, p11.y); ctx.lineTo(p01.x, p01.y);
      ctx.closePath(); ctx.fill();
    }
  }
  drawRunway(ctx, cam);
  drawLandmarks(ctx, cam);
}

function drawRunway(ctx, cam) {
  // The strip is drawn in 40 m segments so the part behind the camera never
  // hides the part ahead (a single quad would fail as a whole when one
  // corner falls behind the camera).
  ctx.fillStyle = '#3a3f46';
  for (let z = -260; z < 460; z += 40) {
    const seg = [
      { x: -13, y: 2.6, z: z + 40 }, { x: 13, y: 2.6, z: z + 40 },
      { x: 13, y: 2.6, z }, { x: -13, y: 2.6, z },
    ].map((p) => project(cam, p));
    if (seg.every(Boolean)) {
      ctx.beginPath();
      ctx.moveTo(seg[0].x, seg[0].y);
      for (let i = 1; i < 4; i++) ctx.lineTo(seg[i].x, seg[i].y);
      ctx.closePath(); ctx.fill();
    }
  }
  // Edge lines, drawn the same way in short runs.
  ctx.strokeStyle = '#f5f5f5'; ctx.lineWidth = 2;
  for (const ex of [-13, 13]) {
    ctx.beginPath();
    let pen = false;
    for (let z = 460; z >= -260; z -= 20) {
      const p = project(cam, { x: ex, y: 2.7, z });
      if (!p) { pen = false; continue; }
      if (!pen) { ctx.moveTo(p.x, p.y); pen = true; }
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  // Centreline dashes.
  ctx.fillStyle = '#f5f5f5';
  for (let z = 440; z > -240; z -= 40) {
    const a = project(cam, { x: -1.2, y: 2.7, z });
    const b = project(cam, { x: 1.2, y: 2.7, z: z - 20 });
    if (a && b) ctx.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y),
      Math.abs(a.x - b.x) + 2, Math.abs(a.y - b.y) + 2);
  }
  // Threshold bars at both ends.
  ctx.fillStyle = '#ffd94d';
  for (const z of [452, -252]) {
    const a = project(cam, { x: -11, y: 2.7, z });
    const b = project(cam, { x: 11, y: 2.7, z: z - 6 });
    if (a && b) ctx.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y),
      Math.abs(a.x - b.x), Math.abs(a.y - b.y) + 2);
  }
}

function drawLandmarks(ctx, cam) {
  // Lighthouse on the east headland, hangars by the runway, a lake, a village.
  const lm = [
    { x: 820, y: groundHeightAt(820, -620), z: -620, kind: 'light' },
    { x: -40, y: 2.6, z: 300, kind: 'hangar' },
    { x: 60, y: 2.6, z: 330, kind: 'hangar' },
    { x: -420, y: groundHeightAt(-420, 480), z: 480, kind: 'village' },
  ];
  for (const m of lm) {
    const p = project(cam, { x: m.x, y: m.y, z: m.z });
    if (!p || p.depth > 1500) continue;
    const s = Math.max(2, p.scale);
    if (m.kind === 'light') {
      ctx.fillStyle = '#e8e4da';
      ctx.fillRect(p.x - 3 * s, p.y - 26 * s, 6 * s, 26 * s);
      ctx.fillStyle = '#d23c2e';
      ctx.fillRect(p.x - 3 * s, p.y - 26 * s, 6 * s, 6 * s);
      ctx.fillStyle = 'rgba(255, 240, 150, 0.9)';
      ctx.beginPath(); ctx.arc(p.x, p.y - 28 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
    } else if (m.kind === 'hangar') {
      ctx.fillStyle = '#7a8894';
      ctx.fillRect(p.x - 12 * s, p.y - 8 * s, 24 * s, 8 * s);
      ctx.fillStyle = '#a34d3f';
      ctx.fillRect(p.x - 12 * s, p.y - 8 * s, 24 * s, 2.5 * s);
    } else {
      ctx.fillStyle = '#e8dcc0';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(p.x + (i - 2) * 7 * s, p.y - (3 + (i % 2) * 2) * s, 5 * s, (3 + (i % 2) * 2) * s);
      }
    }
  }
  // The lake: a flat blue ellipse of quads west of the field.
  const lake = [
    { x: -620, y: 4, z: -140 }, { x: -380, y: 4, z: -140 },
    { x: -380, y: 4, z: 60 }, { x: -620, y: 4, z: 60 },
  ].map((p) => project(cam, p));
  if (lake.every(Boolean)) {
    ctx.fillStyle = '#4d94c4';
    ctx.beginPath();
    ctx.moveTo(lake[0].x, lake[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(lake[i].x, lake[i].y);
    ctx.closePath(); ctx.fill();
  }
}
