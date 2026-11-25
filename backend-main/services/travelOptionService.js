const mongoose = require('mongoose');
const { ApiError } = require('../middleware/errorHandler');
const { isSafeHttpsUrl } = require('./creatorItineraryService');

const CATEGORIES = ['hotel', 'tour', 'transport'];
const ALLERGENS = ['peanuts', 'tree-nuts', 'milk', 'eggs', 'wheat', 'soy', 'fish', 'shellfish', 'sesame'];
const ACCESSIBILITY_CLAIMS = ['wheelchairAccess', 'sensoryFriendly'];
const DIETARY_CLAIMS = ['halal', 'vegan'];

const parseSelection = (value, allowed, label) => {
  if (value === undefined || value === '') return [];
  const values = (Array.isArray(value) ? value : String(value).split(','))
    .map((item) => String(item).trim())
    .filter(Boolean);
  if (values.some((item) => !allowed.includes(item))) {
    throw new ApiError(400, `Invalid ${label} filter`);
  }
  return [...new Set(values)];
};

const buildVerifiedOptionFilter = (query) => {
  const categories = parseSelection(query.category, CATEGORIES, 'category');
  const accessibility = parseSelection(query.accessibility, ACCESSIBILITY_CLAIMS, 'accessibility');
  const dietary = parseSelection(query.dietary, DIETARY_CLAIMS, 'dietary');
  const allergens = parseSelection(query.allergen, ALLERGENS, 'allergen');
  if (!accessibility.length && !dietary.length && !allergens.length) {
    throw new ApiError(400, 'Select at least one accessibility or dietary requirement');
  }
  const filter = { category: { $in: categories.length ? categories : CATEGORIES } };
  const requireVerifiedClaim = (path) => {
    filter[`${path}.verified`] = true;
    filter[`${path}.evidenceUrl`] = { $type: 'string', $ne: '' };
    filter[`${path}.verifiedAt`] = { $type: 'date' };
    filter[`${path}.verifiedBy`] = { $exists: true, $ne: null };
  };

  accessibility.forEach((claim) => {
    requireVerifiedClaim(`verification.accessibility.${claim}`);
  });
  dietary.forEach((claim) => {
    requireVerifiedClaim(`verification.dietary.${claim}`);
  });
  if (allergens.length) {
    filter.$and = allergens.map((allergen) => ({
      'verification.dietary.allergies': {
        $elemMatch: {
          allergen,
          verified: true,
          evidenceUrl: { $type: 'string', $ne: '' },
          verifiedAt: { $type: 'date' },
          verifiedBy: { $exists: true, $ne: null },
        },
      },
    }));
  }

  return filter;
};

const sanitizeOptionInput = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'A travel option object is required');
  }
  if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 120) {
    throw new ApiError(400, 'A name of up to 120 characters is required');
  }
  if (typeof body.provider !== 'string' || !body.provider.trim() || body.provider.trim().length > 120) {
    throw new ApiError(400, 'A provider of up to 120 characters is required');
  }
  if (!CATEGORIES.includes(body.category)) throw new ApiError(400, 'Choose a hotel, tour, or transport option');
  if (!mongoose.Types.ObjectId.isValid(body.destination)) throw new ApiError(400, 'Choose a valid destination');
  if (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 1000)) {
    throw new ApiError(400, 'Description must be 1000 characters or fewer');
  }
  if (body.bookingUrl !== undefined && typeof body.bookingUrl !== 'string') {
    throw new ApiError(400, 'Booking URL must be a valid HTTPS URL');
  }
  if (body.bookingUrl && !isSafeHttpsUrl(body.bookingUrl)) {
    throw new ApiError(400, 'Booking URL must be a valid HTTPS URL');
  }

  return {
    name: body.name.trim(),
    provider: body.provider.trim(),
    category: body.category,
    destination: body.destination,
    description: body.description?.trim() || '',
    bookingUrl: body.bookingUrl?.trim() || '',
  };
};

const sanitizeClaim = (value, reviewerId) => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.verified !== 'boolean') {
    throw new ApiError(400, 'Each claim must include a verified boolean');
  }
  if (!value.verified) {
    return { verified: false, evidenceUrl: '', verifiedAt: null, verifiedBy: null };
  }
  if (!isSafeHttpsUrl(value.evidenceUrl)) {
    throw new ApiError(400, 'Verified claims require an HTTPS evidence URL');
  }
  return {
    verified: true,
    evidenceUrl: value.evidenceUrl,
    verifiedAt: new Date(),
    verifiedBy: reviewerId,
  };
};

const sanitizeVerificationUpdate = (body, reviewerId) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'Verification claims are required');
  }
  const updates = {};
  const accessibility = body.accessibility || {};
  const dietary = body.dietary || {};

  if (typeof accessibility !== 'object' || Array.isArray(accessibility)) {
    throw new ApiError(400, 'Accessibility claims must be an object');
  }
  Object.entries(accessibility).forEach(([claim, value]) => {
    if (!ACCESSIBILITY_CLAIMS.includes(claim)) throw new ApiError(400, 'Unsupported accessibility claim');
    updates[`verification.accessibility.${claim}`] = sanitizeClaim(value, reviewerId);
  });

  if (typeof dietary !== 'object' || Array.isArray(dietary)) {
    throw new ApiError(400, 'Dietary claims must be an object');
  }
  DIETARY_CLAIMS.forEach((claim) => {
    if (dietary[claim] !== undefined) {
      updates[`verification.dietary.${claim}`] = sanitizeClaim(dietary[claim], reviewerId);
    }
  });
  if (dietary.allergies !== undefined) {
    if (!Array.isArray(dietary.allergies) || dietary.allergies.length > ALLERGENS.length) {
      throw new ApiError(400, 'Allergen claims must be a valid list');
    }
    const seen = new Set();
    updates['verification.dietary.allergies'] = dietary.allergies.map((claim) => {
      if (!claim || !ALLERGENS.includes(claim.allergen) || seen.has(claim.allergen)) {
        throw new ApiError(400, 'Allergen claim is invalid or duplicated');
      }
      seen.add(claim.allergen);
      return { allergen: claim.allergen, ...sanitizeClaim(claim, reviewerId) };
    });
  }
  if (!Object.keys(updates).length) throw new ApiError(400, 'At least one verification claim is required');
  return updates;
};

const publicVerification = (verification = {}) => {
  const claims = (items) => Object.fromEntries(
    Object.entries(items || {})
      .filter(([, value]) => value?.verified && value.verifiedAt && value.verifiedBy && isSafeHttpsUrl(value.evidenceUrl))
      .map(([key, value]) => [key, { evidenceUrl: value.evidenceUrl, verifiedAt: value.verifiedAt }])
  );
  return {
    accessibility: claims(verification.accessibility),
    dietary: {
      ...claims(verification.dietary),
      allergies: (verification.dietary?.allergies || [])
        .filter((claim) => claim.verified && claim.verifiedAt && claim.verifiedBy && isSafeHttpsUrl(claim.evidenceUrl))
        .map(({ allergen, evidenceUrl, verifiedAt }) => ({ allergen, evidenceUrl, verifiedAt })),
    },
  };
};

module.exports = {
  ALLERGENS,
  buildVerifiedOptionFilter,
  publicVerification,
  sanitizeOptionInput,
  sanitizeVerificationUpdate,
};
