const { currencyScale, toMinorUnits, fromMinorUnits } = require('./groupSplitService');

const dayStartUtc = (value) => {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const addMonthsFromAnchor = (anchor, months) => {
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth() + months;
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = ((month % 12) + 12) % 12;
  const day = anchor.getUTCDate();
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay)));
};

const nextInstallmentDate = (anchor, frequency, index) => {
  if (frequency === 'weekly') return new Date(anchor.getTime() + index * 7 * 86400000);
  if (frequency === 'biweekly') return new Date(anchor.getTime() + index * 14 * 86400000);
  if (frequency === 'monthly') return addMonthsFromAnchor(anchor, index);
  throw new RangeError('Choose a supported installment frequency');
};

const buildSavingsSchedule = (plan) => {
  const scale = currencyScale(plan.currency);
  const targetMinor = toMinorUnits(plan.targetAmount, plan.currency);
  const depositMinor = toMinorUnits(plan.depositAmount, plan.currency);
  const start = dayStartUtc(plan.createdAt);
  const departure = dayStartUtc(plan.departureDate);
  if (departure <= start) throw new RangeError('Departure must be after the savings plan starts');
  if (depositMinor <= 0 || targetMinor <= depositMinor) {
    throw new RangeError('Deposit must be greater than zero and less than the target');
  }

  const schedule = [{
    type: 'deposit',
    dueDate: start,
    amount: fromMinorUnits(depositMinor, plan.currency),
    amountMinor: depositMinor,
  }];
  const remainingMinor = targetMinor - depositMinor;
  if (remainingMinor === 0) return schedule.map(({ amountMinor, ...entry }) => entry);

  const dates = [];
  for (let index = 1; dates.length <= 1000; index += 1) {
    const date = nextInstallmentDate(start, plan.frequency, index);
    if (date >= departure) break;
    dates.push(date);
  }
  if (dates.length > 1000) throw new RangeError('Choose a less frequent schedule');
  if (!dates.length || dates[dates.length - 1].getTime() !== departure.getTime()) {
    dates.push(departure);
  }
  if (remainingMinor < dates.length) {
    throw new RangeError('The remaining amount is too small for this many installments');
  }

  const base = Math.floor(remainingMinor / dates.length);
  const remainder = remainingMinor % dates.length;
  dates.forEach((dueDate, index) => {
    const amountMinor = base + (index < remainder ? 1 : 0);
    schedule.push({
      type: 'installment',
      dueDate,
      amount: fromMinorUnits(amountMinor, plan.currency),
      amountMinor,
    });
  });
  return schedule.map(({ amountMinor, ...entry }) => entry);
};

const applyContributions = (schedule, contributions, currency, now = new Date()) => {
  let unallocated = contributions.reduce(
    (sum, contribution) => sum + toMinorUnits(contribution.amount, currency),
    0
  );
  const today = dayStartUtc(now).getTime();

  return schedule.map((entry) => {
    const amountMinor = toMinorUnits(entry.amount, currency);
    const paidMinor = Math.min(amountMinor, unallocated);
    unallocated -= paidMinor;
    const dueDay = dayStartUtc(entry.dueDate).getTime();
    const status = paidMinor >= amountMinor
      ? 'paid'
      : dueDay < today
        ? 'overdue'
        : dueDay === today
          ? 'due'
          : 'upcoming';
    return {
      ...entry,
      paidAmount: fromMinorUnits(paidMinor, currency),
      remainingAmount: fromMinorUnits(amountMinor - paidMinor, currency),
      status,
    };
  });
};

module.exports = { buildSavingsSchedule, applyContributions };
