/**
 * Scoring method calculation utilities.
 *
 * Each function takes an array of individual judge final_scores for one
 * contestant and a total penalty value, then returns a single aggregated
 * score.  The penalty has *already* been subtracted per-judge in
 * `judge_scores.final_score`, so the `penalty` param here is for display /
 * additional deduction only when the method needs it applied once (not
 * per-judge).
 *
 * NOTE: In the current DB model each judge row stores its own
 * `time_penalty` and `final_score = raw_total - time_penalty`.  For
 * aggregation we work with `raw_total` values and apply penalty once at the
 * end, OR we work with `final_score` values directly depending on the
 * method.  The caller decides which array to pass.
 */

// ─── Method metadata (used by UI) ───────────────────────────────────────

export interface ScoringMethodMeta {
  value: string;
  label: string;
  description: string;
  formula: string;
}

export const SCORING_METHODS: ScoringMethodMeta[] = [
  {
    value: "olympic",
    label: "Olympic (High-Low Trim)",
    description:
      "Sum all judges' raw totals, subtract the highest and lowest, subtract penalties, then average the result. Minimises the impact of outlier judges.",
    formula: "Final = ( Σ raw_totals − MAX − MIN − Penalty ) / (n − 2)",
  },
  {
    value: "cumulative",
    label: "Cumulative (Total Sum)",
    description:
      "Sum all judge scores into a single total, then subtract the time penalty. Every judge's opinion counts equally.",
    formula: "Final = Σ scores − Penalty",
  },
  {
    value: "weighted",
    label: "Weighted Category",
    description:
      "Each rubric criterion carries a configurable weight percentage. The weighted total across judges is averaged, then the penalty is subtracted.",
    formula: "Final = Σ (criterion × weight%) / judges − Penalty",
  },
  {
    value: "rank",
    label: "Rank-Based (Borda Count)",
    description:
      "Judges rank contestants instead of assigning point scores. Points are awarded by rank position and summed. Eliminates score inflation.",
    formula: "Points = Σ (N − rank + 1) per judge",
  },
  {
    value: "audience",
    label: "Audience Choice",
    description:
      "The winner is determined purely by audience vote count. No judge scores are used.",
    formula: "Score = audience vote count",
  },
  {
    value: "head_to_head",
    label: "Head-to-Head (Bracket)",
    description:
      "Two contestants face off each round; judges vote for the winner. No numeric scores — you either advance or you're out.",
    formula: "Win / Lose per round",
  },
];

// ─── Calculation functions ──────────────────────────────────────────────

/**
 * Olympic (High-Low Trim)
 * Requires ≥ 3 scores to trim; falls back to simple average otherwise.
 */
export function calculateOlympic(scores: number[], penalty: number): number {
  if (scores.length === 0) return 0;
  if (scores.length < 3) {
    // Not enough to trim — fall back to simple average
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Number((avg - penalty).toFixed(2));
  }
  const sorted = [...scores].sort((a, b) => a - b);
  const trimmed = sorted.slice(1, -1); // drop min & max
  const avg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
  return Number((avg - penalty).toFixed(2));
}

/**
 * Cumulative (Total Sum)
 */
export function calculateCumulative(scores: number[], penalty: number): number {
  if (scores.length === 0) return 0;
  const total = scores.reduce((a, b) => a + b, 0);
  return Number((total - penalty).toFixed(2));
}

/**
 * Simple average (used as fallback and for weighted pre-processing)
 */
export function calculateAverage(scores: number[], penalty: number): number {
  if (scores.length === 0) return 0;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Number((avg - penalty).toFixed(2));
}

/**
 * Dispatcher — call the right method by key.
 */
export function calculateMethodScore(
  method: string,
  scores: number[],
  penalty: number,
): number {
  switch (method) {
    case "olympic":
      return calculateOlympic(scores, penalty);
    case "cumulative":
      return calculateCumulative(scores, penalty);
    case "weighted":
      // Weighted uses same average path; weights are applied upstream per-criterion
      return calculateAverage(scores, penalty);
    case "rank":
    case "audience":
    case "head_to_head":
      // These methods don't aggregate numeric judge scores the same way
      return calculateAverage(scores, penalty);
    default:
      return calculateOlympic(scores, penalty);
  }
}
