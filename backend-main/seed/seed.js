// Loads sample destinations + activities, and a demo user you can log in with.
//   npm run seed            -> wipe destinations/activities and reload
//   npm run seed:destroy    -> wipe everything including users and trips

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const Destination = require('../models/Destination');
const Activity = require('../models/Activity');
const User = require('../models/User');
const Trip = require('../models/Trip');
const Itinerary = require('../models/Itinerary');
const Budget = require('../models/Budget');

const destinations = require('./data/destinations');
const activitiesBySlug = require('./data/activities');

const DEMO_USER = {
  name: 'Maya Okafor',
  email: 'maya@example.com',
  password: 'password123',
  preferences: {
    interests: ['food', 'culture', 'nature'],
    budgetLevel: 'mid',
    travelPace: 'balanced',
    homeCity: 'Manchester',
    currency: 'USD',
  },
};

const destroy = async () => {
  await Promise.all([
    Destination.deleteMany(),
    Activity.deleteMany(),
    User.deleteMany(),
    Trip.deleteMany(),
    Itinerary.deleteMany(),
    Budget.deleteMany(),
  ]);
  console.log('Everything wiped.');
};

const seed = async () => {
  await Destination.deleteMany();
  await Activity.deleteMany();

  const created = await Destination.insertMany(destinations);
  const bySlug = new Map(created.map((d) => [d.slug, d]));

  const activityDocs = [];
  for (const [slug, list] of Object.entries(activitiesBySlug)) {
    const dest = bySlug.get(slug);
    if (!dest) {
      console.warn(`  skipping activities for unknown destination "${slug}"`);
      continue;
    }
    list.forEach((a) => activityDocs.push({ ...a, destination: dest._id }));
  }
  await Activity.insertMany(activityDocs);

  console.log(`Loaded ${created.length} destinations and ${activityDocs.length} activities.`);

  const existing = await User.findOne({ email: DEMO_USER.email });
  if (!existing) {
    await User.create(DEMO_USER);
    console.log(`Created demo user  ->  ${DEMO_USER.email} / ${DEMO_USER.password}`);
  } else {
    console.log(`Demo user already exists (${DEMO_USER.email}), left alone.`);
  }
};

(async () => {
  await connectDB();
  try {
    if (process.argv.includes('--destroy')) {
      await destroy();
    } else {
      await seed();
    }
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
