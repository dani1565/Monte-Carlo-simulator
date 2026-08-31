import { describe, expect, it } from 'vitest'
import { DEFAULT_SIMULATION_PARAMS } from './defaults'
import { validateSimulationParams } from './validation'

describe('אימות פרמטרים', () => {
  it('מקבל את ברירות המחדל המרכזיות', () => {
    expect(validateSimulationParams(DEFAULT_SIMULATION_PARAMS)).toEqual({})
  })

  it('שומר תאימות לקישורים חוקיים עם df ומספר מסלולים בגבול הישן', () => {
    expect(validateSimulationParams({
      ...DEFAULT_SIMULATION_PARAMS,
      degreesOfFreedom: 2.01,
      paths: 100,
    })).toEqual({})
  })

  it.each([
    ['initialInvestment', 0, 'הסכום ההתחלתי חייב להיות בין 1 ל־1,000,000,000'],
    ['years', 1.5, 'מספר השנים חייב להיות מספר שלם בין 1 ל־100'],
    ['paths', 100_001, 'מספר המסלולים חייב להיות מספר שלם בין 100 ל־100,000'],
    ['annualDrift', 1.01, 'התשואה השנתית חייבת להיות בין ‎-100% ל־100%'],
    ['annualVolatility', -0.01, 'התנודתיות השנתית חייבת להיות בין 0% ל־200%'],
    ['degreesOfFreedom', 2, 'דרגות החופש חייבות להיות גדולות מ־2 ועד 100'],
    ['cvarPercentile', 0.3, 'אחוזון CVaR חייב להיות בין 1% ל־25%'],
    ['positiveTailPercentile', 0.3, 'אחוז הזנב החיובי חייב להיות בין 1% ל־25%'],
    ['seed', 1.2, 'ה־seed חייב להיות מספר שלם בין 0 ל־4,294,967,295'],
    ['tradingDays', 0, 'מספר ימי המסחר חייב להיות מספר שלם בין 1 ל־366'],
  ] as const)('מחזיר שגיאה בעברית עבור %s', (key, value, message) => {
    const errors = validateSimulationParams({ ...DEFAULT_SIMULATION_PARAMS, [key]: value })
    expect(errors[key]).toBe(message)
  })

  it('דורש לפחות מינוף חוקי אחד ואוסר כפילויות', () => {
    expect(validateSimulationParams({ ...DEFAULT_SIMULATION_PARAMS, leverages: [] }).leverages).toBeTruthy()
    expect(validateSimulationParams({ ...DEFAULT_SIMULATION_PARAMS, leverages: [1, 1] }).leverages).toBeTruthy()
    expect(validateSimulationParams({ ...DEFAULT_SIMULATION_PARAMS, leverages: [0] }).leverages).toBeTruthy()
  })

  it('דוחה ערכים שאינם מספרים סופיים', () => {
    expect(validateSimulationParams({ ...DEFAULT_SIMULATION_PARAMS, annualDrift: Number.NaN }).annualDrift).toBeTruthy()
  })
})
