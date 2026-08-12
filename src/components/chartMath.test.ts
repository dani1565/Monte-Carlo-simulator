import { describe, expect, it } from 'vitest'
import { leverageColor, toInvestmentMultiple } from './chartMath'

describe('יחידות הגרפים', () => {
  it('ממיר סכום מוחלט למכפיל ביחס להשקעה ההתחלתית', () => {
    expect(toInvestmentMultiple(100_000, 100_000)).toBe(1)
    expect(toInvestmentMultiple(250_000, 100_000)).toBe(2.5)
  })

  it('שומר על רצפת אפס', () => {
    expect(toInvestmentMultiple(0, 100_000)).toBe(0)
  })

  it('מחזיר צבע תקין ועקבי גם למינוף עשרוני', () => {
    const standardColors = [1, 2, 3, 4, 5].map(leverageColor)
    expect(new Set(standardColors).size).toBe(5)
    expect(leverageColor(2.5)).toMatch(/^#[0-9a-f]{6}$/i)
    expect(leverageColor(2.5)).toBe(leverageColor(2.5))
    expect(standardColors).not.toContain(leverageColor(2.5))
    expect(leverageColor(20)).toMatch(/^#[0-9a-f]{6}$/i)
  })
})