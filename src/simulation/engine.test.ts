import { describe, expect, it } from 'vitest'
import { SeededRandom } from './random'
import { simulate } from './engine'
import { expectedShortfall, percentile } from './statistics'

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

  it('משאיר מסלול הרוס באפס', () => {
    const result = simulate({
      leverages: [5], years: 1, paths: 100, annualDrift: -1, annualVolatility: 0.01,
      degreesOfFreedom: 5, ruinThreshold: 0.1, cvarPercentile: 0.05, seed: 7,
    })
    expect(result.results[0].ruinRate).toBe(1)
    expect(result.results[0].median).toBe(0)
  })
})
