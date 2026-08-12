import { describe, expect, it } from 'vitest'
import { createHistogram, expectedShortfall, mean, percentile } from './statistics'

describe('כלים סטטיסטיים', () => {
  it('מחזיר אפס עבור קלט ריק', () => {
    expect(mean([])).toBe(0)
    expect(percentile([], 0.5)).toBe(0)
    expect(expectedShortfall([], 0.05)).toBe(0)
    expect(createHistogram([])).toEqual([])
  })

  it('מבצע אינטרפולציה בין ערכי אחוזון', () => {
    expect(percentile([0, 10], 0.25)).toBe(2.5)
    expect(percentile([0, 10], 0.75)).toBe(7.5)
  })

  it('כולל לפחות ערך אחד בחישוב CVaR', () => {
    expect(expectedShortfall([1, 2, 3], 0.01)).toBe(1)
  })

  it('יוצר היסטוגרמה יציבה גם כאשר כל הערכים זהים', () => {
    const histogram = createHistogram([2, 2, 2], 4)
    expect(histogram).toHaveLength(4)
    expect(histogram.reduce((sum, bin) => sum + bin.count, 0)).toBe(3)
  })

  it('מפריד ערכי אפס מההיסטוגרמה החיובית', () => {
    const histogram = createHistogram([0, 0, 1, 2], 4)
    expect(histogram.reduce((sum, bin) => sum + bin.count, 0)).toBe(2)
  })
})
