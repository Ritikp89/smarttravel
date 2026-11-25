const currencyScale = (currency) => (currency === 'JPY' ? 1 : 100);

const toMinorUnits = (amount, currency) => Math.round(Number(amount) * currencyScale(currency));
const fromMinorUnits = (amount, currency) => amount / currencyScale(currency);

const splitEqually = (totalMinorUnits, participantIds) => {
  if (!Number.isSafeInteger(totalMinorUnits) || totalMinorUnits < participantIds.length) {
    throw new RangeError('The amount is too small to give each traveler a share');
  }
  if (!participantIds.length) throw new RangeError('Select at least one traveler');

  const base = Math.floor(totalMinorUnits / participantIds.length);
  const remainder = totalMinorUnits % participantIds.length;
  return participantIds.map((userId, index) => ({
    userId,
    amountMinorUnits: base + (index < remainder ? 1 : 0),
  }));
};

module.exports = { currencyScale, toMinorUnits, fromMinorUnits, splitEqually };
