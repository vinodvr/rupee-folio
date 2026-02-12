// Currency configuration with historical return limits (post-tax)
// Currently only supports INR
export const currencyConfig = {
  INR: {
    symbol: '₹',
    locale: 'en-IN',
    equity: {
      min: 8,
      max: 13,
      default: 10,
      labels: { '8-9': 'Conservative', '10-11': 'Realistic', '12-13': 'Optimistic' }
    },
    debt: {
      min: 4,
      max: 7,
      default: 5,
      labels: { '4': 'Conservative', '5-6': 'Realistic', '7': 'Optimistic' }
    },
    recommendations: {
      equity: 'Nifty 50 / Nifty Total Market Index Fund',
      debt: 'Money Market / Liquid Funds'
    },
    funds: {
      icici: {
        name: 'ICICI Prudential',
        nifty50: 'ICICI Prudential Nifty 50 Index Fund Direct Growth',
        niftyNext50: 'ICICI Prudential Nifty Next 50 Index Fund Direct Growth',
        moneyMarket: 'ICICI Prudential Money Market Fund Direct Growth',
        arbitrage: 'ICICI Prudential Equity Arbitrage Fund Direct Growth'
      },
      hdfc: {
        name: 'HDFC',
        nifty50: 'HDFC Nifty 50 Index Fund Direct Growth',
        niftyNext50: 'HDFC Nifty Next 50 Index Fund Direct Growth',
        moneyMarket: 'HDFC Money Market Fund Direct Growth',
        arbitrage: 'HDFC Arbitrage Fund Direct Growth'
      }
    }
  }
};

export function getCurrencyConfig(currency) {
  return currencyConfig[currency] || currencyConfig.INR;
}

export function formatCurrency(amount, currency) {
  const config = getCurrencyConfig(currency);
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatNumber(amount, currency) {
  const config = getCurrencyConfig(currency);
  return new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function getSymbol(currency) {
  return getCurrencyConfig(currency).symbol;
}

export function formatCompact(amount, currency) {
  const symbol = getSymbol(currency);
  const fmt = (n) => parseFloat(n.toFixed(2)).toString();
  if (amount >= 10000000) return `${symbol}${fmt(amount / 10000000)} Crore`;
  if (amount >= 100000) return `${symbol}${fmt(amount / 100000)} Lakhs`;
  if (amount >= 1000) return `${symbol}${fmt(amount / 1000)}K`;
  return `${symbol}${amount}`;
}

export function getRecommendations(currency) {
  return getCurrencyConfig(currency).recommendations;
}

export function getFunds(currency) {
  return getCurrencyConfig(currency).funds || null;
}

export function getEquityLimits(currency) {
  return getCurrencyConfig(currency).equity;
}

export function getDebtLimits(currency) {
  return getCurrencyConfig(currency).debt;
}

// Constrain return value to currency limits
export function constrainEquityReturn(value, currency) {
  const limits = getEquityLimits(currency);
  return Math.min(Math.max(value, limits.min), limits.max);
}

export function constrainDebtReturn(value, currency) {
  const limits = getDebtLimits(currency);
  return Math.min(Math.max(value, limits.min), limits.max);
}
