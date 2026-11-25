const RATES_FROM_USD = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 156,
  AUD: 1.52,
  CAD: 1.36,
  INR: 83.9,
}

export function normalizeCurrency(currency) {
  const value = String(currency || 'USD').toUpperCase()
  return RATES_FROM_USD[value] ? value : 'USD'
}

export function convertCurrency(amount, toCurrency, fromCurrency = 'USD') {
  const value = Number(amount) || 0
  const from = normalizeCurrency(fromCurrency)
  const to = normalizeCurrency(toCurrency)
  if (from === to) return Math.round(value)
  return Math.round((value / RATES_FROM_USD[from]) * RATES_FROM_USD[to])
}
