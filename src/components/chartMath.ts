export function toInvestmentMultiple(value: number, initialInvestment: number): number {
  return initialInvestment > 0 ? value / initialInvestment : 0
}

const STANDARD_LEVERAGE_COLORS = ['#51e5b4', '#5da9ff', '#f5c15d', '#b989ff', '#ff7a81'] as const
const CUSTOM_LEVERAGE_COLORS = ['#36c5f0', '#ff9f43', '#e66cff', '#7bd88f', '#ff6b9d'] as const

export function leverageColor(leverage: number): string {
  if (Number.isInteger(leverage) && leverage >= 1 && leverage <= STANDARD_LEVERAGE_COLORS.length) {
    return STANDARD_LEVERAGE_COLORS[leverage - 1]
  }
  const stableIndex = Math.abs(Math.round(leverage * 10)) % CUSTOM_LEVERAGE_COLORS.length
  return CUSTOM_LEVERAGE_COLORS[stableIndex]
}
