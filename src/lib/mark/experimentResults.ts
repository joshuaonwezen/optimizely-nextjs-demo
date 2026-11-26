// Reads an Optimizely results response the way an editor reads the Results page:
// who is ahead on the primary metric, and whether that is settled. Pure, so it can
// be exercised without a server.

/** One variation of a rule, with the id the results response keys it by. */
export interface RuleVariation {
  key: string;
  name: string;
  id: string;
}

export interface ArmResult {
  key: string;
  name: string;
  isOriginal: boolean;
  visitors: number;
  conversionRate: number | null;
  /** Relative change against the original, 0.12 for +12%. Null on the original. */
  lift: number | null;
  significant: boolean;
  /** "better", "worse" or "equal", already read against the metric's winning direction. */
  comparedToOriginal: string | null;
  /** Visitors still needed for significance at the current effect. Null: never, or unknown. */
  visitorsRemaining: number | null;
}

export interface MetricResult {
  metric: string;
  winningDirection: string | null;
  arms: ArmResult[];
}

// running: not settled yet. flat: not settled after `flatAfterDays`, so more waiting
// is unlikely to help. no_results: nothing to read (never started, or no visitors).
export type Conclusion = "no_results" | "running" | "winner" | "original_wins" | "flat";

export interface ResultsSummary {
  resultsAsOf: string | null;
  primary: MetricResult | null;
  otherMetrics: MetricResult[];
  conclusion: Conclusion;
  winner: string | null;
  summary: string;
}

interface RawLift {
  value?: number | null;
  is_significant?: boolean | null;
  lift_status?: string | null;
  visitors_remaining?: number | null;
}

interface RawArm {
  is_baseline?: boolean;
  name?: string;
  samples?: number | null;
  rate?: number | null;
  lift?: RawLift | null;
}

interface RawMetric {
  name?: string;
  winning_direction?: string | null;
  results?: Record<string, RawArm>;
}

export interface RawResults {
  end_time?: string | null;
  metrics?: RawMetric[];
}

// Optimizely answers 9223372036854775807 when the test would never conclude at the
// current effect; anything that large is "never", not a number to show an editor.
const NEVER = 1e15;

function toArm(id: string, raw: RawArm, variations: RuleVariation[], originalKey: string): ArmResult {
  const known = variations.find((variation) => variation.id === id);
  const key = known?.key ?? raw.name ?? id;
  const lift = raw.lift ?? null;
  const remaining = lift?.visitors_remaining;
  return {
    key,
    name: known?.name ?? raw.name ?? key,
    isOriginal: Boolean(raw.is_baseline) || key === originalKey,
    visitors: raw.samples ?? 0,
    conversionRate: raw.rate ?? null,
    lift: lift?.value ?? null,
    significant: Boolean(lift?.is_significant),
    comparedToOriginal: lift?.lift_status ?? null,
    visitorsRemaining: typeof remaining === "number" && remaining >= 0 && remaining < NEVER ? remaining : null,
  };
}

function toMetric(raw: RawMetric, variations: RuleVariation[], originalKey: string): MetricResult {
  const arms = Object.entries(raw.results ?? {}).map(([id, arm]) => toArm(id, arm, variations, originalKey));
  // The original first, then the rule's own order.
  const order = (arm: ArmResult) => (arm.isOriginal ? -1 : variations.findIndex((v) => v.key === arm.key));
  return {
    metric: raw.name ?? "",
    winningDirection: raw.winning_direction ?? null,
    arms: arms.sort((a, b) => order(a) - order(b)),
  };
}

const percent = (value: number | null) =>
  value === null ? "n/a" : `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;

function conclude(
  primary: MetricResult | null,
  daysRunning: number | null,
  flatAfterDays: number
): Pick<ResultsSummary, "conclusion" | "winner" | "summary"> {
  const challengers = primary?.arms.filter((arm) => !arm.isOriginal) ?? [];
  if (!primary || challengers.length === 0 || primary.arms.every((arm) => arm.visitors === 0)) {
    return { conclusion: "no_results", winner: null, summary: "No results to read yet." };
  }

  const ahead = challengers
    .filter((arm) => arm.significant && arm.comparedToOriginal === "better")
    .sort((a, b) => Math.abs(b.lift ?? 0) - Math.abs(a.lift ?? 0));
  if (ahead.length > 0) {
    const best = ahead[0];
    return {
      conclusion: "winner",
      winner: best.key,
      summary: `"${best.key}" beats the original on ${primary.metric} by ${percent(best.lift)}, and the difference is significant.`,
    };
  }

  if (challengers.every((arm) => arm.significant && arm.comparedToOriginal === "worse")) {
    return {
      conclusion: "original_wins",
      winner: null,
      summary: `The original beats every variation on ${primary.metric}, and the difference is significant.`,
    };
  }

  const leader = [...challengers].sort((a, b) => (b.lift ?? 0) - (a.lift ?? 0))[0];
  const standing = `Nothing is significant on ${primary.metric} yet ("${leader.key}" is at ${percent(leader.lift)}).`;
  if (daysRunning !== null && daysRunning >= flatAfterDays) {
    return {
      conclusion: "flat",
      winner: null,
      summary: `${standing} After ${daysRunning} days that is unlikely to change: the variations perform about the same.`,
    };
  }
  return { conclusion: "running", winner: null, summary: standing };
}

/**
 * The results of one rule, reduced to what decides the next step. `variations` maps the
 * ids in the response to variation keys; the first metric is the primary one.
 */
export function summarizeResults(
  raw: RawResults | null,
  variations: RuleVariation[],
  options: { originalKey: string; daysRunning: number | null; flatAfterDays: number }
): ResultsSummary {
  const metrics = (raw?.metrics ?? []).map((metric) => toMetric(metric, variations, options.originalKey));
  const primary = metrics[0] ?? null;
  return {
    resultsAsOf: raw?.end_time ?? null,
    primary,
    otherMetrics: metrics.slice(1),
    ...conclude(primary, options.daysRunning, options.flatAfterDays),
  };
}
