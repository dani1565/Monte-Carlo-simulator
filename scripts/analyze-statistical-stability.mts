import { writeFileSync } from 'node:fs'
import { DEFAULT_SIMULATION_PARAMS } from '../src/simulation/defaults.ts'
import { simulate } from '../src/simulation/engine.ts'
import { SeededRandom } from '../src/simulation/random.ts'
import { expectedShortfall, expectedUpside, mean, percentile } from '../src/simulation/statistics.ts'
import type { Preset } from '../src/presets.ts'
import { presets } from '../src/presets.ts'

const STUDY_VERSION = '2026-08-31-v1'
const SHOCK_DEGREES_OF_FREEDOM = [2.01, 2.1, 2.5, 3, 4.2, 5, 10]
const PORTFOLIO_DEGREES_OF_FREEDOM = [2.01, 2.1, 2.5, 3, 4.2, 5]
const SAMPLE_SIZES = [500, 2_000, 10_000]
const SHOCK_SAMPLE_SIZES = [2_000, 10_000, 100_000]
const SEEDS = [7, 42, 77, 1_729, 2_026, 314_159]
const SHOCK_SEEDS = [...SEEDS, 271_828, 867_5309, 123_456_789, 373_592_8559]
const Z_95 = 1.959963984540054
const MAX_PORTFOLIO_VALUE = 1e15

interface Metrics {
  mean: number
  variance: number
  p01: number
  p05: number
  median: number
  p95: number
  p99: number
  cvar05: number
  positiveTail05: number
}

interface DistributionSummary {
  median: number
  p10: number
  p90: number
  min: number
  max: number
}

interface FinalValueMetrics extends Metrics {
  wipeoutRate: number
  wipedOutCount: number
}

function variance(values: number[]): number {
  if (values.length < 2) return 0
  const average = mean(values)
  return values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1)
}

function metrics(values: number[]): Metrics {
  const sorted = [...values].sort((a, b) => a - b)
  return {
    mean: mean(sorted),
    variance: variance(sorted),
    p01: percentile(sorted, 0.01),
    p05: percentile(sorted, 0.05),
    median: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    cvar05: expectedShortfall(sorted, 0.05),
    positiveTail05: expectedUpside(sorted, 0.05),
  }
}

function summarize(values: number[]): DistributionSummary {
  const sorted = [...values].sort((a, b) => a - b)
  return {
    median: percentile(sorted, 0.5),
    p10: percentile(sorted, 0.1),
    p90: percentile(sorted, 0.9),
    min: sorted[0],
    max: sorted.at(-1) ?? 0,
  }
}

function summarizeMetrics(results: Metrics[]) {
  const keys = Object.keys(results[0]) as Array<keyof Metrics>
  return Object.fromEntries(keys.map((key) => [key, summarize(results.map((result) => result[key]))]))
}

function normalizedStudentT(random: SeededRandom, degreesOfFreedom: number): number {
  return random.studentT(degreesOfFreedom) * Math.sqrt((degreesOfFreedom - 2) / degreesOfFreedom)
}

function runShockConvergenceStudy() {
  return SHOCK_DEGREES_OF_FREEDOM.flatMap((degreesOfFreedom) => SHOCK_SAMPLE_SIZES.map((sampleSize) => {
    const perSeed = SHOCK_SEEDS.map((seed) => {
      const random = new SeededRandom(seed)
      const shocks = Array.from({ length: sampleSize }, () => normalizedStudentT(random, degreesOfFreedom))
      return { seed, ...metrics(shocks) }
    })
    return {
      degreesOfFreedom,
      sampleSize,
      theoreticalMean: 0,
      theoreticalVariance: 1,
      finiteFourthMoment: degreesOfFreedom > 4,
      acrossSeeds: summarizeMetrics(perSeed),
      perSeed,
    }
  }))
}

function simulateNestedFinalValues(degreesOfFreedom: number, seed: number): Float64Array {
  const paths = SAMPLE_SIZES.at(-1) ?? 0
  const years = 5
  const tradingDays = DEFAULT_SIMULATION_PARAMS.tradingDays
  const annualDrift = 0.07
  const annualVolatility = 0.25
  const leverage = 3
  const dailyDrift = Math.expm1(Math.log1p(annualDrift) / tradingDays)
  const dailyVolatility = annualVolatility / Math.sqrt(tradingDays)
  const tailScale = Math.sqrt((degreesOfFreedom - 2) / degreesOfFreedom)
  const random = new SeededRandom(seed)
  const values = new Float64Array(paths).fill(1)

  for (let day = 0; day < years * tradingDays; day += 1) {
    for (let path = 0; path < paths; path += 1) {
      if (values[path] === 0) {
        normalizedStudentT(random, degreesOfFreedom)
        continue
      }
      const indexReturn = Math.max(-1, dailyDrift + dailyVolatility * normalizedStudentT(random, degreesOfFreedom))
      values[path] = Math.min(MAX_PORTFOLIO_VALUE, values[path] * Math.max(0, 1 + leverage * indexReturn))
    }
  }
  return values
}

function finalValueMetrics(values: Float64Array, sampleSize: number): FinalValueMetrics {
  const prefix = Array.from(values.slice(0, sampleSize))
  const result = metrics(prefix)
  const wipedOutCount = prefix.reduce((count, value) => count + Number(value === 0), 0)
  return { ...result, wipeoutRate: wipedOutCount / sampleSize, wipedOutCount }
}

function runPortfolioConvergenceStudy() {
  return PORTFOLIO_DEGREES_OF_FREEDOM.flatMap((degreesOfFreedom) => {
    const runs = SEEDS.map((seed) => ({ seed, values: simulateNestedFinalValues(degreesOfFreedom, seed) }))
    return SAMPLE_SIZES.map((sampleSize) => {
      const perSeed = runs.map(({ seed, values }) => ({ seed, ...finalValueMetrics(values, sampleSize) }))
      return {
        degreesOfFreedom,
        sampleSize,
        design: {
          annualDrift: 0.07,
          annualVolatility: 0.25,
          leverage: 3,
          years: 5,
          tradingDays: DEFAULT_SIMULATION_PARAMS.tradingDays,
          initialInvestment: 1,
          nestedPrefixSample: true,
        },
        acrossSeeds: {
          ...summarizeMetrics(perSeed),
          wipeoutRate: summarize(perSeed.map((result) => result.wipeoutRate)),
          wipedOutCount: summarize(perSeed.map((result) => result.wipedOutCount)),
        },
        perSeed,
      }
    })
  })
}

// Lanczos log-gamma and a continued-fraction regularized incomplete beta are
// used only for the deterministic analytic wipeout probability calculation.
function logGamma(value: number): number {
  const coefficients = [
    676.5203681218851,
    -1259.1392167224028,
    771.3234287776531,
    -176.6150291621406,
    12.507343278686905,
    -0.13857109526572012,
    9.984369578019572e-6,
    1.5056327351493116e-7,
  ]
  if (value < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * value)) - logGamma(1 - value)
  let shifted = value - 1
  let series = 0.9999999999998099
  coefficients.forEach((coefficient, index) => { series += coefficient / (shifted + index + 1) })
  const t = shifted + coefficients.length - 0.5
  return 0.5 * Math.log(2 * Math.PI) + (shifted + 0.5) * Math.log(t) - t + Math.log(series)
}

function betaContinuedFraction(a: number, b: number, x: number): number {
  const maxIterations = 200
  const epsilon = 3e-14
  const floor = 1e-300
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < floor) d = floor
  d = 1 / d
  let result = d
  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const doubled = 2 * iteration
    let numerator = (iteration * (b - iteration) * x) / ((qam + doubled) * (a + doubled))
    d = 1 + numerator * d
    if (Math.abs(d) < floor) d = floor
    c = 1 + numerator / c
    if (Math.abs(c) < floor) c = floor
    d = 1 / d
    result *= d * c
    numerator = -((a + iteration) * (qab + iteration) * x) / ((a + doubled) * (qap + doubled))
    d = 1 + numerator * d
    if (Math.abs(d) < floor) d = floor
    c = 1 + numerator / c
    if (Math.abs(c) < floor) c = floor
    d = 1 / d
    const delta = d * c
    result *= delta
    if (Math.abs(delta - 1) < epsilon) return result
  }
  throw new Error(`Incomplete beta did not converge for a=${a}, b=${b}, x=${x}`)
}

function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const factor = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log1p(-x))
  if (x < (a + 1) / (a + b + 2)) return (factor * betaContinuedFraction(a, b, x)) / a
  return 1 - (factor * betaContinuedFraction(b, a, 1 - x)) / b
}

function studentTCdf(value: number, degreesOfFreedom: number): number {
  if (value === 0) return 0.5
  const beta = regularizedIncompleteBeta(
    degreesOfFreedom / (degreesOfFreedom + value * value),
    degreesOfFreedom / 2,
    0.5,
  )
  return value < 0 ? beta / 2 : 1 - beta / 2
}

function verifyStudentTCdf() {
  const values = [-3, -1, 0, 1, 3]
  const errors = values.map((value) => {
    const expected = 0.5 + value / (2 * Math.sqrt(2 + value * value))
    return Math.abs(studentTCdf(value, 2) - expected)
  })
  const maximumAbsoluteError = Math.max(...errors)
  if (maximumAbsoluteError > 1e-12) throw new Error(`Student-t CDF verification failed: ${maximumAbsoluteError}`)
  return { closedFormDegreesOfFreedom: 2, tolerance: 1e-12, maximumAbsoluteError }
}

function wipeoutProbability(preset: Preset, leverage: number): number {
  if (leverage < 1 || preset.values.annualVolatility === 0) return 0
  const { annualDrift, annualVolatility, degreesOfFreedom, years } = preset.values
  const tradingDays = DEFAULT_SIMULATION_PARAMS.tradingDays
  const dailyDrift = Math.expm1(Math.log1p(annualDrift) / tradingDays)
  const dailyVolatility = annualVolatility / Math.sqrt(tradingDays)
  const tailScale = Math.sqrt((degreesOfFreedom - 2) / degreesOfFreedom)
  const threshold = ((-1 / leverage) - dailyDrift) / (dailyVolatility * tailScale)
  const dailyProbability = studentTCdf(threshold, degreesOfFreedom)
  return -Math.expm1(years * tradingDays * Math.log1p(-dailyProbability))
}

function wilsonInterval(successes: number, sampleSize: number): [number, number] {
  const rate = successes / sampleSize
  const denominator = 1 + (Z_95 ** 2) / sampleSize
  const center = (rate + (Z_95 ** 2) / (2 * sampleSize)) / denominator
  const halfWidth = (Z_95 / denominator) * Math.sqrt((rate * (1 - rate)) / sampleSize + (Z_95 ** 2) / (4 * sampleSize ** 2))
  return [Math.max(0, center - halfWidth), Math.min(1, center + halfWidth)]
}

function binomialProbabilityAtMost(maximum: number, sampleSize: number, probability: number): number {
  if (probability === 0) return 1
  if (probability === 1) return maximum >= sampleSize ? 1 : 0
  let term = Math.exp(sampleSize * Math.log1p(-probability))
  let sum = term
  for (let successes = 0; successes < Math.min(maximum, sampleSize); successes += 1) {
    term *= ((sampleSize - successes) / (successes + 1)) * (probability / (1 - probability))
    sum += term
  }
  return Math.min(1, sum)
}

function runRareEventStudy() {
  return presets.flatMap((preset) => {
    const observed = simulate({ ...DEFAULT_SIMULATION_PARAMS, ...preset.values }).results
    return DEFAULT_SIMULATION_PARAMS.leverages.map((leverage, leverageIndex) => {
      const probability = wipeoutProbability(preset, leverage)
      const observedCount = observed[leverageIndex].wipedOutCount
      return {
        preset: preset.name,
        parameters: preset.values,
        leverage,
        analyticWipeoutProbability: probability,
        defaultRun: {
          paths: DEFAULT_SIMULATION_PARAMS.paths,
          seed: DEFAULT_SIMULATION_PARAMS.seed,
          observedCount,
          observedRate: observed[leverageIndex].wipeoutRate,
          wilson95: wilsonInterval(observedCount, DEFAULT_SIMULATION_PARAMS.paths),
        },
        samplingAtPathCounts: [2_000, 10_000, 100_000].map((paths) => ({
          paths,
          expectedEvents: paths * probability,
          standardErrorRate: Math.sqrt((probability * (1 - probability)) / paths),
          relativeStandardError: probability > 0 ? Math.sqrt((1 - probability) / (paths * probability)) : null,
          probabilityOfZeroEvents: (1 - probability) ** paths,
          probabilityOfSingleDigitEvents: binomialProbabilityAtMost(9, paths, probability),
        })),
        pathsFor25ExpectedEvents: probability > 0 ? Math.ceil(25 / probability) : null,
        pathsFor100ExpectedEvents: probability > 0 ? Math.ceil(100 / probability) : null,
      }
    })
  })
}

function verifyResearchRunnerParity() {
  const degreesOfFreedom = 3
  const seed = 77
  const paths = SAMPLE_SIZES.at(-1) ?? 0
  const nested = finalValueMetrics(simulateNestedFinalValues(degreesOfFreedom, seed), paths)
  const engine = simulate({
    ...DEFAULT_SIMULATION_PARAMS,
    initialInvestment: 1,
    leverages: [3],
    years: 5,
    paths,
    annualDrift: 0.07,
    annualVolatility: 0.25,
    degreesOfFreedom,
    seed,
  }).results[0]
  const pairs = {
    mean: [nested.mean, engine.mean],
    median: [nested.median, engine.median],
    p05: [nested.p05, engine.percentiles.p5],
    p95: [nested.p95, engine.percentiles.p95],
    cvar05: [nested.cvar05, engine.cvar],
    positiveTail05: [nested.positiveTail05, engine.positiveTailAverage],
    wipeoutRate: [nested.wipeoutRate, engine.wipeoutRate],
  }
  const relativeErrors = Object.fromEntries(Object.entries(pairs).map(([key, [research, production]]) => [
    key,
    Math.abs(research - production) / Math.max(1, Math.abs(production)),
  ]))
  const maximumRelativeError = Math.max(...Object.values(relativeErrors))
  if (maximumRelativeError > 1e-12) throw new Error(`Research runner parity failed: ${JSON.stringify(relativeErrors)}`)
  return { tolerance: 1e-12, maximumRelativeError, relativeErrors }
}

const output = {
  studyVersion: STUDY_VERSION,
  deterministicInputs: {
    shockDegreesOfFreedom: SHOCK_DEGREES_OF_FREEDOM,
    portfolioDegreesOfFreedom: PORTFOLIO_DEGREES_OF_FREEDOM,
    sampleSizes: SAMPLE_SIZES,
    shockSampleSizes: SHOCK_SAMPLE_SIZES,
    seeds: SEEDS,
    shockSeeds: SHOCK_SEEDS,
  },
  interpretationNotes: [
    'Student-t shocks are normalized to theoretical variance 1 for df > 2.',
    'The fourth moment is infinite at df <= 4, so sample-variance convergence has no finite variance in that range.',
    'Portfolio samples are nested prefixes of the same 10,000-path run to isolate sample-size effects.',
    'Analytic wipeout probabilities use the approved compounded annual drift and the current simple-return floor.',
  ],
  studentTCdfVerification: verifyStudentTCdf(),
  parityWithProductionEngine: verifyResearchRunnerParity(),
  shockConvergence: runShockConvergenceStudy(),
  portfolioConvergence: runPortfolioConvergenceStudy(),
  rareEvents: runRareEventStudy(),
}

const serialized = `${JSON.stringify(output, null, 2)}\n`
const outputArgumentIndex = process.argv.indexOf('--output')
if (outputArgumentIndex >= 0) {
  const outputPath = process.argv[outputArgumentIndex + 1]
  if (!outputPath) throw new Error('--output requires a file path')
  writeFileSync(outputPath, serialized, 'utf8')
  process.stdout.write(`Wrote ${outputPath}\n`)
} else {
  process.stdout.write(serialized)
}
