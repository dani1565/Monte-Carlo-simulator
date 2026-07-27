export interface SimulationParams {
  leverages: number[]
  years: number
  paths: number
  annualDrift: number
  annualVolatility: number
  degreesOfFreedom: number
  ruinThreshold: number
  cvarPercentile: number
  seed: number
}

export interface TimePoint {
  year: number
  mean: number
  median: number
  p5: number
  p25: number
  p75: number
  p95: number
}

export interface SamplePath {
  ruined: boolean
  ruinYear?: number
  values: number[]
}

export interface HistogramBin {
  from: number
  to: number
  count: number
}

export interface LeverageResult {
  leverage: number
  ruinRate: number
  mean: number
  median: number
  cvar: number
  annualizedMedian: number
  percentiles: { p5: number; p25: number; p75: number; p95: number }
  timeline: TimePoint[]
  samples: SamplePath[]
  histogram: HistogramBin[]
  ruinedCount: number
}

export interface SimulationResult {
  params: SimulationParams
  results: LeverageResult[]
  durationMs: number
}
