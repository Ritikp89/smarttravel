const Activity = require('../models/Activity');

// How a destination's daily cost splits across categories, by travel style.
// Budget travellers spend proportionally more on food and transport, luxury on the bed.
const SPLIT = {
  budget: { accommodation: 0.4, food: 0.32, transport: 0.13, misc: 0.15 },
  mid: { accommodation: 0.45, food: 0.28, transport: 0.12, misc: 0.15 },
  luxury: { accommodation: 0.52, food: 0.25, transport: 0.1, misc: 0.13 },
};

const round5 = (n) => Math.round(n / 5) * 5;

/**
 * Category-based summation.
 *
 * Every line is derived from the destination's per-person daily cost at the chosen
 * budget level, scaled by travellers and nights. Activities are the exception - if an
 * itinerary exists we sum the real ticket prices; otherwise we fall back to a share of
 * the daily cost. Flights are left at 0 with a note since we don't know where you're
 * flying from - the user can type that in.
 */
const estimateBudget = async ({ trip, destination, itinerary, existingLines = [] }) => {
  const level = trip.budgetLevel || 'mid';
  const daily = destination.dailyCost?.[level] ?? 150;
  const split = SPLIT[level];
  const days = trip.days;
  const nights = Math.max(1, days - 1);
  const travelers = trip.travelers || 1;
  const rooms = Math.ceil(travelers / 2);

  const lines = [];

  lines.push({
    category: 'accommodation',
    label: `${nights} night${nights > 1 ? 's' : ''} × ${rooms} room${rooms > 1 ? 's' : ''}`,
    // hotel rate is roughly what 2 people would spend on accommodation share
    amount: round5(daily * split.accommodation * 2 * nights * rooms),
  });

  lines.push({
    category: 'food',
    label: `${days} days of meals for ${travelers}`,
    amount: round5(daily * split.food * days * travelers),
  });

  let activitiesAmount;
  let activitiesLabel;
  if (itinerary?.days?.length) {
    const ids = itinerary.days.flatMap((d) => d.slots.map((s) => s.activity));
    const acts = await Activity.find({ _id: { $in: ids } }).select('cost').lean();
    const perPerson = acts.reduce((s, a) => s + a.cost, 0);
    activitiesAmount = round5(perPerson * travelers);
    activitiesLabel = `${acts.length} planned activities`;
  } else {
    activitiesAmount = round5(daily * 0.15 * days * travelers);
    activitiesLabel = 'Rough allowance - generate an itinerary for real prices';
  }
  lines.push({ category: 'activities', label: activitiesLabel, amount: activitiesAmount });

  lines.push({
    category: 'transport',
    label: 'Getting around locally',
    amount: round5(daily * split.transport * days * travelers),
  });

  // keep anything the user already entered by hand
  const manualFlights = existingLines.find((l) => l.category === 'flights' && l.source === 'manual');
  lines.push(
    manualFlights
      ? manualFlights
      : { category: 'flights', label: 'Add your own - depends where you fly from', amount: 0 }
  );

  lines.push({
    category: 'misc',
    label: 'Souvenirs, SIM card, the odd taxi',
    amount: round5(daily * split.misc * days * travelers),
  });

  // carry over any other manual overrides
  existingLines
    .filter((l) => l.source === 'manual' && l.category !== 'flights')
    .forEach((manual) => {
      const idx = lines.findIndex((l) => l.category === manual.category);
      if (idx >= 0) lines[idx] = manual;
    });

  return lines.map((l) => ({ source: 'estimated', ...l }));
};

/**
 * Compare the budget to a self-imposed limit and to the destination's cheaper tiers.
 * Returns a handful of plain-English suggestions.
 */
const budgetInsights = ({ budget, trip, destination }) => {
  const tips = [];
  const level = trip.budgetLevel || 'mid';

  if (budget.limit && budget.total > budget.limit) {
    const over = budget.total - budget.limit;
    tips.push(`You're about ${over} ${budget.currency} over your limit.`);

    const cheaperLevel = level === 'luxury' ? 'mid' : level === 'mid' ? 'budget' : null;
    if (cheaperLevel) {
      const saving = (destination.dailyCost[level] - destination.dailyCost[cheaperLevel]) * trip.days * trip.travelers;
      tips.push(`Switching to ${cheaperLevel} travel style would save roughly ${round5(saving)} ${budget.currency}.`);
    }
  } else if (budget.limit) {
    tips.push(`You've got about ${budget.limit - budget.total} ${budget.currency} of headroom.`);
  }

  const acc = budget.lines.find((l) => l.category === 'accommodation');
  if (acc && acc.amount / budget.total > 0.5) {
    tips.push('Accommodation is over half the trip. Worth checking apartments or staying a little outside the centre.');
  }

  const flights = budget.lines.find((l) => l.category === 'flights');
  if (flights && flights.amount === 0) {
    tips.push('Flights are not included yet - add them to see the true total.');
  }

  return tips;
};

module.exports = { estimateBudget, budgetInsights, SPLIT };
