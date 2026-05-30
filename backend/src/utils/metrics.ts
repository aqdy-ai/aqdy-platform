type CounterMap = Record<string, number>;
type HistogramMap = Record<string, number[]>;

export const metrics = (() => {
  const counters: CounterMap = {};
  const histograms: HistogramMap = {};

  function increment(name: string, value = 1): void {
    counters[name] = (counters[name] || 0) + value;
  }

  function observe(name: string, value: number): void {
    if (!histograms[name]) histograms[name] = [];
    histograms[name].push(value);
  }

  function getMetrics(): Record<string, unknown> {
    const histogramStats: Record<
      string,
      { count: number; avg: number; min: number; max: number }
    > = {};
    for (const [k, arr] of Object.entries(histograms)) {
      if (!arr || arr.length === 0) {
        histogramStats[k] = { count: 0, avg: 0, min: 0, max: 0 };
        continue;
      }
      const count = arr.length;
      const sum = arr.reduce((a, b) => a + b, 0);
      const avg = Math.round((sum / count) * 100) / 100;
      const min = Math.min(...arr);
      const max = Math.max(...arr);
      histogramStats[k] = { count, avg, min, max };
    }

    return {
      counters: { ...counters },
      histograms: histogramStats,
      timestamp: new Date().toISOString(),
    };
  }

  function reset(): void {
    for (const k of Object.keys(counters)) delete counters[k];
    for (const k of Object.keys(histograms)) delete histograms[k];
  }

  return { increment, observe, getMetrics, reset };
})();

export default metrics;
