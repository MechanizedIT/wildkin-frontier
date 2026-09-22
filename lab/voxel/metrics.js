export function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b); return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)];
}
export function summary(values) { return { count: values.length, p50: percentile(values, 0.5), p95: percentile(values, 0.95), p99: percentile(values, 0.99), max: values.length ? Math.max(...values) : null }; }
export class Metrics {
  constructor() { this.samples = {}; this.reset(); }
  reset() { this.samples = {}; this.started = performance.now(); }
  add(name, value) { const values = this.samples[name] ||= []; if (values.length < 36000) values.push(value); }
  report() { return { durationMs: performance.now() - this.started, ...Object.fromEntries(Object.entries(this.samples).map(([k, v]) => [k, summary(v)])) }; }
}
