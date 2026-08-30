import { SeededRandom } from './random'
import { createHistogram, expectedShortfall, expectedUpside, mean, percentile } from './statistics'
import type { LeverageResult, SamplePath, SimulationParams, SimulationResult, TimePoint } from './types'

const SAMPLE_COUNT = 32
const MAX_PORTFOLIO_VALUE = 1e15

export function simulate(params: SimulationParams, onProgress?: (progress: number) => void): SimulationResult {
  const started = performance.now()
  const random = new SeededRandom(params.seed)
  const values = params.leverages.map(() => new Float64Array(params.paths).fill(params.initialInvestment))
  const wipedOut = params.leverages.map(() => new Uint8Array(params.paths))
  const samples: SamplePath[][] = params.leverages.map(() =>
    Array.from({ length: Math.min(SAMPLE_COUNT, params.paths) }, () => ({ wipedOut: false, values: [params.initialInvestment] })),
  )
  const timelines: TimePoint[][] = params.leverages.map(() => [summaryPoint(0, new Float64Array(params.paths).fill(params.initialInvestment))])
  const dailyDrift = params.annualDrift / params.tradingDays
  const dailyVolatility = params.annualVolatility / Math.sqrt(params.tradingDays)
  const tailScale = Math.sqrt((params.degreesOfFreedom - 2) / params.degreesOfFreedom)

  for (let year = 1; year <= params.years; year += 1) {
    for (let day = 0; day < params.tradingDays; day += 1) {
      for (let path = 0; path < params.paths; path += 1) {
        const indexReturn = Math.max(-1, dailyDrift + dailyVolatility * random.studentT(params.degreesOfFreedom) * tailScale)
        params.leverages.forEach((leverage, leverageIndex) => {
          if (wipedOut[leverageIndex][path]) return
          const next = values[leverageIndex][path] * Math.max(0, 1 + leverage * indexReturn)
          if (next <= 0 || !Number.isFinite(next)) {
            values[leverageIndex][path] = 0
            wipedOut[leverageIndex][path] = 1
            if (path < SAMPLE_COUNT) {
              samples[leverageIndex][path].wipedOut = true
              samples[leverageIndex][path].wipeoutYear = year - 1 + day / params.tradingDays
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
    const wipedOutCount = wipedOut[index].reduce((sum, value) => sum + value, 0)
    return {
      leverage,
      wipeoutRate: wipedOutCount / params.paths,
      wipedOutCount,
      mean: mean(finals),
      median,
      cvar: expectedShortfall(finals, params.cvarPercentile),
      positiveTailAverage: expectedUpside(finals, params.positiveTailPercentile),
      annualizedMedian: median > 0 ? Math.pow(median / params.initialInvestment, 1 / params.years) - 1 : -1,
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
