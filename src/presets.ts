import type { SimulationParams } from './simulation/types'

export interface Preset {
  name: string
  description: string
  values: Pick<SimulationParams, 'annualDrift' | 'annualVolatility' | 'degreesOfFreedom' | 'years'>
}

export const presets: Preset[] = [
  { name: 'S&P היסטורי', description: 'סביבה ארוכת טווח עם תשואה ותנודתיות אופייניות לשוק האמריקאי.', values: { annualDrift: 0.09, annualVolatility: 0.18, degreesOfFreedom: 5, years: 20 } },
  { name: 'תרחיש לחץ בסגנון 2008', description: 'מבחן לחץ סינתטי: שוק חלש, תנודתיות חריפה וריבוי ימי קיצון — לא שחזור היסטורי.', values: { annualDrift: -0.04, annualVolatility: 0.36, degreesOfFreedom: 4, years: 5 } },
  { name: 'זנבות שמנים קיצוניים', description: 'מבחן לחץ שבו ברבורים שחורים מופיעים בתדירות גבוהה.', values: { annualDrift: 0.07, annualVolatility: 0.25, degreesOfFreedom: 3, years: 20 } },
  { name: 'שוק שורי אגרסיבי', description: 'צמיחה מהירה לצד תנודתיות שעלולה לפגוע במינוף.', values: { annualDrift: 0.14, annualVolatility: 0.22, degreesOfFreedom: 7, years: 15 } },
]
