export interface FredObservation {
  date: string
  close: number
}

export function parseFredCsv(csv: string): FredObservation[] {
  const lines = csv.replace(/^\uFEFF/, '').trim().split(/\r?\n/)
  if (lines.length < 2) {
    throw new Error('FRED CSV contains no observations')
  }

  return lines.slice(1).flatMap((line) => {
    const [date, rawClose] = line.split(',')
    if (!date || !rawClose || rawClose === '.') {
      return []
    }

    const close = Number(rawClose)
    if (!Number.isFinite(close) || close <= 0) {
      throw new Error(`Invalid FRED close for ${date}`)
    }

    return [{ date, close }]
  })
}

export function pricesToSimpleReturns(prices: number[]): number[] {
  return prices.slice(1).map((price, index) => {
    const previous = prices[index]
    if (!Number.isFinite(previous) || previous <= 0 || !Number.isFinite(price) || price <= 0) {
      throw new RangeError('Prices must be positive finite numbers')
    }
    return price / previous - 1
  })
}

export function sampleExcessKurtosis(values: number[]): number {
  const n = values.length
  if (n < 4 || values.some((value) => !Number.isFinite(value))) {
    throw new RangeError('At least four finite values are required')
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / n
  const squaredDeviations = values.map((value) => (value - mean) ** 2)
  const secondMoment = squaredDeviations.reduce((sum, value) => sum + value, 0) / n
  if (secondMoment === 0) {
    throw new RangeError('Kurtosis is undefined for zero-variance data')
  }

  const fourthMoment = squaredDeviations.reduce((sum, value) => sum + value ** 2, 0) / n
  const biasedExcess = fourthMoment / secondMoment ** 2 - 3
  return ((n - 1) / ((n - 2) * (n - 3))) * ((n + 1) * biasedExcess + 6)
}

export function excessKurtosisToStudentTDoF(excessKurtosis: number): number {
  if (!Number.isFinite(excessKurtosis) || excessKurtosis <= 0) {
    throw new RangeError('Excess kurtosis must be a positive finite number')
  }

  return 4 + 6 / excessKurtosis
}
