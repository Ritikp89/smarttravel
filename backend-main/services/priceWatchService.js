const recordPriceCheck = (watch, price, checkedAt = new Date()) => {
  watch.latestPrice = price;
  watch.lastCheckedAt = checkedAt;
  if (price < watch.lowestPrice) {
    watch.lowestPrice = price;
    watch.lowestPriceAt = checkedAt;
  }
  return watch;
};

module.exports = { recordPriceCheck };
