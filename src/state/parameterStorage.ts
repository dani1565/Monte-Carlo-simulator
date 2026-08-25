import type { SimulationParams } from '../simulation/types'
import { DEFAULT_SIMULATION_PARAMS } from '../simulation/defaults'
import { validateSimulationParams } from '../simulation/validation'

const STORAGE_KEY = 'maslul:simulation-params:v1'
const PARAMETER_KEYS: (keyof SimulationParams)[] = [
  'initialInvestment', 'leverages', 'years', 'paths', 'annualDrift', 'annualVolatility',
  'degreesOfFreedom', 'cvarPercentile', 'positiveTailPercentile', 'seed', 'tradingDays',
]
const REQUIRED_PARAMETER_KEYS = PARAMETER_KEYS.filter((key) => key !== 'positiveTailPercentile')

export function encodeParams(params: SimulationParams): string {
  const query = new URLSearchParams()
  query.set('initialInvestment', String(params.initialInvestment))
  query.set('leverages', params.leverages.join(','))
  query.set('years', String(params.years))
  query.set('paths', String(params.paths))
  query.set('annualDrift', String(params.annualDrift))
  query.set('annualVolatility', String(params.annualVolatility))
  query.set('degreesOfFreedom', String(params.degreesOfFreedom))
  query.set('cvarPercentile', String(params.cvarPercentile))
  query.set('positiveTailPercentile', String(params.positiveTailPercentile))
  query.set('seed', String(params.seed))
  query.set('tradingDays', String(params.tradingDays))
  return query.toString()
}

export function decodeParams(value: string): SimulationParams | null {
  if (!value) return null
  const query = new URLSearchParams(value.startsWith('?') ? value.slice(1) : value)
  if (REQUIRED_PARAMETER_KEYS.some((key) => !query.has(key))) return null
  const params: SimulationParams = {
    initialInvestment: Number(query.get('initialInvestment')),
    leverages: (query.get('leverages') ?? '').split(',').filter(Boolean).map(Number),
    years: Number(query.get('years')),
    paths: Number(query.get('paths')),
    annualDrift: Number(query.get('annualDrift')),
    annualVolatility: Number(query.get('annualVolatility')),
    degreesOfFreedom: Number(query.get('degreesOfFreedom')),
    cvarPercentile: Number(query.get('cvarPercentile')),
    positiveTailPercentile: query.has('positiveTailPercentile') ? Number(query.get('positiveTailPercentile')) : DEFAULT_SIMULATION_PARAMS.positiveTailPercentile,
    seed: Number(query.get('seed')),
    tradingDays: Number(query.get('tradingDays')),
  }
  return Object.keys(validateSimulationParams(params)).length ? null : params
}

export function saveParams(storage: Storage, params: SimulationParams): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(params))
}

export function loadSavedParams(storage: Storage): SimulationParams | null {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SimulationParams>
    if (!parsed || REQUIRED_PARAMETER_KEYS.some((key) => !(key in parsed))) return null
    const params = { ...DEFAULT_SIMULATION_PARAMS, ...parsed }
    return Object.keys(validateSimulationParams(params)).length ? null : params
  } catch {
    return null
  }
}

interface BrowserWithStorage { readonly localStorage: Storage }

export function safeBrowserLoad(browser: BrowserWithStorage): SimulationParams | null {
  try {
    return loadSavedParams(browser.localStorage)
  } catch {
    return null
  }
}

export function safeBrowserSave(browser: BrowserWithStorage, params: SimulationParams): void {
  try {
    saveParams(browser.localStorage, params)
  } catch {
    // Persistence is optional; simulation remains fully functional without it.
  }
}
