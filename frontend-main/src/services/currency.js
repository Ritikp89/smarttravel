// Approximate conversion rates. INR uses the RBI/FBIL reference rate from Nov. 25, 2026.
const RATES_FROM_USD = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 156,
  AUD: 1.52,
  CAD: 1.36,
  INR: 92.4895,
}

export function normalizeCurrency(currency) {
  const value = String(currency || 'INR').toUpperCase()
  return RATES_FROM_USD[value] ? value : 'USD'
}

export function convertCurrency(amount, toCurrency, fromCurrency = 'USD') {
  const value = Number(amount) || 0
  const from = normalizeCurrency(fromCurrency)
  const to = normalizeCurrency(toCurrency)
  if (from === to) return Math.round(value)
  return Math.round((value / RATES_FROM_USD[from]) * RATES_FROM_USD[to])
}
