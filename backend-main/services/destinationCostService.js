// Moderate per-person daily estimates for Indian destinations, in USD.
// These also override older destination records until the seed data is refreshed.
const INDIA_MID_RANGE_USD = Object.freeze({
  jaipur: 45,
  mumbai: 55,
  goa: 50,
  kerala: 55,
  ladakh: 65,
});

const dailyCostFor = (destination, level = 'mid') => {
  const slug = String(destination?.slug || '').toLowerCase();
  if (level === 'mid' && destination?.country?.toLowerCase() === 'india' && INDIA_MID_RANGE_USD[slug]) {
    return INDIA_MID_RANGE_USD[slug];
  }
  return destination?.dailyCost?.[level];
};

const withBudgetCosts = (destination) => {
  if (!destination) return destination;
  const value = typeof destination.toObject === 'function' ? destination.toObject() : destination;
  const mid = dailyCostFor(value, 'mid');
  if (mid == null || mid === value.dailyCost?.mid) return value;
  return { ...value, dailyCost: { ...value.dailyCost, mid } };
};

module.exports = { INDIA_MID_RANGE_USD, dailyCostFor, withBudgetCosts };
