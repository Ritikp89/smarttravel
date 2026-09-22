# Smart Travel

A MERN travel-planning app. Tell it how you like to travel and it recommends destinations, packs a realistic day-by-day itinerary, and estimates a budget you can argue with.

- `backend-main/` — Express + MongoDB REST API
- `frontend-main/` — React (Vite + Tailwind) client

## What it does

- **Personalised recommendations** — destinations scored against your interests, budget style and the month you're travelling.
- **Itinerary generation** — a greedy day-packer that respects pace (relaxed / balanced / packed), time-of-day windows (sunset spots go in the evening), travel time between stops, and variety (max one museum a day, lunch around midday, full-day excursions get a day to themselves). Days are editable: reorder, remove, or pull in anything that didn't make the cut.
- **Budget estimation** — category-based summation (accommodation, food, activities, transport, flights, misc) with a contingency buffer, per-person and per-day figures, an optional spending ceiling, and manual overrides that survive re-estimates.
- **Trip analysis** — `GET /api/trips/:id/analysis` rolls up itinerary balance, budget shape and a forecast for your dates.
- **Weather & maps** — live forecasts from [Open-Meteo](https://open-meteo.com) (no key needed), travel-time estimates from coordinates, optional Google Directions if you add a key.

## Getting started

You need Node 18+ and a MongoDB instance (local `mongod` or an Atlas URI).

### Backend

```bash
cd backend-main
cp .env.example .env     # set MONGODB_URI and JWT_SECRET
npm install
npm run seed             # loads 12 destinations, ~125 activities and a demo user
npm run dev              # http://localhost:5000
```

The seed creates a demo account: **maya@example.com** / **password123**.

### Frontend

```bash
cd frontend-main
cp .env.example .env
npm install
npm run dev              # http://localhost:5183
```

In development Vite proxies `/api` to `http://localhost:5000`, so you don't need to set `VITE_API_URL` unless the API lives somewhere else.

## Project layout

```
backend-main/
  config/db.js               Mongo connection
  controllers/               auth, destination, trip, itinerary, budget, external
  middleware/                JWT auth (protect / optionalAuth), error handling
  models/                    User, Destination, Activity, Trip, Itinerary, Budget
  routes/                    one router per resource; itinerary + budget nest under /trips/:id
  services/
    itineraryService.js      greedy day-packing algorithm
    budgetService.js         category summation + insights
    recommendationService.js destination scoring
    weatherService.js        Open-Meteo proxy with a small cache
    mapsService.js           haversine travel estimates, Nominatim geocoding, Directions fallback
  seed/                      sample data + seed script
  index.js

frontend-main/src/
  components/
    auth/                    LoginForm, RegisterForm (two-step, collects preferences)
    dashboard/               Dashboard
    explore/                 Explore, FilterBar, DestinationCard, DestinationDetail
    trips/                   TripList, NewTrip, TripDetail, ItineraryView, BudgetPanel, TripOverview, WeatherWidget
    user/                    Profile, PreferencesForm
    Navbar.jsx, Home.jsx, NotFound.jsx, ui.jsx
  context/authContext.jsx    auth state, login/register/logout, saved destinations
  services/api.js            axios instance + JWT interceptor
  Routes.jsx
  main.jsx
```

## API overview

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/auth/register` `/login` | – | returns `{ token, user }` |
| GET/PUT | `/api/auth/me` | ✓ | profile + preferences |
| POST | `/api/auth/saved/:destinationId` | ✓ | toggle saved |
| GET | `/api/destinations` | optional | `q`, `region`, `tag`, `sort`, `maxDaily`; adds match scores when logged in |
| GET | `/api/destinations/recommended` | optional | `month`, `interests`, `budgetLevel` |
| GET | `/api/destinations/:idOrSlug` | optional | destination + activities |
| GET/POST | `/api/trips` | ✓ | |
| GET/PUT/DELETE | `/api/trips/:id` | ✓ | |
| GET | `/api/trips/:id/analysis` | ✓ | |
| GET/POST/DELETE | `/api/trips/:id/itinerary` | ✓ | POST (re)generates; accepts `pace`, `interests`, `budgetLevel` overrides |
| PUT | `/api/trips/:id/itinerary/days/:dayNumber` | ✓ | replace a day's slots; times are recomputed |
| GET/POST/PUT | `/api/trips/:id/budget` | ✓ | POST estimates, PUT edits lines / limit |
| POST | `/api/trips/:id/budget/lines/:category/reset` | ✓ | drop a manual override |
| GET | `/api/external/weather` | – | `lat`, `lng`, `days` |
| GET | `/api/external/geocode` `/travel-time` | ✓ | |

## Environment variables

Backend (`backend-main/.env`):

| Var | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/smart-travel` | |
| `JWT_SECRET` | – | required |
| `JWT_EXPIRES_IN` | `7d` | |
| `CLIENT_URL` | `http://localhost:5183` | CORS allow-list in production (comma-separated) |
| `GOOGLE_MAPS_API_KEY` | – | optional; enables real Directions travel times |

Frontend (`frontend-main/.env`): `VITE_API_URL` — leave empty to use the dev proxy.


