const RATES_FROM_USD = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 156,
  AUD: 1.52,
  CAD: 1.36,
  INR: 83.9,
};

const normalizeCurrency = (currency) => (
  RATES_FROM_USD[String(currency || '').toUpperCase()]
    ? String(currency).toUpperCase()
    : 'USD'
);

const convertAmount = (amount, fromCurrency, toCurrency) => {
  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);
  const value = Number(amount) || 0;
  if (from === to) return Math.round(value);
  return Math.round((value / RATES_FROM_USD[from]) * RATES_FROM_USD[to]);
};

module.exports = { RATES_FROM_USD, normalizeCurrency, convertAmount };
