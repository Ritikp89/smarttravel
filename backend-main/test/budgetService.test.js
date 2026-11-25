const test = require('node:test');
const assert = require('node:assert/strict');
const { budgetInsights, estimateBudget, fitBudgetToLimit } = require('../services/budgetService');

test('estimates with the fallback daily cost when a trip destination is missing', async () => {
  const lines = await estimateBudget({
    trip: { budgetLevel: 'mid', days: 2, travelers: 1 },
    destination: null,
    itinerary: null,
  });

  assert.equal(lines.find((line) => line.category === 'accommodation').amount, 135);
});

test('omits cheaper-tier savings when destination cost data is missing', () => {
  const tips = budgetInsights({
    budget: { limit: 100, total: 200, currency: 'USD', lines: [], contingencyPct: 10 },
    trip: { budgetLevel: 'mid', days: 2, travelers: 1 },
    destination: null,
  });

  assert.ok(tips.some((tip) => tip.includes('over your limit')));
  assert.ok(!tips.some((tip) => tip.includes('Switching to')));
});

test('scales estimated categories to the ceiling and preserves manual and planned costs', () => {
  const lines = [
    { category: 'accommodation', amount: 1000, source: 'estimated' },
    { category: 'food', amount: 1000, source: 'estimated' },
    { category: 'activities', amount: 100, source: 'fixed' },
    { category: 'flights', amount: 100, source: 'manual' },
  ];

  const adjusted = fitBudgetToLimit(lines, 1100, 10);

  assert.deepEqual(adjusted.map((line) => line.amount), [400, 400, 100, 100]);
  assert.equal(Math.round(adjusted.reduce((sum, line) => sum + line.amount, 0) * 1.1), 1100);
});

test('keeps the estimate unchanged when it already fits the ceiling', () => {
  const lines = [{ category: 'food', amount: 500, source: 'estimated' }];

  assert.strictEqual(fitBudgetToLimit(lines, 600, 10), lines);
});

test('preserves fixed costs and reduces estimates to zero when fixed costs exceed the ceiling', () => {
  const lines = [
    { category: 'activities', amount: 800, source: 'fixed' },
    { category: 'flights', amount: 300, source: 'manual' },
    { category: 'food', amount: 500, source: 'estimated' },
  ];

  const adjusted = fitBudgetToLimit(lines, 1000, 10);

  assert.deepEqual(adjusted.map((line) => line.amount), [800, 300, 0]);
  assert.ok(Math.round(adjusted.reduce((sum, line) => sum + line.amount, 0) * 1.1) > 1000);
});

test('accepts zero as a ceiling without silently keeping adjustable estimates', () => {
  const adjusted = fitBudgetToLimit([{ category: 'food', amount: 50, source: 'estimated' }], 0, 10);

  assert.equal(adjusted[0].amount, 0);
});
