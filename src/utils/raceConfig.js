// ─── Defaults (used if nothing saved in localStorage) ───────────────────────
const DEFAULT_PLAN_START = '2026-06-15';
const DEFAULT_RACE_DATE  = '2026-10-04';

// ─── Read from localStorage (set via Settings screen) ───────────────────────
export const getPlanConfig = () => {
  const startStr = localStorage.getItem('tt_plan_start') || DEFAULT_PLAN_START;
  const raceStr  = localStorage.getItem('tt_race_date')  || DEFAULT_RACE_DATE;
  const start    = new Date(startStr + 'T00:00:00');
  const race     = new Date(raceStr  + 'T07:00:00');

  // Total weeks = ceil of days between start and race / 7
  const diffDays   = Math.ceil((race - start) / (1000 * 60 * 60 * 24));
  const totalWeeks = Math.max(1, Math.ceil(diffDays / 7));

  return { start, race, totalWeeks, startStr, raceStr };
};

// Convenience exports — these read live from localStorage each call
export const RACE_CONFIG = {
  swim: {
    distance_m: 1500,
    cutoff_s: 65 * 60,
    target_s: 60 * 60,
    target_pace_s: 4 * 60,
    unit: '/100m',
    label: 'Swim',
    color: '#38BDF8',
    colorKey: 'swim',
  },
  bike: {
    distance_m: 40000,
    cutoff_s: 130 * 60,
    target_s: 125 * 60,
    target_speed_kmh: 19.2,
    unit: 'km/h',
    label: 'Bike',
    color: '#F97316',
    colorKey: 'bike',
  },
  run: {
    distance_m: 10000,
    cutoff_s: 105 * 60,
    target_s: 100 * 60,
    target_pace_s: 10 * 60,
    unit: '/km',
    label: 'Run',
    color: '#4ADE80',
    colorKey: 'run',
  },
};

// ─── Formatters ──────────────────────────────────────────────────────────────
export const formatPace = (seconds) => {
  if (!seconds || isNaN(seconds)) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const parseDuration = (str) => {
  if (!str) return 0;
  const parts = str.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
};

// ─── Discipline calculators ──────────────────────────────────────────────────
export const calcSwim = (distance_m, duration_s) => {
  if (!distance_m || !duration_s) return null;
  const pace_s        = (duration_s / distance_m) * 100;
  const extrapolated_s = (duration_s / distance_m) * RACE_CONFIG.swim.distance_m;
  const onTrack       = extrapolated_s <= RACE_CONFIG.swim.target_s;
  const delta_s       = RACE_CONFIG.swim.target_s - extrapolated_s;
  return { pace_s, extrapolated_s, onTrack, delta_s };
};

export const calcBike = (distance_m, duration_s) => {
  if (!distance_m || !duration_s) return null;
  const speed_kmh     = (distance_m / 1000) / (duration_s / 3600);
  const extrapolated_s = (duration_s / distance_m) * RACE_CONFIG.bike.distance_m;
  const onTrack       = extrapolated_s <= RACE_CONFIG.bike.target_s;
  const delta_s       = RACE_CONFIG.bike.target_s - extrapolated_s;
  return { speed_kmh, extrapolated_s, onTrack, delta_s };
};

export const calcRun = (distance_m, duration_s) => {
  if (!distance_m || !duration_s) return null;
  const pace_s        = duration_s / (distance_m / 1000);
  const extrapolated_s = (duration_s / distance_m) * RACE_CONFIG.run.distance_m;
  const onTrack       = extrapolated_s <= RACE_CONFIG.run.target_s;
  const delta_s       = RACE_CONFIG.run.target_s - extrapolated_s;
  return { pace_s, extrapolated_s, onTrack, delta_s };
};

// ─── Time helpers ────────────────────────────────────────────────────────────
export const daysToRace = () => {
  const { race } = getPlanConfig();
  const diff = race - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export const currentWeek = () => {
  const { start, totalWeeks } = getPlanConfig();
  const diff = new Date() - start;
  const week = Math.floor(diff / (1000 * 60 * 60 * 24 * 7)) + 1;
  return Math.max(1, Math.min(totalWeeks, week));
};

// Given a week number (1-based), return array of 7 Date objects starting from plan start
export const getWeekDates = (weekNum) => {
  const { start } = getPlanConfig();
  const weekStart = new Date(start);
  weekStart.setDate(weekStart.getDate() + (weekNum - 1) * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
};

export const sameDay = (d1, d2) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth()    === d2.getMonth()    &&
  d1.getDate()     === d2.getDate();

// Short day label e.g. "Mon", "Tue"
export const shortDay = (date) =>
  date.toLocaleDateString('en', { weekday: 'short' });

// Full day name e.g. "Monday"
export const fullDay = (date) =>
  date.toLocaleDateString('en', { weekday: 'long' });

// ─── Plan overrides (stored in localStorage) ─────────────────────────────────
export const getPlanOverrides = () => {
  try {
    return JSON.parse(localStorage.getItem('tt_plan_overrides') || '{}');
  } catch { return {}; }
};

export const savePlanOverride = (dayOffset, fromWeek, fields) => {
  const overrides = getPlanOverrides();
  overrides[dayOffset] = { fromWeek, ...fields };
  localStorage.setItem('tt_plan_overrides', JSON.stringify(overrides));
};

export const resetPlanOverride = (dayOffset) => {
  const overrides = getPlanOverrides();
  delete overrides[dayOffset];
  localStorage.setItem('tt_plan_overrides', JSON.stringify(overrides));
};

export const resolveSession = (defaultSession, weekNum) => {
  const overrides = getPlanOverrides();
  const ov = overrides[defaultSession.offset];
  if (ov && weekNum >= ov.fromWeek) {
    return { ...defaultSession, ...ov };
  }
  return defaultSession;
};
