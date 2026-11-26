// Flight model for the Merrow Vale Courier: throttle, lift, stall, wind, fuel, damage.
// Units: metres, seconds, knots for display (1 kt = 0.51444 m/s). Angles in radians.
// The plane flies over a 2400 x 2400 m island; heading 0 = north (-z), turning clockwise.

export const KNOT = 0.51444;
export const MAX_SPEED = 92; // m/s at full throttle, level flight (~179 kt)
export const STALL_SPEED = 26; // m/s (~50 kt): below this the nose drops
export const TAKEOFF_SPEED = 30;

export function createPlane() {
  return {
    x: 0, y: 3.7, z: 420,          // start parked on the runway threshold
    heading: 0, pitch: 0, roll: 0,
    speed: 0, throttle: 0,
    fuel: 100, damage: 0,
    airborne: false, landed: false, crashed: false,
    verticalSpeed: 0,
    windX: 2.5, windZ: -1.5,     // steady crosswind, varies per mission
    flaps: false,
  };
}

export function forwardVector(plane) {
  const cp = Math.cos(plane.pitch), sp = Math.sin(plane.pitch);
  const ch = Math.cos(plane.heading), sh = Math.sin(plane.heading);
  return { x: sh * cp, y: sp, z: -ch * cp };
}

export function stepFlight(plane, input, dt, groundHeightAt) {
  if (plane.crashed || plane.landed) return;

  // Throttle: W / Shift raises, S / Ctrl lowers; wheel adjusts too (input.throttleDelta).
  plane.throttle = clamp(plane.throttle + (input.throttleUp ? 0.55 * dt : 0)
    - (input.throttleDown ? 0.55 * dt : 0) + (input.throttleDelta || 0), 0, 1);

  // Pitch and roll targets from keys / mouse; the plane eases toward them.
  const pitchTarget = clamp((input.pitchUp ? 0.42 : 0) + (input.pitchDown ? -0.38 : 0)
    + (input.mousePitch || 0), -0.5, 0.45);
  const rollTarget = clamp((input.rollLeft ? -0.9 : 0) + (input.rollRight ? 0.9 : 0)
    + (input.mouseRoll || 0), -1.0, 1.0);
  plane.pitch += (pitchTarget - plane.pitch) * Math.min(1, dt * 3.2);
  plane.roll += (rollTarget - plane.roll) * Math.min(1, dt * 3.0);

  // Turn rate grows with bank and speed; a steep bank without speed bleeds energy.
  const turnRate = -Math.sin(plane.roll) * (0.35 + plane.speed * 0.004);
  plane.heading += turnRate * dt;

  // Speed: thrust minus drag; climbing trades speed for altitude.
  const thrust = plane.throttle * MAX_SPEED;
  const drag = plane.speed * plane.speed * 0.0109 + (plane.flaps ? 9 : 0);
  const climbCost = Math.sin(plane.pitch) * 34;
  plane.speed += (thrust - drag - climbCost) * dt;
  plane.speed = Math.max(0, plane.speed);

  // Stall: below stall speed, once airborne, the nose drops and the plane sinks.
  const stalled = plane.airborne && plane.speed < STALL_SPEED;
  if (stalled) plane.pitch += (-0.3 - plane.pitch) * Math.min(1, dt * 1.5);

  // Move along the flight path, with wind drift.
  const fwd = forwardVector(plane);
  plane.x += (fwd.x * plane.speed + plane.windX) * dt;
  plane.z += (fwd.z * plane.speed + plane.windZ) * dt;
  const prevY = plane.y;
  plane.y += fwd.y * plane.speed * dt - (stalled ? 6 * dt : 0);
  plane.verticalSpeed = (plane.y - prevY) / Math.max(dt, 1e-6);

  // Fuel burns with throttle; empty tanks glide to whatever is below.
  plane.fuel = Math.max(0, plane.fuel - (0.35 + plane.throttle * 1.1) * dt * 0.14);
  if (plane.fuel <= 0 && plane.throttle > 0) plane.throttle = 0;

  // Stay inside the island's airspace: soft push back toward the middle.
  const dist = Math.hypot(plane.x, plane.z);
  if (dist > 1150) {
    const back = Math.atan2(-plane.x, -plane.z);
    plane.heading += shortestAngle(back, plane.heading) * Math.min(1, dt * 0.4);
  }

  // Ground contact: a gentle, aligned touchdown on the runway strip is a
  // landing; a fast or steep arrival anywhere else is a crash; a slow roll
  // along the runway just rolls (takeoff roll included).
  const ground = groundHeightAt(plane.x, plane.z);
  if (plane.y <= ground + 1.2) {
    plane.y = ground + 1.2;
    const onRunway = Math.abs(plane.x) < 14 && plane.z > -260 && plane.z < 460;
    const aligned = Math.abs(plane.verticalSpeed) < 4.5 && Math.abs(plane.roll) < 0.35;
    if (onRunway && aligned) {
      if (plane.airborne && plane.speed < 48) {
        plane.landed = true; plane.speed *= 0.4;
      } else if (plane.throttle < 0.05) {
        plane.speed = Math.max(0, plane.speed - 14 * dt);
        if (plane.speed <= 0.5 && plane.airborne) plane.landed = true;
      }
    } else if (plane.speed > 12 || Math.abs(plane.verticalSpeed) > 4.5) {
      plane.crashed = true; plane.damage = 100;
    } else {
      plane.speed = Math.max(0, plane.speed - 22 * dt);
      if (plane.speed <= 0.5 && plane.airborne) plane.landed = true;
    }
  }
  if (plane.y > ground + 3 && plane.speed > TAKEOFF_SPEED) plane.airborne = true;
}

export function shortestAngle(target, current) {
  let d = target - current;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

export function knots(ms) { return Math.round(ms / KNOT); }
export function feet(m) { return Math.round(m * 3.28084); }
export function headingDeg(h) {
  let d = Math.round((-h * 180) / Math.PI) % 360;
  if (d < 0) d += 360;
  return d;
}
