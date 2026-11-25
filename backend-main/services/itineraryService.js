const Activity = require('../models/Activity');
const { estimateTravel } = require('./mapsService');

// Hours of "doing stuff" per day, by pace. Meals and getting around eat into this.
const HOURS_BY_PACE = { relaxed: 5.5, balanced: 7.5, packed: 11 };
const DAY_START = { relaxed: 10 * 60, balanced: 9 * 60 + 30, packed: 8 * 60 }; // minutes from midnight
const DAY_END = 21 * 60 + 30;

// cost per person the algorithm is willing to accept for a single activity, by budget level
const COST_CEILING = { budget: 45, mid: 120, luxury: Infinity };

// how many of each category we'll put in a single day
const CATEGORY_CAP = { food: 3, sightseeing: 4, outdoors: 3, museum: 2, nightlife: 2, shopping: 2, tour: 2 };

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
  const destinationId = trip.destination?._id || trip.destination;
  const activities = await Activity.find({ destination: destinationId }).lean();

  if (trip.pace === 'packed' && activities.length < 20) {
    const existingNames = new Set(activities.map((activity) => activity.name));
    const packedFallbacks = [
      ['Morning landmark walk', 'sightseeing', 'A guided-style walk through the city’s best-known landmarks.', 2.5, 'morning'],
      ['Breakfast at a local market', 'food', 'Start the day with local breakfast dishes and market favourites.', 1.5, 'morning'],
      ['Local history museum', 'museum', 'Explore a museum or cultural exhibit covering the area’s history.', 2.5, 'afternoon'],
      ['Lunch tasting route', 'food', 'Try several local dishes along a compact neighbourhood tasting route.', 2, 'afternoon'],
      ['Scenic neighbourhood walk', 'outdoors', 'Walk through scenic streets, parks, viewpoints, or waterfront areas.', 2, 'afternoon'],
      ['Central shopping and craft streets', 'shopping', 'Browse local shops, crafts, markets, and independent boutiques.', 2, 'afternoon'],
      ['Sunset viewpoint stop', 'tour', 'Visit a rooftop, lookout, waterfront, or scenic viewpoint at sunset.', 1.5, 'evening'],
      ['Evening culture experience', 'nightlife', 'Enjoy a local performance, evening market, or cultural night activity.', 2, 'evening'],
      ['Popular attraction visit', 'tour', 'Visit one of the area’s most popular attractions or tour highlights.', 2.5, 'morning'],
      ['Coffee and dessert break', 'food', 'Pause at a local cafe for coffee and a regional dessert.', 1, 'afternoon'],
      ['Garden or park visit', 'outdoors', 'Take a relaxed visit to a public garden, park, or nature area.', 2, 'morning'],
      ['Local evening show', 'nightlife', 'Finish the day with music, theater, dancing, or a night performance.', 2, 'evening'],
      ['Historic walking route', 'sightseeing', 'Follow a walking route through historic streets and landmarks.', 2.5, 'morning'],
      ['Local market lunch', 'food', 'Taste regional dishes at a busy local market or food hall.', 1.5, 'afternoon'],
      ['Architecture highlights', 'sightseeing', 'Explore notable architecture in the city centre.', 2, 'afternoon'],
      ['Art and gallery stop', 'museum', 'Visit an art gallery or local creative exhibition.', 2, 'afternoon'],
      ['Riverside or waterfront walk', 'outdoors', 'Enjoy a scenic walk beside a river, lake, or waterfront.', 2, 'evening'],
      ['Local craft experience', 'shopping', 'Discover local crafts, artisan studios, or speciality shops.', 1.5, 'afternoon'],
      ['Traditional performance', 'nightlife', 'Attend a traditional music, dance, or theater performance.', 2, 'evening'],
      ['Viewpoint and photo stop', 'tour', 'Stop at a popular viewpoint for photos and local scenery.', 1.5, 'morning'],
    ]
      .filter(([name]) => !existingNames.has(name))
      .map(([name, category, description, durationHours, preferredTime]) => ({
        name,
        category,
        description,
        interests: trip.interests?.length ? trip.interests : ['culture', 'food'],
        durationHours,
        cost: category === 'food' ? 15 : category === 'shopping' ? 20 : 10,
        preferredTime,
        rating: 4.3,
        destination: destinationId,
        coordinates: trip.destination?.coordinates || { lat: 0, lng: 0 },
      }));

    if (packedFallbacks.length) {
      const created = await Activity.insertMany(packedFallbacks);
      activities.push(...created.map((activity) => activity.toObject()));
    }
  }

  // A typed or newly added destination may not have cataloged activities yet.
  // Keep itinerary generation usable by filling a few general activities first.
  if (activities.length < 5) {
    const existingCategories = new Set(activities.map((activity) => activity.category));
    const fallbackActivities = [
      { name: 'Explore the city centre', category: 'sightseeing', description: 'Explore the main streets, landmarks, and neighbourhood around the centre.', interests: ['culture', 'history'], durationHours: 2.5, cost: 0, preferredTime: 'morning', rating: 4.2 },
      { name: 'Local food walk', category: 'food', description: 'Try local dishes at a market, cafe, or favourite neighbourhood restaurant.', interests: ['food'], durationHours: 2, cost: 25, preferredTime: 'afternoon', rating: 4.3 },
      { name: 'Park and neighbourhood walk', category: 'outdoors', description: 'Take a relaxed walk through a nearby park or scenic neighbourhood.', interests: ['nature', 'wellness'], durationHours: 2, cost: 0, preferredTime: 'morning', rating: 4.2 },
      { name: 'Museum or cultural visit', category: 'museum', description: 'Visit a local museum, gallery, cultural centre, or historic exhibit.', interests: ['art', 'culture', 'history'], durationHours: 2.5, cost: 15, preferredTime: 'afternoon', rating: 4.3 },
      { name: 'Sunset viewpoint', category: 'tour', description: 'Finish with an evening viewpoint or relaxed guided walk around the area.', interests: ['culture', 'nature'], durationHours: 1.5, cost: 10, preferredTime: 'evening', rating: 4.4 },
    ].filter((activity) => !existingCategories.has(activity.category));

    if (fallbackActivities.length) {
      const created = await Activity.insertMany(
        fallbackActivities.map((activity) => ({
          ...activity,
          destination: destinationId,
          coordinates: trip.destination?.coordinates || { lat: 0, lng: 0 },
        }))
      );
      activities.push(...created.map((activity) => activity.toObject()));
    }
  }

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
      if (trip.pace !== 'packed' && used.has(String(activity._id))) return false;
      if (trip.pace === 'packed' && slots.some((slot) => slot.activity === activity._id)) return false;

      // variety rule: one of most things per day, but two meals and a few sights are fine
      const normalCap = CATEGORY_CAP[activity.category] || 1;
      const cap = trip.pace === 'packed' ? normalCap : normalCap;
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
