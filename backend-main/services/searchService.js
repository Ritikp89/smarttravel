const HINDI_PLACE_ALIASES = {
  'पेरिस': 'Paris',
  'लंदन': 'London',
  'रोम': 'Rome',
  'टोक्यो': 'Tokyo',
  'न्यूयॉर्क': 'New York',
  'न्यू दिल्ली': 'New Delhi',
  'दिल्ली': 'Delhi',
  'मुंबई': 'Mumbai',
  'जयपुर': 'Jaipur',
  'वाराणसी': 'Varanasi',
  'सिडनी': 'Sydney',
  'बाली': 'Bali',
  'दुबई': 'Dubai',
  'इस्तांबुल': 'Istanbul',
  'काठमांडू': 'Kathmandu',
  'बार्सिलोना': 'Barcelona',
  'एम्स्टर्डम': 'Amsterdam',
  'लिस्बन': 'Lisbon',
  'वैंकूवर': 'Vancouver',
  'केप टाउन': 'Cape Town',
}

const HINDI_SEARCH_FILLER = new Set([
  'मुझे', 'में', 'की', 'का', 'के', 'लिए', 'कहाँ', 'कहां', 'क्या', 'खोजें', 'खोजो',
  'घूमने', 'जगह', 'जगहें', 'यात्रा', 'यात्रा में', 'दिखाओ', 'बताओ', 'और', 'पास',
])

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const searchTerms = (query) => {
  const raw = query.trim()
  const tokens = raw
    .replace(/[?!,।]/g, ' ')
    .split(/\s+/)
    .filter((token) => token && !HINDI_SEARCH_FILLER.has(token))
  const cleaned = tokens.join(' ')
  const aliases = Object.entries(HINDI_PLACE_ALIASES)
  let translated = cleaned
  for (const [hindi, english] of aliases) {
    if (translated.includes(hindi)) translated = translated.replace(hindi, english)
  }

  return [...new Set([raw, cleaned, translated].filter((term) => term.length >= 2))];
};

module.exports = { escapeRegex, searchTerms };
