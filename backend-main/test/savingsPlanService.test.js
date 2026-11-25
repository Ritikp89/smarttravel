const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSavingsSchedule, applyContributions } = require('../services/savingsPlanService');

test('monthly plan splits the remaining target exactly and finishes by departure', () => {
  const plan = {
    targetAmount: 100,
    depositAmount: 20,
    currency: 'USD',
    frequency: 'monthly',
    createdAt: new Date('2026-01-31T12:00:00Z'),
    departureDate: new Date('2026-04-15T00:00:00Z'),
  };

  const schedule = buildSavingsSchedule(plan);

  assert.deepEqual(schedule.map((entry) => entry.dueDate.toISOString().slice(0, 10)), [
    '2026-01-31',
    '2026-02-28',
    '2026-03-31',
    '2026-04-15',
  ]);
  assert.equal(schedule.reduce((sum, entry) => sum + entry.amount, 0), 100);
});

test('contributions pay the earliest schedule entries first and flag overdue amounts', () => {
  const schedule = [
    { type: 'deposit', dueDate: new Date('2026-01-01T00:00:00Z'), amount: 25 },
    { type: 'installment', dueDate: new Date('2026-02-01T00:00:00Z'), amount: 25 },
  ];

  const result = applyContributions(
    schedule,
    [{ amount: 30 }],
    'USD',
    new Date('2026-02-10T00:00:00Z')
  );

  assert.deepEqual(result.map((entry) => ({
    paidAmount: entry.paidAmount,
    remainingAmount: entry.remainingAmount,
    status: entry.status,
  })), [
    { paidAmount: 25, remainingAmount: 0, status: 'paid' },
    { paidAmount: 5, remainingAmount: 20, status: 'overdue' },
  ]);
});

test('schedule rejects a deposit larger than the target', () => {
  assert.throws(() => buildSavingsSchedule({
    targetAmount: 10,
    depositAmount: 12,
    currency: 'USD',
    frequency: 'weekly',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    departureDate: new Date('2026-02-01T00:00:00Z'),
  }), /Deposit/);
});
