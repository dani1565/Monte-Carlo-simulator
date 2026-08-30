import { describe, expect, it, vi } from 'vitest'
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

  it('מחשב ממוצע של הזנב החיובי לפי אחוז שנבחר', () => {
    const result = simulate({ ...DEFAULT_SIMULATION_PARAMS, initialInvestment: 100, leverages: [1], years: 1, paths: 100, annualDrift: 0, annualVolatility: 0 })
    expect(result.results[0].positiveTailAverage).toBe(100)
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

  it('חוסם תשואת מדד יומית ב־‎-100% לפני החלת המינוף', () => {
    const result = simulate({
      ...DEFAULT_SIMULATION_PARAMS,
      initialInvestment: 100,
      leverages: [0.5, 1, 2],
      years: 1,
      paths: 100,
      annualDrift: -2,
      annualVolatility: 0,
      tradingDays: 1,
    })

    expect(result.results[0].median).toBe(50)
    expect(result.results[0].wipeoutRate).toBe(0)
    expect(result.results[1].median).toBe(0)
    expect(result.results[1].wipeoutRate).toBe(1)
    expect(result.results[2].median).toBe(0)
    expect(result.results[2].wipeoutRate).toBe(1)
  })

  it('צורך הגרלת Student-t אחת לכל מסלול ויום גם כאשר התשואה נחסמת', () => {
    const studentT = vi.spyOn(SeededRandom.prototype, 'studentT').mockReturnValue(-200)

    simulate({
      ...DEFAULT_SIMULATION_PARAMS,
      leverages: [0.5, 1, 2],
      years: 1,
      paths: 100,
      tradingDays: 2,
    })

    expect(studentT).toHaveBeenCalledTimes(200)
    studentT.mockRestore()
  })
})
