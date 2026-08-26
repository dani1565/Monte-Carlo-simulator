import { describe, expect, it } from 'vitest'

import {
  excessKurtosisToStudentTDoF,
  parseFredCsv,
  pricesToSimpleReturns,
  sampleExcessKurtosis,
} from './tailCalibration'

describe('S&P 500 tail calibration', () => {
  it('maps excess kurtosis to the matching Student-t degrees of freedom', () => {
    expect(excessKurtosisToStudentTDoF(15.8)).toBeCloseTo(4.3797468354, 10)
  })

  it('parses FRED observations and ignores missing values', () => {
    const csv = [
      'DATE,SP500',
      '2026-01-02,100',
      '2026-01-03,.',
      '2026-01-05,110',
      '',
    ].join('\n')

    expect(parseFredCsv(csv)).toEqual([
      { date: '2026-01-02', close: 100 },
      { date: '2026-01-05', close: 110 },
    ])
  })

  it('calculates simple returns between consecutive observed closes', () => {
    expect(pricesToSimpleReturns([100, 110, 99])).toEqual([
      expect.closeTo(0.1, 12),
      expect.closeTo(-0.1, 12),
    ])
  })

  it('uses the bias-corrected sample excess-kurtosis estimator', () => {
    expect(sampleExcessKurtosis([0, 0, 0, 0, 0, 1])).toBeCloseTo(6, 12)
  })
})
