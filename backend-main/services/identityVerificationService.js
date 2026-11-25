const AGE_BANDS = ['18-24', '25-34', '35-44', '45+'];

const ageBandFromDob = (dob, today = new Date()) => {
  if (!dob || !Number.isInteger(dob.year) || !Number.isInteger(dob.month) || !Number.isInteger(dob.day)) {
    return null;
  }

  const birthDate = new Date(Date.UTC(dob.year, dob.month - 1, dob.day));
  if (
    birthDate.getUTCFullYear() !== dob.year
    || birthDate.getUTCMonth() !== dob.month - 1
    || birthDate.getUTCDate() !== dob.day
    || birthDate > today
  ) {
    return null;
  }

  let age = today.getUTCFullYear() - dob.year;
  const birthdayHasPassed =
    today.getUTCMonth() > dob.month - 1
    || (today.getUTCMonth() === dob.month - 1 && today.getUTCDate() >= dob.day);
  if (!birthdayHasPassed) age -= 1;
  if (age < 18) return null;
  if (age <= 24) return AGE_BANDS[0];
  if (age <= 34) return AGE_BANDS[1];
  if (age <= 44) return AGE_BANDS[2];
  return AGE_BANDS[3];
};

const localStatusForStripe = (status) => {
  if (status === 'verified') return 'verified';
  if (status === 'requires_input') return 'requires_input';
  if (status === 'canceled') return 'canceled';
  if (status === 'processing') return 'processing';
  return 'pending';
};

module.exports = { AGE_BANDS, ageBandFromDob, localStatusForStripe };
