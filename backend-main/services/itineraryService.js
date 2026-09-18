const Activity = require('../models/Activity');
const { estimateTravel } = require('./mapsService');

// Hours of "doing stuff" per day, by pace. Meals and getting around eat into this.
const HOURS_BY_PACE = { relaxed: 5.5, balanced: 7.5, packed: 9.5 };
const DAY_START = { relaxed: 10 * 60, balanced: 9 * 60 + 30, packed: 8 * 60 + 30 }; // minutes from midnight
const DAY_END = 21 * 60 + 30;

// cost per person the algorithm is willing to accept for a single activity, by budget level
const COST_CEILING = { budget: 45, mid: 120, luxury: Infinity };

// how many of each category we'll put in a single day
const CATEGORY_CAP = { food: 2, sightseeing: 3, outdoors: 2 };

const CATEGORY_TO_INTEREST = {
  sightseeing: ['culture', 'history'],
  museum: ['art', 'history', 'culture'],
  food: ['food'],
  outdoors: ['nature', 'adventure'],
  adventure: ['adventure'],
  beach: ['beach'],
  nightlife: ['nightlife'],
  shopping: ['shopping'],
  wellness: ['wellness'],
  tour: ['culture', 'history'],
};

const minutesToClock = (mins) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const timeWindow = (preferredTime) => {
  switch (preferredTime) {
    case 'morning':
      return [6 * 60, 13 * 60];
    case 'afternoon':
      return [12 * 60, 18 * 60];
    case 'evening':
      return [17 * 60, 24 * 60];
    default:
      return [0, 24 * 60];
  }
};

/**
 * Score how well an activity fits this trip. Higher is better.
 * Interest match dominates, then rating, then a cost penalty.
 */
const scoreActivity = (activity, { interests = [], budgetLevel = 'mid' }) => {
  const own = new Set([...(activity.interests || []), ...(CATEGORY_TO_INTEREST[activity.category] || [])]);
  const hits = interests.filter((i) => own.has(i)).length;

  let score = interests.length ? (hits / interests.length) * 60 : 30;
  score += ((activity.rating || 4) / 5) * 30;

  const ceiling = COST_CEILING[budgetLevel];
  if (activity.cost > ceiling) score -= 40;
  else if (activity.cost > ceiling * 0.6) score -= 10;

  // free things get a tiny nudge on a budget trip
  if (budgetLevel === 'budget' && activity.cost === 0) score += 5;

  return score;
};

const mostCommon = (arr) => {
  const counts = arr.reduce((acc, x) => ((acc[x] = (acc[x] || 0) + 1), acc), {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
};

const THEME_LABEL = {
  sightseeing: 'Landmarks & wandering',
  museum: 'Museums & galleries',
  food: 'Eating your way around',
  outdoors: 'Fresh air day',
  adventure: 'Adrenaline day',
  beach: 'Beach day',
  nightlife: 'Late one',
  shopping: 'Markets & shops',
  wellness: 'Slow down',
  tour: 'Guided day',
};

/**
 * Greedy day-packing.
 *
 * 1. Score + sort every activity at the destination.
 * 2. For each day, walk down the sorted list and grab anything that fits the remaining
 *    hours, respects its preferred time-of-day window, and doesn't repeat a category
 *    we've already done today (max one museum, one food stop, etc. - keeps days varied).
 * 3. Travel time between consecutive stops is estimated from coordinates and inserted
 *    into the clock so start times are believable.
 * 4. Anything we couldn't place is returned as leftovers.
 *
 * Deterministic - the same trip settings always produce the same plan.
 */
const buildItinerary = async (trip) => {
  const activities = await Activity.find({ destination: trip.destination }).lean();

  const ceiling = COST_CEILING[trip.budgetLevel] || COST_CEILING.mid;
  const ranked = activities
    // way-over-budget things never make the cut, even as filler
    .filter((a) => a.cost <= ceiling * 2)
    .map((a) => ({ ...a, _score: scoreActivity(a, trip) }))
    .sort((a, b) => b._score - a._score || a.cost - b.cost);

  const days = [];
  const used = new Set();
  const dayCount = trip.days;
  const hoursBudget = HOURS_BY_PACE[trip.pace] || HOURS_BY_PACE.balanced;
  const start = new Date(trip.startDate);

  for (let d = 0; d < dayCount; d++) {
    const date = new Date(start);
    date.setDate(start.getDate() + d);

    let clock = DAY_START[trip.pace] || DAY_START.balanced;
    let hoursLeft = hoursBudget;
    const slots = [];
    const categoriesToday = new Map();
    let lastCoords = null;
    let hadLunch = false;

    const candidates = ranked.filter((a) => !used.has(String(a._id)));

    const tryPlace = (activity, maxWaitMinutes = Infinity) => {
      if (used.has(String(activity._id))) return false;

      // variety rule: one of most things per day, but two meals and a few sights are fine
      const cap = CATEGORY_CAP[activity.category] || 1;
      if ((categoriesToday.get(activity.category) || 0) >= cap) return false;

      const travel = lastCoords ? estimateTravel(lastCoords, activity.coordinates) : { minutes: 0 };
      const [winStart, winEnd] = timeWindow(activity.preferredTime);

      // if it's too early for this one, we simply wait (coffee, hotel, whatever) - idle time is free
      const startAt = Math.max(clock + travel.minutes, winStart);
      const durationMin = Math.round(activity.durationHours * 60);
      const endAt = startAt + durationMin;

      if (startAt - (clock + travel.minutes) > maxWaitMinutes) return false;
      if (startAt > winEnd - 30) return false;
      if (endAt > DAY_END) return false;

      // full-day excursions get the whole day to themselves, and not on arrival day
      const isFullDay = activity.durationHours >= 6;
      if (isFullDay && (slots.length > 0 || (d === 0 && dayCount > 1))) return false;
      if (!isFullDay && slots.some((s) => s._hours >= 6)) return false;
      const allowance = isFullDay ? hoursBudget + 2.5 : hoursLeft + 0.25;
      if (activity.durationHours + travel.minutes / 60 > allowance) return false;

      slots.push({
        activity: activity._id,
        startTime: minutesToClock(startAt),
        endTime: minutesToClock(endAt),
        travelMinutesFromPrevious: travel.minutes,
        _cost: activity.cost,
        _hours: activity.durationHours,
        _category: activity.category,
      });

      clock = endAt + 15; // small buffer between things
      hoursLeft -= activity.durationHours + travel.minutes / 60;
      used.add(String(activity._id));
      categoriesToday.set(activity.category, (categoriesToday.get(activity.category) || 0) + 1);
      if (activity.coordinates?.lat != null) lastCoords = activity.coordinates;
      return true;
    };

    // Walk the ranked list a few times. Early passes only take things we can do more or
    // less right now, so the day fills chronologically; the last pass is allowed to wait
    // around for an evening-only item rather than leave the slot empty.
    const WAIT_LIMITS = [45, 120, Infinity];
    for (const maxWait of WAIT_LIMITS) {
      if (hoursLeft < 0.75) break;
      // once we're allowed to wait, go through the day in clock order so an
      // afternoon museum isn't skipped in favour of a higher-scored evening bar
      const order =
        maxWait === Infinity
          ? [...candidates].sort((a, b) => timeWindow(a.preferredTime)[0] - timeWindow(b.preferredTime)[0] || b._score - a._score)
          : candidates;
      for (const a of order) {
        if (used.has(String(a._id))) continue;
        // hold the first food stop until we're around midday so it reads as lunch
        if (a.category === 'food' && !hadLunch && clock < 11 * 60 + 30 && a.preferredTime !== 'evening') continue;
        if (tryPlace(a, maxWait) && a.category === 'food') hadLunch = true;
        if (hoursLeft < 0.75) break;
      }
    }

    const estimatedCost = slots.reduce((s, x) => s + x._cost, 0);
    const totalHours = slots.reduce((s, x) => s + x._hours, 0);
    const theme = THEME_LABEL[mostCommon(slots.map((s) => s._category))] || 'Free day';

    days.push({
      dayNumber: d + 1,
      date,
      theme: slots.length ? theme : 'Free day - nothing scheduled',
      slots: slots.map(({ _cost, _hours, _category, ...s }) => s),
      estimatedCost,
      totalHours: Number(totalHours.toFixed(1)),
    });
  }

  const leftovers = ranked.filter((a) => !used.has(String(a._id))).map((a) => a._id);

  return { days, leftovers };
};

module.exports = { buildItinerary, scoreActivity, minutesToClock };
