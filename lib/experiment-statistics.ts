export const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
export const rounded = (value: number, places = 4) => Number(value.toFixed(places));
export const bounded = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

export function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}

function quantile(sorted: number[], probability: number) {
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position), upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export function repeatRange(values: number[]) {
  const finite = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!finite.length) throw new Error("Cannot summarize an empty experiment.");
  return { mean: rounded(average(finite)), low: rounded(quantile(finite, 0.1)), high: rounded(quantile(finite, 0.9)) };
}

// Each independent world is a cluster. Never treat correlated cases within a
// world as independent replications of the entire learning experiment.
export function bootstrapWorldMeans(worldMeans: number[], seed: number, resamples = 1000) {
  if (worldMeans.length < 2 || worldMeans.some(value => !Number.isFinite(value))) throw new Error("Bootstrap requires at least two finite world means.");
  const random = seededRandom(seed);
  const estimates = Array.from({ length: resamples }, () => average(Array.from({ length: worldMeans.length }, () => worldMeans[Math.floor(random() * worldMeans.length)]))).sort((a, b) => a - b);
  return {
    mean: rounded(average(worldMeans)), low: rounded(quantile(estimates, 0.025)), high: rounded(quantile(estimates, 0.975)),
    level: 0.95, clusters: worldMeans.length, resamples,
    method: "Percentile bootstrap of independent simulated-world mean differences; conditional on the configured generator."
  };
}
