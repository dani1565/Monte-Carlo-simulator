import { describe, expect, it } from 'vitest'
import { DEFAULT_SIMULATION_PARAMS } from '../simulation/defaults'
import { decodeParams, encodeParams, loadSavedParams, safeBrowserLoad, safeBrowserSave, saveParams } from './parameterStorage'

describe('שמירה ושיתוף פרמטרים', () => {
  it('מקודד ומפענח תרחיש מלא ב-URL', () => {
    const params = { ...DEFAULT_SIMULATION_PARAMS, initialInvestment: 42_000, leverages: [1, 2.5, 4], tradingDays: 250 }
    expect(decodeParams(encodeParams(params))).toEqual(params)
  })

  it('טוען קישור ישן ומוסיף את ברירת המחדל של הזנב החיובי', () => {
    const legacy = new URLSearchParams(encodeParams(DEFAULT_SIMULATION_PARAMS))
    legacy.delete('positiveTailPercentile')
    expect(decodeParams(legacy.toString())).toEqual(DEFAULT_SIMULATION_PARAMS)
  })

  it('דוחה URL חלקי או לא תקין', () => {
    expect(decodeParams('years=0&paths=abc')).toBeNull()
    expect(decodeParams('')).toBeNull()
  })

  it('שומר וטוען פרמטרים חוקיים מהדפדפן', () => {
    const storage = new MemoryStorage()
    const params = { ...DEFAULT_SIMULATION_PARAMS, years: 7 }
    saveParams(storage, params)
    expect(loadSavedParams(storage)).toEqual(params)
  })

  it('מתעלם מנתונים ישנים או פגומים', () => {
    const storage = new MemoryStorage()
    storage.setItem('maslul:simulation-params:v1', '{"years":0}')
    expect(loadSavedParams(storage)).toBeNull()
    storage.setItem('maslul:simulation-params:v1', 'not-json')
    expect(loadSavedParams(storage)).toBeNull()
  })

  it('ממשיך לעבוד כאשר הדפדפן חוסם גישה לאחסון', () => {
    const browser = { get localStorage(): Storage { throw new DOMException('blocked', 'SecurityError') } }
    expect(safeBrowserLoad(browser)).toBeNull()
    expect(() => safeBrowserSave(browser, DEFAULT_SIMULATION_PARAMS)).not.toThrow()
  })
})

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}
