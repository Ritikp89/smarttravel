const COUNTRY_IMAGES = {
  Portugal: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1200&q=80',
  Japan: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&q=80',
  India: 'https://images.unsplash.com/photo-1524498250077-390f9e378fc0?w=1200&q=80',
  France: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80',
  Italy: 'https://images.unsplash.com/photo-1533676802871-eca1ae998cd5?w=1200&q=80',
  Spain: 'https://images.unsplash.com/photo-1543785734-4b6e564642f8?w=1200&q=80',
  'United States': 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=1200&q=80',
  'United Kingdom': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&q=80',
  Thailand: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=1200&q=80',
  Indonesia: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80',
  Australia: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1200&q=80',
  'United Arab Emirates': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80',
  Egypt: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=1200&q=80',
  Switzerland: 'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?w=1200&q=80',
  Greece: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1200&q=80',
  Brazil: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=1200&q=80',
  Canada: 'https://images.unsplash.com/photo-1503614472-8c93d2b3b8d9?w=1200&q=80',
  Singapore: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200&q=80',
  Turkey: 'https://images.unsplash.com/photo-1527838832700-5059252407fa?w=1200&q=80',
  'South Africa': 'https://images.unsplash.com/photo-1484318571209-661cf29a69c3?w=1200&q=80',
  Nepal: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1200&q=80',
  'New Zealand': 'https://images.unsplash.com/photo-1469521669194-babb45599def?w=1200&q=80',
  Germany: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1200&q=80',
  Netherlands: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1200&q=80',
}

const FALLBACK_COUNTRY_IMAGE = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80'

export function getCountryImage(country, destinationImage) {
  if (country && COUNTRY_IMAGES[country]) return COUNTRY_IMAGES[country]
  if (destinationImage) return destinationImage
  return FALLBACK_COUNTRY_IMAGE
}

export function getDestinationImage(destination, coverImage) {
  const name = destination?.name || 'Travel'
  const country = destination?.country || ''
  const key = destination?.slug || `${name}-${country}`

  if (destination?.image) return destination.image
  if (coverImage) return coverImage

  return `https://picsum.photos/seed/${encodeURIComponent(key)}/1200/800`
}

export function getDestinationFallback(destination) {
  const name = destination?.name || 'Travel'
  const country = destination?.country || ''
  const key = destination?.slug || `${name}-${country}`
  let hash = 0
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return `https://picsum.photos/seed/${encodeURIComponent(key)}/1200/800`
}
