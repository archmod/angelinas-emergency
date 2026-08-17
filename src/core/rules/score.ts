export interface RunStats {
  timeSeconds: number;
  parSeconds: number;
  timesSuspicious: number;
  timesAlerted: number;
  /** 0..1 urgency when the level ended (lower = calmer). */
  urgencyAtFinish: number;
  /** Farts this run, and how many slipped out on their own (full pressure). */
  farts: number;
  forcedFarts: number;
}

export type Rank = 'S' | 'A' | 'B' | 'C';

export interface ScoreResult {
  score: number;
  rank: Rank;
  stars: 1 | 2 | 3;
}

/** Score = stealth first, speed second. Rank S needs a clean, under-par run. */
export function computeScore(s: RunStats): ScoreResult {
  const timeBonus = Math.max(0, s.parSeconds - s.timeSeconds) * 5;
  const score = Math.max(0, Math.round(1000 - 100 * s.timesSuspicious - 250 * s.timesAlerted + timeBonus));
  let rank: Rank;
  if (s.timesAlerted === 0 && s.timesSuspicious === 0 && s.timeSeconds <= s.parSeconds) rank = 'S';
  else if (s.timesAlerted === 0) rank = 'A';
  else if (s.timesAlerted <= 1) rank = 'B';
  else rank = 'C';
  const stars = rank === 'S' || rank === 'A' ? 3 : rank === 'B' ? 2 : 1;
  return { score, rank, stars };
}
