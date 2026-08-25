import type { SimulationParams } from './types'

export const DEFAULT_SIMULATION_PARAMS: SimulationParams = {
  initialInvestment: 100_000,
  leverages: [1, 2, 3],
  years: 20,
  paths: 2_000,
  annualDrift: 0.09,
  annualVolatility: 0.18,
  degreesOfFreedom: 5,
  cvarPercentile: 0.05,
  positiveTailPercentile: 0.05,
  seed: 2026,
  tradingDays: 252,
}

export const PARAMETER_LIMITS = {
  initialInvestment: { min: 1, max: 1_000_000_000, step: 1 },
  years: { min: 1, max: 100, step: 1 },
  paths: { min: 100, max: 100_000, step: 100 },
  annualDrift: { min: -1, max: 1, step: 0.001 },
  annualVolatility: { min: 0, max: 2, step: 0.001 },
  degreesOfFreedom: { min: 2.01, max: 100, step: 0.1 },
  leverage: { min: 0.1, max: 20, step: 0.1 },
  cvarPercentile: { min: 0.01, max: 0.25, step: 0.01 },
  positiveTailPercentile: { min: 0.01, max: 0.25, step: 0.01 },
  seed: { min: 0, max: 4_294_967_295, step: 1 },
  tradingDays: { min: 1, max: 366, step: 1 },
} as const
