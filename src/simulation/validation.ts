import { PARAMETER_LIMITS } from './defaults'
import type { SimulationParams } from './types'

export type ValidationErrors = Partial<Record<keyof SimulationParams, string>>

const finite = (value: number) => Number.isFinite(value)
const inRange = (value: number, min: number, max: number) => finite(value) && value >= min && value <= max

export function validateSimulationParams(params: SimulationParams): ValidationErrors {
  const errors: ValidationErrors = {}
  if (!inRange(params.initialInvestment, PARAMETER_LIMITS.initialInvestment.min, PARAMETER_LIMITS.initialInvestment.max)) errors.initialInvestment = 'הסכום ההתחלתי חייב להיות בין 1 ל־1,000,000,000'
  if (!inRange(params.years, PARAMETER_LIMITS.years.min, PARAMETER_LIMITS.years.max) || !Number.isInteger(params.years)) errors.years = 'מספר השנים חייב להיות מספר שלם בין 1 ל־100'
  if (!inRange(params.paths, PARAMETER_LIMITS.paths.min, PARAMETER_LIMITS.paths.max) || !Number.isInteger(params.paths)) errors.paths = 'מספר המסלולים חייב להיות מספר שלם בין 100 ל־100,000'
  if (!inRange(params.annualDrift, PARAMETER_LIMITS.annualDrift.min, PARAMETER_LIMITS.annualDrift.max)) errors.annualDrift = 'התשואה השנתית חייבת להיות בין ‎-100% ל־100%'
  if (!inRange(params.annualVolatility, PARAMETER_LIMITS.annualVolatility.min, PARAMETER_LIMITS.annualVolatility.max)) errors.annualVolatility = 'התנודתיות השנתית חייבת להיות בין 0% ל־200%'
  if (!inRange(params.degreesOfFreedom, PARAMETER_LIMITS.degreesOfFreedom.min, PARAMETER_LIMITS.degreesOfFreedom.max)) errors.degreesOfFreedom = 'דרגות החופש חייבות להיות גדולות מ־2 ועד 100'
  if (!inRange(params.cvarPercentile, PARAMETER_LIMITS.cvarPercentile.min, PARAMETER_LIMITS.cvarPercentile.max)) errors.cvarPercentile = 'אחוזון CVaR חייב להיות בין 1% ל־25%'
  if (!inRange(params.positiveTailPercentile, PARAMETER_LIMITS.positiveTailPercentile.min, PARAMETER_LIMITS.positiveTailPercentile.max)) errors.positiveTailPercentile = 'אחוז הזנב החיובי חייב להיות בין 1% ל־25%'
  if (!inRange(params.seed, PARAMETER_LIMITS.seed.min, PARAMETER_LIMITS.seed.max) || !Number.isInteger(params.seed)) errors.seed = 'ה־seed חייב להיות מספר שלם בין 0 ל־4,294,967,295'
  if (!inRange(params.tradingDays, PARAMETER_LIMITS.tradingDays.min, PARAMETER_LIMITS.tradingDays.max) || !Number.isInteger(params.tradingDays)) errors.tradingDays = 'מספר ימי המסחר חייב להיות מספר שלם בין 1 ל־366'
  const validLeverages = params.leverages.length > 0 && params.leverages.every((value) => inRange(value, PARAMETER_LIMITS.leverage.min, PARAMETER_LIMITS.leverage.max))
  if (!validLeverages || new Set(params.leverages).size !== params.leverages.length) errors.leverages = 'יש להזין לפחות רמת מינוף ייחודית אחת בין 0.1 ל־20'
  return errors
}

export function isSimulationParamsValid(params: SimulationParams): boolean {
  return Object.keys(validateSimulationParams(params)).length === 0
}
