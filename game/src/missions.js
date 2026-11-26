// Missions: three sorties over Merrow Vale, each with its own goal, weather and
// scoring. The courier's logbook tracks the best score per mission in memory.

export const MISSIONS = [
  {
    id: 'dawn-rings',
    name: 'DAWN RING RUN',
    blurb: 'Fly the dawn mail loop: 8 rings, then land on the strip.',
    course: 'rings',
    ringsToWin: 8,
    needLanding: true,
    fuelStart: 100,
    wind: { x: 2.5, z: -1.5 },
    ringScore: 100,
    landingScore: 500,
  },
  {
    id: 'canyon',
    name: 'CANYON SLALOM',
    blurb: 'Twelve low gates down the western valley. Mind the hills.',
    course: 'canyon',
    ringsToWin: 12,
    needLanding: true,
    fuelStart: 85,
    wind: { x: -3.5, z: 1.0 },
    ringScore: 120,
    landingScore: 400,
  },
  {
    id: 'storm',
    name: 'STORM LANDING',
    blurb: 'A squall is coming. Thread the guide rings and put her down.',
    course: 'storm',
    ringsToWin: 3,
    needLanding: true,
    fuelStart: 55,
    wind: { x: 6.0, z: 2.0 },
    ringScore: 150,
    landingScore: 800,
  },
];

export function missionById(id) {
  return MISSIONS.find((m) => m.id === id) || MISSIONS[0];
}

export function createRun(mission) {
  return {
    mission,
    ringsPassed: 0,
    score: 0,
    startedAt: performance.now(),
    finished: false,
    outcome: null, // 'landed' | 'crashed' | 'out-of-fuel'
    best: 0,
  };
}

export function scoreRing(run) {
  run.ringsPassed += 1;
  run.score += run.mission.ringScore;
  return run.score;
}

export function scoreLanding(run, plane) {
  // Gentle touchdowns pay more: reward low vertical speed and centred runway.
  const soft = Math.max(0, 1 - Math.abs(plane.verticalSpeed) / 5);
  const centred = Math.max(0, 1 - Math.abs(plane.x) / 14);
  const bonus = Math.round(run.mission.landingScore * (0.5 + 0.3 * soft + 0.2 * centred));
  run.score += bonus;
  return bonus;
}

export function timeBonus(run) {
  const seconds = (performance.now() - run.startedAt) / 1000;
  return Math.max(0, Math.round(600 - seconds * 2));
}

export function finishRun(run, outcome, plane) {
  run.finished = true;
  run.outcome = outcome;
  if (outcome === 'landed') run.score += timeBonus(run);
  run.best = Math.max(run.best, run.score);
  return run;
}
