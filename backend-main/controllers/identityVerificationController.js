const Stripe = require('stripe');
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { ageBandFromDob, localStatusForStripe } = require('../services/identityVerificationService');

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) throw new ApiError(503, 'ID verification is not configured yet');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

const buildReturnUrl = () => {
  const configuredUrl = process.env.STRIPE_IDENTITY_RETURN_URL
    || (process.env.CLIENT_URL || 'http://localhost:5183').split(',')[0].trim();
  return new URL('/profile?verification=returned', configuredUrl).toString();
};

const applyStripeSession = async (session, stripe) => {
  const userId = session.metadata?.user_id;
  if (!userId || !session.id) return;

  const user = await User.findOne({
    _id: userId,
    'identityVerification.provider': 'stripe',
    'identityVerification.sessionId': session.id,
  });
  if (!user) return;

  const verification = user.identityVerification;
  if (verification.status === 'verified' && session.status !== 'verified') return;

  verification.status = localStatusForStripe(session.status);
  if (session.status === 'verified') {
    let verifiedOutputs = session.verified_outputs;
    if (!verifiedOutputs?.dob) {
      const detailedSession = await stripe.identity.verificationSessions.retrieve(session.id, {
        expand: ['verified_outputs'],
      });
      verifiedOutputs = detailedSession.verified_outputs;
    }

    verification.ageBand = ageBandFromDob(verifiedOutputs?.dob);
    verification.verifiedAt = new Date(session.created * 1000);
  }
  await user.save();
};

const getStatus = asyncHandler(async (req, res) => {
  const stripe = process.env.STRIPE_SECRET_KEY ? getStripe() : null;
  let user = await User.findById(req.user._id);
  const verification = user.identityVerification;

  if (stripe && verification.sessionId && verification.status !== 'verified') {
    const session = await stripe.identity.verificationSessions.retrieve(verification.sessionId, {
      expand: ['verified_outputs'],
    });
    await applyStripeSession(session, stripe);
    user = await User.findById(req.user._id);
  }

  const status = user.identityVerification.status;
  const ageBand = user.identityVerification.ageBand;
  res.json({
    configured: Boolean(stripe),
    status,
    ageBand,
    verifiedAt: user.identityVerification.verifiedAt,
    eligible: status === 'verified' && Boolean(ageBand),
  });
});

const createSession = asyncHandler(async (req, res) => {
  const stripe = getStripe();
  const user = await User.findById(req.user._id);
  const current = user.identityVerification;

  if (current.status === 'verified') {
    throw new ApiError(409, 'Your identity has already been verified');
  }

  if (current.sessionId && ['pending', 'processing', 'requires_input'].includes(current.status)) {
    const existing = await stripe.identity.verificationSessions.retrieve(current.sessionId);
    await applyStripeSession(existing, stripe);
    if (existing.status === 'verified') {
      return res.json({ status: 'verified', url: null });
    }
    if (existing.status === 'processing') {
      return res.json({ status: 'processing', url: null });
    }
    if (existing.url) {
      return res.json({ status: localStatusForStripe(existing.status), url: existing.url });
    }
  }

  const previousStatus = current.status;
  const claimed = await User.findOneAndUpdate(
    {
      _id: req.user._id,
      'identityVerification.status': { $nin: ['creating', 'pending', 'processing', 'verified'] },
    },
    {
      $set: {
        'identityVerification.provider': 'stripe',
        'identityVerification.status': 'creating',
      },
      $inc: { 'identityVerification.attempt': 1 },
    },
    { new: true }
  );
  if (!claimed) throw new ApiError(409, 'Your verification is already in progress. Refresh the status shortly.');

  try {
    const session = await stripe.identity.verificationSessions.create(
      {
        type: 'document',
        provided_details: { email: user.email },
        return_url: buildReturnUrl(),
        metadata: { user_id: String(user._id) },
      },
      { idempotencyKey: `solo-identity-${user._id}-${claimed.identityVerification.attempt}` }
    );

    claimed.identityVerification.sessionId = session.id;
    claimed.identityVerification.status = localStatusForStripe(session.status);
    await claimed.save();
    res.status(201).json({ status: claimed.identityVerification.status, url: session.url });
  } catch (error) {
    await User.updateOne(
      { _id: claimed._id, 'identityVerification.status': 'creating' },
      { $set: { 'identityVerification.status': previousStatus || 'not_started' } }
    );
    throw error;
  }
});

const stripeWebhook = asyncHandler(async (req, res) => {
  if (!process.env.STRIPE_IDENTITY_WEBHOOK_SECRET) {
    throw new ApiError(503, 'Stripe Identity webhook is not configured');
  }

  const stripe = getStripe();
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_IDENTITY_WEBHOOK_SECRET
    );
  } catch (error) {
    return res.status(400).json({ message: 'Invalid Stripe webhook signature' });
  }

  if (event.type === 'identity.verification_session.verified') {
    await applyStripeSession(event.data.object, stripe);
  } else if (event.type === 'identity.verification_session.requires_input') {
    await applyStripeSession(event.data.object, stripe);
  }

  res.json({ received: true });
});

module.exports = { getStatus, createSession, stripeWebhook };
