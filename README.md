# Smart Travel

A MERN travel-planning app. Tell it how you like to travel and it recommends destinations, packs a realistic day-by-day itinerary, and estimates a budget you can argue with.

- `backend-main/` — Express + MongoDB REST API
- `frontend-main/` — React (Vite + Tailwind) client

## What it does

- **Personalised recommendations** — destinations scored against your interests, budget style and the month you're travelling.
- **Itinerary generation** — a greedy day-packer that respects pace (relaxed / balanced / packed), time-of-day windows (sunset spots go in the evening), travel time between stops, and variety (max one museum a day, lunch around midday, full-day excursions get a day to themselves). Days are editable: reorder, remove, or pull in anything that didn't make the cut.
- **Budget estimation** — category-based summation (accommodation, food, activities, transport, flights, misc) with a contingency buffer, per-person and per-day figures, an optional spending ceiling, and manual overrides that survive re-estimates.
- **Trip analysis** — `GET /api/trips/:id/analysis` rolls up itinerary balance, budget shape and a forecast for your dates.
- **Trip group chat** — invite existing travelers by email, share messages in a separate trip chatbox, and poll for new messages.
- **Group cost splitting** — split shared bookings equally or by custom shares, then track each traveler’s paid status. No payments are processed in the app.
- **Price-drop tracking** — record booked and later-found flight or hotel prices; the app flags recorded drops, but does not automatically monitor providers or file refund claims.
- **Travel savings plan** — set a deposit goal and weekly, biweekly, or monthly contribution schedule, then track group contributions manually. No money is collected, installments are not charged automatically, and booking prices are not locked.
- **Solo traveler matching** — adults can verify through Stripe Identity, opt individual solo trips into discovery, and connect with verified travelers in the same broad age band who share the destination, overlapping dates, and interests. Requests require mutual acceptance before private messaging; users can block and report. The app stores verification state, timestamp, age band, and an internal Stripe session reference—not ID images or birth dates.
- **Creator-curated routes** — creators can attach a public video or blog URL, manually confirm ordered stops and addresses, then publish map directions and their own HTTPS booking links. The app does not scrape source content, guarantee venue availability, or process bookings.
- **Verified access & dietary options** — search hotels, tours and transport by staff-reviewed wheelchair access, sensory-friendly, halal, vegan and allergen-specific claims. All selected requirements must have HTTPS evidence; seed data is never marked verified by default.
- **Manual offline trip packs** — save trip details, itinerary, budget, local boarding-pass/voucher files, and an English–Hindi emergency phrasebook in this browser. Documents are not uploaded and are limited to 25 MB per trip pack. Base map tiles are not included; a licensed tile source must be configured first.
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
  controllers/               auth, destination, trip, itinerary, budget, group split, price watch, savings plan, identity verification, solo matching, creator routes, external
  middleware/                JWT auth (protect / optionalAuth), error handling
  models/                    User, Destination, Activity, TravelOption, Trip, ChatMessage, Itinerary, Budget, TripSplit, TripPriceWatch, TripSavingsPlan, SoloTravelerMatch, SoloTravelerSafetyReport, CreatorItinerary
  routes/                    one router per resource; itinerary + budget nest under /trips/:id
  services/
    itineraryService.js      greedy day-packing algorithm
    budgetService.js         category summation + insights
    groupSplitService.js     equal cost allocation
    priceWatchService.js     lowest-price tracking
    savingsPlanService.js    installment schedule + contribution allocation
    identityVerificationService.js  Stripe status and coarse adult age bands
    soloTravelerMatchingService.js  trip compatibility and shared-interest checks
    creatorItineraryService.js      safe source/booking URL checks and creator input filtering
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
    trips/                   TripList, NewTrip, TripDetail, ItineraryView, BudgetPanel, GroupSplit, PriceWatch, SavingsPlan, TripOverview, WeatherWidget
    creator/                 creator route listing, details, and editor
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
| GET/POST | `/api/identity-verification/status` `/session` | ✓ | Stripe Identity status and hosted document verification |
| GET | `/api/creator-itineraries` `/:id` | optional | Published routes; logged-in creators also see their own drafts |
| POST/PUT | `/api/creator-itineraries` `/:id` | ✓ | Create or edit a creator-curated route with HTTPS source and booking URLs |
| GET | `/api/travel-options/verified` | – | Verified hotels, tours and transport; selected categories are ORed, every accessibility/dietary/allergen requirement is ANDed and must have reviewed evidence |
| GET/POST | `/api/travel-options/admin` | admin | List all options for review or add an unverified option |
| PATCH | `/api/travel-options/admin/:id/verification` | admin | Add or revoke evidence-backed claims; reviewer and review date are server-assigned |
| GET | `/api/solo-travelers/trips` | ✓ | Lists upcoming solo trips owned by the traveler |
| PATCH | `/api/solo-travelers/trips/:tripId/visibility` | ✓ | Opt an eligible trip into or out of matching |
| GET/POST | `/api/solo-travelers/trips/:tripId/candidates` `/requests` | ✓ | Discover compatible travelers or send a connection request |
| GET/PATCH | `/api/solo-travelers/requests` `/:matchId` | ✓ | List connections; accept or decline incoming requests |
| POST | `/api/solo-travelers/requests/:matchId/messages` `/block` `/report` | ✓ | Accepted-chat messaging and safety actions |
| GET | `/api/destinations` | optional | `q`, `region`, `tag`, `sort`, `maxDaily`; adds match scores when logged in |
| GET | `/api/destinations/recommended` | optional | `month`, `interests`, `budgetLevel` |
| GET | `/api/destinations/:idOrSlug` | optional | destination + activities |
| GET/POST | `/api/trips` | ✓ | |
| GET/PUT/DELETE | `/api/trips/:id` | ✓ | |
| GET | `/api/trips/:id/analysis` | ✓ | |
| GET/POST/DELETE | `/api/trips/:id/itinerary` | ✓ | POST (re)generates; accepts `pace`, `interests`, `budgetLevel` overrides |
| PUT | `/api/trips/:id/itinerary/days/:dayNumber` | ✓ | replace a day's slots; times are recomputed |
| GET | `/api/chat/rooms` | ✓ | Lists trip chats the user owns or has joined |
| GET/POST | `/api/chat/rooms/:tripId/messages` | ✓ | Reads recent messages or sends a message to a trip group |
| POST | `/api/chat/rooms/:tripId/members` | ✓ | Trip owner adds an existing account by email |
| GET/POST/PUT | `/api/trips/:id/budget` | ✓ | POST estimates, PUT edits lines / limit |
| POST | `/api/trips/:id/budget/lines/:category/reset` | ✓ | drop a manual override |
| GET/POST | `/api/trips/:id/splits` | ✓ | group members list or create shared costs |
| PATCH | `/api/trips/:id/splits/:expenseId/shares/:userId` | ✓ | traveler marks their own share paid; trip owner can update any share |
| DELETE | `/api/trips/:id/splits/:expenseId` | ✓ | creator or trip owner removes a shared cost |
| GET/POST | `/api/trips/:id/price-watches` | ✓ | group members list or record booked flight/hotel prices |
| PATCH | `/api/trips/:id/price-watches/:watchId/check` | ✓ | records a manually checked price and flags new lows |
| DELETE | `/api/trips/:id/price-watches/:watchId` | ✓ | creator or trip owner removes a price watch |
| GET/POST/DELETE | `/api/trips/:id/savings` | ✓ | trip owner manages the manual plan; group members can view it |
| POST | `/api/trips/:id/savings/contributions` | ✓ | records a contribution for the logged-in traveler; owner may record for a member |
| DELETE | `/api/trips/:id/savings/contributions/:contributionId` | ✓ | recorder or trip owner removes a contribution |
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
| `STRIPE_SECRET_KEY` | – | required to start Stripe Identity verification |
| `STRIPE_IDENTITY_WEBHOOK_SECRET` | – | required to process signed verification events |
| `STRIPE_IDENTITY_RETURN_URL` | `CLIENT_URL` origin | optional hosted verification return URL |
| `GOOGLE_MAPS_API_KEY` | – | optional; enables real Directions travel times |

Configure Stripe Identity and its signed webhook endpoint at `/api/webhooks/stripe-identity` before enabling live verification. Matching is adults-only and opt-in per trip. It shares first name, age band, city, dates, and shared interests; it does not provide live location or verify ride operators or bookings. Encourage travelers to make their own safety checks.

Frontend (`frontend-main/.env`): `VITE_API_URL` — leave empty to use the dev proxy.

Offline packs are saved manually from a trip’s detail page and opened with **Open offline pack**. The browser service worker caches the app shell; open the app online before departure and keep the offline-pack link available. Local documents are stored in IndexedDB on that device and may be visible to anyone with access to the browser. The offline trip page includes saved coordinates, but no base map tiles until a licensed offline tile provider is configured.

### Verified travel-option review

Only staff accounts can create travel options or mark claims as verified. Promote a trusted account directly in MongoDB (never through registration or a public profile field):

```javascript
db.users.updateOne({ email: "staff@example.com" }, { $set: { role: "admin" } })
```

Admins create hotel, tour or transport entries through `POST /api/travel-options/admin`, then review claims through `PATCH /api/travel-options/admin/:id/verification`. Each verified claim requires a public HTTPS evidence URL. Claim types are `accessibility.wheelchairAccess`, `accessibility.sensoryFriendly`, `dietary.halal`, `dietary.vegan`, and `dietary.allergies` (allergens: peanuts, tree-nuts, milk, eggs, wheat, soy, fish, shellfish and sesame). Existing activity descriptions and seed data are not treated as evidence. Results can be empty until staff add and review options. Travelers should reconfirm current conditions with the provider before booking.


