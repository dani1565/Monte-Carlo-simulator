import { describe, expect, it } from 'vitest'
import { SeededRandom } from './random'
import { simulate } from './engine'
import { expectedShortfall, percentile } from './statistics'
import { DEFAULT_SIMULATION_PARAMS } from './defaults'

describe('מנוע הסימולציה', () => {
  it('משחזר רצף אקראי לפי seed', () => {
    const first = new SeededRandom(42)
    const second = new SeededRandom(42)
    expect(Array.from({ length: 10 }, () => first.next())).toEqual(Array.from({ length: 10 }, () => second.next()))
  })

  it('מחשב אחוזון ו-CVaR', () => {
    const values = [0, 1, 2, 3, 4]
    expect(percentile(values, 0.5)).toBe(2)
    expect(expectedShortfall(values, 0.4)).toBe(0.5)
  })

  it('אינו מוחק תיק רק מפני שירד מתחת לסף מלאכותי', () => {
    const result = simulate({
      ...DEFAULT_SIMULATION_PARAMS,
      leverages: [1], years: 1, paths: 1, annualDrift: -0.9, annualVolatility: 0,
      degreesOfFreedom: 5, cvarPercentile: 0.05, seed: 7,
    })
    expect(result.results[0].median).toBeGreaterThan(0)
    expect(result.results[0].wipeoutRate).toBe(0)
  })

  it('משתמש בסכום ההתחלתי כערך הבסיס', () => {
    const result = simulate({ ...DEFAULT_SIMULATION_PARAMS, initialInvestment: 250_000, leverages: [1], years: 1, paths: 1, annualDrift: 0, annualVolatility: 0 })
    expect(result.results[0].timeline[0].median).toBe(250_000)
    expect(result.results[0].median).toBe(250_000)
    expect(result.results[0].annualizedMedian).toBe(0)
  })

  it('משתמש במספר ימי המסחר שהוגדר', () => {
    const params = { ...DEFAULT_SIMULATION_PARAMS, initialInvestment: 1, leverages: [1], years: 1, paths: 1, annualDrift: 0.12, annualVolatility: 0 }
    expect(simulate({ ...params, tradingDays: 1 }).results[0].median).toBeCloseTo(1.12)
    expect(simulate({ ...params, tradingDays: 2 }).results[0].median).toBeCloseTo(1.1236)
  })

  it('משאיר תיק שנמחק באופן טבעי באפס', () => {
    const result = simulate({
      ...DEFAULT_SIMULATION_PARAMS,
      leverages: [5], years: 1, paths: 100, annualDrift: -100, annualVolatility: 0,
      degreesOfFreedom: 5, cvarPercentile: 0.05, seed: 7,
    })
    expect(result.results[0].wipeoutRate).toBe(1)
    expect(result.results[0].median).toBe(0)
  })
})
