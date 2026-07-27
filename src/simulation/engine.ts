import { SeededRandom } from './random'
import { createHistogram, expectedShortfall, mean, percentile } from './statistics'
import type { LeverageResult, SamplePath, SimulationParams, SimulationResult, TimePoint } from './types'

const TRADING_DAYS = 252
const SAMPLE_COUNT = 32
const MAX_PORTFOLIO_VALUE = 1e15

export function simulate(params: SimulationParams, onProgress?: (progress: number) => void): SimulationResult {
  const started = performance.now()
  const random = new SeededRandom(params.seed)
  const values = params.leverages.map(() => new Float64Array(params.paths).fill(1))
  const ruined = params.leverages.map(() => new Uint8Array(params.paths))
  const samples: SamplePath[][] = params.leverages.map(() =>
    Array.from({ length: Math.min(SAMPLE_COUNT, params.paths) }, () => ({ ruined: false, values: [1] })),
  )
  const timelines: TimePoint[][] = params.leverages.map(() => [summaryPoint(0, new Float64Array(params.paths).fill(1))])
  const dailyDrift = params.annualDrift / TRADING_DAYS
  const dailyVolatility = params.annualVolatility / Math.sqrt(TRADING_DAYS)
  const tailScale = Math.sqrt((params.degreesOfFreedom - 2) / params.degreesOfFreedom)

  for (let year = 1; year <= params.years; year += 1) {
    for (let day = 0; day < TRADING_DAYS; day += 1) {
      for (let path = 0; path < params.paths; path += 1) {
        const indexReturn = dailyDrift + dailyVolatility * random.studentT(params.degreesOfFreedom) * tailScale
        params.leverages.forEach((leverage, leverageIndex) => {
          if (ruined[leverageIndex][path]) return
          const next = values[leverageIndex][path] * Math.max(0, 1 + leverage * indexReturn)
          if (next <= params.ruinThreshold || !Number.isFinite(next)) {
            values[leverageIndex][path] = 0
            ruined[leverageIndex][path] = 1
            if (path < SAMPLE_COUNT) {
              samples[leverageIndex][path].ruined = true
              samples[leverageIndex][path].ruinYear = year - 1 + day / TRADING_DAYS
            }
          } else {
            values[leverageIndex][path] = Math.min(next, MAX_PORTFOLIO_VALUE)
          }
        })
      }
    }
    params.leverages.forEach((_, index) => {
      timelines[index].push(summaryPoint(year, values[index]))
      samples[index].forEach((sample, path) => sample.values.push(values[index][path]))
    })
    onProgress?.(year / params.years)
  }

  const results = params.leverages.map((leverage, index): LeverageResult => {
    const finals = Array.from(values[index]).sort((a, b) => a - b)
    const median = percentile(finals, 0.5)
    const ruinedCount = ruined[index].reduce((sum, value) => sum + value, 0)
    return {
      leverage,
      ruinRate: ruinedCount / params.paths,
      ruinedCount,
      mean: mean(finals),
      median,
      cvar: expectedShortfall(finals, params.cvarPercentile),
      annualizedMedian: median > 0 ? Math.pow(median, 1 / params.years) - 1 : -1,
      percentiles: {
        p5: percentile(finals, 0.05), p25: percentile(finals, 0.25),
        p75: percentile(finals, 0.75), p95: percentile(finals, 0.95),
      },
      timeline: timelines[index],
      samples: samples[index],
      histogram: createHistogram(finals),
    }
  })
  return { params, results, durationMs: performance.now() - started }
}

function summaryPoint(year: number, source: Float64Array): TimePoint {
  const sorted = Array.from(source).sort((a, b) => a - b)
  return {
    year, mean: mean(sorted), median: percentile(sorted, 0.5),
    p5: percentile(sorted, 0.05), p25: percentile(sorted, 0.25),
    p75: percentile(sorted, 0.75), p95: percentile(sorted, 0.95),
  }
}
