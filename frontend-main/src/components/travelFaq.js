export const FAQ_SECTIONS = [
  {
    title: 'Trip Planning & Recommendations',
    questions: [
      { question: 'Where should I travel this weekend?', answer: 'Choose your dates and interests in Explore to browse seasonal destination ideas. Smart Travel does not use live location or weather to pick a weekend destination yet.', action: { to: '/explore', label: 'Browse destinations' } },
      { question: 'What are the best tourist destinations near me?', answer: 'Set your Home city in Profile to use it as your trip origin, then browse Explore. The app does not track your live location or rank places by distance from you.', action: { to: '/profile', label: 'Set my home city' } },
      { question: 'Suggest a 3-day trip itinerary.', answer: 'Create a trip, choose a destination, and set dates covering three days. Smart Travel will draft an itinerary using your interests and pace, which you can edit afterward.', action: { to: '/trips/new', label: 'Plan a 3-day trip' } },
      { question: 'What are the best places to visit in India?', answer: 'Browse Indian destinations in Explore. Open a destination to see highlights, activities, best months, and daily cost estimates.', action: { to: '/explore?q=India', label: 'Explore India' } },
      { question: 'Can you plan a complete trip based on my preferences?', answer: 'Yes. Save your interests, budget style, pace, and Home city in Profile, then create a trip. Smart Travel drafts the itinerary and budget for you.', action: { to: '/trips/new', label: 'Start planning' } },
      { question: 'What is the best time to visit a particular destination?', answer: 'Open the destination in Explore to see its recommended months. Weather and seasonal conditions can change, so check a current forecast before booking.', action: { to: '/explore', label: 'Find a destination' } },
      { question: 'Suggest destinations for a solo trip.', answer: 'Browse destinations, then use Solo Travelers to find trip plans and travelers going to the same destination. You can also create a trip for one traveler.', action: { to: '/solo-travelers', label: 'Explore solo travel' } },
      { question: 'What are the best places for couples or families?', answer: 'When creating a trip, choose the Romantic or Family-Friendly travel style. The itinerary draft will use that style along with your interests and pace.', action: { to: '/trips/new', label: 'Plan a trip' } },
      { question: 'Can you recommend offbeat tourist destinations?', answer: 'Browse Explore and open destination pages for local tips and highlights. There is no dedicated offbeat filter yet, so search for a region or interest to find less familiar options.', action: { to: '/explore', label: 'Browse destinations' } },
      { question: 'How can I explore multiple destinations in one trip?', answer: 'A trip currently has one main destination. Create separate trips for different cities; within a trip, the itinerary can include multiple stops around that destination.', action: { to: '/trips/new', label: 'Plan a trip' } },
    ],
  },
  {
    title: 'Budget & Expenses',
    questions: [
      { question: 'How much will my trip cost?', answer: 'Create a trip with its destination, dates, traveler count, and budget style to get a category-by-category estimate. The estimate uses your selected currency; enter flight costs manually.', action: { to: '/trips/new', label: 'Estimate a trip budget' } },
      { question: 'Can I plan a trip under ₹5,000?', answer: 'It depends on the destination, number of days, and travelers. Choose a nearby destination and Shoestring style, then check the estimate; flights and other costs you enter manually affect the total.', action: { to: '/explore?sort=cheapest', label: 'Find lower-cost destinations' } },
      { question: 'Suggest budget-friendly destinations.', answer: 'Explore destinations sorted by the Shoestring daily estimate, then compare the destination pages before choosing.', action: { to: '/explore?sort=cheapest', label: 'Explore budget destinations' } },
      { question: 'How can I reduce my travel expenses?', answer: 'Try fewer days, travel outside peak season, choose Shoestring style, share a room, use local transit, and review paid activities. Re-estimate the trip after changing your plan.', action: { to: '/trips/new', label: 'Adjust a trip plan' } },
      { question: 'What is the estimated daily expenditure?', answer: 'After estimating a trip, its Budget view shows the estimated daily and per-person totals, with contingency included.', action: { to: '/trips', label: 'View my trips' } },
      { question: 'How much should I spend on food and accommodation?', answer: 'The trip Budget view estimates food and accommodation separately from the destination’s daily cost and your selected travel style. Enter your dates and travelers for a trip-specific estimate.', action: { to: '/trips/new', label: 'Estimate expenses' } },
      { question: 'Can you create an itinerary within my budget?', answer: 'Create the itinerary and budget, then compare the estimate with your ceiling. If the ceiling is below the realistic estimate, choose a less expensive style, shorten the trip, or change activities and re-estimate.', action: { to: '/trips/new', label: 'Plan within a budget' } },
      { question: 'What are the cheapest ways to reach my destination?', answer: 'Smart Travel does not compare live bus, train, and flight fares. Trip details can open a flight search from your trip origin; check rail and bus providers separately and enter the fare in your budget.', action: { to: '/trips', label: 'Open trip details' } },
    ],
  },
  {
    title: 'Transportation & Navigation',
    questions: [
      { question: 'What is the cheapest way to reach my destination?', answer: 'The app does not compare live transport fares across bus, train, car, and flights. Use the trip origin to search fares externally, then add the chosen fare to the budget.', action: { to: '/trips', label: 'Open trip details' } },
      { question: 'How far is the destination from my current location?', answer: 'Smart Travel does not read your live location. Set your Home city in Profile or enter the trip’s departure city; the app uses the destination for local trip planning.', action: { to: '/profile', label: 'Set my Home city' } },
      { question: 'What is the estimated travel time?', answer: 'Generated itineraries include approximate travel time between scheduled stops. These estimates are not live traffic updates.', action: { to: '/trips', label: 'View my itinerary' } },
      { question: 'Should I travel by bus, train, car, or flight?', answer: 'The app does not compare transport modes or live fares. Compare the route, total time, and ticket prices with the providers available for your destination; flights can be searched from trip details.', action: { to: '/trips', label: 'Open trip details' } },
      { question: 'Which transportation option is the most economical?', answer: 'That depends on your route and dates. Smart Travel has no live bus or train fares, so compare providers and add your chosen transport cost to the trip budget.', action: { to: '/trips', label: 'Review a trip budget' } },
      { question: 'Can I track my journey in real time?', answer: 'Real-time GPS journey tracking is not available in Smart Travel. Use a navigation app for live location and traffic updates.', action: { to: '/trips', label: 'View my trips' } },
      { question: 'What are the best routes to reach the destination?', answer: 'The trip itinerary organizes stops within the destination, and destination pages link to map directions. For a full route from your departure city, use a maps or transport provider.', action: { to: '/explore', label: 'Browse destinations' } },
      { question: 'How much will fuel cost for my road trip?', answer: 'Fuel cost is not calculated automatically. Estimate it from route distance, vehicle mileage, and current fuel price, then add it as a manual transport expense.', action: { to: '/trips', label: 'Add a trip expense' } },
    ],
  },
  {
    title: 'Hotels & Accommodation',
    questions: [
      { question: 'What are the best budget hotels nearby?', answer: 'Smart Travel does not show live hotel inventory. Open a trip and use Find hotels to search current options for its destination and dates.', action: { to: '/trips', label: 'Find hotels for a trip' } },
      { question: 'Where can I find affordable hostels?', answer: 'Use the hotel search from trip details and filter the results for hostels. The available listings and prices come from the external booking site.', action: { to: '/trips', label: 'Search accommodation' } },
      { question: 'What is the average hotel price per night?', answer: 'The Budget view gives an estimated accommodation total for your trip. Divide by nights for a rough nightly estimate; actual hotel prices depend on dates and availability.', action: { to: '/trips/new', label: 'Estimate accommodation' } },
      { question: 'Suggest accommodation near tourist attractions.', answer: 'Search hotels for your destination, then choose an area near the attractions in your itinerary. Smart Travel does not currently rank hotels by distance to attractions.', action: { to: '/trips', label: 'Search hotels' } },
      { question: 'Are there any homestays available?', answer: 'Smart Travel does not maintain homestay listings. Search accommodation for your destination on a booking provider and check its current homestay options.', action: { to: '/trips', label: 'Search accommodation' } },
      { question: 'How can I find family-friendly accommodation?', answer: 'Choose Family-Friendly when planning, then search accommodation from trip details and check each property’s family facilities, room capacity, and policies.', action: { to: '/trips/new', label: 'Plan a family trip' } },
    ],
  },
  {
    title: 'Tourist Attractions & Activities',
    questions: [
      { question: 'What are the must-visit places at this destination?', answer: 'Open the destination page to see its highlights and known-for places. Generate an itinerary to arrange selected activities across your trip days.', action: { to: '/explore', label: 'Explore destinations' } },
      { question: 'What activities can I do there?', answer: 'Destination pages list available activities, and the itinerary planner can schedule them by day. Availability and ticket prices can change, so confirm with the activity provider.', action: { to: '/explore', label: 'Find activities' } },
      { question: 'Are there any adventure activities nearby?', answer: 'Search Explore for adventure destinations or open a destination page to see its activity list and tags.', action: { to: '/explore?q=adventure', label: 'Explore adventure trips' } },
      { question: 'What are the famous local food options?', answer: 'Destination descriptions and local tips can point you toward regional food. Smart Travel does not provide a live restaurant directory or current restaurant reviews.', action: { to: '/explore', label: 'Explore destinations' } },
      { question: 'What are the best photography spots?', answer: 'Check destination highlights and the itinerary activity list for scenic places. There is no dedicated photography-spot ranking yet.', action: { to: '/explore', label: 'Browse destinations' } },
      { question: 'Are there any hidden gems worth exploring?', answer: 'Read the destination’s local tips and browse its activities for less obvious stops. The app does not currently label or rank hidden gems separately.', action: { to: '/explore', label: 'Find local tips' } },
      { question: 'What are the famous cultural and historical attractions?', answer: 'Search Explore for history or culture, then open destination pages for highlights and activities.', action: { to: '/explore?q=culture', label: 'Explore culture destinations' } },
    ],
  },
  {
    title: 'AI-Based Smart Travel Questions',
    questions: [
      { question: 'Can AI generate a personalized travel itinerary?', answer: 'Smart Travel can draft a day-by-day itinerary from your destination, dates, interests, pace, and budget style. You can edit the stops afterward.', action: { to: '/trips/new', label: 'Generate an itinerary' } },
      { question: 'Can you recommend destinations based on my budget?', answer: 'Set your budget style in Profile and browse Explore by lowest daily cost. Recommendations also use your saved interests.', action: { to: '/explore?sort=cheapest', label: 'Browse by cost' } },
      { question: 'Can you optimize my travel route?', answer: 'The itinerary planner arranges stops within a destination and estimates travel time between them. It does not optimize multi-city routes or use live traffic.', action: { to: '/trips/new', label: 'Build an itinerary' } },
      { question: 'Can you suggest alternatives if my budget is exceeded?', answer: 'Budget insights can suggest switching to a less expensive travel style. You can also shorten the trip, edit activities, or browse lower-cost destinations.', action: { to: '/explore?sort=cheapest', label: 'Find lower-cost options' } },
      { question: 'Can you recommend destinations based on weather?', answer: 'Destination pages show recommended travel months, and trip pages can show a forecast for a selected destination. The app does not automatically rank destinations using live weather.', action: { to: '/explore', label: 'Browse destinations' } },
      { question: 'Can you calculate the total trip expenditure?', answer: 'Yes. Create a trip to get an estimated total, category breakdown, and contingency. Add flight and other manual costs for a fuller estimate.', action: { to: '/trips/new', label: 'Estimate trip expenditure' } },
      { question: 'Can you suggest the best combination of transportation options?', answer: 'Smart Travel does not compare combined bus, train, car, and flight routes. Compare those options with transport providers and add the selected costs to your trip.', action: { to: '/trips', label: 'Review trip costs' } },
      { question: 'Can you modify my itinerary based on my available time?', answer: 'You can edit the stops scheduled for each day. To change the trip length or pace, create a new trip with the dates and preferences you want, then generate a fresh itinerary.', action: { to: '/trips/new', label: 'Plan a new itinerary' } },
      { question: 'Can you recommend places based on my travel history?', answer: 'Recommendations currently use your saved interests and budget preferences, not past trip history. Update those preferences in Profile to personalize suggestions.', action: { to: '/profile', label: 'Update preferences' } },
      { question: 'Can you compare two destinations based on cost and activities?', answer: 'Open each destination page to compare its daily cost, highlights, and available activities. There is no side-by-side comparison tool yet.', action: { to: '/explore', label: 'Compare destinations' } },
      { question: 'Can you create a multi-day itinerary with minimum travel expenses?', answer: 'Choose your destination and dates, select Shoestring style, and generate an itinerary. Review the budget and edit activities; flight costs are entered manually.', action: { to: '/trips/new', label: 'Plan a low-cost itinerary' } },
    ],
  },
]

const normalize = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim()
  .replace(/\s+/g, ' ')

export const findTravelFaq = (query) => {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return null
  const questions = FAQ_SECTIONS.flatMap((section) => section.questions)
  return questions.find((item) => normalize(item.question) === normalizedQuery)
    || questions.find((item) => normalizedQuery.includes(normalize(item.question)))
    || null
}
