import { Exercise } from '../types';

// Gym abbreviations and common synonyms
const ABBREVIATIONS: Record<string, string[]> = {
  db: ['dumbbell'],
  bb: ['barbell'],
  kb: ['kettlebell'],
  bw: ['bodyweight'],
  rdl: ['romanian deadlift'],
  sldl: ['stiff leg deadlift', 'stiff-leg'],
  ohp: ['overhead press', 'military press', 'shoulder press'],
  bp: ['bench press'],
  mag: ['neutral grip', 'mag grip', 'parallel'],
  lat: ['lats', 'latissimus', 'pulldown'],
  lats: ['lat', 'latissimus'],
  delts: ['delt', 'shoulders', 'deltoid'],
  delt: ['delts', 'shoulders', 'deltoid'],
  pecs: ['pec', 'chest', 'pectoral'],
  pec: ['pecs', 'chest', 'pectoral'],
  quads: ['quad', 'quadriceps', 'legs'],
  quad: ['quads', 'quadriceps', 'legs'],
  hams: ['hamstring', 'hamstrings', 'legs'],
  hamstring: ['hamstrings', 'hams', 'legs'],
  hamstrings: ['hamstring', 'hams', 'legs'],
  calves: ['calf'],
  calf: ['calves'],
  abs: ['abdominals', 'core', 'ab'],
  ab: ['abs', 'abdominals', 'core'],
  biceps: ['bicep'],
  bicep: ['biceps'],
  triceps: ['tricep'],
  tricep: ['triceps'],
  glutes: ['glute', 'butt'],
  glute: ['glutes'],
  traps: ['trapezius'],
  trap: ['traps', 'trapezius'],
};

// Word stemming / compound variations
const WORD_VARIATIONS: Record<string, string[]> = {
  pulldown: ['pull down', 'pulldowns'],
  pulldowns: ['pulldown', 'pull down'],
  pushup: ['push up', 'pushups'],
  pushups: ['pushup', 'push up'],
  pullup: ['pull up', 'pullups'],
  pullups: ['pullup', 'pull up'],
  situp: ['sit up', 'situps'],
  situps: ['situp', 'sit up'],
  fly: ['flye', 'flyes', 'flys'],
  flye: ['fly', 'flyes', 'flys'],
  flyes: ['fly', 'flye', 'flys'],
  flys: ['fly', 'flye', 'flyes'],
  press: ['presses', 'pressing'],
  presses: ['press'],
  curl: ['curls', 'curling'],
  curls: ['curl'],
  raise: ['raises'],
  raises: ['raise'],
  row: ['rows', 'rowing'],
  rows: ['row'],
  extension: ['extensions'],
  extensions: ['extension'],
  shrug: ['shrugs'],
  shrugs: ['shrug'],
  squat: ['squats'],
  squats: ['squat'],
  lunge: ['lunges'],
  lunges: ['lunge'],
  crunch: ['crunches'],
  crunches: ['crunch'],
  dip: ['dips'],
  dips: ['dip'],
  deadlift: ['deadlifts'],
  deadlifts: ['deadlift'],
};

/**
 * Normalizes text by removing special punctuation, extra spaces, and lowercasing.
 */
export function normalizeSearchText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\-_/\\,.:;()]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Builds a comprehensive searchable text blob for an exercise.
 */
function buildExerciseSearchBlob(exercise: Exercise): string {
  const nameDecompounded = exercise.name
    .replace(/pulldown/gi, 'pulldown pull down')
    .replace(/push-?up/gi, 'pushup push up')
    .replace(/pull-?up/gi, 'pullup pull up')
    .replace(/sit-?up/gi, 'situp sit up')
    .replace(/t-?bar/gi, 't-bar t bar')
    .replace(/v-?bar/gi, 'v-bar v bar')
    .replace(/ez-?bar/gi, 'ez-bar ez bar');

  const areas = (exercise.muscleAreaEmphasis || [])
    .map((a) => `${a} ${a.replace(/_/g, ' ')}`)
    .join(' ');

  const secondaries = (exercise.secondaryMuscles || []).join(' ');
  const tags = (exercise.tags || []).join(' ');

  return normalizeSearchText(
    `${exercise.name} ${nameDecompounded} ${exercise.primaryMuscle} ${areas} ${secondaries} ${exercise.equipment} ${exercise.exerciseType} ${tags}`
  );
}

/**
 * Checks if a single query token matches the exercise search blob.
 */
function tokenMatchesBlob(token: string, blob: string): boolean {
  if (!token) return true;

  // Exact substring match
  if (blob.includes(token)) {
    return true;
  }

  // Check abbreviation / synonym expansions
  const syns = ABBREVIATIONS[token];
  if (syns) {
    for (const syn of syns) {
      if (blob.includes(normalizeSearchText(syn))) {
        return true;
      }
    }
  }

  // Check word variations / stems
  const stems = WORD_VARIATIONS[token];
  if (stems) {
    for (const stem of stems) {
      if (blob.includes(normalizeSearchText(stem))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Tests whether an exercise matches a search query using multi-field token matching.
 */
export function matchExerciseSearch(exercise: Exercise, query: string): boolean {
  const cleanQuery = normalizeSearchText(query);
  if (!cleanQuery) return true;

  const blob = buildExerciseSearchBlob(exercise);

  // Handle special compound phrases in query like "pull down", "push up", "pull up"
  const expandedQuery = cleanQuery
    .replace(/\bpull down\b/g, 'pulldown')
    .replace(/\bpush up\b/g, 'pushup')
    .replace(/\bpull up\b/g, 'pullup')
    .replace(/\bsit up\b/g, 'situp');

  const tokens = expandedQuery.split(' ').filter(Boolean);

  // Every token must match somewhere in the exercise's searchable fields
  return tokens.every((token) => tokenMatchesBlob(token, blob));
}

/**
 * Calculates a relevance score for ranking exercise search results.
 */
export function scoreExerciseSearch(exercise: Exercise, query: string): number {
  const cleanQuery = normalizeSearchText(query);
  if (!cleanQuery) return 0;

  const cleanName = normalizeSearchText(exercise.name);
  let score = 0;

  // Exact name match
  if (cleanName === cleanQuery) {
    score += 1000;
  }
  // Name starts with query
  else if (cleanName.startsWith(cleanQuery)) {
    score += 500;
  }
  // Name contains full query as a phrase
  else if (cleanName.includes(cleanQuery)) {
    score += 300;
  }

  // Token matches in name
  const tokens = cleanQuery.split(' ').filter(Boolean);
  let nameTokenHits = 0;
  for (const token of tokens) {
    if (cleanName.includes(token)) {
      nameTokenHits++;
    }
  }
  score += nameTokenHits * 60;

  // Match in primary muscle
  if (cleanQuery.includes(exercise.primaryMuscle.toLowerCase())) {
    score += 40;
  }

  // Match in equipment
  if (cleanQuery.includes(exercise.equipment.toLowerCase())) {
    score += 30;
  }

  return score;
}

/**
 * Filters and sorts exercises by search relevance.
 */
export function filterAndRankExercises(exercises: Exercise[], query: string): Exercise[] {
  const trimmed = query.trim();
  if (!trimmed) return exercises;

  return exercises
    .filter((ex) => matchExerciseSearch(ex, trimmed))
    .sort((a, b) => scoreExerciseSearch(b, trimmed) - scoreExerciseSearch(a, trimmed));
}
